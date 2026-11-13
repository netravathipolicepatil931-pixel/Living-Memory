import React from 'react';

interface PageHeaderProps {
  kicker?: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  demoBanner?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  subtitle,
  actions,
  demoBanner,
}) => {
  return (
    <div className="space-y-3 border-b border-[var(--border-subtle)] pb-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          {kicker && (
            <p className="text-xs font-medium text-[var(--accent-primary)]">{kicker}</p>
          )}
          <h2 className="mt-1 font-serif-editorial text-2xl tracking-tight text-[var(--text-primary)] lg:text-[28px]">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">{subtitle}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
      </div>

      {demoBanner && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--nav-active-bg)] px-3.5 py-2 text-xs text-[var(--text-primary)]">
          <span className="font-semibold text-[var(--accent-primary)]">Demo Data: </span>
          {demoBanner}
        </div>
      )}
    </div>
  );
};
