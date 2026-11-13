import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

import { getSourcePastelClass } from '../utils/categoryColors';

export const SourceReliability: React.FC = () => {
  const { sources } = useLivingMemory();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 33 · Source Reliability & Authority Basis"
        title="Source Authority & Verification Center"
        subtitle="Understand why Living Memory trusts an official Academic Office notice or Rubric PDF over informal group speculation—explained transparently without invented AI scores."
      />

      {/* Precedence Ladder */}
      <div className="ws-card rounded-xl p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--pastel-green)] text-[var(--ink-green)]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          Transparent Source Precedence Basis
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4 text-xs">
          {[
            {
              tier: 'Official / Authoritative',
              badge: 'bg-[var(--pastel-green)] text-[var(--ink-green)]',
              desc: 'Faculty emails, College Announcements notices, and signed rubric PDFs override informal estimates.',
            },
            {
              tier: 'Direct Source',
              badge: 'bg-[var(--pastel-blue)] text-[var(--ink-blue)]',
              desc: 'Calendar blocks and whiteboard images reflect direct records—flagged when newer official emails supersede them.',
            },
            {
              tier: 'Peer Discussion',
              badge: 'bg-[var(--pastel-lavender)] text-[var(--ink-lavender)]',
              desc: 'Team WhatsApp exports capture working decisions and promises accurately but remain provisional on external deadlines.',
            },
            {
              tier: 'Personal Note',
              badge: 'bg-[var(--pastel-cyan)] text-[var(--ink-cyan)]',
              desc: 'Your own markdown/text notes preserve intent and calibration baselines unless superseded by later specs.',
            },
          ].map((item) => (
            <div
              key={item.tier}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5"
            >
              <span className={`inline-block rounded-full px-2.5 py-0.5 font-semibold ${item.badge}`}>
                {item.tier}
              </span>
              <p className="mt-2 leading-relaxed text-[var(--text-secondary)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Source Authority Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((src) => (
          <div
            key={src.id}
            className="ws-card rounded-xl p-5 space-y-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className={`rounded-full px-2.5 py-0.5 font-medium ${getSourcePastelClass(src.type)}`}>
                    {src.type}
                  </span>
                  <span className="text-[var(--text-muted)]">{src.verificationState}</span>
                </div>
                <h3 className="mt-1.5 text-sm font-semibold text-[var(--text-primary)] break-all">
                  {src.name}
                </h3>
              </div>
              <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">
                {src.uploadDate}
              </span>
            </div>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-xs">
              <div className="font-medium text-[var(--text-primary)]">Authority Basis</div>
              <p className="mt-1 leading-relaxed text-[var(--text-secondary)]">
                {src.authorityBasis}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>Status: {src.processingStatus}</span>
              <span className="font-mono">{src.extractedMemoriesCount} extracted memories</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
