import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  FileAudio,
  FileText,
  FileUp,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  MessageSquareText,
  UploadCloud,
  X,
} from 'lucide-react';
import { useLivingMemory } from '../../context/LivingMemoryContext';
import { previewWhatsAppExport } from '../../services/backendApi';

type ImportCategory = 'whatsapp' | 'image' | 'audio' | 'video' | 'document';

const IMPORT_TABS: Array<{
  id: ImportCategory;
  label: string;
  accept: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'whatsapp',
    label: 'WhatsApp (.txt / .zip)',
    accept: '.txt,.zip',
    hint: 'Upload an exported WhatsApp .txt chat or .zip archive containing chat text and media.',
    icon: MessageSquareText,
  },
  {
    id: 'image',
    label: 'Images & Screenshots',
    accept: '.png,.jpg,.jpeg,.webp',
    hint: 'Screenshots, notice photos, receipts, bills, or whiteboard photos (.png, .jpg, .webp).',
    icon: ImageIcon,
  },
  {
    id: 'audio',
    label: 'Audio',
    accept: '.mp3,.wav,.m4a,.aac,.ogg',
    hint: 'Voice notes or meeting recordings (.mp3, .wav, .m4a, .aac, .ogg).',
    icon: FileAudio,
  },
  {
    id: 'video',
    label: 'Video',
    accept: '.mp4,.mov,.webm',
    hint: 'Lecture clips, recorded meetings, or screen recordings (.mp4, .mov, .webm).',
    icon: FileVideo,
  },
  {
    id: 'document',
    label: 'Documents & PDFs',
    accept: '.pdf,.docx,.txt',
    hint: 'Syllabi, official circulars, specs, or notes (.pdf, .docx, .txt).',
    icon: FileText,
  },
];

