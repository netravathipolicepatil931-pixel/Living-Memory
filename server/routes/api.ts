import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import {
  analyzeAudioWithGemini,
  analyzeEmailWithGemini,
  analyzeImageWithGemini,
  analyzePdfDocumentWithGemini,
  analyzeTextBatchWithGemini,
  analyzeVideoWithGemini,
  askLivingMemoryWithGemini,
  ExtractedIntelligenceItem,
  isGeminiConfigured,
  scoreToImportanceCategory,
} from '../ai/geminiClient.ts';
import {
  extractDocxText,
  parseWhatsAppText,
  parseWhatsAppZip,
} from '../ingestion/parsers.ts';
import {
  fetchGmailProfile,
  fetchGoogleCalendarEvents,
  syncGmailMessages,
} from '../integrations/googleApi.ts';
import { createJob, getJob, listJobs, updateJob } from '../services/jobStore.ts';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB safe upload limit
  },
});

const ALLOWED_EXTENSIONS = new Set([
  '.txt',
  '.zip',
  '.pdf',
  '.docx',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.mp3',
  '.wav',
  '.m4a',
  '.aac',
  '.ogg',
  '.mp4',
  '.mov',
  '.webm',
]);

function getBearerToken(req: express.Request): string | null {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

function getFirebaseConfigStatus(): boolean {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  return fs.existsSync(configPath);
}

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: isGeminiConfigured(),
    googleWorkspaceConfigured: getFirebaseConfigStatus(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/jobs', (_req, res) => {
  res.json({ jobs: listJobs() });
});

router.get('/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Processing job not found' });
    return;
  }
  res.json({ job });
});

router.post('/gmail/profile', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing Google access token.' });
    return;
  }
  try {
    const profile = await fetchGmailProfile(token);
    res.json({ profile });
  } catch (err: any) {
    res.status(401).json({ error: err?.message || 'Failed to verify Gmail profile.' });
  }
});

router.post('/gmail/sync', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing Google access token. Connect Google first.' });
    return;
  }

  const {
    maxMessages = 20,
    afterDate,
    beforeDate,
    startHistoryId,
    existingIds = [],
    userTimezone = 'UTC',
    userPriorities = ['Deadlines', 'Decisions', 'Commitments'],
    correctionHints = [],
  } = req.body || {};

  const job = createJob('Gmail Mailbox Sync & Analysis', 'gmail');
  res.json({ jobId: job.id });

  (async () => {
    try {
      updateJob(job.id, {
        status: 'Processing',
        progress: 10,
        message: 'Connecting to Gmail API (non-spam, non-trash)...',
      });

      const syncRes = await syncGmailMessages(token, {
        maxMessages,
        afterDate,
        beforeDate,
        startHistoryId,
        existingIds,
        onProgress: (progress, message) => updateJob(job.id, { status: 'Processing', progress, message }),
      });

      const analyzedEmails: any[] = [];
      const geminiReady = isGeminiConfigured();

      for (let i = 0; i < syncRes.messages.length; i++) {
        const msg = syncRes.messages[i];
        const pct = 65 + Math.round(((i + 1) / Math.max(1, syncRes.messages.length)) * 30);
        updateJob(job.id, {
          status: 'Processing',
          progress: pct,
          message: `Analyzing email ${i + 1} of ${syncRes.messages.length}: ${msg.subject.slice(0, 40)}`,
        });

        if (geminiReady) {
          try {
            const analysis = await analyzeEmailWithGemini({
              from: `${msg.from} <${msg.fromEmail}>`,
              subject: msg.subject,
              date: msg.date,
              body: msg.body,
              labels: msg.labels,
              userTimezone,
              userPriorities,
              correctionHints,
            });
            analyzedEmails.push({
              ...msg,
              ...analysis,
            });
            continue;
          } catch (aiErr: any) {
            // Fall back cleanly per message if rate-limited, preserving email metadata
            analyzedEmails.push({
              ...msg,
              importanceScore: 50,
              importanceCategory: scoreToImportanceCategory(50),
              urgency: 'Medium',
              importanceReason: `AI analysis fallback (${aiErr?.message || 'retry later'}).`,
              shortSummary: msg.preview,
              actionRequired: 'Review email content',
              requiresReply: false,
              emailCategory: 'Important emails',
              extractedItems: [],
            });
            continue;
          }
        } else {
          analyzedEmails.push({
            ...msg,
            importanceScore: 45,
            importanceCategory: 'Low',
            urgency: 'Low',
            importanceReason: 'GEMINI_API_KEY not configured on server; raw email synced.',
            shortSummary: msg.preview,
            actionRequired: 'None',
            requiresReply: false,
            emailCategory: 'Important emails',
            extractedItems: [],
          });
        }
      }

      const needsConfirmation = analyzedEmails.some((em) =>
        em.extractedItems?.some((it: ExtractedIntelligenceItem) => it.deadline?.needsConfirmation)
      );

      updateJob(job.id, {
        status: needsConfirmation ? 'Needs attention' : 'Completed',
        progress: 100,
        message: `Synced ${analyzedEmails.length} emails (${syncRes.skippedDuplicates} duplicates skipped).`,
        result: {
          emailAddress: syncRes.emailAddress,
          historyId: syncRes.historyId,
          syncMode: syncRes.syncMode,
          skippedDuplicates: syncRes.skippedDuplicates,
          emails: analyzedEmails,
        },
      });
    } catch (err: any) {
      updateJob(job.id, {
        status: 'Failed',
        progress: 100,
        message: err?.message || 'Gmail synchronization failed.',
        error: err?.message || 'Gmail synchronization failed.',
      });
    }
  })();
});

