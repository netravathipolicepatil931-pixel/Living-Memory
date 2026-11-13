import JSZip from 'jszip';
import mammoth from 'mammoth';

export interface ParsedWhatsAppMessage {
  timestamp: string;
  sender: string;
  content: string;
}

export interface WhatsAppZipAttachment {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: 'image' | 'audio' | 'video' | 'document';
  base64Data: string;
}

export interface WhatsAppParseResult {
  groupName: string;
  participants: string[];
  messageCount: number;
  dateRange: string;
  messages: ParsedWhatsAppMessage[];
  rawText: string;
  attachments: WhatsAppZipAttachment[];
}

const MIME_BY_EXT: Record<string, { mime: string; kind: WhatsAppZipAttachment['kind'] }> = {
  '.jpg': { mime: 'image/jpeg', kind: 'image' },
  '.jpeg': { mime: 'image/jpeg', kind: 'image' },
  '.png': { mime: 'image/png', kind: 'image' },
  '.webp': { mime: 'image/webp', kind: 'image' },
  '.mp3': { mime: 'audio/mpeg', kind: 'audio' },
  '.wav': { mime: 'audio/wav', kind: 'audio' },
  '.m4a': { mime: 'audio/mp4', kind: 'audio' },
  '.aac': { mime: 'audio/aac', kind: 'audio' },
  '.ogg': { mime: 'audio/ogg', kind: 'audio' },
  '.opus': { mime: 'audio/ogg', kind: 'audio' },
  '.mp4': { mime: 'video/mp4', kind: 'video' },
  '.mov': { mime: 'video/quicktime', kind: 'video' },
  '.webm': { mime: 'video/webm', kind: 'video' },
  '.pdf': { mime: 'application/pdf', kind: 'document' },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    kind: 'document',
  },
  '.txt': { mime: 'text/plain', kind: 'document' },
};

export function inferGroupName(filename: string): string {
  const base = filename
    .replace(/\.(txt|zip)$/i, '')
    .replace(/^WhatsApp Chat with /i, '')
    .replace(/^WhatsApp_?/i, '')
    .replace(/_/g, ' ')
    .trim();
  return base || 'Imported WhatsApp Group';
}

export function parseWhatsAppText(text: string, filename: string): Omit<WhatsAppParseResult, 'attachments'> {
  const lines = text.split(/\r?\n/);
  const messages: ParsedWhatsAppMessage[] = [];
  const participantsSet = new Set<string>();

  // Matches both Android ("12/11/2026, 18:10 - Sarah: ...") and iOS ("[12/11/2026, 6:10:12 PM] Sarah: ...")
  const lineRegex =
    /^\[?(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APMapm]{2})?)\]?\s*(?:-|\])?\s*([^:]+):\s*(.+)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(lineRegex);
    if (match) {
      const timestamp = match[1].trim();
      const sender = match[2].trim();
      const content = match[3].trim();
      // Skip WhatsApp system encryption notices
      if (!content.includes('Messages and calls are end-to-end encrypted')) {
        participantsSet.add(sender);
        messages.push({ timestamp, sender, content });
      }
    } else if (messages.length > 0) {
      // Continuation of previous multiline message
      messages[messages.length - 1].content += `\n${line}`;
    }
  }

  const firstTs = messages[0]?.timestamp || 'Unknown';
  const lastTs = messages[messages.length - 1]?.timestamp || 'Unknown';

  return {
    groupName: inferGroupName(filename),
    participants: Array.from(participantsSet),
    messageCount: messages.length,
    dateRange: messages.length > 0 ? `${firstTs} – ${lastTs}` : 'No dated messages found',
    messages,
    rawText: text,
  };
}

export async function parseWhatsAppZip(buffer: Buffer, filename: string): Promise<WhatsAppParseResult> {
  const zip = await JSZip.loadAsync(buffer);
  let chatText = '';
  let chatFileName = filename;
  const attachments: WhatsAppZipAttachment[] = [];

  for (const [entryName, entry] of Object.entries(zip.files)) {
    if (entry.dir || entryName.startsWith('__MACOSX')) continue;
    const lower = entryName.toLowerCase();
    const ext = `.${lower.split('.').pop() || ''}`;

    if (ext === '.txt' && (!chatText || lower.includes('_chat') || lower.includes('whatsapp'))) {
      chatText = await entry.async('string');
      chatFileName = entryName.split('/').pop() || filename;
      continue;
    }

    const mediaMeta = MIME_BY_EXT[ext];
    if (mediaMeta && attachments.length < 12) {
      const bytes = await entry.async('nodebuffer');
      if (bytes.length <= 10 * 1024 * 1024) {
        attachments.push({
          filename: entryName.split('/').pop() || entryName,
          mimeType: mediaMeta.mime,
          sizeBytes: bytes.length,
          kind: mediaMeta.kind,
          base64Data: bytes.toString('base64'),
        });
      }
    }
  }

  const parsed = parseWhatsAppText(chatText, chatFileName);
  return {
    ...parsed,
    groupName: parsed.groupName === '_chat' ? inferGroupName(filename) : parsed.groupName,
    attachments,
  };
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const res = await mammoth.extractRawText({ buffer });
  return res.value || '';
}
