import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const url = 
    (typeof window !== 'undefined' ? localStorage.getItem('mocinhas_supabase_url') : null) ||
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    '';

  const anonKey = 
    (typeof window !== 'undefined' ? localStorage.getItem('mocinhas_supabase_anon_key') : null) ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    '';

  return { url: url.trim(), anonKey: anonKey.trim() };
}

export function checkIsConfigured(): boolean {
  const { url, anonKey } = getStoredSupabaseConfig();
  return Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    !url.includes('YOUR_')
  );
}

// Export boolean property for backwards compatibility
export const isSupabaseClientConfigured: boolean = checkIsConfigured();

let activeClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabase(): SupabaseClient | null {
  if (!checkIsConfigured()) {
    activeClient = null;
    return null;
  }

  const { url, anonKey } = getStoredSupabaseConfig();

  if (!activeClient || lastUrl !== url || lastKey !== anonKey) {
    lastUrl = url;
    lastKey = anonKey;
    activeClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return activeClient;
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mocinhas_supabase_url', url.trim());
    localStorage.setItem('mocinhas_supabase_anon_key', anonKey.trim());
    activeClient = null;
    getSupabase();
    window.dispatchEvent(new CustomEvent('mocinhas:supabase-configured'));
  }
}

// Proxy/Singleton instance to maintain full backwards compatibility with existing imports
export const supabase: SupabaseClient | null = new Proxy({} as any, {
  get(_target, prop) {
    const client = getSupabase();
    if (!client) return undefined;
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

// Auto-sync Supabase config from server if available and not configured locally
if (typeof window !== 'undefined' && !checkIsConfigured()) {
  fetch('/api/supabase/public-config')
    .then((r) => r.json())
    .then((data) => {
      if (data?.url && data?.anonKey) {
        saveSupabaseConfig(data.url, data.anonKey);
      }
    })
    .catch(() => {});
}
