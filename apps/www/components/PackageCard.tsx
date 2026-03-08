'use client';

import Link from 'next/link';

interface PackageCardProps {
  name: string;
  description: string;
  version: string;
  href: string;
  accentColor: string;
  icon: string;
  tags: string[];
  testCount?: number;
  passCount?: number;
}

export function PackageCard({
  name,
  description,
  version,
  href,
  accentColor,
  icon,
  tags,
  testCount,
  passCount,
}: PackageCardProps) {
  const allPassing = testCount !== undefined && passCount === testCount;

  return (
    <Link href={href} className="block no-underline group">
      <div className="glass-panel p-6 h-full flex flex-col gap-4 transition-transform duration-300 group-hover:scale-[1.02]">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{
              background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`,
              border: `1px solid ${accentColor}33`,
            }}
          >
            {icon}
          </div>
          <span
            className="text-xs font-mono px-2 py-1 rounded-md"
            style={{
              background: `${accentColor}15`,
              color: accentColor,
              border: `1px solid ${accentColor}30`,
            }}
          >
            v{version}
          </span>
        </div>

        {/* Title + Description */}
        <div>
          <h3 className="text-[var(--text-primary)] font-semibold text-lg mb-1">
            {name}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-muted)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Test Status Footer */}
        {testCount !== undefined && (
          <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              {testCount} tests
            </span>
            <span
              className={`status-badge ${allPassing ? 'status-badge--pass' : 'status-badge--pending'}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{
                  background: allPassing ? '#00cc84' : '#b177ff',
                }}
              />
              {allPassing ? 'All passing' : 'Run tests'}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
