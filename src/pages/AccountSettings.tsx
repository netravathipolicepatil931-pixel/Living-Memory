import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, RotateCcw, Save, Sun } from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { User } from '../types/memory';

export const AccountSettings: React.FC = () => {
  const { user, theme, setTheme, updateUser, resetDemoData, logoutDemo, pushToast } =
    useLivingMemory();
  const navigate = useNavigate();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [useMode, setUseMode] = useState<User['useMode']>(user.useMode);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name: name.trim() || 'Alex', email: email.trim(), role: role.trim(), useMode });
    pushToast('Account profile saved locally', 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 38 · Account & Theme Settings"
        title="Profile, Theme & Workspace Reset"
        subtitle="Update Alex’s profile details, toggle between Dark and Light themes, or reset the sample Demo Data."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSave}
          className="ws-card lg:col-span-7 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Profile Details</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Role / Discipline
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Workspace Mode
              </label>
              <select
                value={useMode}
                onChange={(e) => setUseMode(e.target.value as User['useMode'])}
                className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)]"
              >
                <option value="Academic">Academic</option>
                <option value="Personal">Personal</option>
                <option value="Professional">Professional</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-gold)] px-4 py-2 text-xs font-semibold text-white"
          >
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </button>
        </form>

        <div className="lg:col-span-5 space-y-4">
          <div className="ws-card rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Appearance Theme</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Persisted automatically in browser localStorage.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-medium ${
                  theme === 'dark'
                    ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark Workspace
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-medium ${
                  theme === 'light'
                    ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Workspace Light
              </button>
            </div>
          </div>

          <div className="ws-card rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Demo Session Controls
            </h3>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                Reset Demo Data
              </button>
              <button
                type="button"
                onClick={() => {
                  logoutDemo();
                  navigate('/');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--status-danger)]/40 px-3.5 py-2 text-xs font-medium text-[var(--status-danger)]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Restore initial Alex demo dataset?"
        description="Any local edits, resolved conflicts, or deleted records will be reset back to the default Nov 13 demo workspace."
        confirmLabel="Restore Demo Data"
        onConfirm={() => {
          resetDemoData();
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
};
