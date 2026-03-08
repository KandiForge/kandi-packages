'use client';

import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50 px-6 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 no-underline">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, #b177ff 0%, #00D9FF 100%)',
          }}
        >
          K
        </div>
        <span className="text-[var(--text-primary)] font-semibold text-lg tracking-tight">
          Kandi Packages
        </span>
      </Link>

      <div className="flex items-center gap-6">
        <a
          href="https://github.com/KandiForge/kandi-packages"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
        >
          GitHub
        </a>
        <a
          href="https://www.npmjs.com/org/kandiforge"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
        >
          npm
        </a>
      </div>
    </nav>
  );
}