export const QuickUploadModal: React.FC = () => {
  const {
    uploadModalOpen,
    setUploadModalOpen,
    uploadAndAnalyzeMedia,
    analyzeWhatsAppExportJob,
    backendHealth,
  } = useLivingMemory();

  const [tab, setTab] = useState<ImportCategory>('whatsapp');
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  // WhatsApp preview state before analysis
  const [waFile, setWaFile] = useState<File | null>(null);
  const [waPreview, setWaPreview] = useState<{
    groupName: string;
    participants: string[];
    messageCount: number;
    dateRange: string;
    mediaCount: number;
    sampleMessages: Array<{ timestamp: string; sender: string; content: string }>;
    rawText: string;
    attachments: any[];
  } | null>(null);
  const [waGroupNameEdit, setWaGroupNameEdit] = useState('');
  const [includeMedia, setIncludeMedia] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  if (!uploadModalOpen) return null;

  const activeTabMeta = IMPORT_TABS.find((t) => t.id === tab)!;

  const resetModalState = () => {
    setErrorMsg(null);
    setDoneMsg(null);
    setWaFile(null);
    setWaPreview(null);
    setBusy(false);
  };

  const handleClose = () => {
    resetModalState();
    setUploadModalOpen(false);
  };

  const handleFileSelected = async (file: File) => {
    setErrorMsg(null);
    setDoneMsg(null);

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File exceeds 25 MB upload limit. Please select a smaller file.');
      return;
    }

    const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    if (tab === 'whatsapp') {
      if (ext !== '.txt' && ext !== '.zip') {
        setErrorMsg('WhatsApp import expects an exported .txt chat file or .zip archive.');
        return;
      }
      setBusy(true);
      try {
        const preview = await previewWhatsAppExport(file);
        setWaFile(file);
        setWaPreview(preview);
        setWaGroupNameEdit(preview.groupName);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Unable to read WhatsApp export.');
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const res = await uploadAndAnalyzeMedia(file);
      if (res) {
        setDoneMsg(
          `Analyzed "${file.name}" (${res.extractedMemoriesCount} items discovered). View details inside My Information.`
        );
      } else {
        setErrorMsg('Analysis did not complete. Check server configuration or file format.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleStartWhatsAppAnalysis = async () => {
    if (!waPreview || !waFile) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await analyzeWhatsAppExportJob({
        groupName: waGroupNameEdit.trim() || waPreview.groupName,
        messageCount: waPreview.messageCount,
        participants: waPreview.participants,
        rawText: waPreview.rawText,
        includeMedia,
        attachments: waPreview.attachments,
        fileSize: waFile.size,
        isZip: waFile.name.toLowerCase().endsWith('.zip'),
        sampleMessages: waPreview.sampleMessages,
      });
      setDoneMsg(
        `Analyzed "${waGroupNameEdit || waPreview.groupName}" (${waPreview.messageCount} messages).`
      );
      setWaPreview(null);
      setWaFile(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'WhatsApp analysis failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#202124]/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Import information"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-[#DADCE0] bg-[#FFFFFF] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#202124]">Import Information</h2>
            <p className="mt-0.5 text-xs text-[#5F6368]">
              Upload WhatsApp exports, screenshots, photos, audio recordings, videos, or documents for AI extraction.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[#5F6368] hover:bg-[#F8F9FA]"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {IMPORT_TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  resetModalState();
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]/30'
                    : 'border border-[#DADCE0] bg-[#FFFFFF] text-[#5F6368] hover:bg-[#F8F9FA]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {!backendHealth?.geminiConfigured && (
          <div className="mt-4 rounded-xl bg-[#FEF7E0] px-3.5 py-2.5 text-xs text-[#B06000]">
            Gemini AI: Not configured. Files and WhatsApp chats are stored and parsed locally; add <span className="font-mono">GEMINI_API_KEY</span> in <span className="font-mono">.env</span> later for AI extraction.
          </div>
        )}

        {/* Dropzone (unless WhatsApp preview is open) */}
        {!waPreview && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelected(file);
            }}
            className={`mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition-colors ${
              dragOver
                ? 'border-[#1A73E8] bg-[#E8F0FE]'
                : 'border-[#DADCE0] bg-[#F8F9FA]'
            }`}
          >
            {busy ? (
              <Loader2 className="h-8 w-8 animate-spin text-[#1A73E8]" />
            ) : (
              <UploadCloud className="h-8 w-8 text-[#1A73E8]" />
            )}
            <p className="mt-3 text-sm font-medium text-[#202124]">
              {busy ? 'Uploading and analyzing...' : 'Drop file here or choose from your device'}
            </p>
            <p className="mt-1 max-w-md text-xs text-[#5F6368]">{activeTabMeta.hint}</p>

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={activeTabMeta.accept}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1A73E8] px-4 py-2 text-xs font-medium text-white hover:bg-[#1765CC] disabled:opacity-50"
            >
              <FileUp className="h-3.5 w-3.5" />
              Select File
            </button>
          </div>
        )}

        {/* WhatsApp Preview & Selection Step */}
        {waPreview && (
          <div className="mt-4 rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-md bg-[#CEEAD6] px-2 py-0.5 text-[11px] font-medium text-[#137333]">
                WhatsApp Export Ready
              </span>
              <span className="font-mono text-[11px] text-[#5F6368]">
                {waPreview.messageCount} messages · {waPreview.participants.length} participants
                {waPreview.mediaCount > 0 ? ` · ${waPreview.mediaCount} media files` : ''}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5F6368]">Group Name</label>
              <input
                type="text"
                value={waGroupNameEdit}
                onChange={(e) => setWaGroupNameEdit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#202124]"
              />
            </div>

            <div>
              <div className="text-xs font-medium text-[#5F6368]">
                Detected Participants ({waPreview.participants.length})
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {waPreview.participants.slice(0, 12).map((p) => (
                  <span
                    key={p}
                    className="rounded-md border border-[#DADCE0] bg-[#FFFFFF] px-2 py-0.5 text-[11px] text-[#202124]"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {waPreview.sampleMessages.length > 0 && (
              <div>
                <div className="text-xs font-medium text-[#5F6368]">Recent Messages Preview</div>
                <div className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-[#DADCE0] bg-[#FFFFFF] p-2.5 space-y-1.5 text-xs">
                  {waPreview.sampleMessages.slice(0, 5).map((m, idx) => (
                    <div key={idx} className="text-[#202124]">
                      <span className="font-semibold">{m.sender}: </span>
                      <span className="text-[#5F6368]">{m.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {waPreview.mediaCount > 0 && (
              <label className="flex items-center gap-2 text-xs text-[#202124] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                  className="accent-[#1A73E8]"
                />
                Include {waPreview.mediaCount} media attachments (images/screenshots) in AI analysis
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetModalState}
                className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#5F6368]"
              >
                Choose Another File
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleStartWhatsAppAnalysis}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1765CC] disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Start Analysis
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 rounded-lg bg-[#FCE8E6] px-3.5 py-2.5 text-xs text-[#C5221F]">
            {errorMsg}
          </div>
        )}

        {doneMsg && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[#CEEAD6] px-3.5 py-2.5 text-xs text-[#137333]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{doneMsg}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-[#DADCE0] pt-4 text-xs">
          <span className="text-[#80868B]">
            User-authorized uploads only · original files never silently altered
          </span>
          <button
            type="button"
            onClick={() => {
              handleClose();
              navigate('/information');
            }}
            className="font-medium text-[#1A73E8] hover:underline whitespace-nowrap shrink-0"
          >
            Go to My Information
          </button>
        </div>
      </div>
    </div>
  );
};
