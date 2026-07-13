import { cookies } from 'next/headers';
import { UserRole } from '@prisma/client';
import { validateProductionEnvironment } from '@/lib/runtime';

export type SessionUser = {
  id: string;
  role: UserRole;
  fullName: string;
};

const SESSION_COOKIE_NAME = 'haland_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getSessionSecret() {
  const configuredSecret = process.env.SESSION_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'dev-session-secret-at-least-32-chars';
  }

  validateProductionEnvironment();
  throw new Error('SESSION_SECRET must be configured');
}

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function sign(payload: string) {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
}

function getSessionExpiry() {
  return Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
}

export async function encodeSession(session: SessionUser) {
  const payload = encodeBase64Url(JSON.stringify({ ...session, exp: getSessionExpiry() }));
  return `${payload}.${await sign(payload)}`;
}

export async function decodeSession(token?: string | null): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = await sign(payload);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const decoded = decodeBase64Url(payload);
    const parsed = JSON.parse(decoded) as SessionUser & { exp?: number };
    if (!parsed.id || !parsed.role || !parsed.fullName || typeof parsed.exp !== 'number' || parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { id: parsed.id, role: parsed.role, fullName: parsed.fullName };
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return decodeSession(token);
}

export async function setSessionCookie(session: SessionUser) {
  const cookieStore = await cookies();
  const token = await encodeSession(session);
  const isProduction = process.env.NODE_ENV === 'production';
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    priority: 'high',
    partitioned: isProduction,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    expires: new Date(0),
    priority: 'high',
    partitioned: isProduction,
  });
}
