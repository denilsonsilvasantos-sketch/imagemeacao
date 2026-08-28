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

export function generateCompleteSupabaseSql(themes: Theme[] = DEFAULT_THEMES, challenges: ChallengeItem[] = DEFAULT_CHALLENGES): string {
  const wordsSqlRows = challenges.map((c) => {
    const escapedWord = c.word.replace(/'/g, "''");
    const escapedHint = c.hint ? `'${c.hint.replace(/'/g, "''")}'` : 'NULL';
    const score = c.score || 1;
    return `('${c.id}', '${c.themeId}', '${c.ageRangeId}', '${c.category}', '${escapedWord}', ${escapedHint}, ${score}, true)`;
  }).join(',\n');

  const themesSqlRows = themes.map((t) => {
    const escapedName = t.name.replace(/'/g, "''");
    const escapedDesc = t.description ? `'${t.description.replace(/'/g, "''")}'` : 'NULL';
    const isDefault = !t.isCustom;
    return `('${t.id}', '${escapedName}', ${escapedDesc}, '${t.icon || '🎨'}', true, ${isDefault})`;
  }).join(',\n');

  return `-- ==============================================================================
-- IMAGEM & AÇÃO - SCRIPT COMPLETO DO BANCO DE DADOS SUPABASE (ESTRUTURA + SEED)
-- ==============================================================================
-- Execute este script completo no "SQL Editor" do seu painel Supabase (supabase.com)
-- Ele criará todas as tabelas, colunas, índices, políticas RLS, Realtime
-- e alimentará o banco com todos os Temas, Faixas Etárias, Categorias e ${challenges.length} Palavras.
-- ==============================================================================

-- 1. EXTENSÃO UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE SALAS DE JOGO (SINCRONIZAÇÃO MULTI-DISPOSITIVOS EM TEMPO REAL)
CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code TEXT UNIQUE NOT NULL,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE CATEGORIAS DO JOGO (P, O, A, D, L, M)
CREATE TABLE IF NOT EXISTS public.game_categories (
    code VARCHAR(2) PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE FAIXAS ETÁRIAS
CREATE TABLE IF NOT EXISTS public.age_ranges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    min_age INTEGER NOT NULL,
    max_age INTEGER NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE TEMAS
CREATE TABLE IF NOT EXISTS public.custom_themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '🎨' NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE PALAVRAS / DESAFIOS
CREATE TABLE IF NOT EXISTS public.custom_words (
    id TEXT PRIMARY KEY,
    theme_id TEXT NOT NULL REFERENCES public.custom_themes(id) ON DELETE CASCADE,
    age_range_id TEXT NOT NULL REFERENCES public.age_ranges(id) ON DELETE CASCADE,
    category VARCHAR(2) NOT NULL REFERENCES public.game_categories(code) ON DELETE CASCADE,
    word TEXT NOT NULL,
    tip TEXT,
    score INTEGER DEFAULT 1 NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE HISTÓRICO DE PARTIDAS
CREATE TABLE IF NOT EXISTS public.match_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code TEXT,
    winner_name TEXT,
    winner_score INTEGER,
    total_rounds INTEGER,
    match_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABELA DE CONFIGURAÇÕES GLOBAIS DO JOGO
CREATE TABLE IF NOT EXISTS public.game_settings (
    id TEXT PRIMARY KEY DEFAULT 'default_settings',
    turn_duration_seconds INTEGER DEFAULT 80 NOT NULL,
    urgent_threshold_seconds INTEGER DEFAULT 10 NOT NULL,
    min_teams INTEGER DEFAULT 2 NOT NULL,
    max_teams INTEGER DEFAULT 6 NOT NULL,
    sound_enabled BOOLEAN DEFAULT true NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_custom_words_query ON public.custom_words(theme_id, age_range_id, category);
CREATE INDEX IF NOT EXISTS idx_custom_words_active ON public.custom_words(active);
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON public.game_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_match_history_created ON public.match_history(created_at DESC);

-- ==============================================================================
-- SEGURANÇA E POLÍTICAS RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público
CREATE POLICY "Acesso público salas" ON public.game_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público categorias" ON public.game_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público faixas etarias" ON public.age_ranges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público temas" ON public.custom_themes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público palavras" ON public.custom_words FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público historico" ON public.match_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público configuracoes" ON public.game_settings FOR ALL USING (true) WITH CHECK (true);

-- HABILITAR SUPABASE REALTIME NA TABELA DE SALAS
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;

-- ==============================================================================
-- ALIMENTAÇÃO DO BANCO DE DADOS (SEED DATA)
-- ==============================================================================

-- 1. Inserir Categorias Oficiais
INSERT INTO public.game_categories (code, name, description, icon, color) VALUES
('P', 'Pessoa', 'Personagens bíblicos, heróis da fé, profissões e figuras históricas', 'User', '#3b82f6'),
('O', 'Objeto', 'Artefatos, utensílios, instrumentos, roupas e itens bíblicos', 'Package', '#10b981'),
('A', 'Ação', 'Verbos, gestos, milagres, tarefas, atitudes e movimentos corporais', 'Activity', '#f59e0b'),
('D', 'Difícil', 'Conceitos desafiadores, símbolos profundos, elementos e natureza', 'Flame', '#ef4444'),
('L', 'Lugar', 'Cidades, montes, mares, vales, nações e livros bíblicos', 'MapPin', '#8b5cf6'),
('M', 'Mistura', 'Doutrinas, valores, virtudes, festas e temas variados', 'Sparkles', '#ec4899')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color;

-- 2. Inserir Faixas Etárias
INSERT INTO public.age_ranges (id, name, min_age, max_age, active) VALUES
('5-7', '5 a 7 anos (Infantil)', 5, 7, true),
('8-12', '8 a 12 anos (Juniores)', 8, 12, true),
('13-17', '13 a 17 anos (Adolescentes)', 13, 17, true),
('adultos', 'Adultos & Jovens', 18, 99, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    min_age = EXCLUDED.min_age,
    max_age = EXCLUDED.max_age,
    active = EXCLUDED.active;

-- 3. Inserir Temas
INSERT INTO public.custom_themes (id, name, description, icon, active, is_default) VALUES
${themesSqlRows}
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    active = EXCLUDED.active,
    is_default = EXCLUDED.is_default;

-- 4. Inserir Configurações Globais
INSERT INTO public.game_settings (id, turn_duration_seconds, urgent_threshold_seconds, min_teams, max_teams, sound_enabled)
VALUES ('default_settings', 80, 10, 2, 6, true)
ON CONFLICT (id) DO UPDATE SET
    turn_duration_seconds = EXCLUDED.turn_duration_seconds,
    urgent_threshold_seconds = EXCLUDED.urgent_threshold_seconds;

-- 5. Inserir Palavras e Desafios
INSERT INTO public.custom_words (id, theme_id, age_range_id, category, word, tip, score, active) VALUES
${wordsSqlRows}
ON CONFLICT (id) DO UPDATE SET
    word = EXCLUDED.word,
    tip = EXCLUDED.tip,
    score = EXCLUDED.score,
    active = EXCLUDED.active;
`;
}

export const SUPABASE_SQL_SCHEMA = generateCompleteSupabaseSql();

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
