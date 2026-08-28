import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Theme, ChallengeItem } from '../types';
import { DEFAULT_THEMES, DEFAULT_CHALLENGES } from '../data/seedData';

// Get Supabase credentials from environment or localStorage fallback configuration
const envSupabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || '';
const envSupabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = envSupabaseUrl || (typeof window !== 'undefined' ? localStorage.getItem('supabase_custom_url') || '' : '');
  const key = envSupabaseAnonKey || (typeof window !== 'undefined' ? localStorage.getItem('supabase_custom_key') || '' : '');

  if (url && key && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, key, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      return supabaseInstance;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

export function setCustomSupabaseCredentials(url: string, key: string): boolean {
  if (typeof window !== 'undefined') {
    try {
      if (url && key) {
        localStorage.setItem('supabase_custom_url', url.trim());
        localStorage.setItem('supabase_custom_key', key.trim());
      } else {
        localStorage.removeItem('supabase_custom_url');
        localStorage.removeItem('supabase_custom_key');
      }
      supabaseInstance = null; // reset client to re-instantiate
      return isSupabaseConfigured();
    } catch {
      return false;
    }
  }
  return false;
}

export function getActiveSupabaseConfig(): { url: string; hasKey: boolean; isEnv: boolean } {
  const isEnv = Boolean(envSupabaseUrl && envSupabaseAnonKey);
  const url = envSupabaseUrl || (typeof window !== 'undefined' ? localStorage.getItem('supabase_custom_url') || '' : '');
  const key = envSupabaseAnonKey || (typeof window !== 'undefined' ? localStorage.getItem('supabase_custom_key') || '' : '');

  return {
    url,
    hasKey: Boolean(key),
    isEnv,
  };
}

// ----------------------------------------------------
// SQL Schema definition for Supabase Database
// ----------------------------------------------------
export const SUPABASE_SQL_SCHEMA = `-- ==========================================
-- SCHEMA DO SUPABASE PARA IMAGEM & AÇÃO
-- Cole e execute no Editor SQL do Supabase
-- ==========================================

-- 1. Tabela de Salas de Jogo em Tempo Real (Cross-device Sync)
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code TEXT UNIQUE NOT NULL,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Temas Customizados
CREATE TABLE IF NOT EXISTS public.custom_themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '🎨',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Palavras / Desafios
CREATE TABLE IF NOT EXISTS public.custom_words (
    id TEXT PRIMARY KEY,
    theme_id TEXT NOT NULL,
    age_range_id TEXT NOT NULL,
    category TEXT NOT NULL,
    word TEXT NOT NULL,
    tip TEXT,
    difficulty TEXT DEFAULT 'facil',
    score INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Histórico de Partidas
CREATE TABLE IF NOT EXISTS public.match_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code TEXT,
    match_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Habilitar Segurança por Linha (RLS) com políticas de leitura/escrita aberta para o jogo
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso publico para salas" ON public.game_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso publico para temas" ON public.custom_themes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso publico para palavras" ON public.custom_words FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso publico para historico" ON public.match_history FOR ALL USING (true) WITH CHECK (true);

-- 6. Habilitar Supabase Realtime para as Salas
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
`;

// ----------------------------------------------------
// Cloud Database Functions
// ----------------------------------------------------

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado. Adicione a URL e a Anon Key no painel ou no arquivo .env.',
    };
  }

  try {
    const { error } = await client.from('game_rooms').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Conectado ao Supabase! (Execute o script SQL para criar as tabelas).',
        };
      }
      return { success: false, message: `Erro ao conectar: ${error.message}` };
    }
    return { success: true, message: 'Conectado com sucesso ao Supabase e tabelas prontas!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Falha na conexão com Supabase.' };
  }
}

// Push all local themes and words to Supabase
export async function uploadLocalDataToSupabase(
  themes: Theme[],
  challenges: ChallengeItem[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, count: 0, error: 'Supabase desconectado' };

  try {
    // 1. Upload Themes
    if (themes.length > 0) {
      const themesPayload = themes.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        icon: t.icon,
        is_default: !t.isCustom,
      }));
      await client.from('custom_themes').upsert(themesPayload, { onConflict: 'id' });
    }

    // 2. Upload Challenges / Words
    if (challenges.length > 0) {
      const wordsPayload = challenges.map((c) => ({
        id: c.id,
        theme_id: c.themeId,
        age_range_id: c.ageRangeId,
        category: c.category,
        word: c.word,
        tip: c.hint || null,
        difficulty: 'padrao',
        score: c.score || 1,
      }));

      // Upsert in batches of 50
      for (let i = 0; i < wordsPayload.length; i += 50) {
        const batch = wordsPayload.slice(i, i + 50);
        await client.from('custom_words').upsert(batch, { onConflict: 'id' });
      }
    }

    return { success: true, count: challenges.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Erro ao sincronizar com Supabase' };
  }
}

// Download cloud themes and words into local state
export async function downloadCloudDataFromSupabase(): Promise<{
  themes: Theme[];
  challenges: ChallengeItem[];
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [themesRes, wordsRes] = await Promise.all([
      client.from('custom_themes').select('*'),
      client.from('custom_words').select('*'),
    ]);

    if (themesRes.error || wordsRes.error) {
      return null;
    }

    const fetchedThemes: Theme[] = (themesRes.data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon || '🎨',
      active: true,
      isCustom: !row.is_default,
    }));

    const fetchedChallenges: ChallengeItem[] = (wordsRes.data || []).map((row: any) => ({
      id: row.id,
      themeId: row.theme_id,
      ageRangeId: row.age_range_id,
      category: row.category,
      word: row.word,
      hint: row.tip || undefined,
      score: row.score || 1,
      active: true,
      createdAt: row.created_at || new Date().toISOString(),
    }));

    return {
      themes: fetchedThemes.length > 0 ? fetchedThemes : DEFAULT_THEMES,
      challenges: fetchedChallenges.length > 0 ? fetchedChallenges : DEFAULT_CHALLENGES,
    };
  } catch {
    return null;
  }
}
