'use client';

import React from 'react';
import { useAuth } from 'kandi-login';
import { MuiLoginChip } from 'kandi-login/react/mui';
import Providers from './providers';

const configSnippet = `const authConfig = {
  // Point this to your own kandi-login server
  authServerUrl: 'https://kandi-packages-api.vercel.app',
  providers: [
    { id: 'google', name: 'Google' },
    { id: 'apple', name: 'Apple' },
  ],
};`;

function DemoContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
      {/* Banner */}
      <div
        style={{
          padding: '12px 16px',
          marginBottom: 32,
          borderRadius: 8,
          backgroundColor: 'rgba(255, 180, 0, 0.1)',
          border: '1px solid rgba(255, 180, 0, 0.3)',
          color: '#ffb400',
          fontSize: 14,
        }}
      >
        Change <code style={{ fontWeight: 600 }}>authServerUrl</code> to point
        to your own server
      </div>

      {/* Header */}
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        kandi-login
      </h1>
      <p style={{ color: '#999', marginBottom: 32 }}>
        Next.js example &mdash; reference implementation
      </p>

      {/* Login Chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 40,
        }}
      >
        <span style={{ fontSize: 14, color: '#888' }}>MuiLoginChip:</span>
        <MuiLoginChip
          providers={[
            { id: 'google', name: 'Google' },
            { id: 'apple', name: 'Apple' },
          ]}
        />
      </div>

      {/* User Info */}
      {isLoading && (
        <p style={{ color: '#666', fontSize: 14 }}>Restoring session...</p>
      )}

      {isAuthenticated && user && (
        <div
          style={{
            padding: 20,
            borderRadius: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: 32,
          }}
        >
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>
            Logged in
          </h3>
          <table style={{ fontSize: 14, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 16px 4px 0', color: '#888' }}>
                  Name
                </td>
                <td>{user.name ?? user.display_name ?? '-'}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 16px 4px 0', color: '#888' }}>
                  Email
                </td>
                <td>{user.email}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 16px 4px 0', color: '#888' }}>ID</td>
                <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {user.id}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Config Snippet */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        Configuration
      </h2>
      <pre
        style={{
          padding: 20,
          borderRadius: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'auto',
          fontSize: 13,
          lineHeight: 1.6,
          color: '#c8c8c8',
        }}
      >
        {configSnippet}
      </pre>
    </div>
  );
}

export default function Page() {
  return (
    <Providers>
      <DemoContent />
    </Providers>
  );
}
