import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Theme,
  AgeRange,
  ChallengeItem,
} from '../types';
import {
  BookOpen,
  PawPrint,
  Globe,
  Sparkles,
  Users,
  Play,
  Settings,
  Flame,
  Award,
  ScrollText,
  Crown,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { getAvailableAgeRangesForTheme } from '../utils/storage';

interface HomeScreenProps {
  themes: Theme[];
  ageRanges: AgeRange[];
  challenges: ChallengeItem[];
  onStartGame: (themeId: string, ageRangeId: string) => void;
  onOpenAdmin: () => void;
  projectorMode?: boolean;
}

export default function HomeScreen({
  themes,
  ageRanges,
  challenges,
  onStartGame,
  onOpenAdmin,
  projectorMode = false,
}: HomeScreenProps) {
  const activeThemes = useMemo(() => themes.filter((t) => t.active), [themes]);

  // Default to 'biblia' or the first available theme
  const [selectedThemeId, setSelectedThemeId] = useState<string>(() => {
    const biblia = activeThemes.find((t) => t.id === 'biblia');
    return biblia ? biblia.id : activeThemes[0]?.id || 'biblia';
  });

  // Dynamically calculate available age ranges for selected theme
  const availableAgeRanges = useMemo(() => {
    return getAvailableAgeRangesForTheme(selectedThemeId, challenges, ageRanges);
  }, [selectedThemeId, challenges, ageRanges]);

  // Selected age range (default to '8-12' if available, otherwise first)
  const [selectedAgeRangeId, setSelectedAgeRangeId] = useState<string>(() => {
    const defaultRange = availableAgeRanges.find((a) => a.id === '8-12');
    return defaultRange ? defaultRange.id : availableAgeRanges[0]?.id || '';
  });

  // Keep selected age range valid when theme changes
  useMemo(() => {
    if (!availableAgeRanges.some((a) => a.id === selectedAgeRangeId)) {
      setSelectedAgeRangeId(availableAgeRanges[0]?.id || '');
    }
  }, [availableAgeRanges, selectedAgeRangeId]);

  // Count available words for chosen combination
  const availableChallengesCount = useMemo(() => {
    return challenges.filter(
      (c) =>
        c.active &&
        (c.themeId.toLowerCase() === selectedThemeId.toLowerCase() || c.themeId === selectedThemeId) &&
        (c.ageRangeId.toLowerCase() === selectedAgeRangeId.toLowerCase() || c.ageRangeId === selectedAgeRangeId)
    ).length;
  }, [challenges, selectedThemeId, selectedAgeRangeId]);

  const handleStart = () => {
    if (!selectedThemeId || !selectedAgeRangeId) return;
    soundManager.playClick();
    onStartGame(selectedThemeId, selectedAgeRangeId);
  };

  const getThemeIcon = (iconName: string, themeId: string) => {
    switch (themeId) {
      case 'biblia':
        return <BookOpen className="w-8 h-8 text-amber-400" />;
      case 'animais':
        return <PawPrint className="w-8 h-8 text-emerald-400" />;
      case 'geral':
        return <Globe className="w-8 h-8 text-sky-400" />;
      default:
        return <Sparkles className="w-8 h-8 text-purple-400" />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 md:py-10 flex flex-col items-center select-none" id="home-screen-view">
      {/* Decorative Floating Theme Elements */}
      <div className="flex items-center gap-3 text-yellow-400 mb-3 text-xs sm:text-sm font-black uppercase tracking-widest bg-white/10 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
        <span className="flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-yellow-400" /> Bíblia & Geral
        </span>
        <span className="text-white/40">•</span>
        <span className="flex items-center gap-1.5 text-indigo-200">
          <Sparkles className="w-4 h-4 text-yellow-300" /> Gincanas e Dinâmicas
        </span>
      </div>

      {/* Main Title & Subtitle */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 md:mb-12"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase drop-shadow-2xl">
          IMAGEM <span className="text-yellow-400">&</span> AÇÃO
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-200 uppercase tracking-wide mt-2 max-w-2xl mx-auto">
          Divirta-se, represente e descubra!
        </p>
      </motion.div>

      {/* Big Selection Cards */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
        {/* STEP 1: ESCOLHA O TEMA */}
        <div className="p-6 sm:p-8 rounded-[32px] bg-white text-indigo-950 shadow-2xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 pointer-events-none opacity-60"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-yellow-400 text-indigo-950 flex items-center justify-center font-black text-xl shadow-md transform -rotate-3">
              1
            </div>
            <div>
              <h2 className="text-2xl font-black text-indigo-950 uppercase tracking-tight">
                Escolha o Tema
              </h2>
              <p className="text-indigo-900/60 text-xs font-bold uppercase tracking-wider">
                Selecione o assunto da partida
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 flex-1 relative z-10">
            {activeThemes.map((theme) => {
              const isSelected = selectedThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    soundManager.playClick();
                    setSelectedThemeId(theme.id);
                  }}
                  className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xl ring-4 ring-indigo-200 scale-[1.02]'
                      : 'bg-indigo-50/70 hover:bg-indigo-100/80 border-2 border-indigo-100 text-indigo-950'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-yellow-400 text-indigo-950 shadow-lg'
                        : 'bg-white border border-indigo-100 text-indigo-900'
                    }`}
                  >
                    {getThemeIcon(theme.icon, theme.id)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-black text-lg uppercase tracking-tight ${isSelected ? 'text-white' : 'text-indigo-950'}`}>
                        {theme.name}
                      </h3>
                      {isSelected && (
                        <span className="text-xs font-black uppercase text-indigo-950 px-2.5 py-0.5 rounded-full bg-yellow-400 shadow-sm">
                          Selecionado
                        </span>
                      )}
                    </div>
                    {theme.description && (
                      <p className={`text-xs mt-0.5 line-clamp-1 font-semibold ${isSelected ? 'text-indigo-200' : 'text-indigo-900/60'}`}>
                        {theme.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: ESCOLHA A FAIXA ETÁRIA */}
        <div className="p-6 sm:p-8 rounded-[32px] bg-white text-indigo-950 shadow-2xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 pointer-events-none opacity-60"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md transform rotate-3">
              2
            </div>
            <div>
              <h2 className="text-2xl font-black text-indigo-950 uppercase tracking-tight">
                Faixa Etária
              </h2>
              <p className="text-indigo-900/60 text-xs font-bold uppercase tracking-wider">
                Baseada no conteúdo cadastrado
              </p>
            </div>
          </div>

          {availableAgeRanges.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 flex-1 relative z-10">
              {availableAgeRanges.map((ageRange) => {
                const isSelected = selectedAgeRangeId === ageRange.id;
                const wordsCount = challenges.filter(
                  (c) =>
                    c.active &&
                    (c.themeId.toLowerCase() === selectedThemeId.toLowerCase() || c.themeId === selectedThemeId) &&
                    (c.ageRangeId.toLowerCase() === ageRange.id.toLowerCase() || c.ageRangeId === ageRange.id)
                ).length;

                return (
                  <button
                    key={ageRange.id}
                    onClick={() => {
                      soundManager.playClick();
                      setSelectedAgeRangeId(ageRange.id);
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xl ring-4 ring-indigo-200 scale-[1.02]'
                        : 'bg-indigo-50/70 hover:bg-indigo-100/80 border-2 border-indigo-100 text-indigo-950'
                    }`}
                  >
                    <div>
                      <h3 className={`font-black text-base sm:text-lg uppercase tracking-tight ${isSelected ? 'text-white' : 'text-indigo-950'}`}>
                        {ageRange.name}
                      </h3>
                      <p className={`text-xs mt-0.5 font-bold ${isSelected ? 'text-indigo-200' : 'text-indigo-900/60'}`}>
                        {wordsCount} palavras cadastradas
                      </p>
                    </div>

                    {isSelected ? (
                      <span className="text-xs font-black uppercase text-indigo-950 px-2.5 py-1 rounded-full bg-yellow-400 shadow-sm">
                        Selecionada
                      </span>
                    ) : (
                      <span className="text-xs font-black uppercase text-indigo-900/50 bg-indigo-100/80 px-2.5 py-1 rounded-full">
                        {ageRange.minAge}-{ageRange.maxAge} anos
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-indigo-50/50 border-2 border-dashed border-indigo-200 text-indigo-900 relative z-10">
              <p className="text-sm font-black text-indigo-950 mb-1 uppercase">
                Nenhuma faixa etária com conteúdo
              </p>
              <p className="text-xs text-indigo-900/70 mb-4 font-medium">
                Importe uma planilha Excel ou cadastre palavras na área administrativa.
              </p>
              <button
                onClick={onOpenAdmin}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                Gerenciar Conteúdo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Match Readiness & Word Pool Indicator */}
      <div className="w-full flex items-center justify-between p-4 sm:p-5 rounded-[24px] bg-indigo-900/60 border-2 border-indigo-800/80 mb-8 text-xs sm:text-sm text-indigo-200 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
            <ScrollText className="w-4 h-4" />
          </div>
          <span>
            Desafios prontos para este jogo:{' '}
            <strong className="text-yellow-400 font-black uppercase">
              {availableChallengesCount} palavras
            </strong>{' '}
            distribuídas em P, O, A, D, L, M
          </span>
        </div>

        <button
          onClick={onOpenAdmin}
          className="text-xs font-black text-yellow-400 hover:text-yellow-300 uppercase tracking-wider underline underline-offset-4 hidden sm:block cursor-pointer"
        >
          Importar mais via Excel
        </button>
      </div>

      {/* Big Start Button in Vibrant Yellow / Emerald style */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleStart}
        disabled={availableAgeRanges.length === 0 || availableChallengesCount === 0}
        id="btn-start-game"
        className={`w-full max-w-xl py-6 px-10 rounded-[32px] font-black text-2xl sm:text-3xl shadow-2xl flex items-center justify-center gap-4 uppercase tracking-wide transition-all cursor-pointer ${
          availableAgeRanges.length === 0 || availableChallengesCount === 0
            ? 'bg-indigo-900/50 text-indigo-400 cursor-not-allowed border-2 border-indigo-800'
            : 'bg-yellow-400 hover:bg-yellow-300 text-indigo-950 shadow-yellow-400/30 hover:shadow-yellow-400/50 border-4 border-yellow-300 transform'
        }`}
      >
        <Play className="w-8 h-8 fill-current stroke-none" />
        <span>COMEÇAR JOGO</span>
      </motion.button>
    </div>
  );
}
