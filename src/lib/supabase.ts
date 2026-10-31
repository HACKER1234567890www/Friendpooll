import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Checks if a configuration value contains placeholder text or instructions.
 */
export function isPlaceholderValue(val: unknown): boolean {
  if (!val || typeof val !== 'string') return true;
  const trimmed = val.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();

  const knownPlaceholders = [
    'project url above',
    'anon api key above',
    'anon key above',
    'your-project',
    'your-anon-key',
    'my_supabase_url',
    'my_supabase_anon_key',
    'placeholder',
    'example.com',
    'project%20url%20above',
    'none',
    'null',
    'undefined',
    '<project-id>',
    '<project url above>',
    '<your-anon-key>',
  ];

  if (knownPlaceholders.some((ph) => lower.includes(ph))) return true;
  if (/^<.*>$/.test(trimmed)) return true;
  if (lower.includes('above') && (lower.includes('url') || lower.includes('key') || lower.includes('project'))) {
    return true;
  }

  return false;
}

/**
 * Sanitizes and validates a Supabase project URL.
 * Accepts:
 * - Full URLs: https://<project-ref>.supabase.co
 * - Bare project domains: <project-ref>.supabase.co
 * - Bare project reference IDs: <project-ref> (at least 15 alphanumeric chars)
 * - Local development: http://localhost:54321 or http://127.0.0.1:54321
 * Rejects placeholder text, malformed domains, and non-HTTP/HTTPS URLs.
 */
