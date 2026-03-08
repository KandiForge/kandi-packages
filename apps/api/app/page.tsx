export default function ApiRoot() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Kandi Packages API</h1>
      <p>Auth endpoints are at <code>/api/auth/*</code></p>
      <ul>
        <li><code>GET /api/auth/login?provider=google</code></li>
        <li><code>GET /api/auth/callback</code></li>
        <li><code>POST /api/auth/native</code></li>
        <li><code>POST /api/auth/refresh</code></li>
        <li><code>GET /api/auth/validate</code></li>
        <li><code>POST /api/auth/logout</code></li>
        <li><code>POST /api/auth/test/seed</code></li>
        <li><code>GET /api/auth/test/personas</code></li>
        <li><code>POST /api/auth/test/login-as</code></li>
      </ul>
    </div>
  );
}
