import * as XLSX from 'xlsx';
import { ChallengeItem, CategoryCode } from '../types';

export interface ExcelImportValidationResult {
  validItems: ChallengeItem[];
  totalRows: number;
  cardsCount: number;
  challengesCount: number;
  distinctThemes: string[];
  distinctAgeRanges: string[];
  warnings: string[];
  errors: string[];
  duplicateWords: { word: string; count: number; theme: string; ageRange: string }[];
  longCategoryDWarnings: { word: string; row: number }[];
}

// Clean and normalize strings
function normalizeStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function cleanId(val: string): string {
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseExcelFile(
  fileData: ArrayBuffer,
  existingChallenges: ChallengeItem[]
): ExcelImportValidationResult {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Read as array of arrays (header + rows)
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    return {
      validItems: [],
      totalRows: 0,
      cardsCount: 0,
      challengesCount: 0,
      distinctThemes: [],
      distinctAgeRanges: [],
      warnings: [],
      errors: ['O arquivo Excel está vazio ou não possui linhas de dados válidas.'],
      duplicateWords: [],
      longCategoryDWarnings: [],
    };
  }

  const rawHeaders = rows[0].map((h) => normalizeStr(h).toLowerCase());
  const headerMap: Record<string, number> = {};

  rawHeaders.forEach((h, idx) => {
    // Check for Tema
    if (h.includes('tema') || h.includes('assunto')) headerMap['tema'] = idx;
    // Check for Faixa Etária
    else if (h.includes('faixa') || h.includes('idade') || h.includes('etaria') || h.includes('etária')) headerMap['faixa'] = idx;
    // Check for 6 classic categories
    else if (h === 'p' || h.startsWith('p ') || h.includes('pessoa') || h.includes('personagem')) headerMap['P'] = idx;
    else if (h === 'o' || h.startsWith('o ') || h.includes('objeto')) headerMap['O'] = idx;
    else if (h === 'a' || h.startsWith('a ') || h.includes('acao') || h.includes('ação')) headerMap['A'] = idx;
    else if (h === 'd' || h.startsWith('d ') || h.includes('desafio')) headerMap['D'] = idx;
    else if (h === 'l' || h.startsWith('l ') || h.includes('lugar') || h.includes('livro')) headerMap['L'] = idx;
    else if (h === 'm' || h.startsWith('m ') || h.includes('misterio') || h.includes('mistério') || h.includes('tema')) headerMap['M'] = idx;
    // Check for granular format
    else if (h === 'categoria' || h === 'cat') headerMap['categoria'] = idx;
    else if (h === 'palavra' || h === 'desafio_palavra' || h === 'termo') headerMap['palavra'] = idx;
    else if (h === 'pontos' || h === 'pontuacao' || h === 'pontuação' || h === 'score') headerMap['pontos'] = idx;
    else if (h === 'dica' || h === 'referencia' || h === 'referência') headerMap['dica'] = idx;
  });

  const errors: string[] = [];
  const warnings: string[] = [];
  const validItems: ChallengeItem[] = [];
  const longCategoryDWarnings: { word: string; row: number }[] = [];

  const isClassicCardFormat =
    headerMap['P'] !== undefined &&
    headerMap['O'] !== undefined &&
    headerMap['A'] !== undefined &&
    headerMap['D'] !== undefined &&
    headerMap['L'] !== undefined &&
    headerMap['M'] !== undefined;

  const isGranularFormat =
    headerMap['categoria'] !== undefined && headerMap['palavra'] !== undefined;

  if (!isClassicCardFormat && !isGranularFormat) {
    errors.push(
      'Estrutura de colunas não reconhecida. Utilize as colunas [Tema, Faixa Etária, P, O, A, D, L, M] ou [Tema, Faixa Etária, Categoria, Palavra, Pontos].'
    );
    return {
      validItems: [],
      totalRows: rows.length - 1,
      cardsCount: 0,
      challengesCount: 0,
      distinctThemes: [],
      distinctAgeRanges: [],
      warnings,
      errors,
      duplicateWords: [],
      longCategoryDWarnings: [],
    };
  }

  const themesSet = new Set<string>();
  const ageRangesSet = new Set<string>();
  const wordOccurrenceMap: Record<string, { count: number; theme: string; ageRange: string }> = {};

  let cardSequence = 1;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip empty lines
    if (!row || row.every((c) => normalizeStr(c) === '')) continue;

    const rawTema = headerMap['tema'] !== undefined ? normalizeStr(row[headerMap['tema']]) : 'Geral';
    const rawFaixa = headerMap['faixa'] !== undefined ? normalizeStr(row[headerMap['faixa']]) : '8-12';

    if (!rawTema) {
      warnings.push(`Linha ${r + 1}: Tema não preenchido. Usando "Bíblia".`);
    }
    if (!rawFaixa) {
      warnings.push(`Linha ${r + 1}: Faixa etária não preenchida. Usando "8-12".`);
    }

    const themeId = cleanId(rawTema || 'biblia');
    const ageRangeId = cleanId(rawFaixa || '8-12');

    themesSet.add(rawTema || 'Bíblia');
    ageRangesSet.add(rawFaixa || '8 a 12 anos');

    if (isClassicCardFormat) {
      // 6 categories per row
      const categories: CategoryCode[] = ['P', 'O', 'A', 'D', 'L', 'M'];
      const currentCardIdx = cardSequence++;
      const scoreVal =
        headerMap['pontos'] !== undefined && row[headerMap['pontos']]
          ? Number(row[headerMap['pontos']]) || 1
          : 1;

      categories.forEach((cat) => {
        const colIdx = headerMap[cat];
        const word = normalizeStr(row[colIdx]);

        if (!word) {
          warnings.push(`Linha ${r + 1}: Categoria "${cat}" está vazia neste card.`);
          return;
        }

        // Check category D length guideline (should be simple words, alert if long sentence)
        if (cat === 'D') {
          const wordCount = word.split(/\s+/).length;
          if (wordCount > 3 || word.length > 25) {
            longCategoryDWarnings.push({ word, row: r + 1 });
            warnings.push(
              `Linha ${r + 1} (Categoria D): "${word}" parece uma frase longa. Recomenda-se usar termos simples (ex: Leão, Maná, Gigante).`
            );
          }
        }

        // Duplicate tracking
        const wordKey = `${word.toLowerCase()}_${themeId}_${ageRangeId}_${cat}`;
        if (!wordOccurrenceMap[wordKey]) {
          wordOccurrenceMap[wordKey] = {
            count: 1,
            theme: rawTema || 'Bíblia',
            ageRange: rawFaixa || '8-12',
          };
        } else {
          wordOccurrenceMap[wordKey].count++;
        }

        validItems.push({
          id: `imp-${themeId}-${ageRangeId}-${cat}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`,
          themeId,
          ageRangeId,
          category: cat,
          word,
          score: scoreVal,
          cardIndex: currentCardIdx,
          active: true,
          createdAt: new Date().toISOString(),
        });
      });
    } else if (isGranularFormat) {
      // 1 challenge per row
      const rawCat = normalizeStr(row[headerMap['categoria']]).toUpperCase();
      const word = normalizeStr(row[headerMap['palavra']]);
      const scoreVal =
        headerMap['pontos'] !== undefined && row[headerMap['pontos']]
          ? Number(row[headerMap['pontos']]) || 1
          : 1;
      const dica =
        headerMap['dica'] !== undefined ? normalizeStr(row[headerMap['dica']]) : '';

      const validCats: CategoryCode[] = ['P', 'O', 'A', 'D', 'L', 'M'];
      const matchedCat = validCats.find(
        (c) => c === rawCat || c === rawCat[0]
      ) as CategoryCode;

      if (!matchedCat) {
        warnings.push(
          `Linha ${r + 1}: Categoria inválida "${rawCat}". Use P, O, A, D, L ou M.`
        );
        return;
      }

      if (!word) {
        warnings.push(`Linha ${r + 1}: Palavra não preenchida.`);
        return;
      }

      if (matchedCat === 'D') {
        const wordCount = word.split(/\s+/).length;
        if (wordCount > 3 || word.length > 25) {
          longCategoryDWarnings.push({ word, row: r + 1 });
          warnings.push(
            `Linha ${r + 1} (Categoria D): "${word}" parece uma frase longa. Recomenda-se palavras simples.`
          );
        }
      }

      const wordKey = `${word.toLowerCase()}_${themeId}_${ageRangeId}_${matchedCat}`;
      if (!wordOccurrenceMap[wordKey]) {
        wordOccurrenceMap[wordKey] = {
          count: 1,
          theme: rawTema || 'Bíblia',
          ageRange: rawFaixa || '8-12',
        };
      } else {
        wordOccurrenceMap[wordKey].count++;
      }

      validItems.push({
        id: `imp-${themeId}-${ageRangeId}-${matchedCat}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`,
        themeId,
        ageRangeId,
        category: matchedCat,
        word,
        score: scoreVal,
        hint: dica,
        active: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Detect internal and existing duplicates
  const duplicateWords: { word: string; count: number; theme: string; ageRange: string }[] = [];

  Object.entries(wordOccurrenceMap).forEach(([key, info]) => {
    if (info.count > 1) {
      const cleanWord = key.split('_')[0];
      duplicateWords.push({
        word: cleanWord,
        count: info.count,
        theme: info.theme,
        ageRange: info.ageRange,
      });
      warnings.push(
        `Aviso de Duplicidade: A palavra "${cleanWord}" aparece ${info.count} vezes na planilha (${info.theme} - ${info.ageRange}).`
      );
    }
  });

  const cardsCount = isClassicCardFormat
    ? cardSequence - 1
    : Math.ceil(validItems.length / 6);

  return {
    validItems,
    totalRows: rows.length - 1,
    cardsCount,
    challengesCount: validItems.length,
    distinctThemes: Array.from(themesSet),
    distinctAgeRanges: Array.from(ageRangesSet),
    warnings,
    errors,
    duplicateWords,
    longCategoryDWarnings,
  };
}

// Generate and trigger download of template Excel file
export function downloadExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Classic Card Matrix (P, O, A, D, L, M)
  const matrixData = [
    ['Tema', 'Faixa Etária', 'P (Pessoa)', 'O (Objeto)', 'A (Ação)', 'D (Desafio)', 'L (Lugar/Livro)', 'M (Mistério/Tema)', 'Pontos'],
    ['Bíblia', '8-12', 'Davi', 'Cálice', 'Nadar', 'Maná', 'Nazaré', 'Noé', 1],
    ['Bíblia', '8-12', 'Ester', 'Cajado', 'Correr', 'Leão', 'Egito', 'Pentecostes', 1],
    ['Bíblia', '8-12', 'Pedro', 'Alforje', 'Dormir', 'Serpente', 'Belém', 'Parábola', 1],
    ['Bíblia', '5-7', 'Noé', 'Barquinho', 'Agradecer', 'Arco-Íris', 'Jardim do Éden', 'Amor de Deus', 1],
    ['Animais', '5-7', 'Veterinário', 'Coleira', 'Latir', 'Elefante', 'Zoológico', 'Floresta', 1],
    ['Conhecimentos Gerais', '8-12', 'Astronauta', 'Telescópio', 'Andar na Lua', 'Foguete', 'Planeta Marte', 'Gravidade', 1],
  ];
  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Cards (P-O-A-D-L-M)');

  // Sheet 2: Granular Challenge Rows
  const granularData = [
    ['Tema', 'Faixa Etária', 'Categoria', 'Palavra', 'Pontos', 'Dica'],
    ['Bíblia', '8-12', 'P', 'Moisés', 1, 'Libertou o povo do Egito'],
    ['Bíblia', '8-12', 'O', 'Arca da Aliança', 1, 'Objeto sagrado'],
    ['Bíblia', '8-12', 'A', 'Orar de Joelhos', 1, 'Falar com Deus'],
    ['Bíblia', '8-12', 'D', 'Gigante', 1, 'Golias'],
    ['Bíblia', '8-12', 'L', 'Monte Sinai', 1, 'Onde Moisés recebeu os 10 Mandamentos'],
    ['Bíblia', '8-12', 'M', 'Criação', 1, 'Gênesis'],
  ];
  const wsGranular = XLSX.utils.aoa_to_sheet(granularData);
  XLSX.utils.book_append_sheet(wb, wsGranular, 'Desafios Linha a Linha');

  // Sheet 3: Guia e Instruções
  const instructionsData = [
    ['GUIA DE PREENCHIMENTO DO EXCEL - IMAGEM & AÇÃO'],
    [''],
    ['1. CATEGORIAS:'],
    ['   P = PESSOA (Personagem, figura histórica ou pessoa bíblica)'],
    ['   O = OBJETO (Item físico, artefato ou símbolo)'],
    ['   A = AÇÃO (Verbo ou ação representável por mímica)'],
    ['   D = DESAFIO (Palavra ou termo curto - EVITE frases longas!)'],
    ['   L = LUGAR OU LIVRO (Cidades, montes, rios ou livros da Bíblia)'],
    ['   M = MISTÉRIO / TEMA (Conceito, evento marcante ou mistério)'],
    [''],
    ['2. DICAS IMPORTANTES:'],
    ['   - Você pode importar tanto na aba "Cards" quanto na aba "Desafios".'],
    ['   - Mantenha a pontuação como 1 (ou o valor desejado).'],
    ['   - As faixas etárias padrão são: 5-7, 8-12, 13-17, Adultos.'],
    ['   - Você pode criar novos temas e novas faixas etárias digitando os nomes livremente!'],
  ];
  const wsInst = XLSX.utils.aoa_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instruções e Dicas');

  XLSX.writeFile(wb, 'Modelo_Imagem_e_Acao.xlsx');
}

// Export current database to Excel
export function exportDatabaseToExcel(challenges: ChallengeItem[]) {
  const wb = XLSX.utils.book_new();

  // Group by theme, age, and cardIndex if possible, or export granular list
  const data = [
    ['ID', 'Tema', 'Faixa Etária', 'Categoria', 'Palavra', 'Pontos', 'Dica/Referência', 'Status'],
    ...challenges.map((c) => [
      c.id,
      c.themeId,
      c.ageRangeId,
      c.category,
      c.word,
      c.score || 1,
      c.hint || '',
      c.active ? 'Ativo' : 'Inativo',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Banco de Palavras');

  XLSX.writeFile(wb, `Imagem_e_Acao_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
