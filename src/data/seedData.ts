import { Theme, AgeRange, ChallengeItem } from '../types';

export const DEFAULT_THEMES: Theme[] = [
  {
    id: 'biblia',
    name: 'Bíblia',
    description: 'Histórias, personagens, milagres e ensinamentos das Sagradas Escrituras',
    icon: 'BookOpen',
    active: true,
  },
  {
    id: 'animais',
    name: 'Animais & Natureza',
    description: 'Bichos, selva, oceanos e elementos da natureza',
    icon: 'PawPrint',
    active: true,
  },
  {
    id: 'geral',
    name: 'Conhecimentos Gerais',
    description: 'Cotidiano, profissões, esportes, escola e cultura',
    icon: 'Globe',
    active: true,
  },
];

export const DEFAULT_AGE_RANGES: AgeRange[] = [
  {
    id: '5-7',
    name: '5 a 7 anos (Infantil)',
    minAge: 5,
    maxAge: 7,
    active: true,
  },
  {
    id: '8-12',
    name: '8 a 12 anos (Juniores)',
    minAge: 8,
    maxAge: 12,
    active: true,
  },
  {
    id: '13-17',
    name: '13 a 17 anos (Adolescentes)',
    minAge: 13,
    maxAge: 17,
    active: true,
  },
  {
    id: 'adultos',
    name: 'Adultos & Jovens',
    minAge: 18,
    maxAge: 99,
    active: true,
  },
];

// ================= EXACT 60 WORDS PER CATEGORY FOR BIBLIA (8-12 ANOS) =================
const BIBLIA_8_12_P: string[] = [
  'Adão', 'Eva', 'Noé', 'Abraão', 'Sara', 'Isaque', 'Rebeca', 'Jacó', 'Esaú', 'José',
  'Moisés', 'Arão', 'Miriã', 'Josué', 'Calebe', 'Raabe', 'Gideão', 'Sansão', 'Rute', 'Noemi',
  'Samuel', 'Saul', 'Davi', 'Jônatas', 'Salomão', 'Elias', 'Eliseu', 'Isaías', 'Jeremias', 'Daniel',
  'Ester', 'Neemias', 'Esdras', 'Jó', 'Jonas', 'Maria', 'José', 'Jesus', 'Pedro', 'André',
  'Tiago', 'João', 'Mateus', 'Tomé', 'Filipe', 'Bartolomeu', 'Marta', 'Lázaro', 'Zaqueu', 'Nicodemos',
  'Paulo', 'Barnabé', 'Silas', 'Timóteo', 'Tito', 'Estêvão', 'Priscila', 'Áquila', 'Cornélio', 'Bartimeu'
];

const BIBLIA_8_12_O: string[] = [
  'Cajado', 'Cálice', 'Coroa', 'Trombeta', 'Espada', 'Escudo', 'Harpa', 'Arco', 'Flecha', 'Estilingue',
  'Rede', 'Barco', 'Corda', 'Tocha', 'Lâmpada', 'Altar', 'Incenso', 'Jarro', 'Vaso', 'Cesto',
  'Bacia', 'Toalha', 'Sandália', 'Túnica', 'Manto', 'Capa', 'Anel', 'Moeda', 'Pergaminho', 'Livro',
  'Tábuas', 'Lenha', 'Vara', 'Pedra', 'Tijolo', 'Martelo', 'Machado', 'Colher', 'Prato', 'Pão',
  'Peixe', 'Frasco', 'Odre', 'Selo', 'Chave', 'Sino', 'Tambor', 'Cítara', 'Incensário', 'Manjedoura',
  'Corno', 'Lamparina', 'Cântaro', 'Máscara', 'Mochila', 'Carruagem', 'Barrete', 'Cinturão', 'Véu', 'Bússola'
];

const BIBLIA_8_12_A: string[] = [
  'Andar', 'Correr', 'Pular', 'Nadar', 'Dormir', 'Acordar', 'Comer', 'Beber', 'Pescar', 'Orar',
  'Cantar', 'Dançar', 'Chorar', 'Rir', 'Gritar', 'Sorrir', 'Abraçar', 'Ajudar', 'Servir', 'Perdoar',
  'Amar', 'Ensinar', 'Escrever', 'Ler', 'Falar', 'Escutar', 'Caminhar', 'Subir', 'Descer', 'Saltar',
  'Lutar', 'Marchar', 'Construir', 'Quebrar', 'Plantar', 'Colher', 'Semear', 'Cozinhar', 'Viajar', 'Esconder',
  'Procurar', 'Carregar', 'Entregar', 'Receber', 'Oferecer', 'Jejuar', 'Adorar', 'Louvar', 'Vigiar', 'Seguir',
  'Chamar', 'Convidar', 'Batizar', 'Curar', 'Levantar', 'Sentar', 'Ajoelhar', 'Tocar', 'Atirar', 'Derramar'
];

