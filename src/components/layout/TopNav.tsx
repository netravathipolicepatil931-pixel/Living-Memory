import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Plus, Search, Sparkles } from 'lucide-react';
import { useLivingMemory } from '../../context/LivingMemoryContext';

interface TopNavProps {
  onOpenMobileMenu: () => void;
}

const ROUTE_META: Record<string, { title: string; section: string }> = {
  '/dashboard': { title: 'Dashboard', section: 'LIVING MEMORY' },
  '/information': { title: 'My Information', section: 'Source Hub' },
  '/sources': { title: 'My Information', section: 'Source Hub' },
  '/deadlines': { title: 'Deadlines & Calendar', section: 'Schedule' },
  '/memories': { title: 'My Memories', section: 'Memory Center' },
  '/ask': { title: 'Ask Living Memory', section: 'Assistant' },
  '/notifications': { title: 'Notifications', section: 'Updates' },
  '/settings': { title: 'Settings', section: 'Preferences & Privacy' },
};

export const TopNav: React.FC<TopNavProps> = ({ onOpenMobileMenu }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const {
    globalSearch,
    setGlobalSearch,
    setUploadModalOpen,
    notifications,
    user,
  } = useLivingMemory();
  const [localInput, setLocalInput] = useState(globalSearch);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const isMemoryDetail = pathname.startsWith('/memories/');
  const meta = isMemoryDetail
    ? { title: 'Memory Details', section: 'My Memories' }
    : ROUTE_META[pathname] || { title: 'Workspace', section: 'LIVING MEMORY' };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalSearch(localInput);
    if (pathname !== '/memories' && pathname !== '/information') {
      navigate('/memories');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#DADCE0] bg-[#FFFFFF]/95 px-4 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="inline-flex lg:hidden items-center justify-center rounded-lg border border-[#DADCE0] bg-[#FFFFFF] p-2 text-[#5F6368] hover:bg-[#F8F9FA]"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-[#80868B]">
            <span className="truncate">{meta.section}</span>
            <span aria-hidden="true">/</span>
            <span className="truncate text-[#5F6368]">{meta.title}</span>
          </div>
          <h1 className="truncate text-sm font-semibold text-[#202124] lg:text-base">
            {meta.title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#80868B]" />
          <input
            type="search"
            value={localInput}
            onChange={(e) => {
              setLocalInput(e.target.value);
              setGlobalSearch(e.target.value);
            }}
            placeholder="Search emails, chats, deadlines, memories..."
            className="w-60 xl:w-80 rounded-full border border-transparent bg-[#F1F3F4] py-1.5 pl-8 pr-3 text-xs text-[#202124] placeholder:text-[#80868B] focus:border-[#1A73E8] focus:bg-[#FFFFFF] focus:shadow-xs focus:outline-none transition-all"
          />
        </form>

        <button
          onClick={() => navigate('/ask')}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA] whitespace-nowrap shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#5E35B1]" />
          Ask AI
        </button>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#1765CC] whitespace-nowrap shrink-0 shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Import</span>
        </button>

        <button
          onClick={() => navigate('/notifications')}
          className="relative inline-flex items-center justify-center rounded-lg border border-[#DADCE0] bg-[#FFFFFF] p-2 text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124]"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1A73E8] px-1 font-mono text-[10px] font-semibold tabular-nums text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="shrink-0 rounded-full border border-[#DADCE0] p-0.5 hover:border-[#1A73E8] transition-colors"
          aria-label="Settings"
          title={`${user.name} · Settings`}
        >
          <img
            src={user.avatarUrl}
            alt={user.name}
            referrerPolicy="no-referrer"
            className="h-7 w-7 rounded-full object-cover"
          />
        </button>
      </div>
    </header>
  );
};
