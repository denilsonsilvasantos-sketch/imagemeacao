-- ==============================================================================
-- IMAGEM & AÇÃO - SCRIPT COMPLETO DO BANCO DE DADOS SUPABASE (ESTRUTURA + SEED)
-- ==============================================================================
-- Execute este script completo no "SQL Editor" do seu painel Supabase (supabase.com)
-- Ele criará todas as tabelas, colunas, índices, políticas RLS, Realtime
-- e alimentará o banco com todos os Temas, Faixas Etárias, Categorias e 380+ Palavras.
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

-- Políticas de acesso público (Leitura e Escrita para o Jogo)
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
('biblia', 'Bíblia', 'Histórias, personagens, milagres e ensinamentos das Sagradas Escrituras', 'BookOpen', true, true),
('animais', 'Animais & Natureza', 'Bichos, selva, oceanos e elementos da natureza', 'PawPrint', true, true),
('geral', 'Conhecimentos Gerais', 'Cotidiano, profissões, esportes, escola e cultura', 'Globe', true, true)
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

-- 5. Inserir Banco Completo de Palavras Bíblicas (60 por Categoria para 8-12 anos)
INSERT INTO public.custom_words (id, theme_id, age_range_id, category, word, tip, score, active) VALUES
-- Categoria P (Pessoa)
('b8-p-1', 'biblia', '8-12', 'P', 'Adão', 'Primeiro homem criado por Deus', 1, true),
('b8-p-2', 'biblia', '8-12', 'P', 'Eva', 'Primeira mulher', 1, true),
('b8-p-3', 'biblia', '8-12', 'P', 'Noé', 'Construiu a grande arca', 1, true),
('b8-p-4', 'biblia', '8-12', 'P', 'Abraão', 'Pai da fé', 1, true),
('b8-p-5', 'biblia', '8-12', 'P', 'Sara', 'Esposa de Abraão', 1, true),
('b8-p-6', 'biblia', '8-12', 'P', 'Isaque', 'Filho da promessa', 1, true),
('b8-p-7', 'biblia', '8-12', 'P', 'Rebeca', 'Esposa de Isaque', 1, true),
('b8-p-8', 'biblia', '8-12', 'P', 'Jacó', 'Teve o nome mudado para Israel', 1, true),
('b8-p-9', 'biblia', '8-12', 'P', 'Esaú', 'Irmão gêmeo de Jacó', 1, true),
('b8-p-10', 'biblia', '8-12', 'P', 'José', 'Governador do Egito com túnica colorida', 1, true),
('b8-p-11', 'biblia', '8-12', 'P', 'Moisés', 'Abriu o Mar Vermelho', 1, true),
('b8-p-12', 'biblia', '8-12', 'P', 'Arão', 'Irmão de Moisés e sacerdote', 1, true),
('b8-p-13', 'biblia', '8-12', 'P', 'Miriã', 'Irmã de Moisés que tocou tamborim', 1, true),
('b8-p-14', 'biblia', '8-12', 'P', 'Josué', 'Fez os muros de Jericó caírem', 1, true),
('b8-p-15', 'biblia', '8-12', 'P', 'Calebe', 'Espia corajoso', 1, true),
('b8-p-16', 'biblia', '8-12', 'P', 'Raabe', 'Ajudou os espias em Jericó', 1, true),
('b8-p-17', 'biblia', '8-12', 'P', 'Gideão', 'Venceu com 300 homens', 1, true),
('b8-p-18', 'biblia', '8-12', 'P', 'Sansão', 'Homem mais forte da Bíblia', 1, true),
('b8-p-19', 'biblia', '8-12', 'P', 'Rute', 'Moabita fiel a Noemi', 1, true),
('b8-p-20', 'biblia', '8-12', 'P', 'Noemi', 'Sogra de Rute', 1, true),
('b8-p-21', 'biblia', '8-12', 'P', 'Samuel', 'Ouvia a voz do Senhor ainda menino', 1, true),
('b8-p-22', 'biblia', '8-12', 'P', 'Saul', 'Primeiro rei de Israel', 1, true),
('b8-p-23', 'biblia', '8-12', 'P', 'Davi', 'Venceu o gigante Golias', 1, true),
('b8-p-24', 'biblia', '8-12', 'P', 'Jônatas', 'Grande amigo leal de Davi', 1, true),
('b8-p-25', 'biblia', '8-12', 'P', 'Salomão', 'Rei mais sábio', 1, true),
('b8-p-26', 'biblia', '8-12', 'P', 'Elias', 'Profeta que subiu ao céu no redemoinho', 1, true),
('b8-p-27', 'biblia', '8-12', 'P', 'Eliseu', 'Pediu porção dobrada do espírito de Elias', 1, true),
('b8-p-28', 'biblia', '8-12', 'P', 'Isaías', 'Profeta messiânico', 1, true),
('b8-p-29', 'biblia', '8-12', 'P', 'Jeremias', 'Profeta que chorava pelo povo', 1, true),
('b8-p-30', 'biblia', '8-12', 'P', 'Daniel', 'Sobreviveu na cova dos leões', 1, true),
('b8-p-31', 'biblia', '8-12', 'P', 'Ester', 'Rainha que salvou seu povo', 1, true),
('b8-p-32', 'biblia', '8-12', 'P', 'Neemias', 'Reconstruiu os muros de Jerusalém', 1, true),
('b8-p-33', 'biblia', '8-12', 'P', 'Esdras', 'Escriba e sacerdote fiel', 1, true),
('b8-p-34', 'biblia', '8-12', 'P', 'Jó', 'Exemplo de paciência e fé', 1, true),
('b8-p-35', 'biblia', '8-12', 'P', 'Jonas', 'Engolido por um grande peixe', 1, true),
('b8-p-36', 'biblia', '8-12', 'P', 'Maria', 'Mãe de Jesus', 1, true),
('b8-p-37', 'biblia', '8-12', 'P', 'José Carpinteiro', 'Pai terreno de Jesus', 1, true),
('b8-p-38', 'biblia', '8-12', 'P', 'Jesus', 'O Salvador do Mundo', 1, true),
('b8-p-39', 'biblia', '8-12', 'P', 'Pedro', 'Pescador de homens que andou sobre as águas', 1, true),
('b8-p-40', 'biblia', '8-12', 'P', 'André', 'Irmão de Pedro que o levou a Jesus', 1, true),
('b8-p-41', 'biblia', '8-12', 'P', 'Tiago', 'Discípulo e apóstolo', 1, true),
('b8-p-42', 'biblia', '8-12', 'P', 'João', 'O discípulo amado', 1, true),
('b8-p-43', 'biblia', '8-12', 'P', 'Mateus', 'Publicano que virou apóstolo', 1, true),
('b8-p-44', 'biblia', '8-12', 'P', 'Tomé', 'Precisou ver para crer', 1, true),
('b8-p-45', 'biblia', '8-12', 'P', 'Filipe', 'Apóstolo que pregou ao eunuco', 1, true),
('b8-p-46', 'biblia', '8-12', 'P', 'Bartolomeu', 'Também conhecido como Natanael', 1, true),
('b8-p-47', 'biblia', '8-12', 'P', 'Marta', 'Irmã de Lázaro e Maria', 1, true),
('b8-p-48', 'biblia', '8-12', 'P', 'Lázaro', 'Ressuscitado por Jesus ao quarto dia', 1, true),
('b8-p-49', 'biblia', '8-12', 'P', 'Zaqueu', 'Subiu na árvore para ver Jesus', 1, true),
('b8-p-50', 'biblia', '8-12', 'P', 'Nicodemos', 'Foi falar com Jesus à noite', 1, true),
('b8-p-51', 'biblia', '8-12', 'P', 'Paulo', 'Apóstolo dos gentios que escreveu cartas', 1, true),
('b8-p-52', 'biblia', '8-12', 'P', 'Barnabé', 'Filho da consolação', 1, true),
('b8-p-53', 'biblia', '8-12', 'P', 'Silas', 'Cantou na prisão junto com Paulo', 1, true),
('b8-p-54', 'biblia', '8-12', 'P', 'Timóteo', 'Jovem discípulo de Paulo', 1, true),
('b8-p-55', 'biblia', '8-12', 'P', 'Tito', 'Companheiro ministerial de Paulo', 1, true),
('b8-p-56', 'biblia', '8-12', 'P', 'Estêvão', 'Primeiro mártir cristão', 1, true),
('b8-p-57', 'biblia', '8-12', 'P', 'Priscila', 'Missionária com Áquila', 1, true),
('b8-p-58', 'biblia', '8-12', 'P', 'Áquila', 'Trabalhava fazendo tendas', 1, true),
('b8-p-59', 'biblia', '8-12', 'P', 'Cornélio', 'Centurião romano temente a Deus', 1, true),
('b8-p-60', 'biblia', '8-12', 'P', 'Bartimeu', 'Cego de Jericó curado por Jesus', 1, true),

