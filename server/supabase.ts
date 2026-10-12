import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    try {
      require('dotenv').config({ path: path.join(process.cwd(), '.env') });
    } catch {}
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.trim().startsWith('https://') && !url.includes('YOUR_'));
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseClient) {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)!.trim();
    const key = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!.trim();
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
      },
    });
  }
  return supabaseClient;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseAdminClient) {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)!.trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)!.trim();
    supabaseAdminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseAdminClient;
}

export function updateSupabaseCredentials(url: string, key: string, serviceRoleKey?: string): { success: boolean; message: string } {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();
  const cleanServiceKey = (serviceRoleKey || '').trim();

  process.env.SUPABASE_URL = cleanUrl;
  process.env.VITE_SUPABASE_URL = cleanUrl;
  process.env.SUPABASE_ANON_KEY = cleanKey;
  process.env.VITE_SUPABASE_ANON_KEY = cleanKey;
  if (cleanServiceKey) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = cleanServiceKey;
  }

  // Invalidate cached clients
  supabaseClient = null;
  supabaseAdminClient = null;

  // Persist to .env
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    const lines = envContent.split('\n');
    const newVars: Record<string, string> = {
      SUPABASE_URL: cleanUrl,
      SUPABASE_ANON_KEY: cleanKey,
      VITE_SUPABASE_URL: cleanUrl,
      VITE_SUPABASE_ANON_KEY: cleanKey,
    };
    if (cleanServiceKey) {
      newVars.SUPABASE_SERVICE_ROLE_KEY = cleanServiceKey;
    }

    const updatedLines = lines.filter(l => {
      const keyName = l.split('=')[0]?.trim();
      return !Object.keys(newVars).includes(keyName);
    });

    for (const [k, v] of Object.entries(newVars)) {
      updatedLines.push(`${k}="${v}"`);
    }

    fs.writeFileSync(envPath, updatedLines.join('\n') + '\n', 'utf-8');
  } catch (e) {
    console.warn('Não foi possível gravar no arquivo .env:', e);
  }

  return { success: true, message: 'Credenciais do Supabase configuradas com sucesso!' };
}

export async function checkSupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  url?: string;
  tablesFound?: string[];
  tablesMissing?: string[];
  error?: string;
}> {
  const configured = isSupabaseConfigured();
  if (!configured) {
    return {
      configured: false,
      connected: false,
      error: 'Variáveis de ambiente do Supabase (SUPABASE_URL e SUPABASE_ANON_KEY) ainda não preenchidas.',
    };
  }

  try {
    const client = getSupabase();
    if (!client) throw new Error('Falha ao instanciar cliente Supabase');

    const expectedTables = ['profiles', 'categories', 'posts', 'comments', 'likes', 'stories', 'messages'];
    const tablesFound: string[] = [];
    const tablesMissing: string[] = [];

    // Test tables
    for (const table of expectedTables) {
      const { error } = await client.from(table).select('id').limit(1);
      if (!error || error.code === 'PGRST116') {
        tablesFound.push(table);
      } else if (error.message.includes('does not exist') || error.code === '42P01') {
        tablesMissing.push(table);
      } else {
        // Can read or table exists with RLS
        tablesFound.push(table);
      }
    }

    const hasTables = tablesFound.length > 0;

    return {
      configured: true,
      connected: true,
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      tablesFound,
      tablesMissing,
      error: tablesMissing.length > 0
        ? `Tabelas pendentes: ${tablesMissing.join(', ')}. Execute o arquivo supabase_schema.sql no SQL Editor do Supabase.`
        : undefined,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      error: err.message || 'Erro ao conectar ao Supabase',
    };
  }
}
