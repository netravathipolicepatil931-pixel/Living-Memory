import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Calendar,
  FileText,
  GitBranch,
  History,
  Lock,
  Mail,
  MessageSquareText,
  Moon,
  Network,
  Radar,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { HERO_NETWORK_IMAGE } from '../data/mockData';

const LIFECYCLE_STEPS = [
  {
    step: '01 · COLLECT',
    badgeClass: 'bg-[var(--pastel-green)] text-[var(--ink-green)]',
    title: 'Multi-Source Ingestion',
    detail:
      'Bring together WhatsApp chat exports, Gmail threads, Google Calendar events, PDFs, screenshots, and personal notes into one private context hub.',
  },
  {
    step: '02 · REMEMBER',
    badgeClass: 'bg-[var(--pastel-blue)] text-[var(--ink-blue)]',
    title: 'Event Time vs Recorded Time',
    detail:
      'Every extracted decision, promise, and deadline keeps both when it happened and when it was captured—with full version history.',
  },
  {
    step: '03 · CONNECT',
    badgeClass: 'bg-[var(--pastel-lavender)] text-[var(--ink-lavender)]',
    title: 'Cross-Source Linking',
    detail:
      'Automatically trace how an announcement in one group connects to a faculty email, a rescheduled calendar slot, and a team commitment.',
  },
  {
    step: '04 · UNDERSTAND',
    badgeClass: 'bg-[var(--pastel-red)] text-[var(--ink-red)]',
    title: 'Conflicts & Unanswered Gaps',
    detail:
      'Spot contradictory deadlines, stale calendar invites, duplicate notices, and open questions that were answered in a different source.',
  },
  {
    step: '05 · ANTICIPATE',
    badgeClass: 'bg-[var(--pastel-yellow)] text-[var(--ink-yellow)]',
    title: 'Impact Radar & Forecasts',
    detail:
      'See downstream ripple effects when dates shift and distinguish confirmed facts from observed patterns and hypothetical projections.',
  },
];

const INTEGRATIONS_OVERVIEW = [
  {
    icon: MessageSquareText,
    iconBg: 'bg-[var(--pastel-green)] text-[var(--ink-green)]',
    name: 'WhatsApp Exports (.txt & .zip)',
    note: 'Preview participants, detect groups, and extract decisions & deadlines',
  },
  {
    icon: Mail,
    iconBg: 'bg-[var(--pastel-red)] text-[var(--ink-red)]',
    name: 'Gmail (Read-Only Sync)',
    note: 'AI importance scoring (0–100), deadline extraction & Gmail thread links',
  },
  {
    icon: Calendar,
    iconBg: 'bg-[var(--pastel-blue)] text-[var(--ink-blue)]',
    name: 'Google Calendar (Read-Only)',
    note: 'Unified schedule cross-checked against emails & chat announcements',
  },
  {
    icon: FileText,
    iconBg: 'bg-[var(--pastel-cyan)] text-[var(--ink-cyan)]',
    name: 'Images, Audio, Video & PDFs',
    note: 'OCR text extraction, spoken transcripts with timestamps, and doc briefs',
  },
];