router.post('/calendar/sync', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing Google access token.' });
    return;
  }
  try {
    const { timeMin, timeMax } = req.body || {};
    const events = await fetchGoogleCalendarEvents(token, { timeMin, timeMax });
    res.json({ events });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Calendar sync failed.' });
  }
});

router.post('/ingest/whatsapp/preview', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No WhatsApp export file uploaded.' });
    return;
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.txt' && ext !== '.zip') {
    res.status(400).json({ error: 'WhatsApp import accepts .txt chat exports or .zip archives.' });
    return;
  }

  try {
    if (ext === '.txt') {
      const parsed = parseWhatsAppText(file.buffer.toString('utf8'), file.originalname);
      res.json({
        preview: {
          groupName: parsed.groupName,
          participants: parsed.participants,
          messageCount: parsed.messageCount,
          dateRange: parsed.dateRange,
          mediaCount: 0,
          mediaFiles: [],
          sampleMessages: parsed.messages.slice(-12),
          messages: parsed.messages.slice(-250),
          rawText: parsed.rawText.slice(0, 48000),
          attachments: [],
        },
      });
      return;
    }

    const zipParsed = await parseWhatsAppZip(file.buffer, file.originalname);
    res.json({
      preview: {
        groupName: zipParsed.groupName,
        participants: zipParsed.participants,
        messageCount: zipParsed.messageCount,
        dateRange: zipParsed.dateRange,
        mediaCount: zipParsed.attachments.length,
        mediaFiles: zipParsed.attachments.map((a) => ({
          filename: a.filename,
          kind: a.kind,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
        })),
        sampleMessages: zipParsed.messages.slice(-12),
        messages: zipParsed.messages.slice(-250),
        rawText: zipParsed.rawText.slice(0, 48000),
        attachments: zipParsed.attachments,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to parse WhatsApp export.' });
  }
});

router.post('/ingest/whatsapp/analyze', async (req, res) => {
  const {
    groupName = 'Imported WhatsApp Group',
    rawText = '',
    includeMedia = true,
    attachments = [],
    userTimezone = 'UTC',
  } = req.body || {};

  if (!rawText.trim() && (!Array.isArray(attachments) || attachments.length === 0)) {
    res.status(400).json({ error: 'No chat text or media provided for analysis.' });
    return;
  }

  const job = createJob(`WhatsApp: ${groupName}`, 'whatsapp');
  res.json({ jobId: job.id });

  (async () => {
    try {
      updateJob(job.id, {
        status: 'Processing',
        progress: 20,
        message: `Analyzing messages in "${groupName}"...`,
      });

      if (!isGeminiConfigured()) {
        throw new Error('Server GEMINI_API_KEY is not configured.');
      }

      const referenceDate = new Date().toISOString().slice(0, 10);
      const chatRes = await analyzeTextBatchWithGemini({
        sourceName: `WhatsApp · ${groupName}`,
        sourceKind: 'WhatsApp Export',
        content: rawText,
        userTimezone,
        referenceDate,
      });

      const allItems = [...chatRes.extractedItems];
      const mediaSummaries: Array<{ filename: string; summary: string; ocrText?: string }> = [];

      if (includeMedia && Array.isArray(attachments) && attachments.length > 0) {
        const images = attachments.filter((a: any) => a.kind === 'image').slice(0, 4);
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          updateJob(job.id, {
            status: 'Processing',
            progress: 55 + Math.round(((i + 1) / images.length) * 35),
            message: `Analyzing attachment ${img.filename}...`,
          });
          const imgRes = await analyzeImageWithGemini({
            fileName: img.filename,
            mimeType: img.mimeType,
            base64Data: img.base64Data,
            userTimezone,
          });
          mediaSummaries.push({
            filename: img.filename,
            summary: imgRes.summary,
            ocrText: imgRes.ocrText,
          });
          allItems.push(...imgRes.extractedItems);
        }
      }

      const needsAttention = allItems.some((it) => it.deadline?.needsConfirmation);
      updateJob(job.id, {
        status: needsAttention ? 'Needs attention' : 'Completed',
        progress: 100,
        message: `Extracted ${allItems.length} important items from ${groupName}.`,
        result: {
          groupName,
          summary: chatRes.summary,
          extractedItems: allItems,
          mediaSummaries,
        },
      });
    } catch (err: any) {
      updateJob(job.id, {
        status: 'Failed',
        progress: 100,
        message: err?.message || 'WhatsApp analysis failed.',
        error: err?.message || 'WhatsApp analysis failed.',
      });
    }
  })();
});

