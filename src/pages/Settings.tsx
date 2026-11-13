import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Download,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Unlink,
} from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { memoryService } from '../services/memoryService';
import { User } from '../types/memory';

const COMMON_TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export const Settings: React.FC = () => {
  const {
    user,
    settings,
    sources,
    memories,
    googleSession,
    systemStatus,
    syncingGmail,
    syncingCalendar,
    updateUser,
    updateSettings,
    connectGoogleWorkspace,
    disconnectGoogleWorkspace,
    syncRealGmail,
    syncRealCalendar,
    deleteAllSources,
    deleteAllMemories,
    resetDemoData,
    logoutDemo,
    pushToast,
  } = useLivingMemory();
  const navigate = useNavigate();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [useMode, setUseMode] = useState<User['useMode']>(user.useMode);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'delete-sources' | 'delete-memories' | null>(
    null
  );

  const tzOptions = Array.from(new Set([settings.userTimezone, ...COMMON_TIMEZONES]));

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name: name.trim() || 'Alex',
      email: email.trim(),
      role: role.trim(),
      useMode,
    });
    pushToast('Account settings saved', 'success');
  };

  const handleExportJson = () => {
    const json = memoryService.exportMemoriesAsJson(memories);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `living-memory-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Exported stored memories as JSON', 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Privacy"
        subtitle="Manage your Gmail & Google Calendar connections, imported sources, timezone, notifications, data retention, and export controls."
      />

      {/* Connected Google Services */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ws-card rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#202124]">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FCE8E6] text-[#C5221F]">
                <Mail className="h-4 w-4" />
              </span>
              Gmail Connection
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                googleSession.connected
                  ? 'bg-[#CEEAD6] text-[#137333]'
                  : 'bg-[#FEF7E0] text-[#B06000]'
              }`}
            >
              {googleSession.connected
                ? 'Read-Only Active'
                : systemStatus && !systemStatus.googleOAuthConfigured
                ? 'Not configured'
                : 'Not Connected'}
            </span>
          </div>
          <p className="text-xs text-[#5F6368]">
            {googleSession.connected
              ? `Connected as ${googleSession.email}. Read-only access: LIVING MEMORY never sends, modifies, archives, or deletes your emails.`
              : systemStatus && !systemStatus.googleOAuthConfigured
              ? 'Not configured: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable live Gmail OAuth 2.0.'
              : 'Connect your Google account with read-only permission to analyze incoming and archived emails.'}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {!googleSession.connected ? (
              <GoogleSignInButton
                onClick={() => connectGoogleWorkspace().catch(() => {})}
                label="Connect Gmail"
              />
            ) : (
              <>
                <button
                  onClick={() => syncRealGmail()}
                  disabled={syncingGmail}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1765CC]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncingGmail ? 'animate-spin' : ''}`} />
                  Sync Now
                </button>
                <button
                  onClick={() => disconnectGoogleWorkspace()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#C5221F]"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        <div className="ws-card rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#202124]">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#D2E3FC] text-[#1967D2]">
                <Calendar className="h-4 w-4" />
              </span>
              Google Calendar (Read-Only)
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                googleSession.connected
                  ? 'bg-[#CEEAD6] text-[#137333]'
                  : 'bg-[#FEF7E0] text-[#B06000]'
              }`}
            >
              {googleSession.connected
                ? 'Read-Only Active'
                : systemStatus && !systemStatus.googleOAuthConfigured
                ? 'Not configured'
                : 'Not Connected'}
            </span>
          </div>
          <p className="text-xs text-[#5F6368]">
            {systemStatus && !systemStatus.googleOAuthConfigured
              ? 'Not configured: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable Google Calendar read-only sync.'
              : 'Displays your calendar events alongside AI-extracted deadlines without ever mutating your Google Calendar.'}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {googleSession.connected ? (
              <button
                onClick={() => syncRealCalendar()}
                disabled={syncingCalendar}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA]"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#1A73E8] ${syncingCalendar ? 'animate-spin' : ''}`} />
                Sync Calendar Events
              </button>
            ) : (
              <GoogleSignInButton
                onClick={() => connectGoogleWorkspace().catch(() => {})}
                label="Connect Google Calendar"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Profile + Sync & Timezone */}
        <form
          onSubmit={handleSaveProfile}
          className="ws-card lg:col-span-6 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-[#202124]">Account & Timezone</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#5F6368]">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 text-xs text-[#202124]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6368]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 text-xs text-[#202124]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6368]">Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 text-xs text-[#202124]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6368]">User Timezone</label>
              <select
                value={settings.userTimezone}
                onChange={(e) => updateSettings({ userTimezone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 text-xs text-[#202124]"
              >
                {tzOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#5F6368]">Workspace Mode</label>
              <select
                value={useMode}
                onChange={(e) => setUseMode(e.target.value as User['useMode'])}
                className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 text-xs text-[#202124]"
              >
                <option value="Academic">Academic</option>
                <option value="Personal">Personal</option>
                <option value="Professional">Professional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5F6368]">Data Retention</label>
              <select
                value={settings.retentionPolicy}
                onChange={(e) =>
                  updateSettings({
                    retentionPolicy: e.target.value as '90 Days' | '1 Year' | 'Indefinite',
                  })
                }
                className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 text-xs text-[#202124]"
              >
                <option value="90 Days">90 Days</option>
                <option value="1 Year">1 Year</option>
                <option value="Indefinite">Indefinite</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1765CC]"
          >
            <Save className="h-3.5 w-3.5" />
            Save Preferences
          </button>
        </form>

        {/* Privacy, Export, Deletion & Security */}
        <div className="lg:col-span-6 space-y-4">
          <div className="ws-card rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#202124]">
              <ShieldCheck className="h-4 w-4 text-[#137333]" />
              Security & Consent Boundaries
            </div>
            <ul className="space-y-1.5 text-xs text-[#5F6368]">
              <li className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-[#1A73E8]" />
                OAuth tokens are encrypted with Fernet on the backend and never exposed to the browser.
              </li>
              <li>
                • Gmail & Google Calendar are strictly read-only; no external messages or events are ever modified.
              </li>
              <li>
                • WhatsApp analysis runs strictly on user-exported `.txt` or `.zip` files ({sources.length} total sources stored).
              </li>
            </ul>
            {systemStatus && (
              <div className="mt-3 grid gap-2 border-t border-[#DADCE0] pt-3 text-[11px] sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-1.5">
                  <span className="text-[#5F6368]">Gemini API</span>
                  <span className={`font-medium ${systemStatus.geminiConfigured ? 'text-[#137333]' : 'text-[#B06000]'}`}>
                    {systemStatus.geminiConfigured ? 'Configured' : 'Not configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-1.5">
                  <span className="text-[#5F6368]">Sarvam AI</span>
                  <span className={`font-medium ${systemStatus.sarvamConfigured ? 'text-[#137333]' : 'text-[#B06000]'}`}>
                    {systemStatus.sarvamConfigured ? 'Configured' : 'Not configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-1.5">
                  <span className="text-[#5F6368]">Supabase Database</span>
                  <span className={`font-medium ${systemStatus.supabaseConfigured ? 'text-[#137333]' : 'text-[#1A73E8]'}`}>
                    {systemStatus.supabaseConfigured ? 'Configured (Postgres + pgvector)' : 'Not configured (SQLite local fallback)'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-1.5">
                  <span className="text-[#5F6368]">Google OAuth 2.0</span>
                  <span className={`font-medium ${systemStatus.googleOAuthConfigured ? 'text-[#137333]' : 'text-[#B06000]'}`}>
                    {systemStatus.googleOAuthConfigured ? 'Configured' : 'Not configured'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="ws-card rounded-xl p-6 space-y-3">
            <h2 className="text-sm font-semibold text-[#202124]">
              Export & Data Lifecycle Controls
            </h2>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA]"
              >
                <Download className="h-3.5 w-3.5 text-[#1A73E8]" />
                Export Stored JSON
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('reset')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#1A73E8]" />
                Reset Demo Data
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('delete-sources')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#C5221F] hover:bg-[#FCE8E6]/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete All Sources
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('delete-memories')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#C5221F] hover:bg-[#FCE8E6]/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Stored Memories
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (googleSession.connected) await disconnectGoogleWorkspace();
                  logoutDemo();
                  navigate('/');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#5F6368] hover:text-[#202124]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction === 'reset'
            ? 'Restore sample demo dataset?'
            : confirmAction === 'delete-sources'
            ? 'Delete all imported sources?'
            : 'Delete all stored memories and deadlines?'
        }
        description="This action only affects information stored inside LIVING MEMORY and never deletes original emails, calendar events, or files on your device."
        confirmLabel="Confirm"
        destructive={confirmAction !== 'reset'}
        onConfirm={() => {
          if (confirmAction === 'reset') resetDemoData();
          if (confirmAction === 'delete-sources') deleteAllSources();
          if (confirmAction === 'delete-memories') deleteAllMemories();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
