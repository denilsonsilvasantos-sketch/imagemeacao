import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tv,
  Maximize2,
  Minimize2,
  CheckCircle,
  Clock,
  Sparkles,
  Trophy,
  Dices,
  Wifi,
  WifiOff,
  Star,
  AlertTriangle,
  Flame,
  Globe,
  MapPin,
  Zap,
  Layers,
  Compass,
  Columns,
} from 'lucide-react';
import {
  syncService,
  ProjectionState,
  SyncMessage,
  ProjectorLayout,
  getOrCreateRoomCode,
} from '../utils/syncChannel';
import { CATEGORIES } from '../data/categories';
import { soundManager } from '../utils/audio';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase';
import confetti from 'canvas-confetti';
import AnimatedPawnBoard from './AnimatedPawnBoard';

export default function ProjectorView() {
  const [roomCode] = useState(() => getOrCreateRoomCode());
  const [layoutMode, setLayoutMode] = useState<ProjectorLayout>('split');
  const [state, setState] = useState<ProjectionState>(() => {
    return (
      syncService.getLastKnownState() || {
        stage: 'idle',
        roundMode: 'single_team',
        boardLength: 50,
        winningScore: 50,
        projectorLayout: 'split',
        teams: [
          { id: 'team-1', name: 'Equipe 1', score: 0, icon: '🦁', color: 'from-amber-500 to-orange-600', roundsPlayed: 0 },
          { id: 'team-2', name: 'Equipe 2', score: 0, icon: '🦅', color: 'from-sky-500 to-blue-600', roundsPlayed: 0 },
        ],
        timeLeft: 80,
        totalTime: 80,
        isUrgent: false,
        roundNumber: 1,
        lastUpdateTimestamp: Date.now(),
      }
    );
  });

  const [isConnected, setIsConnected] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelperBanner, setShowHelperBanner] = useState(true);

  // Subscribe to sync messages & robust heartbeat
  useEffect(() => {
    let lastReceivedTime = Date.now();

    // 1. If Supabase is configured, fetch initial room state from Cloud database
    const client = getSupabaseClient();
    if (client && roomCode) {
      Promise.resolve(
        client
          .from('game_rooms')
          .select('state')
          .eq('room_code', roomCode)
          .single()
      )
        .then(({ data }) => {
          if (data && data.state && (data.state as ProjectionState).stage) {
            const newState = data.state as ProjectionState;
            setState(newState);
            if (newState.projectorLayout) {
              setLayoutMode(newState.projectorLayout);
            }
            setIsConnected(true);
          }
        })
        .catch(() => {});
    }

    // 2. Request current state immediately from local channels
    syncService.broadcast({ type: 'REQUEST_CURRENT_STATE' });

    const unsubscribe = syncService.subscribe((msg: SyncMessage) => {
      lastReceivedTime = Date.now();
      setIsConnected(true);

      if (msg.type === 'PING') {
        setIsConnected(true);
        syncService.broadcast({ type: 'PONG', timestamp: Date.now() });
      } else if (msg.type === 'STATE_UPDATE') {
        setState(msg.state);
        if (msg.state.projectorLayout) {
          setLayoutMode(msg.state.projectorLayout);
        }
      } else if (msg.type === 'SET_PROJECTOR_LAYOUT') {
        setLayoutMode(msg.layout);
      } else if (msg.type === 'DICE_ROLL') {
        setState((prev) => ({
          ...prev,
          stage: 'die_rolling',
        }));
      } else if (msg.type === 'DICE_RESULT') {
        setState((prev) => ({
          ...prev,
          stage: 'word_ready',
          categoryCode: msg.categoryCode,
          categoryName: msg.categoryName,
          roundScore: msg.score,
        }));
      } else if (msg.type === 'TIMER_START') {
        setState((prev) => ({
          ...prev,
          stage: 'timer_running',
          timeLeft: msg.timeLeft,
          totalTime: msg.totalTime,
          isUrgent: false,
        }));
      } else if (msg.type === 'TIMER_TICK') {
        setState((prev) => ({
          ...prev,
          timeLeft: msg.timeLeft,
          isUrgent: msg.isUrgent,
        }));
      } else if (msg.type === 'ROUND_SUCCESS') {
        try {
          soundManager.playPawnHop();
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#10b981', '#38bdf8', '#ec4899', '#8b5cf6'],
          });
        } catch {
          // ignore
        }
        setState((prev) => ({
          ...prev,
          stage: 'round_success',
          teams: msg.updatedTeams,
          roundScore: msg.points,
          lastScoredTeamId: msg.teamId,
          lastScoredPoints: msg.points,
        }));
      } else if (msg.type === 'ROUND_TIMEOUT') {
        setState((prev) => ({
          ...prev,
          stage: 'round_timeout',
        }));
      } else if (msg.type === 'MATCH_FINISHED') {
        setState((prev) => ({
          ...prev,
          stage: 'match_summary',
          teams: msg.teams,
          winnerTeam: {
            name: msg.winnerName,
            icon: msg.winnerIcon,
            score: msg.winnerScore,
          },
        }));
      }
    });

    // Heartbeat monitor & state poll check
    const interval = setInterval(() => {
      const diff = Date.now() - lastReceivedTime;
      if (diff > 5000) {
        syncService.broadcast({ type: 'REQUEST_CURRENT_STATE' });
      }
      if (diff > 12000) {
        setIsConnected(false);
      } else {
        setIsConnected(true);
      }
    }, 2500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [roomCode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
          setShowHelperBanner(false);
        })
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentCategoryDef = state.categoryCode
    ? CATEGORIES[state.categoryCode as keyof typeof CATEGORIES]
    : null;

  const activeTeam = state.currentTeam || state.teams[0] || {
    name: 'Equipe da Vez',
    icon: '🦁',
    score: 0,
  };

  const isAllTeams = state.roundMode === 'all_teams';
  const boardLength = state.boardLength || 50;
  const progressPercent =
    state.totalTime > 0
      ? ((state.totalTime - state.timeLeft) / state.totalTime) * 100
      : 0;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col justify-between select-none relative overflow-x-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))]" />
      <div className="fixed -top-32 -left-32 w-[500px] h-[500px] bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-32 -right-32 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Helper Banner for Projector / 2nd Monitor */}
      {showHelperBanner && !isFullscreen && (
        <div className="bg-amber-400 text-slate-950 px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-black uppercase tracking-wider relative z-50 shadow-md">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5" />
            <span>
              📺 <strong>TELA 2 / PROJETOR:</strong> O Caminho do Tabuleiro e o Palco são sincronizados em tempo real!
            </span>
          </div>
          <button
            onClick={() => setShowHelperBanner(false)}
            className="text-slate-950/70 hover:text-slate-950 font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Control Bar */}
      <header className="w-full px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-indigo-900/60 bg-slate-950/85 backdrop-blur-md relative z-40">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center text-slate-950 font-black italic shadow-lg transform -rotate-3">
              IA
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>IMAGEM & AÇÃO</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">
                  TELA 2 • TELÃO
                </span>
              </h1>
            </div>
          </div>

          <div
            className={`flex sm:hidden items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
              isConnected
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
            }`}
          >
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isConnected ? 'Ao Vivo' : 'Reconectando...'}</span>
          </div>
        </div>

        {/* View Mode Selector (Dividido, Caminho, Palco) & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
          {/* Display Mode Switcher */}
          <div className="flex items-center bg-indigo-950/90 p-1 rounded-2xl border border-indigo-800/80 shadow-md">
            <button
              onClick={() => setLayoutMode('split')}
              id="btn-layout-split"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                layoutMode === 'split'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-indigo-200 hover:text-white'
              }`}
              title="Exibe o Palco da Rodada e o Caminho do Tabuleiro juntos"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Dividido</span>
            </button>

            <button
              onClick={() => setLayoutMode('path')}
              id="btn-layout-path"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                layoutMode === 'path'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-indigo-200 hover:text-white'
              }`}
              title="Exibe o Caminho do Tabuleiro em tela cheia com peões"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Caminho</span>
            </button>

            <button
              onClick={() => setLayoutMode('stage')}
              id="btn-layout-stage"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                layoutMode === 'stage'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-indigo-200 hover:text-white'
              }`}
              title="Foco grande no cronômetro e etapa da rodada"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Palco</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-900/80 border border-indigo-700 text-amber-300">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{roomCode}</span>
          </div>

          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
              isConnected
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
            }`}
          >
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isConnected ? 'Sincronizado' : 'Reconectando...'}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            id="btn-projector-fullscreen"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-400/20 transition-all cursor-pointer border-2 border-amber-300"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Sair' : 'Tela Cheia'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-5 md:p-6 max-w-7xl mx-auto w-full relative z-30 space-y-4">
        {/* ======================================================== */}
        {/* LAYOUT 1: SPLIT VIEW (STAGE CARD + LIVE CAMINHO DO TABULEIRO) */}
        {/* ======================================================== */}
        {layoutMode === 'split' && (
          <div className="w-full space-y-4">
            {/* Top Stage Area */}
            <div className="w-full">
              {renderStageContent({
                state,
                activeTeam,
                currentCategoryDef,
                isAllTeams,
                formatTime,
                progressPercent,
                compact: true,
              })}
            </div>

            {/* Bottom Live Winding Board Path */}
            <div className="w-full">
              <AnimatedPawnBoard
                teams={state.teams}
                boardLength={boardLength}
                winningScore={boardLength}
                activeTeamId={state.lastScoredTeamId || activeTeam.id}
                lastScoredTeamId={state.lastScoredTeamId}
                lastScoredPoints={state.lastScoredPoints}
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* LAYOUT 2: FULL PATH VIEW (CAMINHO GIGANTE + MINI HUD) */}
        {/* ======================================================== */}
        {layoutMode === 'path' && (
          <div className="w-full space-y-3">
            {/* Mini Floating HUD for Timer & Turn */}
            <div className="w-full p-3 rounded-2xl bg-slate-900/90 border-2 border-amber-400/50 shadow-xl flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl">
                  {isAllTeams ? '⚡' : activeTeam.icon}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-300 block">
                    Rodada #{state.roundNumber} {isAllTeams ? '• Todas as Equipes' : `• ${activeTeam.name}`}
                  </span>
                  <span className="text-sm font-black text-white uppercase">
                    {state.categoryCode ? `${state.categoryCode} — ${state.categoryName || 'Desafio'}` : 'Aguardando Sorteio'}
                  </span>
                </div>
              </div>

              {/* Mini Timer Display */}
              {state.stage === 'timer_running' && (
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-1.5 rounded-xl border border-red-500/50">
                  <Clock className={`w-5 h-5 ${state.isUrgent ? 'text-red-500 animate-spin' : 'text-red-400'}`} />
                  <span className={`font-mono-digits font-black text-2xl ${state.isUrgent ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    {formatTime(state.timeLeft)}
                  </span>
                </div>
              )}

              {state.stage === 'round_success' && (
                <div className="flex items-center gap-2 bg-emerald-950/80 px-4 py-1.5 rounded-xl border border-emerald-500 text-emerald-300 text-xs font-black uppercase">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>+{state.roundScore || 1} Casas no Caminho!</span>
                </div>
              )}
            </div>

            {/* Expansive Board */}
            <AnimatedPawnBoard
              teams={state.teams}
              boardLength={boardLength}
              winningScore={boardLength}
              activeTeamId={state.lastScoredTeamId || activeTeam.id}
              lastScoredTeamId={state.lastScoredTeamId}
              lastScoredPoints={state.lastScoredPoints}
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* LAYOUT 3: STAGE FOCUS VIEW (TIMER GIGANTE + ETAPAS) */}
        {/* ======================================================== */}
        {layoutMode === 'stage' && (
          <div className="w-full flex flex-col items-center justify-center min-h-[60vh]">
            {renderStageContent({
              state,
              activeTeam,
              currentCategoryDef,
              isAllTeams,
              formatTime,
              progressPercent,
              compact: false,
            })}
          </div>
        )}
      </main>

      {/* Persistent Live Scoreboard on bottom of Projector screen */}
      <footer className="w-full bg-slate-950/95 border-t-2 border-indigo-900/80 px-4 sm:px-8 py-3.5 backdrop-blur-lg relative z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-indigo-200 whitespace-nowrap">
              Posição na Trilha (Meta {boardLength} Casas):
            </span>
          </div>

          {/* Teams Horizontal Bar */}
          <div className="flex items-center gap-2.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {state.teams.map((t) => {
              const isCurrentTurn = activeTeam.id === t.id && !isAllTeams;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl whitespace-nowrap transition-all border ${
                    isCurrentTurn
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg scale-105 font-black'
                      : 'bg-slate-900 text-white border-slate-800'
                  }`}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="text-xs sm:text-sm font-black uppercase">{t.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono-digits font-black ${
                      isCurrentTurn
                        ? 'bg-slate-950 text-amber-300'
                        : 'bg-slate-800 text-amber-400'
                    }`}
                  >
                    {t.score}/{boardLength}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------------
// Helper Component: Stage Content Renderer (Supports Compact & Large)
// -------------------------------------------------------------------
interface StageContentProps {
  state: ProjectionState;
  activeTeam: { id?: string; name: string; icon: string; score: number };
  currentCategoryDef: any;
  isAllTeams: boolean;
  formatTime: (sec: number) => string;
  progressPercent: number;
  compact?: boolean;
}

function renderStageContent({
  state,
  activeTeam,
  currentCategoryDef,
  isAllTeams,
  formatTime,
  progressPercent,
  compact = false,
}: StageContentProps) {
  return (
    <AnimatePresence mode="wait">
      {/* 1: IDLE */}
      {state.stage === 'idle' && (
        <motion.div
          key="stage-idle"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`text-center w-full max-w-3xl mx-auto ${compact ? 'p-6 bg-slate-900/80 rounded-3xl border border-indigo-900/60' : 'p-8 sm:p-12'}`}
        >
          <div className="w-20 h-20 sm:w-28 sm:h-28 bg-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-400/20 transform -rotate-6 border-4 border-yellow-300 text-slate-950">
            <Dices className="w-12 h-12 sm:w-16 sm:h-16 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mb-2">
            AGUARDANDO O JOGO
          </h2>
          <p className="text-indigo-200 text-sm sm:text-base font-bold uppercase tracking-wider">
            O operador iniciará a partida no computador principal
          </p>
        </motion.div>
      )}

      {/* 2: TURN WAITING / ROLL DIE */}
      {state.stage === 'turn_waiting' && (
        <motion.div
          key="stage-turn-waiting"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`text-center w-full max-w-4xl mx-auto ${
            compact ? 'p-4 sm:p-6 rounded-3xl bg-white text-indigo-950 shadow-xl border-4 border-amber-400' : 'p-8 sm:p-12 rounded-[48px] bg-white text-indigo-950 shadow-2xl border-4 border-amber-400'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-indigo-900/60 block">
              RODADA #{state.roundNumber}
            </span>
            {isAllTeams && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase">
                ⚡ TODAS AO MESMO TEMPO
              </span>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 my-2">
            <span className="text-3xl sm:text-5xl transform -rotate-3">
              {isAllTeams ? '⚡' : activeTeam.icon}
            </span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-indigo-950">
              {isAllTeams ? 'TODAS AS EQUIPES' : activeTeam.name}
            </h2>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-slate-950 shadow-md animate-bounce">
              <Dices className="w-7 h-7 stroke-[2.5]" />
            </div>
            <span className="text-indigo-900/80 font-black text-sm sm:text-lg uppercase tracking-wider">
              GIRANDO O DADO NO COMPUTADOR...
            </span>
          </div>
        </motion.div>
      )}

      {/* 3: DIE ROLLING */}
      {state.stage === 'die_rolling' && (
        <motion.div
          key="stage-die-rolling"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`text-center w-full max-w-4xl mx-auto ${
            compact ? 'p-4 sm:p-6 rounded-3xl bg-white text-indigo-950 shadow-xl' : 'p-8 sm:p-12 rounded-[48px] bg-white text-indigo-950 shadow-2xl'
          }`}
        >
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-amber-400 rounded-2xl flex items-center justify-center text-slate-950 shadow-xl border-4 border-yellow-300 animate-spin mx-auto my-3">
            <Dices className="w-9 h-9 sm:w-14 sm:h-14 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-indigo-950 animate-pulse">
            SORTEANDO CATEGORIA...
          </h2>
        </motion.div>
      )}

      {/* 4: WORD READY */}
      {state.stage === 'word_ready' && (
        <motion.div
          key="stage-word-ready"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`text-center w-full max-w-4xl mx-auto relative ${
            compact ? 'p-5 sm:p-7 rounded-3xl bg-white text-indigo-950 shadow-xl border-4 border-amber-400' : 'p-8 sm:p-12 rounded-[48px] bg-white text-indigo-950 shadow-2xl border-4 border-amber-400'
          }`}
        >
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">
            CATEGORIA SORTEADA
          </span>

          <h3 className="text-2xl sm:text-4xl font-black uppercase text-indigo-950 tracking-tight mb-2">
            {state.categoryCode} — {state.categoryName || currentCategoryDef?.name || 'DESAFIO'}
          </h3>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-amber-400/20 border-2 border-amber-400 text-amber-800 font-mono-digits font-black text-sm sm:text-lg mb-3">
            ⭐ VALE +{state.roundScore || 1} {(state.roundScore || 1) === 1 ? 'CASA' : 'CASAS'} NO CAMINHO
          </div>

          <p className="text-indigo-950 font-black text-lg sm:text-2xl uppercase tracking-wide">
            🤫 REPRESENTE SEM FALAR!
          </p>
        </motion.div>
      )}

      {/* 5: TIMER RUNNING */}
      {state.stage === 'timer_running' && (
        <motion.div
          key="stage-timer-running"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="text-center w-full max-w-5xl mx-auto space-y-3"
        >
          {/* Top Banner: Team & Category */}
          <div className="w-full flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white text-indigo-950 shadow-lg border-2 border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-2xl shadow-sm">
                {isAllTeams ? '⚡' : activeTeam.icon}
              </div>
              <div className="text-left">
                <span className="text-[10px] uppercase font-black tracking-wider text-indigo-900/60 block">
                  {isAllTeams ? 'Modo Simultâneo' : 'Vez da Equipe'}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-indigo-950 uppercase">
                  {isAllTeams ? 'TODAS AS EQUIPES' : activeTeam.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase bg-indigo-600 text-white shadow-sm">
                {state.categoryCode} — {state.categoryName || 'CATEGORIA'}
              </span>
              <span className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase bg-amber-400 text-slate-950 shadow-sm border border-amber-300 font-mono-digits">
                ⭐ +{state.roundScore || 1} {(state.roundScore || 1) === 1 ? 'CASA' : 'CASAS'}
              </span>
            </div>
          </div>

          {/* Countdown Clock Display */}
          <div
            className={`w-full bg-white rounded-3xl flex flex-col items-center justify-center shadow-xl border-b-6 border-red-200 ${
              compact ? 'p-4 sm:p-6' : 'p-8 sm:p-12'
            }`}
          >
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-indigo-900/60">
              {state.isUrgent ? '🔥 ÚLTIMOS SEGUNDOS!' : 'TEMPO RESTANTE'}
            </span>

            {/* Digits */}
            <h1
              id="projector-timer-digits"
              className={`font-mono-digits font-black tracking-tighter leading-none transition-colors my-1 ${
                compact
                  ? 'text-6xl sm:text-7xl md:text-8xl'
                  : 'text-7xl sm:text-8xl md:text-[140px]'
              } ${state.isUrgent ? 'text-red-600 animate-pulse' : 'text-red-500'}`}
            >
              {formatTime(state.timeLeft)}
            </h1>

            {/* Progress Bar */}
            <div className="w-full max-w-xl h-3.5 sm:h-4 bg-indigo-50 rounded-full mt-3 overflow-hidden border border-indigo-100 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  state.isUrgent ? 'bg-red-600 animate-pulse' : 'bg-red-500'
                }`}
                style={{ width: `${100 - progressPercent}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* 6: ROUND SUCCESS */}
      {state.stage === 'round_success' && (
        <motion.div
          key="stage-round-success"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`text-center w-full max-w-4xl mx-auto ${
            compact ? 'p-5 sm:p-7 rounded-3xl bg-white text-indigo-950 shadow-xl border-4 border-emerald-500' : 'p-8 sm:p-12 rounded-[48px] bg-white text-indigo-950 shadow-2xl border-4 border-emerald-500'
          }`}
        >
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-emerald-500/40 animate-bounce">
            <CheckCircle className="w-10 h-10 stroke-[3]" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-emerald-600 mb-2">
            🎉 ACERTOU! PEÃO AVANÇOU NO CAMINHO!
          </h2>

          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-amber-400 border-2 border-amber-300 shadow-md my-1 font-mono-digits font-black text-lg sm:text-2xl text-slate-950 uppercase">
            +{state.roundScore || 1} {(state.roundScore || 1) === 1 ? 'CASA' : 'CASAS'} ♟️
          </div>
        </motion.div>
      )}

      {/* 7: ROUND TIMEOUT */}
      {state.stage === 'round_timeout' && (
        <motion.div
          key="stage-round-timeout"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`text-center w-full max-w-4xl mx-auto ${
            compact ? 'p-5 sm:p-7 rounded-3xl bg-white text-indigo-950 shadow-xl border-4 border-red-500' : 'p-8 sm:p-12 rounded-[48px] bg-white text-indigo-950 shadow-2xl border-4 border-red-500'
          }`}
        >
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <AlertTriangle className="w-10 h-10 stroke-[2.5]" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-red-600 mb-1">
            ⏰ TEMPO ESGOTADO!
          </h2>
          <p className="text-indigo-900/70 font-black text-sm sm:text-base uppercase tracking-wider">
            RODADA ENCERRADA (0 CASAS)
          </p>
        </motion.div>
      )}

      {/* 8: MATCH SUMMARY / PODIUM */}
      {state.stage === 'match_summary' && (
        <motion.div
          key="stage-match-summary"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="text-center w-full max-w-4xl mx-auto p-6 sm:p-10 rounded-3xl bg-white text-indigo-950 shadow-2xl border-4 border-amber-400"
        >
          <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-950 shadow-lg border-2 border-yellow-300">
            <Trophy className="w-10 h-10 fill-current stroke-none" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-indigo-950 mb-4">
            {state.winnerTeam
              ? `🏆 VITÓRIA DA EQUIPE ${state.winnerTeam.name.toUpperCase()}!`
              : '🏆 PARTIDA FINALIZADA!'}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {state.teams
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((t, idx) => (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-2xl text-center border-2 ${
                    idx === 0
                      ? 'bg-amber-400 text-slate-950 border-yellow-500 shadow-lg scale-105 font-black'
                      : 'bg-indigo-50 text-indigo-950 border-indigo-100'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase block mb-1">
                    {idx === 0 ? '👑 1º Lugar' : `${idx + 1}º Lugar`}
                  </span>
                  <span className="text-2xl block my-0.5">{t.icon}</span>
                  <h4 className="font-black text-sm uppercase truncate">{t.name}</h4>
                  <span className="font-mono-digits font-black text-lg block mt-1">
                    {t.score} casas
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