const BIBLIA_8_12_D: string[] = [
  'Maná', 'Leão', 'Serpente', 'Baleia', 'Gigante', 'Estrela', 'Pomba', 'Corvo', 'Cordeiro', 'Galo',
  'Peixe', 'Trigo', 'Espiga', 'Azeite', 'Fogo', 'Chuva', 'Trovão', 'Relâmpago', 'Vento', 'Areia',
  'Deserto', 'Montanha', 'Muralha', 'Túmulo', 'Cruz', 'Coroa', 'Ferida', 'Sangue', 'Água', 'Poço',
  'Semente', 'Videira', 'Uva', 'Figo', 'Oliveira', 'Palma', 'Cedro', 'Rocha', 'Ossos', 'Cinzas',
  'Prisão', 'Corrente', 'Escada', 'Espelho', 'Sombra', 'Luz', 'Trevas', 'Voz', 'Lágrima', 'Sorriso',
  'Fome', 'Sede', 'Medo', 'Fé', 'Graça', 'Paz', 'Amor', 'Glória', 'Aleluia', 'Amém'
];

const BIBLIA_8_12_L: string[] = [
  // Lugares
  'Éden', 'Belém', 'Nazaré', 'Jerusalém', 'Jericó', 'Betânia', 'Cafarnaum', 'Damasco', 'Hebrom', 'Canaã',
  'Egito', 'Babilônia', 'Nínive', 'Samaria', 'Moabe', 'Midiã', 'Susã', 'Sarepta', 'Filipos', 'Corinto',
  'Éfeso', 'Roma', 'Antioquia', 'Patmos', 'Gólgota', 'Getsêmani', 'Sinai', 'Carmelo', 'Jordão', 'Galileia',
  // Livros da Bíblia
  'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute', 'Samuel', 'Reis',
  'Crônicas', 'Esdras', 'Neemias', 'Ester', 'Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cantares', 'Isaías',
  'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel', 'Oseias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miqueias'
];

const BIBLIA_8_12_M: string[] = [
  'Criação', 'Dilúvio', 'Aliança', 'Promessa', 'Pecado', 'Perdão', 'Salvação', 'Redenção', 'Graça', 'Fé',
  'Esperança', 'Amor', 'Justiça', 'Misericórdia', 'Santidade', 'Obediência', 'Coragem', 'Sabedoria', 'Humildade', 'Fidelidade',
  'Perseverança', 'Oração', 'Adoração', 'Louvor', 'Jejum', 'Milagre', 'Profecia', 'Evangelho', 'Evangelização', 'Discipulado',
  'Batismo', 'Ressurreição', 'Ascensão', 'Pentecostes', 'Páscoa', 'Ceia', 'Sacrifício', 'Expiação', 'Unção', 'Chamado',
  'Missão', 'Testemunho', 'Comunhão', 'Serviço', 'Generosidade', 'Bênção', 'Reino', 'Messias', 'Redentor', 'Profeta',
  'Apóstolo', 'Discípulo', 'Sacerdote', 'Anjo', 'Espírito', 'Templo', 'Tabernáculo', 'Vida Eterna', 'Nova Aliança', 'Trindade'
];

// Helper to convert word list to ChallengeItem array
function buildChallengesFromList(
  words: string[],
  themeId: string,
  ageRangeId: string,
  category: 'P' | 'O' | 'A' | 'D' | 'L' | 'M',
  prefix: string
): ChallengeItem[] {
  return words.map((word, index) => ({
    id: `${prefix}-${category.toLowerCase()}-${index + 1}`,
    themeId,
    ageRangeId,
    category,
    word,
    score: 1, // Base default; actual round score is randomized between 1 and 6 at turn creation
    active: true,
    createdAt: '2025-01-01',
  }));
}

