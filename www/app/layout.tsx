import type { Metadata } from 'next';
import './globals.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource-variable/inter';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: {
    default: 'Kandi Packages — Open-Source Components by KandiForge',
    template: '%s · Kandi Packages',
  },
  description:
    'Reusable open-source packages for authentication, UI, and more. Built and maintained by KandiForge.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="min-h-screen pt-16">{children}</main>
      </body>
    </html>
  );
}
