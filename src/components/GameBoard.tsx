import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MatchState,
  ChallengeItem,
  CategoryCode,
  RoundRecord,
  GameSettings,
} from '../types';
import { CATEGORIES } from '../data/categories';
import Die3D from './Die3D';
import GameTimer from './GameTimer';
import AnimatedPawnBoard from './AnimatedPawnBoard';
import { soundManager } from '../utils/audio';
import { drawRandomWord } from '../utils/storage';
import {
  syncService,
  ProjectionState,
  ProjectorLayout,
  getOrCreateRoomCode,
} from '../utils/syncChannel';
import {
  Trophy,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Flag,
  Zap,
  MapPin,
  Tv,
  Columns,
  Compass,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameBoardProps {
  match: MatchState;
  allChallenges: ChallengeItem[];
  settings: GameSettings;
  onUpdateMatch: (updated: MatchState) => void;
  onFinishMatch: (match: MatchState) => void;
  onBackToHome: () => void;
}

type BoardStep = 'roll_die' | 'word_preview' | 'timer_active' | 'round_recap';

export default function GameBoard({
  match,
  allChallenges,
  settings,
  onUpdateMatch,
  onFinishMatch,
  onBackToHome,
}: GameBoardProps) {
  const [boardStep, setBoardStep] = useState<BoardStep>('roll_die');
  const [rolledCategory, setRolledCategory] = useState<CategoryCode | null>(null);
  const [currentWordItem, setCurrentWordItem] = useState<ChallengeItem | null>(null);
  const [isWordRevealedToAll, setIsWordRevealedToAll] = useState(false);
  const [categoryExhausted, setCategoryExhausted] = useState(false);
  const [latestRoundResult, setLatestRoundResult] = useState<RoundRecord | null>(null);
  const [showBoardModal, setShowBoardModal] = useState<boolean>(false);
  const [projectorLayout, setProjectorLayout] = useState<ProjectorLayout>('split');

  const boardTargetScore = match.targetScore || settings.boardLength || 50;
  const currentTeam = match.teams[match.currentTeamIndex] || match.teams[0];
  const currentCategoryDef = rolledCategory ? CATEGORIES[rolledCategory] : null;

  // Build sanitized projection state (strictly omitting secret word)
  const getSanitizedProjectionState = (step = boardStep, customTeams = match.teams): ProjectionState => {
    let stage: ProjectionState['stage'] = 'turn_waiting';
    if (step === 'roll_die') stage = 'turn_waiting';
    else if (step === 'word_preview') stage = 'word_ready';
    else if (step === 'timer_active') stage = 'timer_running';
    else if (step === 'round_recap') {
      stage = latestRoundResult?.result === 'correct' ? 'round_success' : 'round_timeout';
    }

    return {
      stage,
      roundMode: match.roundMode || 'single_team',
      boardLength: boardTargetScore,
      winningScore: boardTargetScore,
      projectorLayout,
      currentTeam: {
        id: currentTeam.id,
        name: currentTeam.name,
        icon: currentTeam.icon,
        color: currentTeam.color,
        score: currentTeam.score,
      },
      teams: customTeams,
      categoryCode: rolledCategory || undefined,
      categoryName: currentCategoryDef?.name || undefined,
      roundScore: currentWordItem?.score || 1,
      timeLeft: settings.roundDurationSeconds,
      totalTime: settings.roundDurationSeconds,
      isUrgent: false,
      roundNumber: match.roundNumber,
      lastScoredTeamId: match.lastScoredTeamId,
      lastScoredPoints: match.lastScoredPoints,
      lastUpdateTimestamp: Date.now(),
    };
  };

  const handleSetProjectorLayout = (layout: ProjectorLayout) => {
    setProjectorLayout(layout);
    syncService.broadcast({ type: 'SET_PROJECTOR_LAYOUT', layout });
  };

  const handleOpenProjectorWindow = () => {
    const roomCode = getOrCreateRoomCode();
    const url = `${window.location.origin}${window.location.pathname}?projector=true&room=${roomCode}`;
    window.open(url, 'ImagemAcaoProjetor', 'width=1280,height=720,menubar=no,toolbar=no,location=no');
  };

  // Broadcast state changes & listen for sync requests from projector windows
  useEffect(() => {
    const pState = getSanitizedProjectionState();
    syncService.broadcast({ type: 'STATE_UPDATE', state: pState });

    const unsubscribe = syncService.subscribe((msg) => {
      if (msg.type === 'REQUEST_CURRENT_STATE') {
        const latestState = getSanitizedProjectionState();
        syncService.broadcast({ type: 'STATE_UPDATE', state: latestState });
      }
    });

    return () => unsubscribe();
  }, [
    boardStep,
    match.currentTeamIndex,
    match.roundNumber,
    match.teams,
    match.roundMode,
    match.lastScoredTeamId,
    match.lastScoredPoints,
    rolledCategory,
    currentWordItem?.score,
  ]);

  // Handle dice landing on letter
  const handleDieRollComplete = (category: CategoryCode) => {
    setRolledCategory(category);

    // Draw word from pool
    const { item, totalAvailable, remainingCount } = drawRandomWord(
      match.themeId,
      match.ageRangeId,
      category,
      match.usedWordIds,
      allChallenges
    );

    if (!item) {
      // All words used for this category
      setCategoryExhausted(true);
      setCurrentWordItem(null);
    } else {
      // Random score from 1 to 6 for the round (equal probability for 1,2,3,4,5,6)
      const randomRoundPoints = Math.floor(Math.random() * 6) + 1;
      const itemWithRandomScore: ChallengeItem = {
        ...item,
        score: randomRoundPoints,
      };

      setCategoryExhausted(false);
      setCurrentWordItem(itemWithRandomScore);
      setIsWordRevealedToAll(true);
      setBoardStep('word_preview');

      // Broadcast dice result & random round score to projector without secret word
      syncService.broadcast({
        type: 'DICE_RESULT',
        categoryCode: category,
        categoryName: CATEGORIES[category]?.name || category,
        score: randomRoundPoints,
        teamName: match.roundMode === 'all_teams' ? 'Todas as Equipes' : currentTeam.name,
      });
    }
  };

  // Start round timer
  const handleStartTimer = () => {
    soundManager.playClick();
    setBoardStep('timer_active');
    syncService.broadcast({
      type: 'TIMER_START',
      timeLeft: settings.roundDurationSeconds,
      totalTime: settings.roundDurationSeconds,
    });
  };

  // Reset words used in this match
  const handleResetMatchWordPool = () => {
    soundManager.playClick();
    const updatedMatch: MatchState = {
      ...match,
      usedWordIds: [],
    };
    onUpdateMatch(updatedMatch);
    setCategoryExhausted(false);
    setBoardStep('roll_die');
    setRolledCategory(null);
  };

  // Record round result & update scoreboard and pawns
  const finishRound = (
    result: 'correct' | 'timeout' | 'aborted',
    timeUsedSeconds: number,
    scoringTeamId?: string
  ) => {
    if (!currentWordItem || !rolledCategory) return;

    const pointsAwarded = result === 'correct' ? currentWordItem.score || 1 : 0;
    const targetTeamId = scoringTeamId || currentTeam.id;
    const targetTeam = match.teams.find((t) => t.id === targetTeamId) || currentTeam;

    // Update team scores
    let winnerDetectedTeam: typeof targetTeam | null = null;
    const updatedTeams = match.teams.map((t) => {
      if (t.id === targetTeamId) {
        const newScore = t.score + pointsAwarded;
        if (newScore >= boardTargetScore) {
          winnerDetectedTeam = { ...t, score: newScore };
        }
        return {
          ...t,
          score: newScore,
          roundsPlayed: t.roundsPlayed + 1,
          correctGuesses: (t.correctGuesses || 0) + (result === 'correct' ? 1 : 0),
          wrongGuesses: (t.wrongGuesses || 0) + (result !== 'correct' ? 1 : 0),
        };
      }
      return t;
    });

    const newRecord: RoundRecord = {
      id: `round-${Date.now()}`,
      matchId: match.id,
      roundNumber: match.roundNumber,
      teamId: targetTeam.id,
      teamName: targetTeam.name,
      category: rolledCategory,
      categoryName: currentCategoryDef?.name || rolledCategory,
      word: currentWordItem.word,
      points: pointsAwarded,
      result,
      timeUsedSeconds,
      totalTimeSeconds: settings.roundDurationSeconds,
      timestamp: new Date().toISOString(),
    };

    const updatedMatch: MatchState = {
      ...match,
      teams: updatedTeams,
      lastScoredTeamId: result === 'correct' ? targetTeam.id : undefined,
      lastScoredPoints: result === 'correct' ? pointsAwarded : undefined,
      usedWordIds: [...match.usedWordIds, currentWordItem.id],
      roundHistory: [newRecord, ...match.roundHistory],
      isFinished: !!winnerDetectedTeam,
      winnerTeamId: winnerDetectedTeam ? (winnerDetectedTeam as any).id : undefined,
    };

    setLatestRoundResult(newRecord);
    onUpdateMatch(updatedMatch);
    setBoardStep('round_recap');

    if (result === 'correct') {
      syncService.broadcast({
        type: 'ROUND_SUCCESS',
        points: pointsAwarded,
        teamName: targetTeam.name,
        teamIcon: targetTeam.icon,
        teamId: targetTeam.id,
        updatedTeams,
      });

      // Check if winner reached the finish line
      if (winnerDetectedTeam) {
        setTimeout(() => {
          soundManager.playChampionVictory();
          confetti({
            particleCount: 200,
            spread: 120,
            origin: { y: 0.5 },
          });
        }, 500);
      }
    } else {
      syncService.broadcast({
        type: 'ROUND_TIMEOUT',
        teamName: match.roundMode === 'all_teams' ? 'Todas as Equipes' : currentTeam.name,
      });
    }
  };

  // Move to next round / next team
  const handleNextRound = () => {
    soundManager.playClick();
    
    // Check if match was finished by finish line
    if (match.isFinished || (latestRoundResult && match.teams.some(t => t.score >= boardTargetScore))) {
      onFinishMatch(match);
      return;
    }

    const nextTeamIndex = (match.currentTeamIndex + 1) % match.teams.length;
    const nextRoundNumber = match.roundNumber + 1;

    const updatedMatch: MatchState = {
      ...match,
      currentTeamIndex: nextTeamIndex,
      roundNumber: nextRoundNumber,
      lastScoredTeamId: undefined,
      lastScoredPoints: undefined,
    };

    onUpdateMatch(updatedMatch);
    setRolledCategory(null);
    setCurrentWordItem(null);
    setCategoryExhausted(false);
    setBoardStep('roll_die');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 md:py-6 select-none space-y-6" id="game-board-view">
      {/* Top Banner: Scoreboard & Turn Information in Vibrant Palette Style */}
      <div className="w-full bg-indigo-900/60 backdrop-blur-md border-2 border-indigo-800/80 rounded-[32px] p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Active Turn Team or Simultaneous Mode Info */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center text-3xl shadow-lg shadow-yellow-400/20 transform -rotate-3">
              {match.roundMode === 'all_teams' ? '⚡' : currentTeam.icon || '🦁'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300 block">
                  Rodada #{match.roundNumber}
                </span>
                {match.roundMode === 'all_teams' ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                    Todas Simultâneas
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase">
                    Por Turnos
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-yellow-400 uppercase tracking-tight">
                {match.roundMode === 'all_teams'
                  ? 'TODAS AS EQUIPES DISPUTAM'
                  : currentTeam.name.toUpperCase()}
              </h2>
            </div>
          </div>

          {/* Quick Action Buttons: Screen 2 & Game Actions */}
          <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
            <button
              onClick={handleOpenProjectorWindow}
              id="btn-open-screen2-window"
              className="px-4 py-2.5 rounded-2xl bg-indigo-800 hover:bg-indigo-700 text-yellow-300 font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-indigo-500 hover:border-yellow-400 transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-950/40"
              title="Abrir a 2ª Tela / Placar ao Vivo para o Telão"
            >
              <Tv className="w-4 h-4 text-yellow-400" />
              <span>Abrir Tela 2 (Placar TV)</span>
            </button>

            {/* Finish Game Button */}
            <button
              onClick={() => onFinishMatch(match)}
              id="btn-finish-match"
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white text-xs font-black uppercase tracking-wider border border-white/20 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md"
              title="Encerrar Partida e Ver Vencedor"
            >
              <Flag className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden sm:inline">Encerrar Partida</span>
            </button>
          </div>
        </div>
      </div>

      {/* PERSISTENT / TOGGLED ANIMATED PAWN BOARD (50 Casas) */}
      {(showBoardModal || boardStep === 'round_recap') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatedPawnBoard
            teams={match.teams}
            boardLength={boardTargetScore}
            winningScore={boardTargetScore}
            activeTeamId={currentTeam.id}
            lastScoredTeamId={match.lastScoredTeamId}
            lastScoredPoints={match.lastScoredPoints}
          />
        </motion.div>
      )}

      {/* STAGE 1: ROLL THE DIE */}
      {boardStep === 'roll_die' && (
        <div className="flex flex-col items-center justify-center p-6 sm:p-10 rounded-[48px] bg-white text-indigo-950 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full -mr-24 -mt-24 pointer-events-none opacity-60"></div>
          
          <div className="mb-2 relative z-10">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-950 px-4 py-1.5 rounded-full bg-yellow-400 shadow-sm">
              Etapa 1: Sorteio da Categoria
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-indigo-950 uppercase tracking-tight mt-3 mb-1 relative z-10">
            Gire o dado para sortear a categoria!
          </h2>
          <p className="text-indigo-900/60 text-sm font-bold uppercase tracking-wider max-w-md mx-auto mb-4 relative z-10">
            {match.roundMode === 'all_teams'
              ? 'Uma palavra será sorteada e todas as equipes tentarão adivinhar juntas!'
              : `A equipe ${currentTeam.name} fará a mímica nesta rodada.`}
          </p>

          {/* 3D Animated Die */}
          <Die3D
            onRollComplete={handleDieRollComplete}
            setIsRolling={(rolling) => {
              if (rolling) {
                syncService.broadcast({
                  type: 'DICE_ROLL',
                  teamName: match.roundMode === 'all_teams' ? 'Todas as Equipes' : currentTeam.name,
                });
              }
            }}
            projectorMode={settings.projectorMode}
          />

          {/* Category Exhausted Notice */}
          {categoryExhausted && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md mt-6 p-5 rounded-2xl bg-yellow-400/20 border-2 border-yellow-400 text-center relative z-10"
            >
              <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <h4 className="font-black text-indigo-950 text-base uppercase">
                Todas as palavras desta categoria já foram sorteadas!
              </h4>
              <p className="text-indigo-900/80 text-xs mt-1 mb-4 font-semibold">
                Você pode girar o dado novamente para tentar outra categoria ou reiniciar a lista de palavras usadas nesta partida.
              </p>
              <button
                onClick={handleResetMatchWordPool}
                className="py-3 px-6 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
              >
                REINICIAR PALAVRAS DA PARTIDA
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* STAGE 2: WORD PREVIEW & INÍCIO DO DESAFIO */}
      {boardStep === 'word_preview' && currentWordItem && currentCategoryDef && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center justify-center p-8 sm:p-14 pt-16 sm:pt-18 rounded-[48px] bg-white text-indigo-950 shadow-2xl text-center relative"
        >
          {/* Floating Tilted Category Badge matching Vibrant Palette mockup */}
          <div className="absolute -top-10 sm:-top-12 w-20 h-20 sm:w-24 sm:h-24 bg-yellow-400 rounded-3xl border-8 border-indigo-950 flex items-center justify-center shadow-2xl rotate-6">
            <span className="text-indigo-950 text-4xl sm:text-5xl font-black">
              {currentCategoryDef.code}
            </span>
          </div>

          <div className="mt-4 w-full">
            <span className="text-indigo-400 font-black uppercase tracking-[0.3em] text-xs sm:text-sm block">
              CATEGORIA: {currentCategoryDef.name.toUpperCase()}
            </span>

            {/* Vez da Equipe */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-indigo-50 border border-indigo-200 mt-2 mb-4">
              <span className="text-xl">
                {match.roundMode === 'all_teams' ? '⚡' : currentTeam.icon}
              </span>
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-indigo-950">
                {match.roundMode === 'all_teams' ? (
                  <>DINÂMICA: <strong className="text-indigo-600">TODAS AS EQUIPES DISPUTAM</strong></>
                ) : (
                  <>VEZ DA EQUIPE: <strong className="text-indigo-600">{currentTeam.name}</strong></>
                )}
              </span>
            </div>

            {/* Sorteio dos Pontos */}
            <div className="my-2 p-3 sm:p-4 rounded-3xl bg-yellow-400/20 border-2 border-yellow-400 max-w-sm mx-auto shadow-inner">
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-900/70 block">
                VALE NESTA RODADA
              </span>
              <strong className="text-2xl sm:text-3xl font-black text-indigo-950 uppercase block font-mono-digits tracking-tight text-amber-600">
                ⭐ +{currentWordItem.score || 1} {currentWordItem.score === 1 ? 'CASA' : 'CASAS'} NO TABULEIRO
              </strong>
            </div>

            {/* Target Word */}
            <div className="my-4">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-900/50 block">
                SUA PALAVRA:
              </span>
              <h1
                id="preview-word-title"
                className={`font-black uppercase text-indigo-950 mt-1 mb-2 tracking-tight drop-shadow-sm ${
                  settings.projectorMode
                    ? 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-indigo-950'
                    : 'text-4xl sm:text-5xl md:text-6xl'
                }`}
              >
                {currentWordItem.word}
              </h1>

              <p className="text-indigo-900/70 font-black text-base sm:text-xl uppercase tracking-wider">
                🤫 REPRESENTE SEM FALAR!
              </p>
            </div>

            {currentWordItem.hint && (
              <p className="text-indigo-400 text-xs mt-1 font-bold uppercase tracking-wider">
                Dica: {currentWordItem.hint}
              </p>
            )}
          </div>

          <p className="text-indigo-900/50 text-xs sm:text-sm max-w-md mt-4 mb-8 font-semibold">
            Clique em <strong>COMEÇAR</strong> para iniciar a contagem regressiva de{' '}
            <strong>1:20 (80s)</strong>.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
            <button
              onClick={handleStartTimer}
              id="btn-start-round-timer"
              className="w-full py-5 px-8 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xl shadow-lg shadow-emerald-500/25 uppercase tracking-wide flex items-center justify-center gap-3 transition-all cursor-pointer order-1 border-2 border-emerald-400"
            >
              <Play className="w-6 h-6 fill-current stroke-none" />
              <span>COMEÇAR (1:20)</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                setBoardStep('roll_die');
              }}
              className="w-full sm:w-auto py-5 px-6 rounded-3xl bg-slate-100 hover:bg-slate-200 text-slate-500 text-sm font-black uppercase tracking-wider transition-all cursor-pointer order-2"
            >
              Girar Novamente
            </button>
          </div>
        </motion.div>
      )}

      {/* STAGE 3: ACTIVE TIMER */}
      {boardStep === 'timer_active' && currentWordItem && currentCategoryDef && (
        <GameTimer
          initialSeconds={settings.roundDurationSeconds || 80}
          word={currentWordItem.word}
          categoryCode={currentCategoryDef.code}
          categoryLabel={currentCategoryDef.name}
          categoryColor={currentCategoryDef.textColor}
          categoryBg={currentCategoryDef.bgGradient}
          teamName={currentTeam.name}
          teamColor={currentTeam.color}
          teamIcon={currentTeam.icon}
          teamId={currentTeam.id}
          teams={match.teams}
          roundMode={match.roundMode}
          scoreValue={currentWordItem.score || 1}
          projectorMode={settings.projectorMode}
          onSuccess={(timeUsed, scoringTeamId) => finishRound('correct', timeUsed, scoringTeamId)}
          onTimeout={() => finishRound('timeout', settings.roundDurationSeconds)}
          onAbort={() => finishRound('aborted', settings.roundDurationSeconds)}
        />
      )}

      {/* STAGE 4: ROUND RECAP MODAL / SCREEN */}
      {boardStep === 'round_recap' && latestRoundResult && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-8 sm:p-12 rounded-[48px] bg-white text-indigo-950 shadow-2xl text-center max-w-2xl mx-auto relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full -mr-24 -mt-24 pointer-events-none opacity-60"></div>

          {/* Header icon & badge */}
          {latestRoundResult.result === 'correct' ? (
            <div className="w-20 h-20 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-4 text-4xl shadow-xl shadow-emerald-500/30 transform -rotate-3 animate-bounce">
              🎉
            </div>
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-red-500 text-white flex items-center justify-center mx-auto mb-4 text-4xl shadow-xl shadow-red-500/30 transform rotate-3">
              ⏰
            </div>
          )}

          <h2 className="text-3xl sm:text-4xl font-black text-indigo-950 uppercase tracking-tight mb-1 relative z-10">
            {latestRoundResult.result === 'correct' ? '🎉 PEÃO AVANÇOU!' : 'TEMPO ESGOTADO'}
          </h2>

          <p className="text-indigo-900/60 text-sm font-bold uppercase tracking-wider mb-6 relative z-10">
            Equipe Pontuadora: <strong className="text-indigo-950 font-black">{latestRoundResult.teamName}</strong>
          </p>

          {/* Word and Score Card */}
          <div className="p-6 rounded-3xl bg-indigo-50/80 border-2 border-indigo-100 mb-6 relative z-10">
            <span className="text-xs uppercase font-black tracking-widest text-indigo-900/50 block mb-1">
              Palavra da Rodada
            </span>
            <strong className="text-3xl sm:text-4xl font-black text-indigo-950 uppercase block tracking-tight">
              {latestRoundResult.word}
            </strong>

            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t-2 border-indigo-100 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-900/60 font-bold uppercase">Resultado:</span>
                {latestRoundResult.result === 'correct' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white shadow-sm uppercase">
                    +{latestRoundResult.points} {latestRoundResult.points === 1 ? 'CASA PULADA' : 'CASAS PULADAS'} ♟️
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-600 uppercase">
                    0 CASAS (NÃO PONTUOU)
                  </span>
                )}
              </div>

              <div className="text-xs text-indigo-900/60 font-bold uppercase">
                Tempo: <strong className="text-indigo-950 font-black">{latestRoundResult.timeUsedSeconds}s</strong>
              </div>
            </div>
          </div>

          {/* Winner finish line banner if game reached end */}
          {match.isFinished && (
            <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-xl animate-pulse">
              <div className="text-3xl mb-1">🏆🏁</div>
              <h3 className="text-xl uppercase font-black">
                CRUZOU A LINHA DE CHEGADA!
              </h3>
              <p className="text-xs uppercase tracking-wider">
                A equipe {latestRoundResult.teamName} atingiu {boardTargetScore} casas e venceu a partida!
              </p>
            </div>
          )}

          {/* Next Round Button */}
          <button
            onClick={handleNextRound}
            id="btn-next-round"
            className="w-full py-5 px-8 rounded-3xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-xl uppercase tracking-wider shadow-2xl shadow-yellow-400/30 border-4 border-yellow-300 flex items-center justify-center gap-3 transition-all cursor-pointer relative z-10"
          >
            <span>{match.isFinished ? 'VER PÓDIO & RESULTADO FINAL 🏆' : 'PRÓXIMA RODADA'}</span>
            <ArrowRight className="w-6 h-6 stroke-[3]" />
          </button>
        </motion.div>
      )}
    </div>
  );
}