export function sanitizeSupabaseUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/^["'\s]+|["'\s]+$/g, '');

  if (!trimmed || isPlaceholderValue(trimmed)) {
    return null;
  }

  // Reject strings containing spaces or percent-encoded spaces
  if (trimmed.includes(' ') || trimmed.includes('%20')) {
    return null;
  }

  let candidate = trimmed;
  if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
    // Check if it's a bare project reference (standard Supabase project IDs are 20 alphanumeric chars)
    if (/^[a-z0-9_-]{12,40}$/i.test(candidate)) {
      candidate = `https://${candidate}.supabase.co`;
    } else if (candidate.includes('.supabase.co')) {
      candidate = `https://${candidate}`;
    } else {
      return null;
    }
  }

  try {
    const parsed = new URL(candidate);
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    // Must be HTTPS in production; HTTP allowed strictly for local Supabase emulator
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocal)) {
      return null;
    }

    if (!parsed.hostname || isPlaceholderValue(parsed.hostname)) {
      return null;
    }

    // Supabase standard hosted domains: <ref>.supabase.co
    if (parsed.hostname.endsWith('.supabase.co')) {
      const subdomain = parsed.hostname.replace('.supabase.co', '');
      if (!/^[a-z0-9_-]+$/i.test(subdomain) || subdomain.length < 5 || isPlaceholderValue(subdomain)) {
        return null;
      }
      return parsed.origin;
    }

    // Allow custom domains (valid FQDN with at least one dot)
    if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(parsed.hostname)) {
      return parsed.origin;
    }

    if (isLocal) {
      return parsed.origin;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Sanitizes and validates a Supabase anon public key.
 * Supabase anon keys are JWTs (3 dot-separated base64 segments) or modern publishable keys.
 */
export function sanitizeSupabaseAnonKey(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/^["'\s]+|["'\s]+$/g, '');

  if (!trimmed || isPlaceholderValue(trimmed)) {
    return null;
  }

  // Check for standard Supabase JWT format (header.payload.signature)
  const jwtParts = trimmed.split('.');
  const isJwt = jwtParts.length === 3 && jwtParts[0].length >= 10 && jwtParts[1].length >= 10;

  // Modern Supabase publishable keys start with sbp_ or sb_publishable_
  const isPublishableKey = /^(sbp_|sb_publishable_)[a-zA-Z0-9_-]{20,}$/.test(trimmed);

  if ((isJwt || isPublishableKey) && trimmed.length >= 30) {
    return trimmed;
  }

  return null;
}

const LOCAL_STORAGE_URL_KEY = 'friendpool_supabase_custom_url';
const LOCAL_STORAGE_ANON_KEY = 'friendpool_supabase_custom_anon_key';

export type SupabaseConnectionStatus =
  | 'unconfigured'       // Missing or placeholder credentials (local simulation mode)
  | 'invalid_format'     // Malformed or placeholder URL/key
  | 'connecting'         // Valid syntax, currently pinging Supabase
  | 'connected'          // Successfully verified active connection with Supabase
  | 'connection_error';  // Valid syntax, but Supabase server returned an error or was unreachable

export interface SupabaseConfigState {
  client: SupabaseClient | null;
  isConfigured: boolean;
  isVerified: boolean;
  status: SupabaseConnectionStatus;
  projectUrl: string | null;
  statusMessage: string;
  isUsingCustomOverride: boolean;
  rawEnvUrlIsPlaceholder: boolean;
}

const memoryStorage = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStorage.get(key) || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
  memoryStorage.set(key, value);
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  memoryStorage.delete(key);
}

function resolveCredentials(): {
  url: string | null;
  key: string | null;
  isCustom: boolean;
  rawEnvUrlIsPlaceholder: boolean;
} {
  const rawEnvUrl =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SUPABASE_URL
      : typeof process !== 'undefined' && process.env
      ? process.env.VITE_SUPABASE_URL
      : null;

  const rawEnvKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_SUPABASE_ANON_KEY
      : typeof process !== 'undefined' && process.env
      ? process.env.VITE_SUPABASE_ANON_KEY
      : null;

  const rawEnvUrlIsPlaceholder = isPlaceholderValue(rawEnvUrl);

  const envUrl = sanitizeSupabaseUrl(rawEnvUrl);
  const envKey = sanitizeSupabaseAnonKey(rawEnvKey);

  // Check storage for manual overrides
  let customUrl: string | null = null;
  let customKey: string | null = null;

  const storedUrl = safeGetItem(LOCAL_STORAGE_URL_KEY);
  const storedKey = safeGetItem(LOCAL_STORAGE_ANON_KEY);

  if (storedUrl) {
    const sanitized = sanitizeSupabaseUrl(storedUrl);
    if (sanitized) {
      customUrl = sanitized;
    } else {
      safeRemoveItem(LOCAL_STORAGE_URL_KEY);
    }
  }

  if (storedKey) {
    const sanitized = sanitizeSupabaseAnonKey(storedKey);
    if (sanitized) {
      customKey = sanitized;
    } else {
      safeRemoveItem(LOCAL_STORAGE_ANON_KEY);
    }
  }

  if (customUrl && customKey) {
    return {
      url: customUrl,
      key: customKey,
      isCustom: true,
      rawEnvUrlIsPlaceholder,
    };
  }

  return {
    url: envUrl,
    key: envKey,
    isCustom: false,
    rawEnvUrlIsPlaceholder,
  };
}

// Current singleton state
let currentCredentials = resolveCredentials();
let activeClient: SupabaseClient | null = null;

if (currentCredentials.url && currentCredentials.key) {
  try {
    activeClient = createClient(currentCredentials.url, currentCredentials.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('Supabase client initialization skipped:', err);
    activeClient = null;
  }
}

let currentStatus: SupabaseConnectionStatus = !activeClient
  ? 'unconfigured'
  : 'connecting';
let currentStatusMessage = !activeClient
  ? 'Simulation mode active (local storage)'
  : 'Connecting to Supabase...';
let isVerifiedActive = false;

// Event listeners for state changes
type Listener = (state: SupabaseConfigState) => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  const snapshot = getSupabaseStateSnapshot();
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      // ignore listener error
    }
  });
}

export function getSupabaseStateSnapshot(): SupabaseConfigState {
  return {
    client: activeClient,
    isConfigured: Boolean(activeClient && currentCredentials.url),
    isVerified: isVerifiedActive,
    status: currentStatus,
    projectUrl: currentCredentials.url,
    statusMessage: currentStatusMessage,
    isUsingCustomOverride: currentCredentials.isCustom,
    rawEnvUrlIsPlaceholder: currentCredentials.rawEnvUrlIsPlaceholder,
  };
}

