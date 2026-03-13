import { PackageCard } from '@/components/PackageCard';

const packages = [
  {
    name: 'kandi-login',
    description:
      'Multi-platform authentication framework. 5 Client SDKs connect to 1 server SDK — Web, Electron, Tauri, iOS, and Android.',
    version: '0.1.0',
    href: '/packages/kandi-login',
    accentColor: '#00D9FF',
    icon: '🔐',
    tags: ['React', 'Electron', 'Tauri', 'iOS', 'Android', 'OAuth', 'JWT', '5 Client SDKs'],
    testCount: 12,
  },
];

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      {/* Hero */}
      <section className="mb-16 animate-fade-up">
        <h1
          className="font-bold tracking-tight mb-4"
          style={{
            fontSize: 'clamp(2rem, 4vw + 0.5rem, 3.5rem)',
            lineHeight: 1.1,
          }}
        >
          Kandi{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #b177ff, #00D9FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Packages
          </span>
        </h1>
        <p
          className="text-[var(--text-secondary)] max-w-2xl"
          style={{ fontSize: 'clamp(1rem, 0.5vw + 0.75rem, 1.25rem)' }}
        >
          Reusable open-source components for authentication, UI, and more.
          Built and maintained by KandiForge. Each package includes a live test
          dashboard to verify integrations.
        </p>
      </section>

      {/* Package Grid */}
      <section>
        <h2 className="text-[var(--text-muted)] text-xs font-semibold tracking-widest uppercase mb-6">
          Packages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <PackageCard key={pkg.name} {...pkg} />
          ))}
        </div>
      </section>
    </div>
  );
}
