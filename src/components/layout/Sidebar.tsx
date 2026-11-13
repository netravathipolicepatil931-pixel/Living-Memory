import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Compass,
  FolderOpen,
  Layers,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { useLivingMemory } from '../../context/LivingMemoryContext';
import { BrandLogo } from '../common/BrandLogo';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const {
    user,
    googleSession,
    notifications,
    deadlines,
    activeJobs,
    logoutDemo,
    disconnectGoogleWorkspace,
  } = useLivingMemory();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const navigate = useNavigate();

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const pendingDeadlines = deadlines.filter((d) => d.status !== 'Completed').length;
  const processingJobs = activeJobs.filter(
    (j) => j.status === 'Uploaded' || j.status === 'Processing'
  ).length;

  // Strictly 7 main navigation items as specified
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      to: '/information',
      label: 'My Information',
      icon: FolderOpen,
      count: processingJobs > 0 ? processingJobs : undefined,
    },
    {
      to: '/deadlines',
      label: 'Deadlines & Calendar',
      icon: CalendarClock,
      count: pendingDeadlines > 0 ? pendingDeadlines : undefined,
    },
    { to: '/memories', label: 'My Memories', icon: Layers },
    { to: '/ask', label: 'Ask Living Memory', icon: Sparkles },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      count: unreadNotifs > 0 ? unreadNotifs : undefined,
    },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const renderSidebarBody = (isMobile: boolean) => (
    <div className="flex h-full flex-col bg-[#FFFFFF] text-[#202124]">
      {/* Brand + Collapse */}
      <div className="flex h-16 items-center justify-between border-b border-[#DADCE0] px-4">
        <button
          onClick={() => {
            navigate('/dashboard');
            if (isMobile) onCloseMobile();
          }}
          className="text-left focus-visible:outline-none"
        >
          <BrandLogo compact={collapsed && !isMobile} />
        </button>

        {isMobile ? (
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-[#5F6368] hover:bg-[#F8F9FA]"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex rounded-lg p-1.5 text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124]"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Connection / Mode Status */}
      {(!collapsed || isMobile) && (
        <div className="border-b border-[#DADCE0] px-4 py-3 text-xs">
          <div className="flex items-center justify-between text-[#5F6368]">
            <span>{googleSession.connected ? 'Google Connected' : 'Sample + Local Mode'}</span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                googleSession.connected
                  ? 'bg-[#CEEAD6] text-[#137333]'
                  : 'bg-[#FEF7E0] text-[#B06000]'
              }`}
            >
              {googleSession.connected ? 'Live' : 'Demo'}
            </span>
          </div>
          <div className="mt-1 truncate text-[11px] text-[#80868B]">
            {googleSession.connected && googleSession.email
              ? googleSession.email
              : `${user.useMode} Workspace`}
          </div>
        </div>
      )}

      {/* Strictly 7 Primary Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary Sidebar">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => {
                    if (isMobile) onCloseMobile();
                  }}
                  title={collapsed && !isMobile ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-full px-3.5 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#E8F0FE] text-[#1A73E8]'
                        : 'text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? 'text-[#1A73E8]' : 'text-[#5F6368]'
                          }`}
                        />
                        {(!collapsed || isMobile) && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </span>
                      {(!collapsed || isMobile) && item.count !== undefined && (
                        <span
                          className={`ml-2 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${
                            isActive
                              ? 'bg-[#1A73E8] text-white'
                              : 'bg-[#F1F3F4] text-[#5F6368]'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom User Profile */}
      <div className="relative border-t border-[#DADCE0] p-3">
        {accountMenuOpen && (!collapsed || isMobile) && (
          <div className="mb-2 rounded-xl border border-[#DADCE0] bg-[#FFFFFF] p-1.5 text-xs shadow-sm">
            <button
              onClick={() => {
                setAccountMenuOpen(false);
                navigate('/onboarding');
                if (isMobile) onCloseMobile();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124]"
            >
              <Compass className="h-3.5 w-3.5" />
              Setup Guide
            </button>
            <button
              onClick={() => {
                setAccountMenuOpen(false);
                navigate('/settings');
                if (isMobile) onCloseMobile();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124]"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings & Privacy
            </button>
            <button
              onClick={async () => {
                setAccountMenuOpen(false);
                if (googleSession.connected) {
                  await disconnectGoogleWorkspace();
                }
                logoutDemo();
                navigate('/');
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[#C5221F] hover:bg-[#FCE8E6]/60"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        )}

        <button
          onClick={() => setAccountMenuOpen((prev) => !prev)}
          className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-[#F8F9FA] transition-colors"
          aria-expanded={accountMenuOpen}
        >
          <img
            src={user.avatarUrl}
            alt={user.name}
            referrerPolicy="no-referrer"
            className="h-8 w-8 shrink-0 rounded-full object-cover border border-[#DADCE0]"
          />
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-[#202124]">{user.name}</div>
              <div className="truncate text-[11px] text-[#5F6368]">{user.email}</div>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:block shrink-0 border-r border-[#DADCE0] transition-[width] duration-200 ${
          collapsed ? 'w-[68px]' : 'w-[256px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{renderSidebarBody(false)}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-[#202124]/40 backdrop-blur-xs" onClick={onCloseMobile} />
          <aside className="relative z-10 h-full w-72 border-r border-[#DADCE0]">
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}
    </>
  );
};
