import { useState, useMemo, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Theme,
  AgeRange,
  ChallengeItem,
  CategoryCode,
  GameSettings,
} from '../types';
import { CATEGORIES, CATEGORY_CODES } from '../data/categories';
import {
  parseExcelFile,
  downloadExcelTemplate,
  exportDatabaseToExcel,
  ExcelImportValidationResult,
} from '../utils/excel';
import { soundManager } from '../utils/audio';
import {
  Upload,
  Download,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Users,
  Database,
  ArrowLeft,
  RefreshCcw,
  BookOpen,
  Wand2,
  Check,
  X,
  Clock,
  Cloud,
  Globe,
  FileCode,
  Copy,
  Radio,
} from 'lucide-react';
import {
  isSupabaseConfigured,
  getActiveSupabaseConfig,
  testSupabaseConnection,
  uploadLocalDataToSupabase,
  downloadCloudDataFromSupabase,
  SUPABASE_SQL_SCHEMA,
  generateCompleteSupabaseSql,
  setCustomSupabaseCredentials,
} from '../services/supabase';

interface AdminPanelProps {
  themes: Theme[];
  ageRanges: AgeRange[];
  challenges: ChallengeItem[];
  settings: GameSettings;
  onUpdateThemes: (themes: Theme[]) => void;
  onUpdateAgeRanges: (ageRanges: AgeRange[]) => void;
  onUpdateChallenges: (challenges: ChallengeItem[]) => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onResetToDefaults: () => void;
  onBack: () => void;
}

type AdminTab = 'import_export' | 'ai_generator' | 'challenges' | 'themes_ages' | 'settings' | 'supabase_cloud';

