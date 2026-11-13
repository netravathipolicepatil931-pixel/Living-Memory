import React, { useEffect, useState } from 'react';
import { Copy, Download, FileText } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

interface HandoverSections {
  projectOverview: string;
  currentStatus: string;
  keyPeople: string;
  decisionsMade: string;
  timelineEvolution: string;
  completedWork: string;
  pendingCommitments: string;
  upcomingDeadlines: string;
  openQuestions: string;
  activeConflicts: string;
  importantResources: string;
  recommendedNextSteps: string;
}

const SECTION_LABELS: Array<{ key: keyof HandoverSections; title: string }> = [
  { key: 'projectOverview', title: '01 · Project Overview' },
  { key: 'currentStatus', title: '02 · Current Status' },
  { key: 'keyPeople', title: '03 · Key People & Roles' },
  { key: 'decisionsMade', title: '04 · Decisions Made' },
  { key: 'timelineEvolution', title: '05 · Timeline & Date Evolution' },
  { key: 'completedWork', title: '06 · Completed Work' },
  { key: 'pendingCommitments', title: '07 · Pending Commitments' },
  { key: 'upcomingDeadlines', title: '08 · Upcoming Deadlines' },
  { key: 'openQuestions', title: '09 · Open Questions' },
  { key: 'activeConflicts', title: '10 · Active Conflicts & Warnings' },
  { key: 'importantResources', title: '11 · Important Resources & Documents' },
  { key: 'recommendedNextSteps', title: '12 · Recommended Next Steps' },
];

export const ProjectHandover: React.FC = () => {
  const {
    projects,
    entities,
    decisions,
    commitments,
    questions,
    conflicts,
    sources,
    pushToast,
  } = useLivingMemory();

  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || 'proj-ai-assistant');
  const [editMode, setEditMode] = useState(false);

  const project = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const buildSections = (): HandoverSections => {
    const projectPeople = entities
      .filter((e) => project.memberIds.includes(e.id))
      .map((e) => `${e.name} (${e.role})`)
      .join('; ');
    const projectCommitments = commitments.filter((c) => c.projectId === project.id);

    return {
      projectOverview: `${project.name}: ${project.summary}`,
      currentStatus: `Status: ${project.status}. Next milestone: ${project.nextMilestone} on ${project.nextMilestoneDate}. Risk note: ${project.riskSummary}`,
      keyPeople: projectPeople || 'Alex, Sarah, Rahul, Professor Meera',
      decisionsMade: decisions
        .map((d) => `${d.title}: ${d.finalChoice} (${d.sourceName}, ${d.date})`)
        .join('\n'),
      timelineEvolution:
        selectedProjectId === 'proj-ai-assistant'
          ? 'Assignment deadline shifted 3 times: Nov 15 (Class Discussion) → Nov 18 (AI Project Team) → Nov 20, 23:59 (Official College Announcements & Academic Office Gmail). Team meeting moved to Nov 15, 16:30 in Library Room B.'
          : '15-minute rolling calibration model finalized Oct 28; Showcase presentation scheduled Nov 22 at 10:00 AM in Auditorium B.',
      completedWork:
        projectCommitments
          .filter((c) => c.status === 'Completed')
          .map((c) => `• ${c.title} (${c.owner})`)
          .join('\n') || '• Initial architecture schema & rubric indexing completed.',
      pendingCommitments:
        projectCommitments
          .filter((c) => c.status !== 'Completed')
          .map((c) => `• [${c.status}] ${c.title} — ${c.owner} (due ${c.dueDate})`)
          .join('\n') || 'None open.',
      upcomingDeadlines: `• ${project.nextMilestone} (${project.nextMilestoneDate})\n• Final Assignment Submission (Nov 20, 23:59)`,
      openQuestions: questions.map((q) => `• [${q.status}] ${q.question} (${q.askedBy})`).join('\n'),
      activeConflicts:
        conflicts.map((c) => `• [${c.status}] ${c.title}: ${c.suggestedResolution}`).join('\n') ||
        'No unresolved conflicts.',
      importantResources: sources.map((s) => `• ${s.name} (${s.type})`).join('\n'),
      recommendedNextSteps:
        '1. Confirm slide deck draft link from Sarah before Nov 16.\n2. Update stale Nov 15 Google Calendar assignment block to Nov 20.\n3. Verify Auditorium B dual-HDMI output with Facilities.',
    };
  };

  const [sections, setSections] = useState<HandoverSections>(buildSections);

  useEffect(() => {
    setSections(buildSections());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const toMarkdown = () =>
    `# ${project.name} — Handover Brief\n\n` +
    SECTION_LABELS.map((s) => `## ${s.title}\n${sections[s.key]}\n`).join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown());
      pushToast('Handover summary copied to clipboard', 'success');
    } catch {
      pushToast('Clipboard unavailable in browser context', 'warning');
    }
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    pushToast(`Downloaded ${filename}`, 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 35 · Project Handover Generator"
        title="12-Section Structured Handover Brief"
        subtitle="Compile verified project decisions, timeline shifts, open questions, risks, and pending promises into an editable briefing."
        actions={
          <>
            <button
              onClick={() => setEditMode((p) => !p)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)]"
            >
              {editMode ? 'Preview Brief' : 'Edit Sections'}
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)]"
            >
              <Copy className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
              Copy Summary
            </button>
            <button
              onClick={() =>
                downloadFile(toMarkdown(), `${project.id}-handover.md`, 'text/markdown')
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-gold)] px-3.5 py-2 text-xs font-semibold text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Export .MD
            </button>
            <button
              onClick={() =>
                downloadFile(
                  JSON.stringify({ project: project.name, sections }, null, 2),
                  `${project.id}-handover.json`,
                  'application/json'
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)]"
            >
              Export JSON
            </button>
          </>
        }
      />

      {/* Project Picker */}
      <div className="flex flex-wrap items-center gap-3">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProjectId(p.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
              selectedProjectId === p.id
                ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <FileText className="h-4 w-4" />
            {p.name} ({p.status})
          </button>
        ))}
      </div>

      {/* 12 Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {SECTION_LABELS.map((sec) => (
          <div
            key={sec.key}
            className="ws-card rounded-xl p-5"
          >
            <div className="text-xs font-semibold text-[var(--accent-primary)]">{sec.title}</div>
            {editMode ? (
              <textarea
                rows={4}
                value={sections[sec.key]}
                onChange={(e) =>
                  setSections((prev) => ({ ...prev, [sec.key]: e.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2.5 text-xs text-[var(--text-primary)]"
              />
            ) : (
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[var(--text-primary)]">
                {sections[sec.key]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
