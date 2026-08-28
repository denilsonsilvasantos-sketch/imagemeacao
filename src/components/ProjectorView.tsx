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
} from 'lucide-react';
import { syncService, ProjectionState, SyncMessage, getOrCreateRoomCode } from '../utils/syncChannel';
import { CATEGORIES } from '../data/categories';
import { soundManager } from '../utils/audio';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase';
import confetti from 'canvas-confetti';

export default function ProjectorView() {
  const [roomCode] = useState(() => getOrCreateRoomCode());
  const [state, setState] = useState<ProjectionState>(() => {
    return (
      syncService.getLastKnownState() || {
        stage: 'idle',
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
            setState(data.state as ProjectionState);
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
        // Heartbeat received from operator
        setIsConnected(true);
        syncService.broadcast({ type: 'PONG', timestamp: Date.now() });
      } else if (msg.type === 'STATE_UPDATE') {
        setState(msg.state);
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
        // Request state again in case a message was dropped
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

  const progressPercent = state.totalTime > 0
    ? ((state.totalTime - state.timeLeft) / state.totalTime) * 100
    : 0;

  return (
    <div className="min-h-screen w-full bg-indigo-950 text-white flex flex-col justify-between select-none relative overflow-hidden font-sans">
      {/* Background ambient lighting and subtle energetic radial effects */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.3),rgba(255,255,255,0))]" />
      <div className="fixed -top-32 -left-32 w-[500px] h-[500px] bg-yellow-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-32 -right-32 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Helper Banner for Projector / 2nd Monitor */}
      {showHelperBanner && !isFullscreen && (
        <div className="bg-yellow-400 text-indigo-950 px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-black uppercase tracking-wider relative z-50 shadow-md">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5" />
            <span>
              📺 MODO PROJEÇÃO ATIVO — Arraste esta janela para a TV/projetor e clique em <strong>TELA CHEIA</strong>
            </span>
          </div>
          <button
            onClick={() => setShowHelperBanner(false)}
            className="text-indigo-950/70 hover:text-indigo-950 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Control Bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-indigo-900/60 bg-indigo-950/80 backdrop-blur-md relative z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-indigo-950 font-black italic shadow-lg transform -rotate-3">
            IA
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <span>IMAGEM & AÇÃO</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400 text-indigo-950 font-heading">
                PROJEÇÃO PÚBLICA
              </span>
            </h1>
          </div>
        </div>

        {/* Status Indicator, Room Code & Fullscreen Button */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-900/80 border border-indigo-700 text-yellow-300">
            <Globe className="w-3.5 h-3.5 text-yellow-400" />
            <span>{roomCode}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
              isConnected
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 animate-pulse'
            }`}
          >
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isConnected ? 'Sincronizado' : 'Reconectando...'}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            id="btn-projector-fullscreen"
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-yellow-400/20 transition-all cursor-pointer border-2 border-yellow-300"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}</span>
          </button>
        </div>
      </header>

      {/* Main Dynamic Stage View */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-7xl mx-auto w-full relative z-30">
        <AnimatePresence mode="wait">
          {/* ================= STAGE 1: IDLE / WAITING GAME START ================= */}
          {state.stage === 'idle' && (
            <motion.div
              key="stage-idle"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="text-center w-full max-w-3xl"
            >
              <div className="w-28 h-28 sm:w-36 sm:h-36 bg-yellow-400 rounded-[36px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-yellow-400/30 transform -rotate-6 border-4 border-yellow-300">
                <Dices className="w-16 h-16 sm:w-20 sm:h-20 text-indigo-950 stroke-[2.5]" />
              </div>

              <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white mb-4">
                AGUARDANDO O JOGO
              </h2>
              <p className="text-indigo-200 text-lg sm:text-2xl font-bold uppercase tracking-wider">
                O operador iniciará a partida no computador principal
              </p>
            </motion.div>
          )}

          {/* ================= STAGE 2: TURN WAITING / ROLL DIE ================= */}
          {state.stage === 'turn_waiting' && (
            <motion.div
              key="stage-turn-waiting"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="text-center w-full max-w-4xl"
            >
              {/* Big Team Turn Card */}
              <div className="p-8 sm:p-12 rounded-[48px] bg-white text-indigo-950 shadow-2xl mb-8 border-4 border-yellow-400 relative">
                <span className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-indigo-900/60 block mb-2">
                  RODADA #{state.roundNumber} • VEZ DA EQUIPE
                </span>

                <div className="flex items-center justify-center gap-4 my-3">
                  <span className="text-5xl sm:text-7xl transform -rotate-3">{activeTeam.icon}</span>
                  <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-indigo-950">
                    {activeTeam.name}
                  </h2>
                </div>

                <div className="mt-8 flex flex-col items-center">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-yellow-400 rounded-3xl flex items-center justify-center text-indigo-950 shadow-xl border-4 border-yellow-300 animate-bounce">
                    <Dices className="w-14 h-14 stroke-[2.5]" />
                  </div>
                  <span className="text-indigo-900/70 font-black text-base sm:text-xl uppercase tracking-wider mt-4">
                    GIRANDO O DADO NO COMPUTADOR...
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= STAGE 3: DIE ROLLING ================= */}
          {state.stage === 'die_rolling' && (
            <motion.div
              key="stage-die-rolling"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="text-center w-full max-w-4xl flex flex-col items-center"
            >
              <div className="p-8 sm:p-14 rounded-[48px] bg-white text-indigo-950 shadow-2xl w-full flex flex-col items-center">
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-indigo-900/60 mb-4">
                  VEZ DE {activeTeam.name.toUpperCase()} {activeTeam.icon}
                </span>

                <div className="w-32 h-32 sm:w-40 sm:h-40 bg-yellow-400 rounded-[32px] flex items-center justify-center text-indigo-950 shadow-2xl border-4 border-yellow-300 animate-spin my-6">
                  <Dices className="w-20 h-20 sm:w-24 sm:h-24 stroke-[2.5]" />
                </div>

                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-indigo-950 animate-pulse">
                  SORTEANDO CATEGORIA...
                </h2>
              </div>
            </motion.div>
          )}

          {/* ================= STAGE 4: WORD READY / CATEGORY & POINTS REVEALED ================= */}
          {state.stage === 'word_ready' && (
            <motion.div
              key="stage-word-ready"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="text-center w-full max-w-4xl"
            >
              <div className="p-8 sm:p-12 rounded-[48px] bg-white text-indigo-950 shadow-2xl relative border-4 border-yellow-400">
                {/* Floating Category Letter Badge */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 bg-yellow-400 rounded-3xl border-4 border-indigo-950 flex items-center justify-center shadow-2xl rotate-3">
                  <span className="text-indigo-950 text-4xl sm:text-5xl font-black">
                    {state.categoryCode || 'P'}
                  </span>
                </div>

                <div className="pt-8">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-indigo-400 block mb-1">
                    CATEGORIA SORTEADA
                  </span>

                  <h3 className="text-3xl sm:text-5xl font-black uppercase text-indigo-950 tracking-tight mb-4">
                    {state.categoryCode} — {state.categoryName || currentCategoryDef?.name || 'DESAFIO'}
                  </h3>

                  {/* Big Points Badge */}
                  <div className="my-6 p-4 sm:p-6 rounded-[32px] bg-yellow-400/20 border-3 border-yellow-400 max-w-md mx-auto shadow-inner">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-indigo-900/70 block">
                      VALE NESTA RODADA
                    </span>
                    <strong className="text-4xl sm:text-6xl font-black text-amber-600 uppercase block font-mono-digits tracking-tight my-1">
                      ⭐ {state.roundScore || 1} {(state.roundScore || 1) === 1 ? 'PONTO' : 'PONTOS'}
                    </strong>
                  </div>

                  {/* Callout: Represente sem falar */}
                  <div className="mt-4">
                    <p className="text-indigo-950 font-black text-2xl sm:text-4xl uppercase tracking-wide">
                      🤫 REPRESENTE SEM FALAR!
                    </p>
                    <p className="text-indigo-900/60 text-xs sm:text-sm font-bold uppercase tracking-wider mt-2">
                      (A palavra foi enviada somente para o representante da equipe {activeTeam.name})
                    </p>
                  </div>

                  {/* Ready Timer Preview */}
                  <div className="mt-8 inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-indigo-50 border border-indigo-200">
                    <Clock className="w-6 h-6 text-indigo-600" />
                    <span className="font-mono-digits font-black text-2xl sm:text-3xl text-indigo-950">
                      01:20
                    </span>
                    <span className="text-xs font-black uppercase text-indigo-900/60">
                      PRONTO PARA COMEÇAR
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= STAGE 5: TIMER RUNNING ================= */}
          {state.stage === 'timer_running' && (
            <motion.div
              key="stage-timer-running"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="text-center w-full max-w-5xl"
            >
              {/* Top Banner: Team & Category */}
              <div className="w-full flex items-center justify-between gap-4 p-4 sm:p-6 rounded-[32px] bg-white text-indigo-950 shadow-xl mb-6 border-2 border-indigo-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center text-3xl shadow-md transform -rotate-3">
                    {activeTeam.icon}
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] sm:text-xs uppercase font-black tracking-widest text-indigo-900/60 block">
                      Vez da Equipe
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-indigo-950 uppercase">
                      {activeTeam.name}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-5 py-2.5 rounded-2xl text-sm sm:text-base font-black uppercase bg-indigo-600 text-white shadow-md">
                    {state.categoryCode} — {state.categoryName || 'CATEGORIA'}
                  </span>
                  <span className="px-5 py-2.5 rounded-2xl text-sm sm:text-base font-black uppercase bg-yellow-400 text-indigo-950 shadow-md border-2 border-yellow-300">
                    ⭐ {state.roundScore || 1} {(state.roundScore || 1) === 1 ? 'PONTO' : 'PONTOS'}
                  </span>
                </div>
              </div>

              {/* Giant Digital Countdown Screen */}
              <div className="w-full bg-white rounded-[48px] p-8 sm:p-14 flex flex-col items-center justify-center shadow-2xl border-b-8 border-red-200 relative overflow-hidden">
                <span className="text-sm sm:text-base font-black uppercase tracking-widest text-indigo-900/60 mb-2">
                  {state.isUrgent ? '🔥 ÚLTIMOS SEGUNDOS!' : 'TEMPO RESTANTE'}
                </span>

                {/* Giant Digits */}
                <h1
                  id="projector-timer-digits"
                  className={`font-mono-digits font-black tracking-tighter leading-none transition-colors my-2 ${
                    state.isUrgent
                      ? 'text-8xl sm:text-9xl md:text-[160px] text-red-600 animate-pulse'
                      : 'text-7xl sm:text-8xl md:text-[140px] text-red-500'
                  }`}
                >
                  {formatTime(state.timeLeft)}
                </h1>

                {/* Giant Linear Progress Bar */}
                <div className="w-full max-w-2xl h-5 sm:h-6 bg-indigo-50 rounded-full mt-8 overflow-hidden border-2 border-indigo-100 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      state.isUrgent ? 'bg-red-600 animate-pulse' : 'bg-red-500'
                    }`}
                    style={{ width: `${100 - progressPercent}%` }}
                  />
                </div>

                <p className="text-indigo-950 font-black text-xl sm:text-3xl uppercase tracking-wider mt-8">
                  🤫 REPRESENTE SEM FALAR!
                </p>
              </div>
            </motion.div>
          )}

          {/* ================= STAGE 6: ROUND SUCCESS ================= */}
          {state.stage === 'round_success' && (
            <motion.div
              key="stage-round-success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center w-full max-w-4xl"
            >
              <div className="p-10 sm:p-16 rounded-[48px] bg-white text-indigo-950 shadow-2xl border-4 border-emerald-500">
                <div className="w-28 h-28 sm:w-36 sm:h-36 bg-emerald-500 rounded-[36px] flex items-center justify-center mx-auto mb-6 text-white shadow-2xl shadow-emerald-500/40 animate-bounce">
                  <CheckCircle className="w-16 h-16 sm:w-22 sm:h-22 stroke-[3]" />
                </div>

                <h2 className="text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight text-emerald-600 mb-4">
                  🎉 ACERTOU!
                </h2>

                <div className="inline-flex items-center gap-3 px-8 py-4 rounded-3xl bg-yellow-400 border-4 border-yellow-300 shadow-xl my-4">
                  <Star className="w-8 h-8 fill-indigo-950 stroke-none" />
                  <span className="text-3xl sm:text-5xl font-black text-indigo-950 uppercase font-mono-digits">
                    +{state.roundScore || 1} {(state.roundScore || 1) === 1 ? 'PONTO' : 'PONTOS'}
                  </span>
                  <Star className="w-8 h-8 fill-indigo-950 stroke-none" />
                </div>

                <p className="text-indigo-950 font-black text-2xl sm:text-3xl uppercase tracking-wide mt-4">
                  PONTUAÇÃO COMPUTADA PARA {activeTeam.name.toUpperCase()} {activeTeam.icon}
                </p>
              </div>
            </motion.div>
          )}

          {/* ================= STAGE 7: ROUND TIMEOUT ================= */}
          {state.stage === 'round_timeout' && (
            <motion.div
              key="stage-round-timeout"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center w-full max-w-4xl"
            >
              <div className="p-10 sm:p-16 rounded-[48px] bg-white text-indigo-950 shadow-2xl border-4 border-red-500">
                <div className="w-28 h-28 sm:w-36 sm:h-36 bg-red-100 text-red-600 rounded-[36px] flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
                  <AlertTriangle className="w-16 h-16 sm:w-20 sm:h-20 stroke-[2.5]" />
                </div>

                <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-red-600 mb-2">
                  ⏰ TEMPO ESGOTADO!
                </h2>

                <p className="text-indigo-900/70 font-black text-xl sm:text-2xl uppercase tracking-wider my-4">
                  RODADA ENCERRADA (0 PONTOS)
                </p>
              </div>
            </motion.div>
          )}

          {/* ================= STAGE 8: MATCH FINISHED ================= */}
          {state.stage === 'match_summary' && (
            <motion.div
              key="stage-match-summary"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center w-full max-w-5xl"
            >
              <div className="p-8 sm:p-14 rounded-[48px] bg-white text-indigo-950 shadow-2xl border-4 border-yellow-400">
                <div className="w-28 h-28 bg-yellow-400 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-950 shadow-2xl border-4 border-yellow-300 transform -rotate-3">
                  <Trophy className="w-16 h-16 fill-current stroke-none" />
                </div>

                <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-indigo-950 px-4 py-1.5 rounded-full bg-yellow-400 shadow-md inline-block mb-3">
                  PARTIDA FINALIZADA
                </span>

                <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-indigo-950 mb-6">
                  {state.winnerTeam
                    ? `🏆 VITÓRIA DA EQUIPE ${state.winnerTeam.name.toUpperCase()}!`
                    : '🏆 PARABÉNS A TODAS AS EQUIPES!'}
                </h2>

                {/* Final Mini Podiums */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  {state.teams
                    .slice()
                    .sort((a, b) => b.score - a.score)
                    .map((t, idx) => (
                      <div
                        key={t.id}
                        className={`p-4 rounded-3xl text-center border-2 ${
                          idx === 0
                            ? 'bg-yellow-400 text-indigo-950 border-yellow-500 shadow-xl scale-105'
                            : 'bg-indigo-50 text-indigo-950 border-indigo-100'
                        }`}
                      >
                        <span className="text-xs font-black uppercase block mb-1">
                          {idx === 0 ? '👑 1º Lugar' : `${idx + 1}º Lugar`}
                        </span>
                        <span className="text-3xl block my-1">{t.icon}</span>
                        <h4 className="font-black text-lg uppercase truncate">{t.name}</h4>
                        <span className="font-mono-digits font-black text-2xl block mt-1">
                          {t.score} pts
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent Live Scoreboard on bottom of Projector screen */}
      <footer className="w-full bg-indigo-950/95 border-t-2 border-indigo-900 px-4 sm:px-8 py-4 backdrop-blur-lg relative z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-indigo-200 whitespace-nowrap">
              PLACAR GERAL:
            </span>
          </div>

          {/* Teams Horizontal Bar */}
          <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {state.teams.map((t, idx) => {
              const isCurrentTurn = activeTeam.id === t.id;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl whitespace-nowrap transition-all border ${
                    isCurrentTurn
                      ? 'bg-yellow-400 text-indigo-950 border-yellow-300 shadow-lg scale-105 font-black'
                      : 'bg-white/10 text-white border-white/10'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-sm font-black uppercase">{t.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-sm font-mono-digits font-black ${
                      isCurrentTurn
                        ? 'bg-indigo-950 text-yellow-400'
                        : 'bg-white/20 text-yellow-400'
                    }`}
                  >
                    {t.score}
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
