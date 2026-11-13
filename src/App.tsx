/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LivingMemoryProvider } from './context/LivingMemoryContext';
import { AppLayout } from './layouts/AppLayout';

import { Landing } from './pages/Landing';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Onboarding } from './pages/Onboarding';

import { Dashboard } from './pages/Dashboard';
import { MyInformation } from './pages/MyInformation';
import { DeadlinesCalendar } from './pages/DeadlinesCalendar';
import { MyMemories } from './pages/MyMemories';
import { MemoryDetails } from './pages/MemoryDetails';
import { AskLivingMemory } from './pages/AskLivingMemory';
import { NotificationsSettings } from './pages/NotificationsSettings';
import { Settings } from './pages/Settings';
import { HelpSupport } from './pages/HelpSupport';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-[#202124] p-6">
          <div className="max-w-md rounded-xl border border-[#DADCE0] bg-white p-6 space-y-3 shadow-sm">
            <h1 className="text-lg font-semibold">LIVING MEMORY Recovery</h1>
            <p className="text-xs text-[#5F6368]">{this.state.message}</p>
            <button
              onClick={() => window.location.assign('/')}
              className="rounded-lg bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1765CC]"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <LivingMemoryProvider>
        <BrowserRouter>
          <Routes>
            {/* Public / Auth / Onboarding */}
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/auth" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Core 7-Screen Workspace Layout */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/information" element={<MyInformation />} />
              <Route path="/deadlines" element={<DeadlinesCalendar />} />
              <Route path="/memories" element={<MyMemories />} />
              <Route path="/memories/:id" element={<MemoryDetails />} />
              <Route path="/ask" element={<AskLivingMemory />} />
              <Route path="/notifications" element={<NotificationsSettings />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<HelpSupport />} />

              {/* Clean Redirects from Legacy Routes into Contextual Tabs */}
              <Route path="/sources" element={<Navigate to="/information" replace />} />
              <Route path="/sources/permissions" element={<Navigate to="/settings" replace />} />
              <Route path="/integrations/gmail" element={<Navigate to="/information?tab=gmail" replace />} />
              <Route path="/integrations/calendar" element={<Navigate to="/information?tab=calendar" replace />} />
              <Route path="/integrations/apps" element={<Navigate to="/settings" replace />} />
              <Route path="/groups/select" element={<Navigate to="/information?tab=whatsapp" replace />} />
              <Route path="/groups/intelligence" element={<Navigate to="/information?tab=whatsapp" replace />} />
              <Route path="/connections" element={<Navigate to="/information?tab=whatsapp" replace />} />

              <Route path="/timeline" element={<Navigate to="/memories?tab=history&view=timeline" replace />} />
              <Route path="/graph" element={<Navigate to="/memories?tab=history&view=graph" replace />} />
              <Route path="/time-machine" element={<Navigate to="/memories?tab=history&view=time-machine" replace />} />
              <Route path="/recovery" element={<Navigate to="/memories?tab=history&view=recovery" replace />} />
              <Route path="/profile" element={<Navigate to="/memories?tab=history&view=profile" replace />} />
              <Route path="/health" element={<Navigate to="/memories?tab=memories" replace />} />
              <Route path="/relationships" element={<Navigate to="/memories?tab=people" replace />} />
              <Route path="/people" element={<Navigate to="/memories?tab=people" replace />} />
              <Route path="/decisions" element={<Navigate to="/memories?tab=decisions" replace />} />
              <Route path="/commitments" element={<Navigate to="/memories?tab=commitments" replace />} />
              <Route path="/handover" element={<Navigate to="/memories?tab=projects" replace />} />

              <Route path="/conflicts" element={<Navigate to="/notifications?tab=conflicts" replace />} />
              <Route path="/questions" element={<Navigate to="/notifications?tab=questions" replace />} />
              <Route path="/alerts" element={<Navigate to="/notifications" replace />} />
              <Route path="/settings/notifications" element={<Navigate to="/notifications" replace />} />

              <Route path="/impact" element={<Navigate to="/deadlines" replace />} />
              <Route path="/briefing" element={<Navigate to="/dashboard" replace />} />
              <Route path="/reflection" element={<Navigate to="/dashboard" replace />} />
              <Route path="/simulator" element={<Navigate to="/deadlines" replace />} />
              <Route path="/reliability" element={<Navigate to="/information" replace />} />
              <Route path="/predictions" element={<Navigate to="/dashboard" replace />} />

              <Route path="/settings/privacy" element={<Navigate to="/settings" replace />} />
              <Route path="/settings/account" element={<Navigate to="/settings" replace />} />
              <Route path="/settings/integrations" element={<Navigate to="/settings" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LivingMemoryProvider>
    </AppErrorBoundary>
  );
}