export const Landing: React.FC = () => {
  const { loginDemo } = useLivingMemory();
  const navigate = useNavigate();

  const handleExploreDemo = () => {
    loginDemo('alex.chen@university.edu', 'Alex');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#DADCE0] bg-[#FFFFFF]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="focus-visible:outline-none">
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-[#5F6368] md:flex">
            <a href="#lifecycle" className="hover:text-[#1A73E8] transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-[#1A73E8] transition-colors">
              Capabilities
            </a>
            <a href="#integrations" className="hover:text-[#1A73E8] transition-colors">
              Integrations
            </a>
            <a href="#privacy" className="hover:text-[#1A73E8] transition-colors">
              Privacy
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              to="/signin"
              className="hidden sm:inline-flex rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA] whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>

            <button
              onClick={handleExploreDemo}
              className="rounded-lg bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1765CC] whitespace-nowrap shrink-0 shadow-xs"
            >
              Explore Demo
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-6 space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F0FE] px-3 py-1 text-xs font-medium text-[#1A73E8]">
              Personal Context Intelligence Platform
            </div>

            <h1 className="font-serif-editorial text-4xl leading-[1.12] tracking-tight text-[#202124] sm:text-5xl lg:text-[52px]">
              Your life, continuously understood.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[#5F6368] sm:text-lg">
              One intelligent memory system for everything you learn, share, decide, and plan.
              Connect Gmail, Google Calendar, WhatsApp exports, screenshots, audio, video, and
              documents into a single Workspace-clean intelligence assistant.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-[#1A73E8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1765CC] whitespace-nowrap shrink-0 shadow-xs"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                onClick={handleExploreDemo}
                className="inline-flex items-center gap-2 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-5 py-3 text-sm font-medium text-[#202124] hover:bg-[#F8F9FA] whitespace-nowrap shrink-0"
              >
                Explore Demo Workspace
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-[#DADCE0] pt-6">
              <div>
                <div className="font-mono text-xl font-semibold tabular-nums text-[#202124]">
                  7 Core Views
                </div>
                <div className="text-xs text-[#5F6368]">Focused Navigation</div>
              </div>
              <div>
                <div className="font-mono text-xl font-semibold tabular-nums text-[#1A73E8]">
                  100%
                </div>
                <div className="text-xs text-[#5F6368]">Source-Cited Claims</div>
              </div>
              <div>
                <div className="font-mono text-xl font-semibold tabular-nums text-[#137333]">
                  Read-Only
                </div>
                <div className="text-xs text-[#5F6368]">Privacy First Scope</div>
              </div>
            </div>
          </motion.div>

          {/* Hero Visual + Clean White Trace Card */}
          <div className="lg:col-span-6 space-y-4">
            <div className="ws-card overflow-hidden rounded-2xl">
              <div className="aspect-[16/9] w-full overflow-hidden border-b border-[var(--border-subtle)]">
                <img
                  src={HERO_NETWORK_IMAGE}
                  alt="Interconnected personal memory network"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="bg-[var(--bg-card)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--text-secondary)]">
                    Cross-Source Memory Trace · Alex’s Workspace
                  </span>
                  <span className="rounded-md bg-[var(--pastel-yellow)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--ink-yellow)]">
                    3 Versioned Shifts
                  </span>
                </div>
                <div className="mt-2 font-semibold text-sm text-[var(--text-primary)]">
                  AI Systems Assignment Deadline → Moved Nov 15 → Nov 18 → Nov 20
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Linked across Class Discussion WhatsApp export, AI Project Team chat, Academic
                  Office Gmail, and stale Nov 15 Google Calendar invite.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Philosophy Strip */}
      <section id="lifecycle" className="border-y border-[var(--border-subtle)] bg-[var(--bg-card)] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[var(--accent-primary)]">Core Architecture</p>
            <h2 className="mt-2 font-serif-editorial text-3xl text-[var(--text-primary)]">
              COLLECT → REMEMBER → CONNECT → UNDERSTAND → ANTICIPATE
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Built as a persistent, time-aware context graph rather than a single-session chat window.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {LIFECYCLE_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5"
              >
                <span
                  className={`inline-block rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${item.badgeClass}`}
                >
                  {item.step}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-[var(--accent-primary)]">Intelligence Modules</p>
          <h2 className="mt-2 font-serif-editorial text-3xl text-[var(--text-primary)]">
            Every conversation, commitment, and shift preserved with evidence
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Network,
              tileClass: 'bg-[var(--pastel-blue)] text-[var(--ink-blue)]',
              title: '10-Entity Interactive Memory Graph',
              desc: 'Explore links between People, Projects, Events, Decisions, Commitments, Emails, Calendar invites, PDFs, and WhatsApp groups.',
            },
            {
              icon: History,
              tileClass: 'bg-[var(--pastel-lavender)] text-[var(--ink-lavender)]',
              title: 'Memory Time Machine',
              desc: 'Slide back to Nov 10, Nov 12, or Nov 13 to see exactly what you knew then and what later superseded it.',
            },
            {
              icon: GitBranch,
              tileClass: 'bg-[var(--pastel-red)] text-[var(--ink-red)]',
              title: 'Cross-Group & Email Conflict Center',
              desc: 'Catch when an official Academic Office email overrides a WhatsApp discussion while your Calendar still holds the old date.',
            },
            {
              icon: Radar,
              tileClass: 'bg-[var(--pastel-yellow)] text-[var(--ink-yellow)]',
              title: 'Impact Radar & What-If Simulator',
              desc: 'Inspect confirmed downstream effects and simulate hypothetical schedule or teammate changes safely.',
            },
            {
              icon: Sparkles,
              tileClass: 'bg-[var(--pastel-purple)] text-[var(--ink-purple)]',
              title: 'Grounded Context Assistant',
              desc: 'Ask natural questions and inspect exact source excerpts, people involved, and follow-up verification prompts.',
            },
            {
              icon: FileText,
              tileClass: 'bg-[var(--pastel-cyan)] text-[var(--ink-cyan)]',
              title: '12-Section Project Handover Builder',
              desc: 'Compile project summaries, key decisions, open questions, risks, and pending promises into an editable briefing.',
            },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.title} className="ws-card rounded-xl p-6">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${feat.tileClass}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
                  {feat.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Integrations Overview */}
      <section id="integrations" className="border-y border-[var(--border-subtle)] bg-[var(--bg-card)] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold text-[var(--accent-primary)]">Data Sources</p>
              <h2 className="mt-2 font-serif-editorial text-3xl text-[var(--text-primary)]">
                Designed around transparent, user-controlled inputs
              </h2>
            </div>
            <button
              onClick={handleExploreDemo}
              className="inline-flex items-center gap-2 text-xs font-medium text-[var(--accent-primary)] hover:underline whitespace-nowrap shrink-0"
            >
              Inspect Alex’s Demo Workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INTEGRATIONS_OVERVIEW.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.iconBg}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                    {item.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {item.note}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section id="privacy" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="ws-card rounded-2xl p-8 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--pastel-green)] px-3 py-1 text-xs font-medium text-[var(--ink-green)]">
                <ShieldCheck className="h-4 w-4" />
                User-Authorized · Honest Boundaries
              </div>
              <h2 className="font-serif-editorial text-3xl text-[var(--text-primary)]">
                You control what enters your memory system
              </h2>
              <p className="text-sm leading-relaxed text-[#5F6368]">
                LIVING MEMORY never scrapes private WhatsApp accounts silently—group intelligence
                works exclusively from `.txt` or `.zip` exports you choose to upload. Gmail and
                Google Calendar use strict read-only permissions when connected, alongside clearly
                labeled sample Demo Data when exploring without an account.
              </p>
            </div>
            <div className="lg:col-span-5 space-y-3">
              {[
                {
                  icon: Lock,
                  title: 'No silent overwrites',
                  desc: 'Prior versions remain inspectable when deadlines or plans evolve.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Facts vs AI inferences separated',
                  desc: 'Confirmed evidence, observed patterns, and simulations are always labeled distinctly.',
                },
              ].map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">{p.title}</div>
                      <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{p.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA & Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-card)] py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <BrandLogo />
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Personal Context Intelligence Platform · Google Workspace-Inspired Edition
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/signin"
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)]"
            >
              Create Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
