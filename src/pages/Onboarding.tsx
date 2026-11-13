import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { User } from '../types/memory';

const USE_CASES = [
  'Academic courses',
  'Research & AI projects',
  'Team collaboration',
  'Calendar & deadlines',
  'Personal commitments',
  'Reading & PDF notes',
];

const SOURCE_OPTIONS = [
  'Gmail (Read-only)',
  'Google Calendar (Read-only)',
  'WhatsApp Exports (.txt / .zip)',
  'PDF & DOCX Documents',
  'Images & Screenshots',
  'Audio & Video Notes',
];

const CATEGORY_OPTIONS = [
  'Deadlines',
  'Decisions',
  'Commitments',
  'Questions',
  'Events',
  'Tasks',
  'Announcements',
  'Relationships',
];

export const Onboarding: React.FC = () => {
  const { user, settings, completeOnboarding } = useLivingMemory();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [name, setName] = useState(user.name);
  const [useMode, setUseMode] = useState<User['useMode']>(user.useMode);
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>(user.useCases);
  const [selectedSources, setSelectedSources] = useState<string[]>(user.preferredSources);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(user.importantCategories);
  const [digestTime, setDigestTime] = useState(settings.digestTime);
  const [proactiveAlerts, setProactiveAlerts] = useState(settings.proactiveAlertsEnabled);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleFinish = () => {
    completeOnboarding(
      {
        name: name.trim() || 'Alex',
        useMode,
        useCases: selectedUseCases,
        preferredSources: selectedSources,
        importantCategories: selectedCategories,
      },
      {
        digestTime,
        proactiveAlertsEnabled: proactiveAlerts,
      }
    );
    navigate('/information');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <BrandLogo />
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Skip to Dashboard
          </button>
        </div>

        {/* Progress indicator */}
        <div className="mt-8">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>
              Step {step} of {totalSteps}
            </span>
            <span className="font-mono tabular-nums text-[var(--accent-gold)]">
              {Math.round((step / totalSteps) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="ws-card mt-6 rounded-2xl p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="font-serif-editorial text-2xl text-[var(--text-primary)]">
                  Personalize your context workspace
                </h1>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Confirm how Living Memory should address you and structure your workspace.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Primary Workspace Mode
                </label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {(['Personal', 'Academic', 'Professional'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setUseMode(m)}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        useMode === m
                          ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      <div className="text-sm font-medium text-[var(--text-primary)]">{m}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                        {m === 'Academic'
                          ? 'Courses, labs & reviews'
                          : m === 'Personal'
                          ? 'Life plans & promises'
                          : 'Projects & stakeholders'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h1 className="font-serif-editorial text-2xl text-[var(--text-primary)]">
                  What do you want Living Memory to track?
                </h1>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Select your active use cases. You can change these anytime in Context Profile.
                </p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {USE_CASES.map((item) => {
                  const active = selectedUseCases.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(selectedUseCases, setSelectedUseCases, item)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-xs font-medium ${
                        active
                          ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <span>{item}</span>
                      {active && <Check className="h-4 w-4 text-[var(--accent-gold)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h1 className="font-serif-editorial text-2xl text-[var(--text-primary)]">
                  Choose information sources to analyze
                </h1>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Connect read-only Gmail & Google Calendar or upload WhatsApp exports, PDFs, images, audio, and videos in My Information.
                </p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {SOURCE_OPTIONS.map((item) => {
                  const active = selectedSources.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(selectedSources, setSelectedSources, item)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-xs font-medium ${
                        active
                          ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <span>{item}</span>
                      {active && <Check className="h-4 w-4 text-[var(--accent-gold)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h1 className="font-serif-editorial text-2xl text-[var(--text-primary)]">
                  High-priority memory categories
                </h1>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Prioritize which signals surface first in your Daily Briefing and Alerts.
                </p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {CATEGORY_OPTIONS.map((item) => {
                  const active = selectedCategories.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(selectedCategories, setSelectedCategories, item)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-xs font-medium ${
                        active
                          ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <span>{item}</span>
                      {active && <Check className="h-4 w-4 text-[var(--accent-gold)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h1 className="font-serif-editorial text-2xl text-[var(--text-primary)]">
                  Briefing & alert preferences
                </h1>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Choose when daily briefings compile and whether proactive alerts stay active.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Daily Briefing Schedule
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2.5">
                  {(['07:30', '08:00', '09:00'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDigestTime(t)}
                      className={`rounded-lg border py-2.5 font-mono text-xs ${
                        digestTime === t
                          ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {t} AM
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    Proactive Deadline & Conflict Alerts
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Surface date shifts, unanswered questions, and overdue promises.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={proactiveAlerts}
                  onChange={(e) => setProactiveAlerts(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent-gold)]"
                />
              </label>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-[var(--border-subtle)] pt-5">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <div className="flex items-center gap-2.5">
              {step < totalSteps ? (
                <>
                  <button
                    type="button"
                    onClick={() => setStep((s) => s + 1)}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2"
                  >
                    Skip step
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep((s) => s + 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-gold)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Continue
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-gold)] px-5 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  Save & Configure Sources
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
