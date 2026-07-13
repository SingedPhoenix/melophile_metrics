import type { ReactNode } from 'react';

export type AppSection = {
  key: string;
  name: string;
  description: string;
  icon: string;
};

type AppShellProps<SectionKey extends string> = {
  activeSection: SectionKey | 'home';
  children: ReactNode;
  sections: readonly AppSection[];
  onNavigate: (section: SectionKey | 'home') => void;
  onPreviewSection?: (section: SectionKey | 'home') => void;
};

function AppShell<SectionKey extends string>({
  activeSection,
  children,
  sections,
  onNavigate,
  onPreviewSection
}: AppShellProps<SectionKey>) {
  const isHome = activeSection === 'home';

  return (
    <main className="app-shell">
      <header className="brand-header">
        <p className="brand-name">
          <span className="brand-name-melophile">melophile</span>{' '}
          <span className="brand-name-metrics">metrics</span>
        </p>
        <p className="brand-subtitle">your listening, quantified</p>
        <p className="brand-note">desktop listening archive</p>
      </header>

      {!isHome && (
        <nav className="shell-nav" aria-label="Sections">
          <button className="back-button" type="button" onClick={() => onNavigate('home')}>
            sections
          </button>
          <div className="shell-nav-items">
            {sections.map(section => {
              const isActive = activeSection === section.key;
              return (
                <button
                  aria-current={isActive ? 'page' : undefined}
                  className={isActive ? 'shell-nav-button active' : 'shell-nav-button'}
                  key={section.key}
                  type="button"
                  onFocus={() => onPreviewSection?.(section.key as SectionKey)}
                  onMouseEnter={() => onPreviewSection?.(section.key as SectionKey)}
                  onClick={() => onNavigate(section.key as SectionKey)}
                >
                  {section.name}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {children}
    </main>
  );
}

export default AppShell;