-- Categoria O (Objeto)
('b8-o-1', 'biblia', '8-12', 'O', 'Cajado', 'Vara de pastor usada por Moisés', 1, true),
('b8-o-2', 'biblia', '8-12', 'O', 'Cálice', 'Copo sagrado', 1, true),
('b8-o-3', 'biblia', '8-12', 'O', 'Coroa', 'Símbolo da realeza', 1, true),
('b8-o-4', 'biblia', '8-12', 'O', 'Trombeta', 'Instrumento de som forte para anúncio', 1, true),
('b8-o-5', 'biblia', '8-12', 'O', 'Espada', 'Símbolo da Palavra de Deus', 1, true),
('b8-o-6', 'biblia', '8-12', 'O', 'Escudo', 'Escudo da fé na armadura de Deus', 1, true),
('b8-o-7', 'biblia', '8-12', 'O', 'Harpa', 'Instrumento que Davi tocava', 1, true),
('b8-o-8', 'biblia', '8-12', 'O', 'Arco', 'Arma de caça e combate', 1, true),
('b8-o-9', 'biblia', '8-12', 'O', 'Flecha', 'Projétil lançado pelo arco', 1, true),
('b8-o-10', 'biblia', '8-12', 'O', 'Estilingue', 'Funda usada por Davi contra Golias', 1, true),
('b8-o-11', 'biblia', '8-12', 'O', 'Rede de Pesca', 'Usada pelos discípulos no Mar da Galileia', 1, true),
('b8-o-12', 'biblia', '8-12', 'O', 'Barco', 'Embarcação dos apóstolos', 1, true),
('b8-o-13', 'biblia', '8-12', 'O', 'Corda', 'Usada para amarrar ou resgatar', 1, true),
('b8-o-14', 'biblia', '8-12', 'O', 'Tocha', 'Luz de fogo para a noite', 1, true),
('b8-o-15', 'biblia', '8-12', 'O', 'Lâmpada', 'Lâmpada para os meus pés é Tua Palavra', 1, true),
('b8-o-16', 'biblia', '8-12', 'O', 'Altar', 'Lugar de oração e sacrifício', 1, true),
('b8-o-17', 'biblia', '8-12', 'O', 'Incenso', 'Aroma que sobe com as orações', 1, true),
('b8-o-18', 'biblia', '8-12', 'O', 'Jarro de Barro', 'Recipiente para água ou azeite', 1, true),
('b8-o-19', 'biblia', '8-12', 'O', 'Vaso de Alabastro', 'Perfume precioso derramado em Jesus', 1, true),
('b8-o-20', 'biblia', '8-12', 'O', 'Cesto', 'Onde Paulo desceu pela muralha', 1, true),
('b8-o-21', 'biblia', '8-12', 'O', 'Bacia', 'Usada por Jesus no lava-pés', 1, true),
('b8-o-22', 'biblia', '8-12', 'O', 'Toalha', 'Cinto de servo de Jesus', 1, true),
('b8-o-23', 'biblia', '8-12', 'O', 'Sandália', 'Tira as sandálias dos pés em terra santa', 1, true),
('b8-o-24', 'biblia', '8-12', 'O', 'Túnica', 'Vestimenta típica de várias cores', 1, true),
('b8-o-25', 'biblia', '8-12', 'O', 'Manto de Elias', 'Caiu sobre Eliseu', 1, true),
('b8-o-26', 'biblia', '8-12', 'O', 'Capa', 'Paulo pediu que trouxessem a sua capa', 1, true),
('b8-o-27', 'biblia', '8-12', 'O', 'Anel do Filho Pródigo', 'Colocado no dedo pelo pai', 1, true),
('b8-o-28', 'biblia', '8-12', 'O', 'Moeda da Viúva', 'Duas pequenas moedas de oferta', 1, true),
('b8-o-29', 'biblia', '8-12', 'O', 'Pergaminho', 'Rolo de escrita sagrada', 1, true),
('b8-o-30', 'biblia', '8-12', 'O', 'Livro da Vida', 'Onde estão escritos os salvos', 1, true),
('b8-o-31', 'biblia', '8-12', 'O', 'Tábuas da Lei', 'Os Dez Mandamentos gravados em pedra', 1, true),
('b8-o-32', 'biblia', '8-12', 'O', 'Lenha', 'Madeira levada para o sacrifício', 1, true),
('b8-o-33', 'biblia', '8-12', 'O', 'Vara que Floresceu', 'A vara de Arão', 1, true),
('b8-o-34', 'biblia', '8-12', 'O', 'Pedra da Funda', 'Uma das cinco pedras lisas de Davi', 1, true),
('b8-o-35', 'biblia', '8-12', 'O', 'Tijolo', 'Feito pelos hebreus no Egito', 1, true),
('b8-o-36', 'biblia', '8-12', 'O', 'Martelo', 'Ferramenta de construção', 1, true),
('b8-o-37', 'biblia', '8-12', 'O', 'Machado Flutuante', 'Milagre de Eliseu no Jordão', 1, true),
('b8-o-38', 'biblia', '8-12', 'O', 'Colher', 'Utensílio do tabernáculo', 1, true),
('b8-o-39', 'biblia', '8-12', 'O', 'Prato', 'Utensílio de mesa na ceia', 1, true),
('b8-o-40', 'biblia', '8-12', 'O', 'Pão da Vida', 'Alimento repartido', 1, true),
('b8-o-41', 'biblia', '8-12', 'O', 'Peixinho', 'Dois peixinhos multiplicados', 1, true),
('b8-o-42', 'biblia', '8-12', 'O', 'Frasco de Óleo', 'Da viúva de Sarepta', 1, true),
('b8-o-43', 'biblia', '8-12', 'O', 'Odre de Vinho', 'Bolsa de couro para líquidos', 1, true),
('b8-o-44', 'biblia', '8-12', 'O', 'Selo Real', 'Usado para fechar decretos e a cova', 1, true),
('b8-o-45', 'biblia', '8-12', 'O', 'Chave do Reino', 'Símbolo de autoridade', 1, true),
('b8-o-46', 'biblia', '8-12', 'O', 'Sino das Vestes', 'Campainhas nas vestes do sumo sacerdote', 1, true),
('b8-o-47', 'biblia', '8-12', 'O', 'Tamborim', 'Instrumento de celebração', 1, true),
('b8-o-48', 'biblia', '8-12', 'O', 'Cítara', 'Instrumento de cordas para louvor', 1, true),
('b8-o-49', 'biblia', '8-12', 'O', 'Incensário de Ouro', 'Peça do Santo dos Santos', 1, true),
('b8-o-50', 'biblia', '8-12', 'O', 'Manjedoura', 'Berço humilde de Jesus', 1, true),
('b8-o-51', 'biblia', '8-12', 'O', 'Corno de Azeite', 'Chifre usado para ungir reis', 1, true),
('b8-o-52', 'biblia', '8-12', 'O', 'Lamparina', 'Luz mantida com azeite pelas noivas sábias', 1, true),
('b8-o-53', 'biblia', '8-12', 'O', 'Cântaro de Água', 'Carregado pela mulher samaritana', 1, true),
('b8-o-54', 'biblia', '8-12', 'O', 'Mochila de Viagem', 'Alforje dos discípulos', 1, true),
('b8-o-55', 'biblia', '8-12', 'O', 'Carruagem de Fogo', 'Levou Elias ao céu', 1, true),
('b8-o-56', 'biblia', '8-12', 'O', 'Cinturão da Verdade', 'Parte da Armadura de Deus', 1, true),
('b8-o-57', 'biblia', '8-12', 'O', 'Véu do Templo', 'Rasgou-se de alto a baixo', 1, true),
('b8-o-58', 'biblia', '8-12', 'O', 'Candelabro de Ouro', 'Menorá de sete braços', 1, true),
('b8-o-59', 'biblia', '8-12', 'O', 'Arca da Aliança', 'Baú sagrado coberto de ouro', 1, true),
('b8-o-60', 'biblia', '8-12', 'O', 'Cruz de Cristo', 'Madeiro da salvação', 1, true),

