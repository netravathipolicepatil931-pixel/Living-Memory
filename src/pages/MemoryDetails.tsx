import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  FileWarning,
  GitCommitHorizontal,
  MessageSquarePlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { getSourcePastelClass, getStatusPastelClass } from '../utils/categoryColors';

export const MemoryDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    memories,
    entities,
    verifyMemory,
    correctMemoryInterpretation,
    addMemoryNote,
    deleteMemory,
  } = useLivingMemory();

  const memory = memories.find((m) => m.id === id);

  const [editing, setEditing] = useState(false);
  const [correctedText, setCorrectedText] = useState(memory?.currentInformation || '');
  const [correctionReason, setCorrectionReason] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!memory) {
    return (
        <EmptyState
          icon={FileWarning}
          title="Memory record not found"
          description="This memory may have been deleted or archived in your current workspace."
          actionLabel="Back to My Memories"
          onAction={() => navigate('/memories')}
        />
      );
    }

  const relatedPeople = entities.filter((e) => memory.relatedPeopleIds.includes(e.id));

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctedText.trim()) return;
    correctMemoryInterpretation(memory.id, correctedText.trim(), correctionReason.trim());
    setEditing(false);
    setCorrectionReason('');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    addMemoryNote(memory.id, noteInput);
    setNoteInput('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/memories"
          className="inline-flex items-center gap-1.5 text-xs text-[#5F6368] hover:text-[#202124]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Memories
        </Link>
      </div>

      <PageHeader
        title={memory.title}
        subtitle={memory.description}
        actions={
          <>
            {memory.verificationStatus !== 'Verified' && (
              <button
                onClick={() => verifyMemory(memory.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--pastel-green)] px-3.5 py-2 text-xs font-semibold text-[var(--ink-green)] hover:opacity-90"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verify Memory
              </button>
            )}
            <button
              onClick={() => {
                setCorrectedText(memory.currentInformation);
                setEditing((p) => !p);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            >
              <Pencil className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
              Correct AI Interpretation
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--status-danger)]/40 bg-[var(--bg-card)] px-3.5 py-2 text-xs font-medium text-[var(--status-danger)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </>
        }
      />

      {/* Current Interpretation + Event vs Recorded */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="ws-card lg:col-span-8 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[var(--accent-primary)]">
              Current Authoritative State
            </span>
            <span className={`rounded-full px-2.5 py-0.5 font-medium ${getStatusPastelClass(memory.verificationStatus)}`}>
              {memory.verificationStatus} · {memory.confidence} Confidence
            </span>
          </div>

          <p className="text-sm leading-relaxed text-[var(--text-primary)]">
            {memory.currentInformation}
          </p>

          {editing && (
            <form
              onSubmit={handleSaveCorrection}
              className="space-y-3 rounded-xl border border-[var(--accent-gold)]/50 bg-[var(--bg-secondary)] p-4"
            >
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Append Corrected Interpretation (preserves old versions)
              </div>
              <textarea
                rows={3}
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
              />
              <input
                type="text"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Reason for correction (e.g., Confirmed with Professor Meera)"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--accent-gold)] px-3.5 py-1.5 text-xs font-semibold text-white"
                >
                  Save Verified Version
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-[var(--border-subtle)] px-3.5 py-1.5 text-xs text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-3 sm:grid-cols-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5 text-xs">
            <div>
              <div className="text-[11px] text-[var(--text-muted)]">Event Time</div>
              <div className="mt-0.5 font-mono text-[var(--text-primary)]">{memory.eventTime}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-muted)]">Recorded Time</div>
              <div className="mt-0.5 font-mono text-[var(--text-primary)]">
                {memory.recordedTime}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-muted)]">Primary Source</div>
              <div className="mt-0.5 text-[var(--text-primary)]">{memory.sourceName}</div>
            </div>
          </div>
        </div>

        <div className="ws-card lg:col-span-4 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">People Involved</h3>
          <div className="space-y-2">
            {relatedPeople.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2.5 text-xs"
              >
                <div className="font-medium text-[var(--text-primary)]">{p.name}</div>
                <div className="text-[11px] text-[var(--text-secondary)]">{p.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Provenance Evidence & Version History */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ws-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Source Evidence ({memory.evidence.length})
          </h3>
          <div className="mt-3 space-y-3">
            {memory.evidence.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5 text-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${getSourcePastelClass(ev.sourceType)}`}>
                    {ev.sourceName} · {ev.sourceType}
                  </span>
                  <span className="font-mono">{ev.recordedTime}</span>
                </div>
                <p className="mt-1.5 leading-relaxed text-[var(--text-primary)]">“{ev.excerpt}”</p>
                <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                  Author: {ev.author} · Event time: {ev.eventTime}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ws-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <GitCommitHorizontal className="h-4 w-4 text-[var(--accent-primary)]" />
            Append-Only Version History ({memory.versions.length})
          </div>
          <div className="space-y-2.5">
            {memory.versions.map((v) => (
              <div
                key={v.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-[var(--accent-gold)]">
                    v{v.version} · {v.status}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">
                    {v.recordedTime}
                  </span>
                </div>
                <div className="mt-1 font-medium text-[var(--text-primary)]">{v.value}</div>
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                  {v.summary} — {v.reason} ({v.sourceName})
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-4">
            <h4 className="text-xs font-semibold text-[var(--text-primary)]">User Notes</h4>
            <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-secondary)]">
              {memory.userNotes.length === 0 ? (
                <li className="text-[var(--text-muted)]">No personal notes added yet.</li>
              ) : (
                memory.userNotes.map((n, idx) => (
                  <li
                    key={idx}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
                  >
                    {n}
                  </li>
                ))
              )}
            </ul>
            <form onSubmit={handleAddNote} className="mt-3 flex gap-2">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add personal annotation..."
                className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-gold)] px-3 py-2 text-xs font-semibold text-white"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                Add Note
              </button>
            </form>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete memory from local store?"
        description="This removes the memory card and its version trace from your current local demo workspace."
        confirmLabel="Delete Memory"
        destructive
        onConfirm={() => {
          deleteMemory(memory.id);
          navigate('/memories');
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
};
