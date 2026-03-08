import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth-server';
import type { AuthRequest, AuthResponse, AuthHandler } from 'kandi-login/server';

function getRoutes(): Record<string, { handler: AuthHandler; methods: string[] }> {
  const auth = getAuth();
  const routes: Record<string, { handler: AuthHandler; methods: string[] }> = {
    login: { handler: auth.handleLogin, methods: ['GET'] },
    callback: { handler: auth.handleCallback, methods: ['GET'] },
    native: { handler: auth.handleNativeLogin, methods: ['POST'] },
    refresh: { handler: auth.handleRefresh, methods: ['POST'] },
    validate: { handler: auth.handleValidate, methods: ['GET'] },
    logout: { handler: auth.handleLogout, methods: ['POST'] },
  };

  if (auth.handleSeedPersonas) {
    routes['test/seed'] = { handler: auth.handleSeedPersonas, methods: ['POST'] };
  }
  if (auth.handleListPersonas) {
    routes['test/personas'] = { handler: auth.handleListPersonas, methods: ['GET'] };
  }
  if (auth.handleLoginAs) {
    routes['test/login-as'] = { handler: auth.handleLoginAs, methods: ['POST'] };
  }

  return routes;
}

function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  const routeKey = path.join('/');
  const routes = getRoutes();
  const route = routes[routeKey];

  if (!route) {
    return addCorsHeaders(
      NextResponse.json({ error: `Unknown route: /auth/${routeKey}` }, { status: 404 })
    );
  }

  if (!route.methods.includes(request.method)) {
    return addCorsHeaders(
      NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    );
  }

  const url = new URL(request.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body: unknown;
  if (request.method === 'POST') {
    try {
      body = await request.json();
    } catch {
      body = {};
    }
  }

  const authReq: AuthRequest = {
    method: request.method,
    url: request.url,
    query,
    headers,
    body,
  };

  let statusCode = 200;
  let responseBody: unknown = null;
  let redirectUrl: string | null = null;
  const responseHeaders: Record<string, string> = {};

  const authRes: AuthResponse = {
    status(code) {
      statusCode = code;
      return authRes;
    },
    json(data) {
      responseBody = data;
    },
    redirect(redirectTo) {
      redirectUrl = redirectTo;
      statusCode = 302;
    },
    send(data) {
      responseBody = data;
    },
    setHeader(name, value) {
      responseHeaders[name] = value;
      return authRes;
    },
  };

  await route.handler(authReq, authRes);

  let response: NextResponse;
  if (redirectUrl) {
    response = NextResponse.redirect(redirectUrl, statusCode as 301 | 302 | 303 | 307 | 308);
  } else if (typeof responseBody === 'string') {
    response = new NextResponse(responseBody, { status: statusCode });
  } else {
    response = NextResponse.json(responseBody ?? {}, { status: statusCode });
  }

  for (const [name, value] of Object.entries(responseHeaders)) {
    response.headers.set(name, value);
  }

  return addCorsHeaders(response);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context);
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 204 }));
}