-- Categoria A (Ação)
('b8-a-1', 'biblia', '8-12', 'A', 'Orar', 'Falar com o Pai celestial', 1, true),
('b8-a-2', 'biblia', '8-12', 'A', 'Cantar', 'Louvar com a voz e alegria', 1, true),
('b8-a-3', 'biblia', '8-12', 'A', 'Dançar', 'Davi dançou na presença de Deus', 1, true),
('b8-a-4', 'biblia', '8-12', 'A', 'Chorar', 'Jesus chorou por Lázaro', 1, true),
('b8-a-5', 'biblia', '8-12', 'A', 'Rir', 'Sara riu ao saber que seria mãe', 1, true),
('b8-a-6', 'biblia', '8-12', 'A', 'Gritar', 'O povo gritou e os muros caíram', 1, true),
('b8-a-7', 'biblia', '8-12', 'A', 'Abraçar', 'O pai abraçou o filho pródigo', 1, true),
('b8-a-8', 'biblia', '8-12', 'A', 'Ajudar', 'O bom samaritano socorreu o ferido', 1, true),
('b8-a-9', 'biblia', '8-12', 'A', 'Servir', 'Lavar os pés uns dos outros', 1, true),
('b8-a-10', 'biblia', '8-12', 'A', 'Perdoar', 'Setenta vezes sete', 1, true),
('b8-a-11', 'biblia', '8-12', 'A', 'Amar', 'Amar a Deus e ao próximo', 1, true),
('b8-a-12', 'biblia', '8-12', 'A', 'Ensinar', 'Jesus ensinava por parábolas', 1, true),
('b8-a-13', 'biblia', '8-12', 'A', 'Escrever', 'Deus escreveu os mandamentos na pedra', 1, true),
('b8-a-14', 'biblia', '8-12', 'A', 'Ler', 'Ler a Palavra de Deus', 1, true),
('b8-a-15', 'biblia', '8-12', 'A', 'Escutar', 'Fala, Senhor, que teu servo ouve', 1, true),
('b8-a-16', 'biblia', '8-12', 'A', 'Caminhar', 'Enoque andou com Deus', 1, true),
('b8-a-17', 'biblia', '8-12', 'A', 'Subir o Monte', 'Moisés subiu ao Sinai', 1, true),
('b8-a-18', 'biblia', '8-12', 'A', 'Marchar', 'Marchar 7 dias ao redor de Jericó', 1, true),
('b8-a-19', 'biblia', '8-12', 'A', 'Construir a Arca', 'Noé trabalhou com madeira', 1, true),
('b8-a-20', 'biblia', '8-12', 'A', 'Semear', 'O semeador saiu a semear', 1, true),
('b8-a-21', 'biblia', '8-12', 'A', 'Colher Frutos', 'Pelos frutos os conhecereis', 1, true),
('b8-a-22', 'biblia', '8-12', 'A', 'Pescar', 'Pedro lançou as redes', 1, true),
('b8-a-23', 'biblia', '8-12', 'A', 'Nadar', 'Paulo nadou após o naufrágio', 1, true),
('b8-a-24', 'biblia', '8-12', 'A', 'Correr', 'Correr a carreira com perseverança', 1, true),
('b8-a-25', 'biblia', '8-12', 'A', 'Pular de Alegria', 'O coxo curado saltou', 1, true),
('b8-a-26', 'biblia', '8-12', 'A', 'Dormir no Barco', 'Jesus descansava na tempestade', 1, true),
('b8-a-27', 'biblia', '8-12', 'A', 'Acordar', 'Desperta, tu que dormes', 1, true),
('b8-a-28', 'biblia', '8-12', 'A', 'Ajoelhar', 'Dobrar os joelhos em reverência', 1, true),
('b8-a-29', 'biblia', '8-12', 'A', 'Jejuar', 'Abster-se de comida para buscar a Deus', 1, true),
('b8-a-30', 'biblia', '8-12', 'A', 'Batizar', 'João Batista nas águas do Jordão', 1, true),
('b8-a-31', 'biblia', '8-12', 'A', 'Curar', 'Jesus curou cegos e leprosos', 1, true),
('b8-a-32', 'biblia', '8-12', 'A', 'Tocar as Vestes', 'A mulher com fluxo de sangue tocou em Jesus', 1, true),
('b8-a-33', 'biblia', '8-12', 'A', 'Multiplicar Pães', 'Cinco pães alimentaram multidões', 1, true),
('b8-a-34', 'biblia', '8-12', 'A', 'Acalmar Tempestade', 'Jesus disse: Cala-te, aquieta-te!', 1, true),
('b8-a-35', 'biblia', '8-12', 'A', 'Ungir com Óleo', 'Samuel ungiu a Davi como rei', 1, true),
('b8-a-36', 'biblia', '8-12', 'A', 'Proclamar', 'Ide por todo o mundo e pregai o evangelho', 1, true),
('b8-a-37', 'biblia', '8-12', 'A', 'Compartilhar', 'Dividir o alimento com quem precisa', 1, true),
('b8-a-38', 'biblia', '8-12', 'A', 'Obedecer', 'Melhor é obedecer do que sacrificar', 1, true),
('b8-a-39', 'biblia', '8-12', 'A', 'Vigiar', 'Vigiai e orai para não cair em tentação', 1, true),
('b8-a-40', 'biblia', '8-12', 'A', 'Seguir Jesus', 'Deixar tudo e seguir o Mestre', 1, true),
('b8-a-41', 'biblia', '8-12', 'A', 'Agradecer', 'Dar graças em todas as circunstâncias', 1, true),
('b8-a-42', 'biblia', '8-12', 'A', 'Celebrar a Páscoa', 'Festa de libertação', 1, true),
('b8-a-43', 'biblia', '8-12', 'A', 'Quebrar Cadeias', 'Paulo e Silas louvaram e as portas se abriram', 1, true),
('b8-a-44', 'biblia', '8-12', 'A', 'Tocar Trombeta', 'Gideão com tochas e trombetas', 1, true),
('b8-a-45', 'biblia', '8-12', 'A', 'Sonhar', 'José teve sonhos enviados por Deus', 1, true),
('b8-a-46', 'biblia', '8-12', 'A', 'Interpretar Sonho', 'Daniel interpretou o sonho do rei', 1, true),
('b8-a-47', 'biblia', '8-12', 'A', 'Carregar a Cruz', 'Simão Cirineu ajudou Jesus', 1, true),
('b8-a-48', 'biblia', '8-12', 'A', 'Ressuscitar', 'Vencer a morte ao terceiro dia', 1, true),
('b8-a-49', 'biblia', '8-12', 'A', 'Subir aos Céus', 'Ascensão de Jesus diante dos discípulos', 1, true),
('b8-a-50', 'biblia', '8-12', 'A', 'Partir o Pão', 'Ceia do Senhor em memória dele', 1, true),
('b8-a-51', 'biblia', '8-12', 'A', 'Derramar Lágrimas', 'Choro de arrependimento de Pedro', 1, true),
('b8-a-52', 'biblia', '8-12', 'A', 'Lavar os Pés', 'Exemplo de humildade de Jesus', 1, true),
('b8-a-53', 'biblia', '8-12', 'A', 'Acender a Luz', 'Não se coloca lâmpada debaixo da cama', 1, true),
('b8-a-54', 'biblia', '8-12', 'A', 'Bater à Porta', 'Eis que estou à porta e bato', 1, true),
('b8-a-55', 'biblia', '8-12', 'A', 'Buscar a Ovelha Perdida', 'O bom pastor busca a que se perdeu', 1, true),
('b8-a-56', 'biblia', '8-12', 'A', 'Curar com Saliva', 'Jesus curou o cego com lodo', 1, true),
('b8-a-57', 'biblia', '8-12', 'A', 'Transformar Água em Vinho', 'Primeiro milagre em Caná', 1, true),
('b8-a-58', 'biblia', '8-12', 'A', 'Repartir a Capa', 'Gesto de amor com o necessitado', 1, true),
('b8-a-59', 'biblia', '8-12', 'A', 'Coroar com Glória', 'Receber a coroa da vida', 1, true),
('b8-a-60', 'biblia', '8-12', 'A', 'Adorar em Espírito', 'Adorar ao Senhor em verdade', 1, true),

