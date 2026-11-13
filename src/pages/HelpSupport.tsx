import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, HelpCircle, MessageSquareText, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';

export const HelpSupport: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="How Living Memory Works"
        subtitle="Understand the intelligence workflow, WhatsApp .txt/.zip exports, multimodal uploads, and read-only Google Workspace permissions."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="ws-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-[#202124]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D2E3FC] text-[#1967D2]">
              <BookOpen className="h-4 w-4" />
            </span>
            Core Workflow: COLLECT → UNDERSTAND → REMEMBER → CONNECT → PRIORITIZE → INFORM
          </div>
          <p className="text-xs leading-relaxed text-[#5F6368]">
            Unlike single-session chatbots, Living Memory preserves both <strong>Event Time</strong>{' '}
            (when an assignment or meeting actually happens) and <strong>Recorded Time</strong>{' '}
            (when a chat, email, screenshot, or recording mentioned it). Superseded dates are
            preserved in append-only version history so you can audit how any plan shifted.
          </p>
        </div>

        <div className="ws-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-[#202124]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#CEEAD6] text-[#137333]">
              <MessageSquareText className="h-4 w-4" />
            </span>
            How to Export a WhatsApp Group (.txt or .zip)
          </div>
          <ol className="list-decimal pl-4 space-y-1.5 text-xs leading-relaxed text-[#5F6368]">
            <li>Open the group chat in WhatsApp on mobile or desktop.</li>
            <li>Tap Group Info → Export Chat (with or without media).</li>
            <li>
              Upload the `.txt` or `.zip` file via{' '}
              <Link to="/information?tab=whatsapp" className="font-medium text-[#1A73E8] hover:underline">
                My Information → WhatsApp
              </Link>{' '}
              or the Import modal.
            </li>
          </ol>
        </div>

        <div className="ws-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-[#202124]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EDE7F6] text-[#5E35B1]">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Privacy Boundaries & Demo vs Live Data
          </div>
          <p className="text-xs leading-relaxed text-[#5F6368]">
            Gmail and Google Calendar connect strictly with read-only permissions—Living Memory
            never sends emails or alters your calendar. Sample Demo records are clearly marked
            as <strong>Demo</strong>, while your imported files and synced emails/events are
            marked as <strong>Live</strong> and can be deleted anytime in Settings.
          </p>
        </div>

        <div className="ws-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-[#202124]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3E8FD] text-[#7627BB]">
              <HelpCircle className="h-4 w-4" />
            </span>
            Quick Navigation Shortcuts
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              to="/memories?tab=history&view=time-machine"
              className="rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 font-medium text-[#202124] hover:bg-[#E8F0FE] hover:text-[#1A73E8] transition-colors"
            >
              Time Machine
            </Link>
            <Link
              to="/notifications?tab=conflicts"
              className="rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 font-medium text-[#202124] hover:bg-[#E8F0FE] hover:text-[#1A73E8] transition-colors"
            >
              Conflict Detection
            </Link>
            <Link
              to="/memories?tab=projects"
              className="rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 font-medium text-[#202124] hover:bg-[#E8F0FE] hover:text-[#1A73E8] transition-colors"
            >
              Project Handover
            </Link>
            <Link
              to="/settings"
              className="rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 font-medium text-[#202124] hover:bg-[#E8F0FE] hover:text-[#1A73E8] transition-colors"
            >
              Integrations & Reset
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