// Generate the 360 foundational items for Bíblia 8-12 anos (60 per category)
const biblia8to12Challenges: ChallengeItem[] = [
  ...buildChallengesFromList(BIBLIA_8_12_P, 'biblia', '8-12', 'P', 'b8'),
  ...buildChallengesFromList(BIBLIA_8_12_O, 'biblia', '8-12', 'O', 'b8'),
  ...buildChallengesFromList(BIBLIA_8_12_A, 'biblia', '8-12', 'A', 'b8'),
  ...buildChallengesFromList(BIBLIA_8_12_D, 'biblia', '8-12', 'D', 'b8'),
  ...buildChallengesFromList(BIBLIA_8_12_L, 'biblia', '8-12', 'L', 'b8'),
  ...buildChallengesFromList(BIBLIA_8_12_M, 'biblia', '8-12', 'M', 'b8'),
];

// Additional seed items for other age ranges and themes
const otherSeedChallenges: ChallengeItem[] = [
  // Bíblia 5-7 anos
  { id: 'b5-p-1', themeId: 'biblia', ageRangeId: '5-7', category: 'P', word: 'Noé', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-p-2', themeId: 'biblia', ageRangeId: '5-7', category: 'P', word: 'Menino Jesus', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-p-3', themeId: 'biblia', ageRangeId: '5-7', category: 'P', word: 'Daniel', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-o-1', themeId: 'biblia', ageRangeId: '5-7', category: 'O', word: 'Barquinho', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-o-2', themeId: 'biblia', ageRangeId: '5-7', category: 'O', word: 'Pão e Peixe', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-a-1', themeId: 'biblia', ageRangeId: '5-7', category: 'A', word: 'Agradecer', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-a-2', themeId: 'biblia', ageRangeId: '5-7', category: 'A', word: 'Abraçar', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-d-1', themeId: 'biblia', ageRangeId: '5-7', category: 'D', word: 'Arco-Íris', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-d-2', themeId: 'biblia', ageRangeId: '5-7', category: 'D', word: 'Ovelhinha', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-l-1', themeId: 'biblia', ageRangeId: '5-7', category: 'L', word: 'Jardim do Éden', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-l-2', themeId: 'biblia', ageRangeId: '5-7', category: 'L', word: 'Belém', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-m-1', themeId: 'biblia', ageRangeId: '5-7', category: 'M', word: 'Amor de Deus', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b5-m-2', themeId: 'biblia', ageRangeId: '5-7', category: 'M', word: 'Natal', score: 1, active: true, createdAt: '2025-01-01' },

  // Bíblia 13-17 anos
  { id: 'b13-p-1', themeId: 'biblia', ageRangeId: '13-17', category: 'P', word: 'Estêvão', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b13-o-1', themeId: 'biblia', ageRangeId: '13-17', category: 'O', word: 'Túnica de José', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b13-a-1', themeId: 'biblia', ageRangeId: '13-17', category: 'A', word: 'Perdoar Inimigo', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b13-d-1', themeId: 'biblia', ageRangeId: '13-17', category: 'D', word: 'Muralhas', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b13-l-1', themeId: 'biblia', ageRangeId: '13-17', category: 'L', word: 'Jericó', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'b13-m-1', themeId: 'biblia', ageRangeId: '13-17', category: 'M', word: 'Santidade', score: 1, active: true, createdAt: '2025-01-01' },

  // Animais & Natureza
  { id: 'an-p-1', themeId: 'animais', ageRangeId: '8-12', category: 'P', word: 'Veterinário', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'an-o-1', themeId: 'animais', ageRangeId: '8-12', category: 'O', word: 'Coleira', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'an-a-1', themeId: 'animais', ageRangeId: '8-12', category: 'A', word: 'Latir e Pular', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'an-d-1', themeId: 'animais', ageRangeId: '8-12', category: 'D', word: 'Elefante', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'an-l-1', themeId: 'animais', ageRangeId: '8-12', category: 'L', word: 'Zoológico', score: 1, active: true, createdAt: '2025-01-01' },
  { id: 'an-m-1', themeId: 'animais', ageRangeId: '8-12', category: 'M', word: 'Floresta', score: 1, active: true, createdAt: '2025-01-01' },
];

export const DEFAULT_CHALLENGES: ChallengeItem[] = [
  ...biblia8to12Challenges,
  ...otherSeedChallenges,
];