-- Categoria D (Difícil)
('b8-d-1', 'biblia', '8-12', 'D', 'Maná do Céu', 'Pão milagroso que caía do céu no deserto', 1, true),
('b8-d-2', 'biblia', '8-12', 'D', 'Leão da Tribo de Judá', 'Título glorioso de Jesus', 1, true),
('b8-d-3', 'biblia', '8-12', 'D', 'Serpente de Bronze', 'Levantada por Moisés no deserto', 1, true),
('b8-d-4', 'biblia', '8-12', 'D', 'Grande Peixe', 'Engoliu o profeta Jonas', 1, true),
('b8-d-5', 'biblia', '8-12', 'D', 'Gigante Golias', 'Guerreiro de Gate derrotado por Davi', 1, true),
('b8-d-6', 'biblia', '8-12', 'D', 'Estrela de Belém', 'Guiou os magos do oriente', 1, true),
('b8-d-7', 'biblia', '8-12', 'D', 'Pomba da Paz', 'Voltou com a folha de oliveira para Noé', 1, true),
('b8-d-8', 'biblia', '8-12', 'D', 'Corvo de Elias', 'Levava pão e carne para o profeta', 1, true),
('b8-d-9', 'biblia', '8-12', 'D', 'Cordeiro de Deus', 'Tira o pecado do mundo', 1, true),
('b8-d-10', 'biblia', '8-12', 'D', 'Galo que Cantou', 'Após a terceira negação de Pedro', 1, true),
('b8-d-11', 'biblia', '8-12', 'D', 'Coluna de Fogo', 'Guiava o povo à noite pelo deserto', 1, true),
('b8-d-12', 'biblia', '8-12', 'D', 'Nuvem de Glória', 'Enchia o tabernáculo do Senhor', 1, true),
('b8-d-13', 'biblia', '8-12', 'D', 'Arbusto em Chamas', 'A sarça ardente que não se queimava', 1, true),
('b8-d-14', 'biblia', '8-12', 'D', 'Água da Rocha', 'Moisés feriu a rocha e brotou água', 1, true),
('b8-d-15', 'biblia', '8-12', 'D', 'Muro de Jericó', 'Muralhas impenetráveis que desabaram', 1, true),
('b8-d-16', 'biblia', '8-12', 'D', 'Escada de Jacó', 'Anjos subiam e desciam sonhando', 1, true),
('b8-d-17', 'biblia', '8-12', 'D', 'Fornalha Ardente', 'Três jovens e o quarto homem no fogo', 1, true),
('b8-d-18', 'biblia', '8-12', 'D', 'Cova dos Leões', 'Deus fechou a boca dos animais famintos', 1, true),
('b8-d-19', 'biblia', '8-12', 'D', 'Vale de Ossos Secos', 'Profetiza sobre estes ossos, filho do homem', 1, true),
('b8-d-20', 'biblia', '8-12', 'D', 'Estátua de Sal', 'A mulher de Ló olhou para trás', 1, true),
('b8-d-21', 'biblia', '8-12', 'D', 'Praga dos Gafanhotos', 'Uma das dez pragas do Egito', 1, true),
('b8-d-22', 'biblia', '8-12', 'D', 'Rio que Virou Sangue', 'Primeira praga sobre o Rio Nilo', 1, true),
('b8-d-23', 'biblia', '8-12', 'D', 'Chuva de Granizo', 'Fogo e gelo sobre as plantações do Faraó', 1, true),
('b8-d-24', 'biblia', '8-12', 'D', 'Sol que Parou', 'Josué orou e o sol se deteve em Gibeão', 1, true),
('b8-d-25', 'biblia', '8-12', 'D', 'Sombra que Recuou', 'Sinal de cura para o rei Ezequias', 1, true),
('b8-d-26', 'biblia', '8-12', 'D', 'Velo de Lã', 'Sinal do orvalho pedido por Gideão', 1, true),
('b8-d-27', 'biblia', '8-12', 'D', 'Carro de Fogo', 'Cavalos celestiais em Dotã com Eliseu', 1, true),
('b8-d-28', 'biblia', '8-12', 'D', 'Voz como Trovão', 'A voz do Todo-Poderoso', 1, true),
('b8-d-29', 'biblia', '8-12', 'D', 'Cinto de Couro', 'Vestimenta de João Batista no deserto', 1, true),
('b8-d-30', 'biblia', '8-12', 'D', 'Mel Silvestre', 'Alimento de João Batista com gafanhotos', 1, true),
('b8-d-31', 'biblia', '8-12', 'D', 'Moeda na Boca do Peixe', 'Pedro pagou o imposto com ela', 1, true),
('b8-d-32', 'biblia', '8-12', 'D', 'Figueira que Secou', 'Jesus não achou fruto nela', 1, true),
('b8-d-33', 'biblia', '8-12', 'D', 'Trinta Moedas de Prata', 'Preço da traição de Judas', 1, true),
('b8-d-34', 'biblia', '8-12', 'D', 'Coroa de Espinhos', 'Colocada na fronte de Jesus', 1, true),
('b8-d-35', 'biblia', '8-12', 'D', 'Túmulo Vazio', 'Ele não está aqui, ressuscitou!', 1, true),
('b8-d-36', 'biblia', '8-12', 'D', 'Pedra Removida', 'O anjo rolou a enorme pedra da tumba', 1, true),
('b8-d-37', 'biblia', '8-12', 'D', 'Línguas de Fogo', 'Derramamento do Espírito Santo no Pentecostes', 1, true),
('b8-d-38', 'biblia', '8-12', 'D', 'Vento Impetuoso', 'O som do Espírito no cenáculo', 1, true),
('b8-d-39', 'biblia', '8-12', 'D', 'Lençol com Animais', 'Visão celestial de Pedro em Jope', 1, true),
('b8-d-40', 'biblia', '8-12', 'D', 'Víbora na Fogueira', 'Mordeu a mão de Paulo na Ilha de Malta', 1, true),
('b8-d-41', 'biblia', '8-12', 'D', 'Espinho na Carne', 'Mensageiro para manter Paulo humilde', 1, true),
('b8-d-42', 'biblia', '8-12', 'D', 'Armadura de Deus', 'Capacete, couraça, escudo e espada', 1, true),
('b8-d-43', 'biblia', '8-12', 'D', 'Cavalo Branco', 'Montado pelo Fiel e Verdadeiro no Apocalipse', 1, true),
('b8-d-44', 'biblia', '8-12', 'D', 'Sete Trombetas', 'Tocadas pelos anjos no livro de Apocalipse', 1, true),
('b8-d-45', 'biblia', '8-12', 'D', 'Árvore da Vida', 'Produz frutos todos os meses na Nova Jerusalém', 1, true),
('b8-d-46', 'biblia', '8-12', 'D', 'Rio de Água Viva', 'Flui do trono de Deus e do Cordeiro', 1, true),
('b8-d-47', 'biblia', '8-12', 'D', 'Mar de Vidro', 'Diante do trono de Deus', 1, true),
('b8-d-48', 'biblia', '8-12', 'D', 'Portas de Pérola', 'Entradas da Nova Jerusalém celestial', 1, true),
('b8-d-49', 'biblia', '8-12', 'D', 'Ruas de Ouro', 'Onde os santos andarão na glória', 1, true),
('b8-d-50', 'biblia', '8-12', 'D', 'Arco-Íris da Aliança', 'Sinal no céu de que a terra não será mais inundada', 1, true),
('b8-d-51', 'biblia', '8-12', 'D', 'Azeite da Viúva', 'Multiplicou-se até encher todos os vasos', 1, true),
('b8-d-52', 'biblia', '8-12', 'D', 'Sombra de Pedro', 'Curava os enfermos nas ruas', 1, true),
('b8-d-53', 'biblia', '8-12', 'D', 'Lenços de Paulo', 'Curavam quando levados aos doentes', 1, true),
('b8-d-54', 'biblia', '8-12', 'D', 'Jumento que Falou', 'Advertiu o profeta Balaão', 1, true),
('b8-d-55', 'biblia', '8-12', 'D', 'Carneiros Presos no Mato', 'Substituto de Isaque no sacrifício do monte Moriá', 1, true),
('b8-d-56', 'biblia', '8-12', 'D', 'Prato de Lentilhas', 'Pelo qual Esaú vendeu a primogenitura', 1, true),
('b8-d-57', 'biblia', '8-12', 'D', 'Fonte em Mara', 'Águas amargas transformadas em doces', 1, true),
('b8-d-58', 'biblia', '8-12', 'D', 'Cabelo de Sansão', 'Sinal do seu voto de nazireu com Deus', 1, true),
('b8-d-59', 'biblia', '8-12', 'D', 'Doze Pedras do Jordão', 'Memorial da travessia a pé enxuto com Josué', 1, true),
('b8-d-60', 'biblia', '8-12', 'D', 'Queijinhos e Pães de Davi', 'Levados aos irmãos na batalha contra Golias', 1, true),