export function subscribeSupabaseState(fn: Listener): () => void {
  listeners.add(fn);
  fn(getSupabaseStateSnapshot());
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Actively probes the Supabase endpoint to verify that credentials are valid and reachable.
 */
export async function verifySupabaseConnection(): Promise<{
  ok: boolean;
  status: SupabaseConnectionStatus;
  message: string;
}> {
  if (!activeClient || !currentCredentials.url) {
    currentStatus = 'unconfigured';
    isVerifiedActive = false;
    currentStatusMessage = 'No active Supabase configuration (Simulation Mode).';
    notifyListeners();
    return { ok: false, status: currentStatus, message: currentStatusMessage };
  }

  currentStatus = 'connecting';
  currentStatusMessage = 'Verifying connection to Supabase Cloud...';
  notifyListeners();

  try {
    // Probe 1: Check client auth session health
    const { error: sessionError } = await activeClient.auth.getSession();
    if (sessionError && !sessionError.message.includes('Auth session missing')) {
      currentStatus = 'connection_error';
      isVerifiedActive = false;
      currentStatusMessage = `Supabase Auth error: ${sessionError.message}`;
      notifyListeners();
      return { ok: false, status: currentStatus, message: currentStatusMessage };
    }

    // Probe 2: Try reaching the Supabase endpoint
    let reachable = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${currentCredentials.url}/auth/v1/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok || res.status === 200 || res.status === 404 || res.status === 401) {
        reachable = true;
      }
    } catch {
      // Network probe via fetch might be blocked by CORS on some projects; test via database RPC/table check
      const { error: dbError } = await activeClient
        .from('profiles')
        .select('user_id', { count: 'exact', head: true });
      // If dbError is null or a standard Postgres/RLS response (code defined), server is reached
      if (!dbError || Boolean(dbError?.code)) {
        reachable = true;
      }
    }

    if (reachable) {
      currentStatus = 'connected';
      isVerifiedActive = true;
      currentStatusMessage = 'Verified connection to Supabase Cloud.';
      notifyListeners();
      return { ok: true, status: currentStatus, message: currentStatusMessage };
    } else {
      currentStatus = 'connection_error';
      isVerifiedActive = false;
      currentStatusMessage = 'Could not reach Supabase Cloud server. Please check network or project status.';
      notifyListeners();
      return { ok: false, status: currentStatus, message: currentStatusMessage };
    }
  } catch (err: any) {
    currentStatus = 'connection_error';
    isVerifiedActive = false;
    currentStatusMessage = err?.message || 'Connection verification failed.';
    notifyListeners();
    return { ok: false, status: currentStatus, message: currentStatusMessage };
  }
}

// Auto-trigger background verification if client is configured
if (activeClient && typeof window !== 'undefined') {
  setTimeout(() => {
    verifySupabaseConnection();
  }, 100);
}

/**
 * Re-evaluates configuration and reinitializes the Supabase client.
 */
function reinitializeClient(): void {
  currentCredentials = resolveCredentials();
  if (currentCredentials.url && currentCredentials.key) {
    try {
      activeClient = createClient(currentCredentials.url, currentCredentials.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      currentStatus = 'connecting';
      currentStatusMessage = 'Connecting...';
      isVerifiedActive = false;
      setTimeout(() => {
        verifySupabaseConnection();
      }, 50);
    } catch {
      activeClient = null;
      currentStatus = 'invalid_format';
      currentStatusMessage = 'Failed to create Supabase client with provided credentials.';
      isVerifiedActive = false;
    }
  } else {
    activeClient = null;
    currentStatus = 'unconfigured';
    currentStatusMessage = 'Running in local simulation mode.';
    isVerifiedActive = false;
  }
  supabase = activeClient;
  isSupabaseConfigured = Boolean(activeClient && currentCredentials.url);
  supabaseProjectUrl = currentCredentials.url;
  notifyListeners();
}

/**
 * Save manual credentials (e.g. from connection modal).
 */
export function saveCustomSupabaseCredentials(url: string, key: string): boolean {
  const sanitizedUrl = sanitizeSupabaseUrl(url);
  const sanitizedKey = sanitizeSupabaseAnonKey(key);

  if (!sanitizedUrl || !sanitizedKey) {
    return false;
  }

  safeSetItem(LOCAL_STORAGE_URL_KEY, sanitizedUrl);
  safeSetItem(LOCAL_STORAGE_ANON_KEY, sanitizedKey);
  reinitializeClient();
  return true;
}

/**
 * Clears any manual local overrides and restores environment configuration.
 */
export function clearCustomSupabaseCredentials(): void {
  safeRemoveItem(LOCAL_STORAGE_URL_KEY);
  safeRemoveItem(LOCAL_STORAGE_ANON_KEY);
  reinitializeClient();
}

// Live binding exports
export let supabase: SupabaseClient | null = activeClient;
export let isSupabaseConfigured: boolean = Boolean(activeClient && currentCredentials.url);
export let supabaseProjectUrl: string | null = currentCredentials.url;

export function getSupabaseClient(): SupabaseClient | null {
  return activeClient;
}

/**
 * Resolves the appropriate redirect URL for Supabase email authentication callbacks.
 * Uses window.location.origin in the browser so verification links redirect back
 * to the currently running deployment origin (not localhost:3000), with the
 * Cloud Run production deployment URL as the canonical fallback.
 */
export function getAuthRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://friendpool-612854878146.asia-south1.run.app';
}
