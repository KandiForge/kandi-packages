import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'kandi-login Next.js Example',
  description: 'Reference implementation of kandi-login in a Next.js app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#050505',
          color: '#e0e0e0',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