-- Categoria L (Lugar e Livros)
('b8-l-1', 'biblia', '8-12', 'L', 'Jardim do Éden', 'Paraíso inicial da criação', 1, true),
('b8-l-2', 'biblia', '8-12', 'L', 'Belém', 'Cidade onde nasceu Jesus', 1, true),
('b8-l-3', 'biblia', '8-12', 'L', 'Nazaré', 'Onde Jesus cresceu', 1, true),
('b8-l-4', 'biblia', '8-12', 'L', 'Jerusalém', 'Cidade Santa e templo do Senhor', 1, true),
('b8-l-5', 'biblia', '8-12', 'L', 'Jericó', 'Cidade com grandes muralhas', 1, true),
('b8-l-6', 'biblia', '8-12', 'L', 'Betânia', 'Aldeia de Maria, Marta e Lázaro', 1, true),
('b8-l-7', 'biblia', '8-12', 'L', 'Cafarnaum', 'Cidade onde Jesus realizou muitos milagres', 1, true),
('b8-l-8', 'biblia', '8-12', 'L', 'Damasco', 'Caminho onde Saulo viu a grande luz', 1, true),
('b8-l-9', 'biblia', '8-12', 'L', 'Canaã', 'A Terra Prometida que mana leite e mel', 1, true),
('b8-l-10', 'biblia', '8-12', 'L', 'Egito', 'Terra das pirâmides e dos faraós', 1, true),
('b8-l-11', 'biblia', '8-12', 'L', 'Babilônia', 'Terra do cativeiro de Daniel', 1, true),
('b8-l-12', 'biblia', '8-12', 'L', 'Nínive', 'Cidade onde Jonas pregou arrependimento', 1, true),
('b8-l-13', 'biblia', '8-12', 'L', 'Samaria', 'Onde Jesus falou com a mulher junto ao poço', 1, true),
('b8-l-14', 'biblia', '8-12', 'L', 'Ilha de Patmos', 'Onde o apóstolo João recebeu a Revelação', 1, true),
('b8-l-15', 'biblia', '8-12', 'L', 'Gólgota', 'Lugar da Caveira onde Jesus foi crucificado', 1, true),
('b8-l-16', 'biblia', '8-12', 'L', 'Getsêmani', 'Jardim das Oliveiras de oração de Jesus', 1, true),
('b8-l-17', 'biblia', '8-12', 'L', 'Monte Sinai', 'Onde Deus entregou a Lei a Moisés', 1, true),
('b8-l-18', 'biblia', '8-12', 'L', 'Monte Carmelo', 'Onde Elias desafiou os profetas de Baal', 1, true),
('b8-l-19', 'biblia', '8-12', 'L', 'Rio Jordão', 'Onde Jesus foi batizado por João', 1, true),
('b8-l-20', 'biblia', '8-12', 'L', 'Mar da Galileia', 'Onde Jesus andou sobre as águas', 1, true),
('b8-l-21', 'biblia', '8-12', 'L', 'Mar Vermelho', 'Abriu-se ao meio para o povo passar', 1, true),
('b8-l-22', 'biblia', '8-12', 'L', 'Monte das Oliveiras', 'Lugar de ensinamento e ascensão', 1, true),
('b8-l-23', 'biblia', '8-12', 'L', 'Poço de Jacó', 'Onde a samaritana tirava água', 1, true),
('b8-l-24', 'biblia', '8-12', 'L', 'Tanque de Betesda', 'Onde o anjo agitava as águas', 1, true),
('b8-l-25', 'biblia', '8-12', 'L', 'Tanque de Siloé', 'Onde o cego de nascença lavou os olhos', 1, true),
('b8-l-26', 'biblia', '8-12', 'L', 'Cova de Macpela', 'Sepultura dos patriarcas em Hebrom', 1, true),
('b8-l-27', 'biblia', '8-12', 'L', 'Torre de Babel', 'Onde as línguas foram confundidas', 1, true),
('b8-l-28', 'biblia', '8-12', 'L', 'Monte Ararate', 'Onde a arca de Noé repousou', 1, true),
('b8-l-29', 'biblia', '8-12', 'L', 'Monte Nebo', 'Onde Moisés avistou a Terra Prometida', 1, true),
('b8-l-30', 'biblia', '8-12', 'L', 'Roma', 'Capital imperial onde Paulo pregou em prisão', 1, true),
('b8-l-31', 'biblia', '8-12', 'L', 'Livro de Gênesis', 'O livro dos começos e da criação', 1, true),
('b8-l-32', 'biblia', '8-12', 'L', 'Livro de Êxodo', 'A saída do Egito e a libertação', 1, true),
('b8-l-33', 'biblia', '8-12', 'L', 'Livro de Levítico', 'Leis de santidade e sacerdócio', 1, true),
('b8-l-34', 'biblia', '8-12', 'L', 'Livro de Números', 'Censo e marcha pelo deserto', 1, true),
('b8-l-35', 'biblia', '8-12', 'L', 'Livro de Deuteronômio', 'Segunda lei e despedida de Moisés', 1, true),
('b8-l-36', 'biblia', '8-12', 'L', 'Livro de Josué', 'Conquista da Terra Prometida', 1, true),
('b8-l-37', 'biblia', '8-12', 'L', 'Livro de Juízes', 'Líderes que libertavam Israel', 1, true),
('b8-l-38', 'biblia', '8-12', 'L', 'Livro de Rute', 'História de amor e lealdade familiar', 1, true),
('b8-l-39', 'biblia', '8-12', 'L', 'Livro de Salmos', 'Hinos, louvores e orações do coração', 1, true),
('b8-l-40', 'biblia', '8-12', 'L', 'Livro de Provérbios', 'Conselhos de sabedoria prática', 1, true),
('b8-l-41', 'biblia', '8-12', 'L', 'Livro de Daniel', 'Profecias e fidelidade na corte babilônica', 1, true),
('b8-l-42', 'biblia', '8-12', 'L', 'Evangelho de Mateus', 'Jesus apresentado como o Rei prometido', 1, true),
('b8-l-43', 'biblia', '8-12', 'L', 'Evangelho de Marcos', 'Jesus como o Servo operador de milagres', 1, true),
('b8-l-44', 'biblia', '8-12', 'L', 'Evangelho de Lucas', 'Jesus como o Filho do Homem compassivo', 1, true),
('b8-l-45', 'biblia', '8-12', 'L', 'Evangelho de João', 'Jesus como o Verbo de Deus encarnado', 1, true),
('b8-l-46', 'biblia', '8-12', 'L', 'Livro de Atos dos Apóstolos', 'História do nascimento da Igreja e Espírito Santo', 1, true),
('b8-l-47', 'biblia', '8-12', 'L', 'Carta aos Romanos', 'Tratado da graça e justificação pela fé', 1, true),
('b8-l-48', 'biblia', '8-12', 'L', 'Carta aos Filipenses', 'A carta da alegria no Senhor', 1, true),
('b8-l-49', 'biblia', '8-12', 'L', 'Livro de Apocalipse', 'Revelação final da vitória de Jesus', 1, true),
('b8-l-50', 'biblia', '8-12', 'L', 'Éfeso', 'Igreja que recebeu carta de Paulo e João', 1, true),
('b8-l-51', 'biblia', '8-12', 'L', 'Corinto', 'Cidade grega com grande igreja cristã', 1, true),
('b8-l-52', 'biblia', '8-12', 'L', 'Antioquia', 'Onde os discípulos foram chamados de cristãos', 1, true),
('b8-l-53', 'biblia', '8-12', 'L', 'Filipos', 'Onde o carcereiro se converteu com Paulo e Silas', 1, true),
('b8-l-54', 'biblia', '8-12', 'L', 'Tessalônica', 'Cidade que aguardava a volta de Jesus', 1, true),
('b8-l-55', 'biblia', '8-12', 'L', 'Atenas', 'Areópago onde Paulo pregou ao Deus Desconhecido', 1, true),
('b8-l-56', 'biblia', '8-12', 'L', 'Sodoma e Gomorra', 'Cidades destruídas por fogo do céu', 1, true),
('b8-l-57', 'biblia', '8-12', 'L', 'Ur dos Caldeus', 'De onde Abraão saiu pela fé', 1, true),
('b8-l-58', 'biblia', '8-12', 'L', 'Gaza', 'Cidade dos filisteus onde Sansão esteve', 1, true),
('b8-l-59', 'biblia', '8-12', 'L', 'Siló', 'Onde ficava o tabernáculo e Samuel serviu', 1, true),
('b8-l-60', 'biblia', '8-12', 'L', 'Nova Jerusalém', 'A cidade eterna preparada para a Noiva', 1, true),