router.post('/ingest/media', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file provided.' });
    return;
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    res.status(400).json({ error: `Unsupported file type (${ext}).` });
    return;
  }

  const userTimezone = String(req.body?.userTimezone || 'UTC');
  const isImage = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
  const isAudio = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'].includes(ext);
  const isVideo = ['.mp4', '.mov', '.webm'].includes(ext);
  const kind = isImage ? 'image' : isAudio ? 'audio' : isVideo ? 'video' : 'document';

  const job = createJob(file.originalname, kind);
  res.json({ jobId: job.id });

  (async () => {
    try {
      if (!isGeminiConfigured()) {
        throw new Error('Server GEMINI_API_KEY is not configured.');
      }
      updateJob(job.id, {
        status: 'Processing',
        progress: 25,
        message: `Processing ${file.originalname} (${kind})...`,
      });

      const base64Data = file.buffer.toString('base64');
      let result: any;

      if (isImage) {
        result = await analyzeImageWithGemini({
          fileName: file.originalname,
          mimeType: file.mimetype || 'image/png',
          base64Data,
          userTimezone,
        });
      } else if (isAudio) {
        updateJob(job.id, {
          status: 'Processing',
          progress: 40,
          message: `Transcribing audio with speech-to-text...`,
        });
        result = await analyzeAudioWithGemini({
          fileName: file.originalname,
          mimeType: file.mimetype || 'audio/mpeg',
          base64Data,
          userTimezone,
        });
      } else if (isVideo) {
        updateJob(job.id, {
          status: 'Processing',
          progress: 40,
          message: `Extracting audio transcript and key video frames...`,
        });
        result = await analyzeVideoWithGemini({
          fileName: file.originalname,
          mimeType: file.mimetype || 'video/mp4',
          base64Data,
          userTimezone,
        });
      } else if (ext === '.pdf') {
        result = await analyzePdfDocumentWithGemini({
          fileName: file.originalname,
          base64Data,
          userTimezone,
        });
      } else if (ext === '.docx') {
        const text = await extractDocxText(file.buffer);
        result = await analyzeTextBatchWithGemini({
          sourceName: file.originalname,
          sourceKind: 'Document',
          content: text,
          userTimezone,
          referenceDate: new Date().toISOString().slice(0, 10),
        });
      } else {
        const text = file.buffer.toString('utf8');
        result = await analyzeTextBatchWithGemini({
          sourceName: file.originalname,
          sourceKind: 'Document',
          content: text,
          userTimezone,
          referenceDate: new Date().toISOString().slice(0, 10),
        });
      }

      const items: ExtractedIntelligenceItem[] = result.extractedItems || [];
      const needsAttention = items.some((it) => it.deadline?.needsConfirmation);

      updateJob(job.id, {
        status: needsAttention ? 'Needs attention' : 'Completed',
        progress: 100,
        message: `Analyzed ${file.originalname}: ${items.length} important items discovered.`,
        result: {
          kind,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          ...result,
        },
      });
    } catch (err: any) {
      updateJob(job.id, {
        status: 'Failed',
        progress: 100,
        message: err?.message || `Failed to analyze ${file.originalname}`,
        error: err?.message || `Failed to analyze ${file.originalname}`,
      });
    }
  })();
});

router.post('/ai/ask', async (req, res) => {
  const { question, contextSnapshot } = req.body || {};
  if (!question || typeof question !== 'string') {
    res.status(400).json({ error: 'Question is required.' });
    return;
  }
  if (!isGeminiConfigured()) {
    res.status(503).json({
      error: 'GEMINI_API_KEY not configured on server.',
      fallbackAvailable: true,
    });
    return;
  }

  try {
    const answer = await askLivingMemoryWithGemini({
      question,
      contextSnapshot: contextSnapshot || {
        userTimezone: 'UTC',
        connectedSourcesSummary: [],
        memories: [],
        emails: [],
        deadlines: [],
        conflicts: [],
      },
    });
    res.json(answer);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'AI synthesis failed.' });
  }
});

export default router;
