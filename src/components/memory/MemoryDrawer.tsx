import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  GitCommitHorizontal,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useLivingMemory } from '../../context/LivingMemoryContext';
import {
  getCategoryPastelClass,
  getImportancePastelClass,
  getStatusPastelClass,
} from '../../utils/categoryColors';

export const MemoryDrawer: React.FC = () => {
  const { drawerMemoryId, closeMemoryDrawer, memories, entities, sources, verifyMemory } =
    useLivingMemory();
  const navigate = useNavigate();

  const memory = memories.find((m) => m.id === drawerMemoryId);
  if (!memory) return null;

  const relatedPeople = entities.filter((e) => memory.relatedPeopleIds.includes(e.id));
  const sourceRecord = sources.find((s) => s.id === memory.sourceId);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[#202124]/35 backdrop-blur-[1px]">
      <div
        className="flex h-full w-full max-w-lg flex-col border-l border-[#DADCE0] bg-[#FFFFFF] shadow-xl"
        role="dialog"
        aria-label="Memory details drawer"
      >
        <div className="flex items-center justify-between border-b border-[#DADCE0] px-6 py-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-md px-2 py-0.5 font-medium ${getCategoryPastelClass(memory.category)}`}>
              {memory.category}
            </span>
            {memory.importanceScore !== undefined && (
              <span
                className={`rounded-md px-2 py-0.5 font-mono font-medium tabular-nums ${getImportancePastelClass(
                  memory.importanceCategory || 'Medium'
                )}`}
              >
                {memory.importanceScore}/100 · {memory.importanceCategory}
              </span>
            )}
            <span
              className={`rounded-md px-2 py-0.5 font-medium ${getStatusPastelClass(
                memory.verificationStatus
              )}`}
            >
              {memory.verificationStatus}
            </span>
          </div>
          <button
            onClick={closeMemoryDrawer}
            className="rounded-lg p-1.5 text-[#5F6368] hover:bg-[#F8F9FA]"
            aria-label="Close memory drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-[#80868B]">
              <span>{memory.dataOrigin === 'Live' ? 'Imported Live Data' : 'Sample Demo Data'}</span>
              {memory.urgency && <span>· Urgency: {memory.urgency}</span>}
            </div>
            <h2 className="mt-1 font-serif-editorial text-xl text-[#202124] leading-snug">
              {memory.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5F6368]">{memory.description}</p>
          </div>

          <div className="rounded-xl border border-[#DADCE0] bg-[#E8F0FE]/60 p-4">
            <div className="text-xs font-semibold text-[#1A73E8]">
              Current Supported Information
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-[#202124]">
              {memory.currentInformation}
            </p>
            {memory.importanceReason && (
              <p className="mt-2 text-xs text-[#5F6368]">
                <strong className="text-[#202124]">Why important: </strong>
                {memory.importanceReason}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-[#DADCE0] py-4 text-xs">
            <div>
              <span className="text-[#80868B]">Event Time</span>
              <p className="mt-1 font-mono tabular-nums text-[#202124]">{memory.eventTime}</p>
            </div>
            <div>
              <span className="text-[#80868B]">Recorded Time</span>
              <p className="mt-1 font-mono tabular-nums text-[#202124]">{memory.recordedTime}</p>
            </div>
            <div className="col-span-2">
              <span className="text-[#80868B]">Primary Source & Reliability</span>
              <p className="mt-1 flex items-center gap-2 text-[#202124]">
                <FileText className="h-3.5 w-3.5 text-[#1A73E8]" />
                <span className="truncate font-medium">{memory.sourceName}</span>
                {memory.pageOrTimestampRef && (
                  <span className="rounded bg-[#F1F3F4] px-1.5 py-0.5 font-mono text-[10px] text-[#5F6368]">
                    {memory.pageOrTimestampRef}
                  </span>
                )}
              </p>
              {sourceRecord && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#5F6368]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#137333]" />
                  {sourceRecord.verificationState} · {sourceRecord.authorityBasis}
                </p>
              )}
            </div>
          </div>

          {relatedPeople.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#5F6368]">Related People</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {relatedPeople.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => {
                      closeMemoryDrawer();
                      navigate('/memories?tab=people');
                    }}
                    className="flex items-center gap-2 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#202124] hover:bg-[#F8F9FA]"
                  >
                    <span className="rounded bg-[#F3E8FD] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#7627BB]">
                      {person.avatarInitials}
                    </span>
                    <span>{person.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-[#5F6368]">
              Source Evidence ({memory.evidence.length})
            </h3>
            <div className="mt-2.5 space-y-2.5">
              {memory.evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-lg border border-[#DADCE0] bg-[#F8F9FA] p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between text-[#5F6368]">
                    <span className="font-semibold text-[#202124]">{ev.author}</span>
                    <span className="font-mono tabular-nums">{ev.recordedTime}</span>
                  </div>
                  <p className="mt-1.5 leading-relaxed text-[#202124]">{ev.excerpt}</p>
                  <div className="mt-2 text-[11px] text-[#80868B]">
                    {ev.sourceName}
                    {ev.pageOrTimestampRef ? ` · ${ev.pageOrTimestampRef}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#5F6368]">
              Version History ({memory.versions.length})
            </h3>
            <div className="mt-2.5 space-y-2">
              {memory.versions.map((ver) => (
                <div
                  key={ver.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <GitCommitHorizontal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1A73E8]" />
                    <div>
                      <div className="font-medium text-[#202124]">
                        v{ver.version}: {ver.value}
                      </div>
                      <div className="mt-0.5 text-[#5F6368]">{ver.summary}</div>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-[#80868B]">{ver.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#DADCE0] bg-[#FFFFFF] px-6 py-4">
          {memory.verificationStatus !== 'Verified' ? (
            <button
              onClick={() => verifyMemory(memory.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-4 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA] whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#137333]" />
              Mark Verified
            </button>
          ) : (
            <span className="rounded-md bg-[#CEEAD6] px-2.5 py-1 text-xs font-medium text-[#137333]">
              Verified
            </span>
          )}

          <button
            onClick={() => {
              closeMemoryDrawer();
              navigate(`/memories/${memory.id}`);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-4 py-2 text-xs font-medium text-white hover:bg-[#1765CC] whitespace-nowrap shrink-0"
          >
            Open Full Record
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