-- Categoria M (Mistura, Doutrina e Valores)
('b8-m-1', 'biblia', '8-12', 'M', 'Criação do Mundo', 'No princípio criou Deus os céus e a terra', 1, true),
('b8-m-2', 'biblia', '8-12', 'M', 'O Grande Dilúvio', 'Chuva de 40 dias e 40 noites', 1, true),
('b8-m-3', 'biblia', '8-12', 'M', 'Aliança Eterna', 'Pacto de amor e fidelidade de Deus', 1, true),
('b8-m-4', 'biblia', '8-12', 'M', 'A Promessa', 'Inúmeros como as estrelas do céu', 1, true),
('b8-m-5', 'biblia', '8-12', 'M', 'Salvação pela Graça', 'Dom gratuito de Deus por meio da fé', 1, true),
('b8-m-6', 'biblia', '8-12', 'M', 'Redenção', 'Resgatados pelo sangue de Cristo', 1, true),
('b8-m-7', 'biblia', '8-12', 'M', 'Fé que Move Montanhas', 'Certeza das coisas que se esperam', 1, true),
('b8-m-8', 'biblia', '8-12', 'M', 'Esperança Viva', 'Âncora da nossa alma', 1, true),
('b8-m-9', 'biblia', '8-12', 'M', 'Amor Incondicional', 'O amor nunca falha', 1, true),
('b8-m-10', 'biblia', '8-12', 'M', 'Justiça Divina', 'Deus é reto e verdadeiro', 1, true),
('b8-m-11', 'biblia', '8-12', 'M', 'Misericórdia', 'Suas misericórdias se renovam a cada manhã', 1, true),
('b8-m-12', 'biblia', '8-12', 'M', 'Santidade', 'Sede santos porque Eu sou santo', 1, true),
('b8-m-13', 'biblia', '8-12', 'M', 'Obediência', 'Filhos, obedecei a vossos pais no Senhor', 1, true),
('b8-m-14', 'biblia', '8-12', 'M', 'Coragem e Bom Ânimo', 'Não temas nem te espantes', 1, true),
('b8-m-15', 'biblia', '8-12', 'M', 'Sabedoria do Alto', 'O temor do Senhor é o princípio da sabedoria', 1, true),
('b8-m-16', 'biblia', '8-12', 'M', 'Humildade', 'Os humildes serão exaltados', 1, true),
('b8-m-17', 'biblia', '8-12', 'M', 'Fidelidade', 'Fiel até a morte e dar-te-ei a coroa da vida', 1, true),
('b8-m-18', 'biblia', '8-12', 'M', 'Paz de Deus', 'Que excede todo o entendimento', 1, true),
('b8-m-19', 'biblia', '8-12', 'M', 'Alegria do Senhor', 'A alegria do Senhor é a nossa força', 1, true),
('b8-m-20', 'biblia', '8-12', 'M', 'Perseverança', 'Aquele que perseverar até o fim será salvo', 1, true),
('b8-m-21', 'biblia', '8-12', 'M', 'Oração e Jejum', 'Chaves para a intimidade espiritual', 1, true),
('b8-m-22', 'biblia', '8-12', 'M', 'Adoração Sincera', 'Em espírito e em verdade', 1, true),
('b8-m-23', 'biblia', '8-12', 'M', 'Louvor com Instrumentos', 'Tudo quanto tem fôlego louve ao Senhor', 1, true),
('b8-m-24', 'biblia', '8-12', 'M', 'Milagre Inesperado', 'Ação sobrenatural do poder de Deus', 1, true),
('b8-m-25', 'biblia', '8-12', 'M', 'Profecia Bíblica', 'Palavra inspirada pelo Espírito Santo', 1, true),
('b8-m-26', 'biblia', '8-12', 'M', 'O Santo Evangelho', 'Boas novas de salvação', 1, true),
('b8-m-27', 'biblia', '8-12', 'M', 'Grande Comissão', 'Fazer discípulos de todas as nações', 1, true),
('b8-m-28', 'biblia', '8-12', 'M', 'Discipulado', 'Aprender e ensinar os passos de Jesus', 1, true),
('b8-m-29', 'biblia', '8-12', 'M', 'Batismo nas Águas', 'Testemunho público de nova vida', 1, true),
('b8-m-30', 'biblia', '8-12', 'M', 'Ressurreição de Jesus', 'Ao terceiro dia ressuscitou triunfante', 1, true),
('b8-m-31', 'biblia', '8-12', 'M', 'Dia de Pentecostes', 'Descida do Consolador sobre os crentes', 1, true),
('b8-m-32', 'biblia', '8-12', 'M', 'A Santa Ceia', 'Em memória do corpo e sangue de Cristo', 1, true),
('b8-m-33', 'biblia', '8-12', 'M', 'Fruto do Espírito', 'Amor, alegria, paz, longanimidade e bondade', 1, true),
('b8-m-34', 'biblia', '8-12', 'M', 'Dons Espirituais', 'Capacitações dadas pelo Espírito para edificar', 1, true),
('b8-m-35', 'biblia', '8-12', 'M', 'Unção de Deus', 'Presença capacitadora do Todo-Poderoso', 1, true),
('b8-m-36', 'biblia', '8-12', 'M', 'Chamado Missionário', 'Eis-me aqui, envia-me a mim', 1, true),
('b8-m-37', 'biblia', '8-12', 'M', 'Comunhão dos Irmãos', 'Quão bom e suave é viverem em união', 1, true),
('b8-m-38', 'biblia', '8-12', 'M', 'Generosidade', 'Deus ama ao que dá com alegria', 1, true),
('b8-m-39', 'biblia', '8-12', 'M', 'Bênção Paterna', 'Palavras de vida sobre os filhos', 1, true),
('b8-m-40', 'biblia', '8-12', 'M', 'Reino dos Céus', 'Chegado é a vós o Reino de Deus', 1, true),
('b8-m-41', 'biblia', '8-12', 'M', 'O Messias', 'O Ungido anunciado pelos profetas', 1, true),
('b8-m-42', 'biblia', '8-12', 'M', 'O Bom Pastor', 'Dá a sua vida pelas ovelhas', 1, true),
('b8-m-43', 'biblia', '8-12', 'M', 'A Luz do Mundo', 'Vós sois a luz do mundo e sal da terra', 1, true),
('b8-m-44', 'biblia', '8-12', 'M', 'A Porta Estreita', 'Entrai pela porta estreita que leva à vida', 1, true),
('b8-m-45', 'biblia', '8-12', 'M', 'A Videira Verdadeira', 'Eu sou a videira, vós sois os ramos', 1, true),
('b8-m-46', 'biblia', '8-12', 'M', 'Anjos Mensageiros', 'Seres celestiais a serviço de Deus', 1, true),
('b8-m-47', 'biblia', '8-12', 'M', 'Arcanjo Miguel', 'Líder dos exércitos celestes', 1, true),
('b8-m-48', 'biblia', '8-12', 'M', 'Anjo Gabriel', 'Trouxe a mensagem a Maria e Zacarias', 1, true),
('b8-m-49', 'biblia', '8-12', 'M', 'Templo do Espírito Santo', 'Nosso corpo dedicado a Deus', 1, true),
('b8-m-50', 'biblia', '8-12', 'M', 'Tabernáculo no Deserto', 'Lugar da habitação de Deus com o povo', 1, true),
('b8-m-51', 'biblia', '8-12', 'M', 'Vida Eterna', 'Para todo aquele que crer no Filho', 1, true),
('b8-m-52', 'biblia', '8-12', 'M', 'A Nova Aliança', 'Selada no sangue de Jesus Cristo', 1, true),
('b8-m-53', 'biblia', '8-12', 'M', 'A Santíssima Trindade', 'Pai, Filho e Espírito Santo', 1, true),
('b8-m-54', 'biblia', '8-12', 'M', 'Festa dos Tabernáculos', 'Celebração da proteção no deserto', 1, true),
('b8-m-55', 'biblia', '8-12', 'M', 'A Páscoa da Libertação', 'O sangue do cordeiro nos umbrais', 1, true),
('b8-m-56', 'biblia', '8-12', 'M', 'Ano do Jubileu', 'Ano de descanso e libertação de dívidas', 1, true),
('b8-m-57', 'biblia', '8-12', 'M', 'Dízimos e Ofertas', 'Trazei todos os dízimos à casa do tesouro', 1, true),
('b8-m-58', 'biblia', '8-12', 'M', 'Aconselhamento Bíblico', 'Multidão de conselheiros há segurança', 1, true),
('b8-m-59', 'biblia', '8-12', 'M', 'A Segunda Vinda', 'Jesus voltará com poder e grande glória', 1, true),
('b8-m-60', 'biblia', '8-12', 'M', 'Maranata, Ora Vem Senhor', 'O clamor da igreja fiel', 1, true)
ON CONFLICT (id) DO UPDATE SET
    word = EXCLUDED.word,
    tip = EXCLUDED.tip,
    score = EXCLUDED.score,
    active = EXCLUDED.active;

