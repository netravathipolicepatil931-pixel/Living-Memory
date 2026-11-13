import React, { useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { queryDemoContextEngine } from '../services/aiService';
import { queryAskLivingMemoryBackend } from '../services/backendApi';
import { ChatTurn } from '../types/memory';

const SUGGESTED_QUESTIONS = [
  'What are my upcoming deadlines?',
  'Which emails are most important?',
  'What did my professor announce?',
  'What did my project team decide?',
  'Which deadlines changed this week?',
  'Who promised to complete the presentation?',
  'Are there any conflicts between my emails and calendar?',
  'What should I focus on today?',
];

export const AskLivingMemory: React.FC = () => {
  const {
    user,
    memories,
    sources,
    gmailItems,
    deadlines,
    conflicts,
    googleSession,
    backendHealth,
    settings,
    openMemoryDrawer,
  } = useLivingMemory();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'turn-welcome',
      role: 'assistant',
      modeLabel: backendHealth?.geminiConfigured
        ? 'Gemini Grounded Synthesis (Authorized Sources)'
        : 'Demo Context Engine (Sample Data)',
      confidenceLabel: `Grounded across ${sources.length} sources & ${memories.length} memories`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content:
        'Ask any question across your synchronized Gmail emails, WhatsApp exports, images, audio, videos, PDFs, and Google Calendar. Answers always cite source names, original dates, and evidence quotes—and never fabricate missing data.',
      followUps: [
        'What are my upcoming deadlines?',
        'Which emails are most important?',
        'What should I focus on today?',
      ],
    },
  ]);

  const askQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: now,
    };

    setTurns((prev) => [...prev, userTurn]);
    setInput('');
    setLoading(true);

    try {
      if (backendHealth?.geminiConfigured) {
        const connectedSourcesSummary = [
          `Gmail: ${googleSession.connected ? `Connected (${googleSession.email}, ${gmailItems.length} emails)` : `Sample demo (${gmailItems.length} demo emails)`}`,
          `Google Calendar: ${googleSession.connected ? 'Read-only connected' : 'Sample demo'}`,
          ...sources.map((s) => `${s.type}: "${s.name}" (${s.processingStatus}, ${s.dataOrigin || 'Demo'})`),
        ];

        const contextSnapshot = {
          userTimezone: settings.userTimezone,
          connectedSourcesSummary,
          memories: memories
            .filter((m) => m.verificationStatus !== 'Archived')
            .slice(0, 40)
            .map((m) => ({
              id: m.id,
              title: m.title,
              category: m.category,
              currentInformation: m.currentInformation,
              sourceName: m.sourceName,
              sourceType: m.sourceType,
              eventTime: m.eventTime,
              recordedTime: m.recordedTime,
              importanceScore: m.importanceScore,
              evidenceExcerpts: m.evidence.map((e) => e.excerpt),
            })),
          emails: gmailItems.slice(0, 30).map((g) => ({
            id: g.id,
            from: g.from,
            subject: g.subject,
            date: g.date,
            summary: g.shortSummary || g.preview,
            importanceScore: g.importanceScore,
            urgency: g.urgency,
          })),
          deadlines: deadlines.slice(0, 30).map((d) => ({
            title: d.title,
            date: d.date,
            source: d.sourceName,
            status: d.status,
          })),
          conflicts: conflicts.map((c) => ({
            title: c.title,
            status: c.status,
            claims: c.claims.map((cl) => `${cl.sourceName}: ${cl.value}`),
          })),
        };

        const aiRes = await queryAskLivingMemoryBackend({
          question: trimmed,
          contextSnapshot,
        });

        const assistantTurn: ChatTurn = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          modeLabel: 'Gemini Grounded Synthesis (Authorized Sources)',
          confidenceLabel: aiRes.confidenceLabel,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: aiRes.answer,
          relatedMemoryIds: aiRes.citations
            .map((c) => c.memoryId)
            .filter((id): id is string => Boolean(id)),
          peopleMentioned: aiRes.peopleMentioned,
          projectsMentioned: aiRes.projectsMentioned,
          evidenceSnippets: aiRes.citations.map((c) => ({
            sourceName: c.sourceName,
            date: c.date,
            excerpt: c.excerpt,
          })),
          followUps: aiRes.followUps,
        };
        setTurns((prev) => [...prev, assistantTurn]);
        setLoading(false);
        return;
      }
    } catch {
      // Fall back cleanly to deterministic context engine if Gemini endpoint unavailable
    }

    const fallback = await queryDemoContextEngine(trimmed, memories);
    setTurns((prev) => [...prev, fallback]);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ask Living Memory"
        subtitle="Ask questions across all your authorized and processed information with verifiable evidence links."
        demoBanner={
          !backendHealth?.geminiConfigured
            ? 'Gemini API: Not configured — running local deterministic Context Engine on stored records.'
            : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-3">
          <div className="ws-card rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#5E35B1]">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EDE7F6] text-[#5E35B1]">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              Suggested Questions
            </div>
            <div className="mt-3 space-y-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => askQuestion(q)}
                  className="w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 text-left text-xs text-[#202124] hover:bg-[#E8F0FE] hover:border-[#1A73E8]/40 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ws-card lg:col-span-8 flex flex-col rounded-xl">
          <div className="flex-1 space-y-4 p-5 max-h-[620px] overflow-y-auto">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={`rounded-xl border p-4 ${
                  turn.role === 'user'
                    ? 'ml-auto max-w-[85%] border-[#1A73E8]/30 bg-[#E8F0FE]'
                    : 'border-[#DADCE0] bg-[#F8F9FA]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#80868B]">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      turn.role === 'user'
                        ? 'bg-[#FFFFFF] text-[#1A73E8]'
                        : 'bg-[#EDE7F6] text-[#5E35B1]'
                    }`}
                  >
                    {turn.role === 'user'
                      ? user.name
                      : turn.modeLabel || 'LIVING MEMORY Assistant'}
                  </span>
                  <span>
                    {turn.confidenceLabel ? `${turn.confidenceLabel} · ` : ''}
                    {turn.timestamp}
                  </span>
                </div>

                <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#202124]">
                  {turn.content}
                </div>

                {turn.evidenceSnippets && turn.evidenceSnippets.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-[#DADCE0] pt-3">
                    <div className="text-[11px] font-semibold text-[#5F6368]">Cited Evidence</div>
                    {turn.evidenceSnippets.map((ev, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] p-2.5 text-xs"
                      >
                        <div className="flex justify-between text-[11px] text-[#80868B]">
                          <span>{ev.sourceName}</span>
                          <span className="font-mono">{ev.date}</span>
                        </div>
                        <p className="mt-1 italic text-[#202124]">“{ev.excerpt}”</p>
                      </div>
                    ))}
                  </div>
                )}

                {turn.relatedMemoryIds && turn.relatedMemoryIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {turn.relatedMemoryIds.map((memId) => {
                      const mem = memories.find((m) => m.id === memId);
                      if (!mem) return null;
                      return (
                        <button
                          key={memId}
                          onClick={() => openMemoryDrawer(mem.id)}
                          className="rounded-full border border-[#DADCE0] bg-[#FFFFFF] px-3 py-1 text-[11px] font-medium text-[#1A73E8] hover:bg-[#E8F0FE]"
                        >
                          Open Memory: {mem.title}
                        </button>
                      );
                    })}
                  </div>
                )}

                {(turn.peopleMentioned?.length || turn.projectsMentioned?.length) ? (
                  <div className="mt-2.5 text-[11px] text-[#80868B]">
                    {turn.peopleMentioned?.length ? `People: ${turn.peopleMentioned.join(', ')}` : ''}
                    {turn.peopleMentioned?.length && turn.projectsMentioned?.length ? ' · ' : ''}
                    {turn.projectsMentioned?.length ? `Projects: ${turn.projectsMentioned.join(', ')}` : ''}
                  </div>
                ) : null}

                {turn.followUps && turn.followUps.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {turn.followUps.map((f) => (
                      <button
                        key={f}
                        onClick={() => askQuestion(f)}
                        className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-2.5 py-1 text-[11px] text-[#5F6368] hover:text-[#202124]"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#5F6368]">
                <Loader2 className="h-4 w-4 animate-spin text-[#1A73E8]" />
                Searching authorized processed sources...
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              askQuestion(input);
            }}
            className="flex items-center gap-2 border-t border-[#DADCE0] p-4"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about deadlines, emails, screenshots, audio recordings, or decisions..."
              className="flex-1 rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 text-xs text-[#202124] placeholder:text-[#80868B] focus:border-[#1A73E8] focus:bg-[#FFFFFF] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1765CC] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