export default function AdminPanel({
  themes,
  ageRanges,
  challenges,
  settings,
  onUpdateThemes,
  onUpdateAgeRanges,
  onUpdateChallenges,
  onUpdateSettings,
  onResetToDefaults,
  onBack,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('import_export');

  // Excel Import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importResult, setImportResult] = useState<ExcelImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // AI Generator state
  const [aiTheme, setAiTheme] = useState('Bíblia - Histórias e Personagens');
  const [aiAgeRange, setAiAgeRange] = useState('8-12');
  const [aiCardCount, setAiCardCount] = useState(5);
  const [aiCustomInstructions, setAiCustomInstructions] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedItems, setAiGeneratedItems] = useState<ChallengeItem[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // Challenges Table Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTheme, setFilterTheme] = useState<string>('all');
  const [filterAgeRange, setFilterAgeRange] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // New Word Modal / State
  const [showAddWordModal, setShowAddWordModal] = useState(false);
  const [newWordData, setNewWordData] = useState({
    themeId: 'biblia',
    ageRangeId: '8-12',
    category: 'P' as CategoryCode,
    word: '',
    score: 1,
    hint: '',
  });

  // Reset database confirm modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Supabase Cloud State
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseStatusMsg, setSupabaseStatusMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingToCloud, setIsSyncingToCloud] = useState(false);
  const [isDownloadingFromCloud, setIsDownloadingFromCloud] = useState(false);
  const [copiedSqlSchema, setCopiedSqlSchema] = useState(false);
  const [customSupabaseUrl, setCustomSupabaseUrl] = useState(() => getActiveSupabaseConfig().url);
  const [customSupabaseKey, setCustomSupabaseKey] = useState('');

  const isSupabaseReady = isSupabaseConfigured();
  const activeConfig = getActiveSupabaseConfig();

  // Filtered challenges
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (filterTheme !== 'all' && c.themeId.toLowerCase() !== filterTheme.toLowerCase()) return false;
      if (filterAgeRange !== 'all' && c.ageRangeId.toLowerCase() !== filterAgeRange.toLowerCase()) return false;
      if (filterCategory !== 'all' && c.category.toUpperCase() !== filterCategory.toUpperCase()) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          c.word.toLowerCase().includes(query) ||
          (c.hint && c.hint.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [challenges, filterTheme, filterAgeRange, filterCategory, searchQuery]);

  const totalPages = Math.ceil(filteredChallenges.length / pageSize) || 1;
  const paginatedChallenges = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredChallenges.slice(start, start + pageSize);
  }, [filteredChallenges, page, pageSize]);

  // Handle Excel File Upload
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setImportSuccessMessage(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const result = parseExcelFile(buffer, challenges);
        setImportResult(result);
      } catch (err: any) {
        setImportResult({
          validItems: [],
          totalRows: 0,
          cardsCount: 0,
          challengesCount: 0,
          distinctThemes: [],
          distinctAgeRanges: [],
          warnings: [],
          errors: ['Falha ao ler arquivo: ' + (err.message || 'Formato inválido')],
          duplicateWords: [],
          longCategoryDWarnings: [],
        });
      } finally {
        setIsProcessingFile(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Commit Excel Import to State & Storage
  const handleConfirmImport = () => {
    if (!importResult || importResult.validItems.length === 0) return;
    soundManager.playClick();

    // Auto-create any new themes found in Excel if they don't exist yet
    const currentThemeIds = new Set(themes.map((t) => t.id.toLowerCase()));
    const newThemesToAdd: Theme[] = [];
    importResult.distinctThemes.forEach((tName) => {
      const cleanId = tName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      if (!currentThemeIds.has(cleanId) && cleanId) {
        newThemesToAdd.push({
          id: cleanId,
          name: tName,
          description: `Importado de planilha`,
          icon: 'sparkles',
          active: true,
        });
        currentThemeIds.add(cleanId);
      }
    });

    if (newThemesToAdd.length > 0) {
      onUpdateThemes([...themes, ...newThemesToAdd]);
    }

    // Auto-create any new age ranges found in Excel if they don't exist yet
    const currentAgeIds = new Set(ageRanges.map((a) => a.id.toLowerCase()));
    const newAgesToAdd: AgeRange[] = [];
    importResult.distinctAgeRanges.forEach((aName) => {
      const cleanId = aName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      if (!currentAgeIds.has(cleanId) && cleanId) {
        newAgesToAdd.push({
          id: cleanId,
          name: aName,
          minAge: 8,
          maxAge: 12,
          active: true,
        });
        currentAgeIds.add(cleanId);
      }
    });

    if (newAgesToAdd.length > 0) {
      onUpdateAgeRanges([...ageRanges, ...newAgesToAdd]);
    }

    // Update challenges
    if (importMode === 'replace') {
      onUpdateChallenges(importResult.validItems);
      setImportSuccessMessage(
        `Sucesso! Banco de dados substituído por ${importResult.validItems.length} novos desafios.`
      );
    } else {
      onUpdateChallenges([...challenges, ...importResult.validItems]);
      setImportSuccessMessage(
        `Sucesso! ${importResult.validItems.length} novos desafios adicionados ao banco existente.`
      );
    }

    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Generate cards via AI
  const handleGenerateAi = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    setAiGeneratedItems([]);
    soundManager.playClick();

    try {
      const res = await fetch('/api/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: aiTheme,
          ageRange: aiAgeRange,
          cardCount: aiCardCount,
          customInstructions: aiCustomInstructions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao gerar conteúdo com IA');
      }

      setAiGeneratedItems(data.challenges || []);
      soundManager.playLetterChime();
    } catch (err: any) {
      setAiError(err.message || 'Erro inesperado ao conectar com o gerador');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Save AI items to database
  const handleSaveAiItems = () => {
    if (aiGeneratedItems.length === 0) return;
    soundManager.playClick();
    onUpdateChallenges([...challenges, ...aiGeneratedItems]);
    setImportSuccessMessage(
      `Sucesso! ${aiGeneratedItems.length} palavras geradas por IA foram salvas no banco!`
    );
    setAiGeneratedItems([]);
  };

  // Delete single challenge
  const handleDeleteChallenge = (id: string) => {
    soundManager.playClick();
    onUpdateChallenges(challenges.filter((c) => c.id !== id));
  };

  // Add manual challenge
  const handleSaveNewWord = () => {
    if (!newWordData.word.trim()) return;
    soundManager.playClick();

    const newItem: ChallengeItem = {
      id: `manual-${Date.now()}`,
      themeId: newWordData.themeId,
      ageRangeId: newWordData.ageRangeId,
      category: newWordData.category,
      word: newWordData.word.trim(),
      score: newWordData.score || 1,
      hint: newWordData.hint?.trim() || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    };

    onUpdateChallenges([newItem, ...challenges]);
    setShowAddWordModal(false);
    setNewWordData({
      themeId: newWordData.themeId,
      ageRangeId: newWordData.ageRangeId,
      category: 'P',
      word: '',
      score: 1,
      hint: '',
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 select-none" id="admin-panel-container">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-indigo-900/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.playClick();
              onBack();
            }}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-yellow-400 transition-colors cursor-pointer border border-white/10"
            title="Voltar ao Jogo"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase flex items-center gap-2 tracking-tight">
              <Database className="w-7 h-7 text-yellow-400" />
              <span>Gerenciamento de Conteúdo</span>
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm font-semibold">
              Importe planilhas Excel, gere desafios com IA ou cadastre temas e palavras
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundManager.playClick();
              exportDatabaseToExcel(challenges);
            }}
            id="btn-export-database"
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-yellow-400 stroke-[2.5]" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              downloadExcelTemplate();
            }}
            id="btn-download-template"
            className="px-4 py-2.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-yellow-400/20 flex items-center gap-1.5 transition-all cursor-pointer border-2 border-yellow-300"
          >
            <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
            <span>Baixar Modelo Excel</span>
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-indigo-900/60">
        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('import_export');
          }}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'import_export'
              ? 'bg-yellow-400 text-indigo-950 shadow-lg'
              : 'bg-white/10 text-indigo-200 hover:text-white hover:bg-white/20'
          }`}
        >
          <Upload className="w-4 h-4 stroke-[2.5]" />
          <span>Importar Planilha</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('ai_generator');
          }}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'ai_generator'
              ? 'bg-yellow-400 text-indigo-950 shadow-lg'
              : 'bg-white/10 text-indigo-200 hover:text-white hover:bg-white/20'
          }`}
        >
          <Wand2 className="w-4 h-4 stroke-[2.5]" />
          <span>Gerador com IA</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('challenges');
          }}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'challenges'
              ? 'bg-yellow-400 text-indigo-950 shadow-lg'
              : 'bg-white/10 text-indigo-200 hover:text-white hover:bg-white/20'
          }`}
        >
          <Layers className="w-4 h-4 stroke-[2.5]" />
          <span>Palavras ({challenges.length})</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('themes_ages');
          }}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'themes_ages'
              ? 'bg-yellow-400 text-indigo-950 shadow-lg'
              : 'bg-white/10 text-indigo-200 hover:text-white hover:bg-white/20'
          }`}
        >
          <BookOpen className="w-4 h-4 stroke-[2.5]" />
          <span>Temas & Faixas ({themes.length})</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('settings');
          }}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-yellow-400 text-indigo-950 shadow-lg'
              : 'bg-white/10 text-indigo-200 hover:text-white hover:bg-white/20'
          }`}
        >
          <RefreshCcw className="w-4 h-4 stroke-[2.5]" />
          <span>Configurações & Reset</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setActiveTab('supabase_cloud');
          }}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'supabase_cloud'
              ? 'bg-yellow-400 text-indigo-950 shadow-lg'
              : isSupabaseReady
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-white/10 text-indigo-200 hover:text-white hover:bg-white/20'
          }`}
        >
          <Cloud className="w-4 h-4 stroke-[2.5]" />
          <span>Nuvem & Supabase</span>
          {isSupabaseReady && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
        </button>
      </div>

      {/* Success Notification Banner */}
      {importSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500 text-emerald-300 text-sm font-bold flex items-center justify-between mb-6 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>{importSuccessMessage}</span>
          </div>
          <button
            onClick={() => setImportSuccessMessage(null)}
            className="p-1 rounded-lg hover:bg-emerald-900/50 text-emerald-400"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* TAB 1: EXCEL IMPORT & EXPORT */}
      {activeTab === 'import_export' && (
        <div className="space-y-6">
          {/* Upload Dropzone */}
          <div className="p-8 rounded-3xl bg-slate-900/80 border-2 border-dashed border-slate-700 text-center relative hover:border-indigo-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mx-auto mb-4 text-indigo-400">
              <Upload className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-extrabold text-white font-heading">
              Arraste sua planilha Excel aqui ou clique para selecionar
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
              Suporta formato clássico de cards <strong>[Tema, Faixa Etária, P, O, A, D, L, M]</strong> ou formato de desafios individuais linha a linha.
            </p>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/20 transition-all pointer-events-none"
              >
                Selecionar Arquivo .xlsx
              </button>
            </div>
          </div>

          {/* Validation Result Preview */}
          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-slate-900 border-2 border-slate-700 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-white font-heading">
                    Relatório de Validação da Planilha
                  </h3>
                  <p className="text-slate-400 text-xs">
                    {importResult.totalRows} linhas analisadas • {importResult.challengesCount} desafios individuais válidos identificados
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 font-bold">Modo de Importação:</label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none"
                  >
                    <option value="append">Adicionar ao banco existente</option>
                    <option value="replace">Substituir todo o banco</option>
                  </select>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block font-bold">Cards Detectados</span>
                  <strong className="text-2xl text-amber-400 font-extrabold font-mono-digits">
                    {importResult.cardsCount}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block font-bold">Total de Palavras</span>
                  <strong className="text-2xl text-emerald-400 font-extrabold font-mono-digits">
                    {importResult.challengesCount}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block font-bold">Temas Encontrados</span>
                  <strong className="text-sm text-white font-extrabold block truncate mt-1">
                    {importResult.distinctThemes.join(', ') || 'Nenhum'}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block font-bold">Faixas Etárias</span>
                  <strong className="text-sm text-white font-extrabold block truncate mt-1">
                    {importResult.distinctAgeRanges.join(', ') || 'Nenhuma'}
                  </strong>
                </div>
              </div>

              {/* Warnings and Duplicate Alerts */}
              {importResult.warnings.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Avisos e Sugestões ({importResult.warnings.length}):</span>
                  </div>
                  <ul className="text-xs text-amber-200/90 space-y-1 list-disc list-inside max-h-40 overflow-y-auto pr-1">
                    {importResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Errors Block */}
              {importResult.errors.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <X className="w-5 h-5" />
                    <span>Erros Críticos:</span>
                  </div>
                  <ul className="text-xs text-rose-200 space-y-1 list-disc list-inside">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Import Action */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setImportResult(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importResult.validItems.length === 0}
                  id="btn-confirm-import-excel"
                  className={`px-8 py-3 rounded-xl font-black text-sm shadow-xl flex items-center gap-2 transition-all cursor-pointer ${
                    importResult.validItems.length === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:brightness-110 shadow-emerald-600/30'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  <span>
                    Confirmar Importação de {importResult.validItems.length} Desafios
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* TAB 2: AI CARD GENERATOR */}
      {activeTab === 'ai_generator' && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border-2 border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Wand2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white font-heading">
                  Gerador Automático de Cards com Gemini IA
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm">
                  Gere cards completos com 6 categorias (P, O, A, D, L, M) perfeitamente adequados à faixa etária
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Tema / Assunto
                </label>
                <input
                  type="text"
                  value={aiTheme}
                  onChange={(e) => setAiTheme(e.target.value)}
                  placeholder="Ex: Bíblia, Heróis da Fé, Parábolas, Animais..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Faixa Etária
                </label>
                <select
                  value={aiAgeRange}
                  onChange={(e) => setAiAgeRange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="5-7">5 a 7 anos (Crianças)</option>
                  <option value="8-12">8 a 12 anos (Juvenil)</option>
                  <option value="13-17">13 a 17 anos (Adolescentes)</option>
                  <option value="adultos">Adultos</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Quantidade de Cards (x6 palavras)
                </label>
                <select
                  value={aiCardCount}
                  onChange={(e) => setAiCardCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value={3}>3 Cards (18 Desafios)</option>
                  <option value={5}>5 Cards (30 Desafios)</option>
                  <option value={10}>10 Cards (60 Desafios)</option>
                  <option value={15}>15 Cards (90 Desafios)</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                Instruções Personalizadas (Opcional)
              </label>
              <input
                type="text"
                value={aiCustomInstructions}
                onChange={(e) => setAiCustomInstructions(e.target.value)}
                placeholder="Ex: Focar em histórias do Antigo Testamento, usar apenas palavras fáceis de desenhar..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            {aiError && (
              <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-300 text-xs font-semibold mb-4">
                {aiError}
              </div>
            )}

            <button
              onClick={handleGenerateAi}
              disabled={isGeneratingAi || !aiTheme.trim()}
              id="btn-generate-ai"
              className={`w-full py-4 px-6 rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-3 transition-all cursor-pointer ${
                isGeneratingAi || !aiTheme.trim()
                  ? 'bg-purple-950 text-purple-400 cursor-not-allowed animate-pulse'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white hover:brightness-110 shadow-purple-600/30'
              }`}
            >
              <Wand2 className={`w-5 h-5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
              <span>
                {isGeneratingAi
                  ? 'Gerando cards com inteligência artificial...'
                  : `Gerar ${aiCardCount} Cards (${aiCardCount * 6} Desafios)`}
              </span>
            </button>
          </div>

          {/* AI Generated Preview List */}
          {aiGeneratedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-slate-900 border border-purple-500/50 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-white font-heading">
                    Prévia do Conteúdo Gerado ({aiGeneratedItems.length} palavras)
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Tema: {aiTheme} • Faixa: {aiAgeRange}
                  </p>
                </div>

                <button
                  onClick={handleSaveAiItems}
                  id="btn-save-ai-items"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar no Banco de Palavras</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                {aiGeneratedItems.map((item, idx) => {
                  const catDef = CATEGORIES[item.category];
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center text-white ${catDef.bgGradient}`}
                        >
                          {item.category}
                        </span>
                        <div>
                          <strong className="text-white text-sm uppercase block font-heading">
                            {item.word}
                          </strong>
                          <span className="text-[10px] text-slate-400">{catDef.name}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* TAB 3: CHALLENGE DATABASE TABLE */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar palavra ou dica..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <select
                value={filterTheme}
                onChange={(e) => {
                  setFilterTheme(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none"
              >
                <option value="all">Todos os Temas</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={filterAgeRange}
                onChange={(e) => {
                  setFilterAgeRange(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none"
              >
                <option value="all">Todas as Idades</option>
                {ageRanges.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none"
              >
                <option value="all">Todas Categorias</option>
                {CATEGORY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c} — {CATEGORIES[c].name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setShowAddWordModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ml-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Palavra</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Cat.</th>
                    <th className="py-3.5 px-4">Palavra</th>
                    <th className="py-3.5 px-4">Tema</th>
                    <th className="py-3.5 px-4">Faixa Etária</th>
                    <th className="py-3.5 px-4">Pontos</th>
                    <th className="py-3.5 px-4">Dica / Ref.</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedChallenges.map((item) => {
                    const catDef = CATEGORIES[item.category] || CATEGORIES.P;
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`w-6 h-6 rounded-md text-xs font-black inline-flex items-center justify-center text-white ${catDef.bgGradient}`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <strong className="text-white uppercase font-bold text-sm">
                            {item.word}
                          </strong>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize">{item.themeId}</span>
                        </td>
                        <td className="py-3 px-4">{item.ageRangeId}</td>
                        <td className="py-3 px-4 font-mono-digits font-bold text-amber-300">
                          +{item.score || 1}
                        </td>
                        <td className="py-3 px-4 text-slate-400 italic">
                          {item.hint || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteChallenge(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Excluir palavra"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedChallenges.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhuma palavra encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Mostrando {paginatedChallenges.length} de {filteredChallenges.length} palavras
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span>
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: THEMES & AGE RANGES */}
      {activeTab === 'themes_ages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Themes list */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
            <h3 className="text-lg font-extrabold text-white font-heading mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>Temas Cadastrados ({themes.length})</span>
            </h3>

            <div className="space-y-3">
              {themes.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <strong className="text-white text-sm font-bold block">{t.name}</strong>
                    <span className="text-xs text-slate-400">{t.description || t.id}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
                    Ativo
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Age ranges list */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
            <h3 className="text-lg font-extrabold text-white font-heading mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <span>Faixas Etárias ({ageRanges.length})</span>
            </h3>

            <div className="space-y-3">
              {ageRanges.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <strong className="text-white text-sm font-bold block">{a.name}</strong>
                    <span className="text-xs text-slate-400">{a.minAge} a {a.maxAge} anos</span>
                  </div>
                  <span className="text-[11px] font-bold text-sky-400 px-2 py-0.5 rounded-full bg-sky-500/10">
                    Ativa
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SETTINGS & DATABASE RESET */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl max-w-2xl">
            <h3 className="text-lg font-extrabold text-white font-heading mb-4">
              Configurações Gerais do Jogo
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Tempo Padrão da Rodada (Segundos)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={settings.roundDurationSeconds}
                    onChange={(e) =>
                      onUpdateSettings({ roundDurationSeconds: Number(e.target.value) || 80 })
                    }
                    min={30}
                    max={300}
                    className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono-digits font-bold text-sm"
                  />
                  <span className="text-slate-400 text-xs">
                    Padrão: 80s (1:20 minuto)
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <label className="text-xs font-bold text-rose-400 uppercase block mb-1">
                  Zona de Perigo — Restaurar Banco Original
                </label>
                <p className="text-slate-400 text-xs mb-3">
                  Restaura os temas originais (Bíblia, Animais, Conhecimentos Gerais) e a biblioteca padrão de palavras.
                </p>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  id="btn-trigger-reset-db"
                  className="px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Restaurar Banco de Dados Padrão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SUPABASE CLOUD & VERCEL DEPLOYMENT */}
      {activeTab === 'supabase_cloud' && (
        <div className="space-y-6">
          {/* Cloud Status Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white font-heading">
                    Integração com Supabase & Sincronização em Nuvem
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Salve palavras na nuvem e acerte sincronização multi-dispositivos pela internet em tempo real.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setIsTestingSupabase(true);
                    setSupabaseStatusMsg(null);
                    soundManager.playClick();
                    const res = await testSupabaseConnection();
                    setSupabaseStatusMsg(res);
                    setIsTestingSupabase(false);
                  }}
                  disabled={isTestingSupabase}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                  <span>{isTestingSupabase ? 'Testando...' : 'Testar Conexão'}</span>
                </button>
              </div>
            </div>

            {/* Test Result Message */}
            {supabaseStatusMsg && (
              <div
                className={`mt-4 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                  supabaseStatusMsg.success
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                }`}
              >
                {supabaseStatusMsg.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                <span>{supabaseStatusMsg.message}</span>
              </div>
            )}

            {/* Database Sync Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2 mb-1">
                    <Upload className="w-4 h-4 text-emerald-400" /> Enviar Local para o Supabase
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    Envia todos os seus temas e as {challenges.length} palavras locais para a base de dados do Supabase.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setIsSyncingToCloud(true);
                    soundManager.playClick();
                    const res = await uploadLocalDataToSupabase(themes, challenges);
                    setIsSyncingToCloud(false);
                    if (res.success) {
                      setImportSuccessMessage(`Sucesso! ${res.count} palavras e ${themes.length} temas foram sincronizados no Supabase.`);
                    } else {
                      setSupabaseStatusMsg({ success: false, message: res.error || 'Erro ao sincronizar' });
                    }
                  }}
                  disabled={isSyncingToCloud || !isSupabaseReady}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Upload className={`w-3.5 h-3.5 ${isSyncingToCloud ? 'animate-bounce' : ''}`} />
                  <span>{isSyncingToCloud ? 'Enviando...' : 'Enviar Dados para a Nuvem'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2 mb-1">
                    <Download className="w-4 h-4 text-sky-400" /> Baixar Dados da Nuvem
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    Puxa temas e palavras armazenadas no Supabase para o jogo localmente.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setIsDownloadingFromCloud(true);
                    soundManager.playClick();
                    const cloudData = await downloadCloudDataFromSupabase();
                    setIsDownloadingFromCloud(false);
                    if (cloudData) {
                      onUpdateThemes(cloudData.themes);
                      onUpdateChallenges(cloudData.challenges);
                      setImportSuccessMessage(`Sucesso! ${cloudData.challenges.length} palavras carregadas da nuvem.`);
                    } else {
                      setSupabaseStatusMsg({ success: false, message: 'Falha ao buscar dados do Supabase. Verifique a conexão e tabelas.' });
                    }
                  }}
                  disabled={isDownloadingFromCloud || !isSupabaseReady}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 ${isDownloadingFromCloud ? 'animate-bounce' : ''}`} />
                  <span>{isDownloadingFromCloud ? 'Baixando...' : 'Baixar Dados da Nuvem'}</span>
                </button>
              </div>
            </div>

            {/* SQL Script & Vercel Guide */}
            <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Scripts do Supabase & Configuração de Banco de Dados:
              </h4>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase">
                      1. Script SQL Completo (Tabelas, Colunas & Seeds com {challenges.length} Palavras)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        const sql = generateCompleteSupabaseSql(themes, challenges);
                        navigator.clipboard.writeText(sql);
                        setCopiedSqlSchema(true);
                        setTimeout(() => setCopiedSqlSchema(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      {copiedSqlSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSqlSchema ? 'SQL Copiado!' : 'Copiar Script SQL'}</span>
                    </button>
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        const sql = generateCompleteSupabaseSql(themes, challenges);
                        const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'schema_and_seed.sql';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar .SQL</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Copie o script e cole na aba <strong>SQL Editor</strong> do painel Supabase e clique em <strong>Run</strong>.
                </p>

                {/* Tables Breakdown summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-300">
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-bold block">game_rooms</span>
                    <span className="text-slate-500">Sincronização TV</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-amber-400 font-bold block">custom_words</span>
                    <span className="text-slate-500">{challenges.length} palavras</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-sky-400 font-bold block">custom_themes</span>
                    <span className="text-slate-500">{themes.length} temas</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-purple-400 font-bold block">match_history</span>
                    <span className="text-slate-500">Placar & histórico</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase">
                    2. Variáveis de Ambiente no Vercel (Environment Variables)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  No seu projeto do Vercel, acesse <strong>Settings &gt; Environment Variables</strong> e adicione as seguintes chaves do seu Supabase:
                </p>
                <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-300 space-y-1">
                  <div><span className="text-emerald-400">VITE_SUPABASE_URL</span> = https://seu-id.supabase.co</div>
                  <div><span className="text-emerald-400">VITE_SUPABASE_ANON_KEY</span> = eyJhbGciOi...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Word Registration Modal */}
      <AnimatePresence>
        {showAddWordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border-2 border-amber-500 shadow-2xl space-y-4"
            >
              <h3 className="text-xl font-extrabold text-white font-heading">
                Cadastrar Nova Palavra / Desafio
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Tema
                  </label>
                  <select
                    value={newWordData.themeId}
                    onChange={(e) =>
                      setNewWordData({ ...newWordData, themeId: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                  >
                    {themes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Faixa Etária
                  </label>
                  <select
                    value={newWordData.ageRangeId}
                    onChange={(e) =>
                      setNewWordData({ ...newWordData, ageRangeId: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                  >
                    {ageRanges.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Categoria
                  </label>
                  <select
                    value={newWordData.category}
                    onChange={(e) =>
                      setNewWordData({
                        ...newWordData,
                        category: e.target.value as CategoryCode,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                  >
                    {CATEGORY_CODES.map((c) => (
                      <option key={c} value={c}>
                        {c} — {CATEGORIES[c].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Pontos
                  </label>
                  <input
                    type="number"
                    value={newWordData.score}
                    onChange={(e) =>
                      setNewWordData({ ...newWordData, score: Number(e.target.value) || 1 })
                    }
                    min={1}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Palavra / Desafio
                </label>
                <input
                  type="text"
                  value={newWordData.word}
                  onChange={(e) =>
                    setNewWordData({ ...newWordData, word: e.target.value })
                  }
                  placeholder="Ex: Davi, Arca de Noé, Orar..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Dica ou Referência Bíblica (Opcional)
                </label>
                <input
                  type="text"
                  value={newWordData.hint}
                  onChange={(e) =>
                    setNewWordData({ ...newWordData, hint: e.target.value })
                  }
                  placeholder="Ex: 1 Samuel 17, Gênesis..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setShowAddWordModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNewWord}
                  disabled={!newWordData.word.trim()}
                  className="px-6 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black disabled:opacity-40"
                >
                  Salvar Palavra
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border-2 border-rose-500 shadow-2xl text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-400 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-white font-heading">
                Confirmar Restauração do Banco?
              </h3>
              <p className="text-slate-300 text-xs">
                Todas as alterações manuais e importações serão redefinidas para o conjunto inicial padrão com centenas de desafios.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onResetToDefaults();
                    setShowResetConfirm(false);
                    setImportSuccessMessage('Banco de dados restaurado para os padrões de fábrica!');
                  }}
                  id="btn-confirm-reset-db-now"
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
                >
                  Sim, Restaurar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
