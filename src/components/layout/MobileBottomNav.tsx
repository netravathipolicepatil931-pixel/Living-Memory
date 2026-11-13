import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarClock, FolderOpen, Layers, LayoutDashboard, Sparkles } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const items = [
    { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/information', label: 'Info', icon: FolderOpen },
    { to: '/deadlines', label: 'Deadlines', icon: CalendarClock },
    { to: '/memories', label: 'Memories', icon: Layers },
    { to: '/ask', label: 'Ask AI', icon: Sparkles },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around border-t border-[#DADCE0] bg-[#FFFFFF]/95 px-2 backdrop-blur-md lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors ${
                isActive ? 'bg-[#E8F0FE] text-[#1A73E8]' : 'text-[#5F6368]'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
