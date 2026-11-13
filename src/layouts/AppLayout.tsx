import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNav } from '../components/layout/TopNav';
import { ToastContainer } from '../components/common/ToastContainer';
import { MemoryDrawer } from '../components/memory/MemoryDrawer';
import { QuickUploadModal } from '../components/sources/QuickUploadModal';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 pt-6 pb-20 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileBottomNav />
      <MemoryDrawer />
      <QuickUploadModal />
      <ToastContainer />
    </div>
  );
};