-- 6. Inserir Palavras de Outras Faixas Etárias e Temas
INSERT INTO public.custom_words (id, theme_id, age_range_id, category, word, tip, score, active) VALUES
-- Bíblia 5-7 anos
('b5-p-1', 'biblia', '5-7', 'P', 'Noé', 'Amigo de Deus que construiu a arca', 1, true),
('b5-p-2', 'biblia', '5-7', 'P', 'Menino Jesus', 'Nasceu na manjedoura em Belém', 1, true),
('b5-p-3', 'biblia', '5-7', 'P', 'Daniel', 'Ficou com os leões na cova e não foi mordido', 1, true),
('b5-o-1', 'biblia', '5-7', 'O', 'Barquinho', 'Fez os discípulos navegarem no mar', 1, true),
('b5-o-2', 'biblia', '5-7', 'O', 'Pão e Peixinho', 'Comidinha multiplicada por Jesus', 1, true),
('b5-a-1', 'biblia', '5-7', 'A', 'Agradecer a Deus', 'Dizer obrigado pelo papai, mamãe e comida', 1, true),
('b5-a-2', 'biblia', '5-7', 'A', 'Dar um Abraço', 'Gesto de carinho com os amigos', 1, true),
('b5-d-1', 'biblia', '5-7', 'D', 'Arco-Íris Colorido', 'Sinal lindo que Deus colocou no céu', 1, true),
('b5-d-2', 'biblia', '5-7', 'D', 'Ovelhinha Branca', 'O Bom Pastor cuida com muito amor', 1, true),
('b5-l-1', 'biblia', '5-7', 'L', 'Jardim do Éden', 'Lugar de árvores e flores bonitas', 1, true),
('b5-l-2', 'biblia', '5-7', 'L', 'Belém', 'Cidadezinha onde Jesus nasceu', 1, true),
('b5-m-1', 'biblia', '5-7', 'M', 'Amor de Deus', 'Maior do que o mar e mais alto que o céu', 1, true),
('b5-m-2', 'biblia', '5-7', 'M', 'Festa de Natal', 'Celebração do aniversário de Jesus', 1, true),

-- Animais & Natureza
('an-p-1', 'animais', '8-12', 'P', 'Veterinário', 'Médico que cuida da saúde dos animais', 1, true),
('an-o-1', 'animais', '8-12', 'O', 'Coleira e Guia', 'Usado para passear com cachorrinhos', 1, true),
('an-a-1', 'animais', '8-12', 'A', 'Latir e Pular', 'Brincadeira clássica de cachorros felizes', 1, true),
('an-d-1', 'animais', '8-12', 'D', 'Elefante Africano', 'Maior mamífero terrestre com tromba', 1, true),
('an-l-1', 'animais', '8-12', 'L', 'Zoológico', 'Parque com várias espécies de animais', 1, true),
('an-m-1', 'animais', '8-12', 'M', 'Floresta Amazônica', 'Maior floresta tropical do mundo', 1, true)
ON CONFLICT (id) DO UPDATE SET
    word = EXCLUDED.word,
    tip = EXCLUDED.tip,
    score = EXCLUDED.score,
    active = EXCLUDED.active;
