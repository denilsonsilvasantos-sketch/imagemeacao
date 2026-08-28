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
  Zap,
  Crown,
} from 'lucide-react';
import {
  syncService,
  ProjectionState,
  SyncMessage,
  getOrCreateRoomCode,
} from '../utils/syncChannel';
import { CATEGORIES } from '../data/categories';
import { soundManager } from '../utils/audio';
import { getSupabaseClient } from '../services/supabase';
import confetti from 'canvas-confetti';

export default function ProjectorView() {
  const [roomCode] = useState(() => getOrCreateRoomCode());
  const [state, setState] = useState<ProjectionState>(() => {
    return (
      syncService.getLastKnownState() || {
        stage: 'idle',
        roundMode: 'single_team',
        boardLength: 50,
        winningScore: 50,
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

  // Subscribe to sync messages & heartbeat
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
            particleCount: 180,
            spread: 120,
            origin: { y: 0.5 },
            colors: ['#f59e0b', '#10b981', '#38bdf8', '#ec4899', '#8b5cf6', '#eab308'],
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
        .then(() => setIsFullscreen(true))
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
  const targetScore = state.winningScore || state.boardLength || 50;

  // Calculate highest score to identify current leader(s)
  const maxScore = Math.max(...state.teams.map((t) => t.score), 0);

  const progressPercent =
    state.totalTime > 0
      ? ((state.totalTime - state.timeLeft) / state.totalTime) * 100
      : 0;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col justify-start select-none relative overflow-x-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))]" />
      <div className="fixed -top-32 -left-32 w-[500px] h-[500px] bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-32 -right-32 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* ======================================================== */}
      {/* FIXED TOP HEADER & SCOREBOARD (SEMPRE FIXO NO TOPO)     */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-50 w-full bg-slate-950/95 backdrop-blur-xl border-b-2 border-indigo-900/80 shadow-2xl">
        {/* Top Control Bar */}
        <div className="w-full px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-indigo-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center text-slate-950 font-black italic shadow-lg transform -rotate-3">
              IA
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>IMAGEM & AÇÃO</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">
                  PLACAR AO VIVO
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-900/80 border border-indigo-700 text-amber-300">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>SALA: {roomCode}</span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
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
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer border border-amber-300"
              title="Alternar Tela Cheia"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Sair' : 'Tela Cheia'}</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SCOREBOARD CARDS (PLACAR FIXO E DESTACADO PARA TODAS AS EQUIPES) */}
        {/* ======================================================== */}
        <div className="w-full px-3 sm:px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>PLACAR GERAL DAS EQUIPES</span>
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
              Meta: {targetScore} Pontos
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {state.teams.map((t) => {
              const isCurrentTurn = activeTeam.id === t.id && !isAllTeams;
              const isLeader = maxScore > 0 && t.score === maxScore;
              const isLastScored = state.lastScoredTeamId === t.id && state.stage === 'round_success';

              return (
                <div
                  key={t.id}
                  className={`relative rounded-2xl p-3 sm:p-3.5 transition-all duration-300 border-2 flex flex-col justify-between overflow-hidden shadow-lg ${
                    isCurrentTurn
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 border-white ring-4 ring-amber-400/40 scale-[1.02]'
                      : 'bg-slate-900/90 text-white border-indigo-900/70 hover:border-indigo-700'
                  }`}
                >
                  {/* Floating Points Gain Animation Badge */}
                  {isLastScored && (
                    <motion.div
                      initial={{ scale: 0, y: 15 }}
                      animate={{ scale: 1.1, y: 0 }}
                      className="absolute top-2 right-2 bg-emerald-500 text-white font-mono-digits font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 z-20 animate-bounce"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>+{state.roundScore || 1} pts</span>
                    </motion.div>
                  )}

                  {/* Team Header: Icon, Name & Status Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl sm:text-3xl shrink-0">{t.icon}</span>
                      <div className="min-w-0">
                        <h3 className={`font-black text-xs sm:text-sm uppercase truncate ${isCurrentTurn ? 'text-slate-950 font-black' : 'text-white'}`}>
                          {t.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {isLeader && (
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md flex items-center gap-0.5 ${
                                isCurrentTurn
                                  ? 'bg-slate-950 text-amber-400'
                                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                              }`}
                            >
                              <Crown className="w-2.5 h-2.5 fill-current" />
                              <span>Líder</span>
                            </span>
                          )}
                          {isCurrentTurn && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-slate-950 text-white animate-pulse">
                              ⚡ Na Vez
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score Display */}
                  <div className="flex items-end justify-between border-t pt-2 mt-auto border-black/10 dark:border-white/10">
                    <span className={`text-[10px] font-black uppercase ${isCurrentTurn ? 'text-slate-950/80' : 'text-indigo-300'}`}>
                      Pontuação:
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`font-mono-digits font-black text-2xl sm:text-3xl leading-none ${
                          isCurrentTurn ? 'text-slate-950 font-black' : 'text-amber-400'
                        }`}
                      >
                        {t.score}
                      </span>
                      <span className={`text-xs font-bold ${isCurrentTurn ? 'text-slate-950/70' : 'text-indigo-400'}`}>
                        /{targetScore}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN STAGE AREA (PALCO CENTRAL: DADO, CRONÔMETRO, RESULTADO) */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full relative z-30">
        <AnimatePresence mode="wait">
          {/* 1: IDLE */}
          {state.stage === 'idle' && (
            <motion.div
              key="stage-idle"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="text-center w-full p-8 sm:p-14 bg-slate-900/80 rounded-3xl border-2 border-indigo-900/60 shadow-2xl"
            >
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-amber-400/20 transform -rotate-6 border-4 border-yellow-300 text-slate-950">
                <Dices className="w-14 h-14 sm:w-20 sm:h-20 stroke-[2.5]" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white mb-2">
                AGUARDANDO O JOGO
              </h2>
              <p className="text-indigo-200 text-base sm:text-xl font-bold uppercase tracking-wider">
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
              className="text-center w-full p-8 sm:p-12 rounded-[40px] bg-white text-indigo-950 shadow-2xl border-4 border-amber-400"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-indigo-900/60 block">
                  RODADA #{state.roundNumber}
                </span>
                {isAllTeams && (
                  <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase">
                    ⚡ TODAS AO MESMO TEMPO
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center gap-4 my-3">
                <span className="text-4xl sm:text-6xl transform -rotate-3">
                  {isAllTeams ? '⚡' : activeTeam.icon}
                </span>
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-indigo-950">
                  {isAllTeams ? 'TODAS AS EQUIPES' : activeTeam.name}
                </h2>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center text-slate-950 shadow-md animate-bounce">
                  <Dices className="w-8 h-8 stroke-[2.5]" />
                </div>
                <span className="text-indigo-900/80 font-black text-lg sm:text-2xl uppercase tracking-wider">
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
              className="text-center w-full p-10 sm:p-14 rounded-[40px] bg-white text-indigo-950 shadow-2xl border-4 border-amber-400"
            >
              <div className="w-20 h-20 sm:w-28 sm:h-28 bg-amber-400 rounded-3xl flex items-center justify-center text-slate-950 shadow-xl border-4 border-yellow-300 animate-spin mx-auto my-4">
                <Dices className="w-12 h-12 sm:w-16 sm:h-16 stroke-[2.5]" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-indigo-950 animate-pulse">
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
              className="text-center w-full p-8 sm:p-12 rounded-[40px] bg-white text-indigo-950 shadow-2xl border-4 border-amber-400"
            >
              <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-indigo-400 block mb-2">
                CATEGORIA SORTEADA
              </span>

              <h3 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase text-indigo-950 tracking-tight mb-4">
                {state.categoryCode} — {state.categoryName || currentCategoryDef?.name || 'DESAFIO'}
              </h3>

              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl bg-amber-400/20 border-2 border-amber-400 text-amber-900 font-mono-digits font-black text-lg sm:text-2xl mb-4">
                ⭐ VALE +{state.roundScore || 1} {(state.roundScore || 1) === 1 ? 'PONTO' : 'PONTOS'} NO PLACAR
              </div>

              <p className="text-indigo-950 font-black text-xl sm:text-3xl uppercase tracking-wide">
                🤫 REPRESENTE SEM FALAR!
              </p>
            </motion.div>
          )}

          {/* 5: TIMER RUNNING (CRONÔMETRO GIGANTE) */}
          {state.stage === 'timer_running' && (
            <motion.div
              key="stage-timer-running"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="text-center w-full space-y-4"
            >
              {/* Top Banner: Team & Category */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-white text-indigo-950 shadow-xl border-2 border-indigo-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-3xl shadow-sm">
                    {isAllTeams ? '⚡' : activeTeam.icon}
                  </div>
                  <div className="text-left">
                    <span className="text-[11px] uppercase font-black tracking-wider text-indigo-900/60 block">
                      {isAllTeams ? 'Modo Simultâneo' : 'Vez da Equipe'}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-indigo-950 uppercase">
                      {isAllTeams ? 'TODAS AS EQUIPES' : activeTeam.name}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 rounded-2xl text-sm sm:text-base font-black uppercase bg-indigo-600 text-white shadow-sm">
                    {state.categoryCode} — {state.categoryName || 'CATEGORIA'}
                  </span>
                  <span className="px-4 py-2 rounded-2xl text-sm sm:text-base font-black uppercase bg-amber-400 text-slate-950 shadow-sm border border-amber-300 font-mono-digits">
                    ⭐ +{state.roundScore || 1} {(state.roundScore || 1) === 1 ? 'PONTO' : 'PONTOS'}
                  </span>
                </div>
              </div>

              {/* Huge Countdown Clock Display */}
              <div className="w-full bg-white rounded-[40px] p-8 sm:p-14 flex flex-col items-center justify-center shadow-2xl border-b-8 border-red-200">
                <span className="text-sm sm:text-base font-black uppercase tracking-wider text-indigo-900/60 mb-1">
                  {state.isUrgent ? '🔥 ÚLTIMOS SEGUNDOS!' : 'TEMPO RESTANTE'}
                </span>

                {/* Big Digits */}
                <h1
                  id="projector-timer-digits"
                  className={`font-mono-digits font-black tracking-tighter leading-none transition-colors my-2 text-8xl sm:text-9xl md:text-[160px] ${
                    state.isUrgent ? 'text-red-600 animate-pulse' : 'text-red-500'
                  }`}
                >
                  {formatTime(state.timeLeft)}
                </h1>

                {/* Progress Bar */}
                <div className="w-full max-w-2xl h-5 sm:h-6 bg-indigo-50 rounded-full mt-4 overflow-hidden border-2 border-indigo-100 p-0.5">
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
              className="text-center w-full p-8 sm:p-14 rounded-[40px] bg-white text-indigo-950 shadow-2xl border-4 border-emerald-500"
            >
              <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4 text-white shadow-xl shadow-emerald-500/40 animate-bounce">
                <CheckCircle className="w-12 h-12 stroke-[3]" />
              </div>

              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-emerald-600 mb-3">
                🎉 ACERTOU! PONTOS CONFIRMADOS!
              </h2>

              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 border-2 border-amber-300 shadow-md my-2 font-mono-digits font-black text-2xl sm:text-4xl text-slate-950 uppercase">
                +{state.roundScore || 1} {(state.roundScore || 1) === 1 ? 'PONTO' : 'PONTOS'} NO PLACAR ⭐
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
              className="text-center w-full p-8 sm:p-14 rounded-[40px] bg-white text-indigo-950 shadow-2xl border-4 border-red-500"
            >
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-md">
                <AlertTriangle className="w-12 h-12 stroke-[2.5]" />
              </div>

              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-red-600 mb-2">
                ⏰ TEMPO ESGOTADO!
              </h2>
              <p className="text-indigo-900/70 font-black text-base sm:text-xl uppercase tracking-wider">
                Nenhum ponto marcado nesta rodada
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
              className="text-center w-full p-8 sm:p-12 rounded-[40px] bg-white text-indigo-950 shadow-2xl border-4 border-amber-400"
            >
              <div className="w-20 h-20 bg-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-950 shadow-xl border-2 border-yellow-300">
                <Trophy className="w-12 h-12 fill-current stroke-none" />
              </div>

              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-indigo-950 mb-6">
                {state.winnerTeam
                  ? `🏆 VITÓRIA DA EQUIPE ${state.winnerTeam.name.toUpperCase()}!`
                  : '🏆 PARTIDA FINALIZADA!'}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {state.teams
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((t, idx) => (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl text-center border-2 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 border-yellow-500 shadow-xl scale-105 font-black'
                          : 'bg-indigo-50 text-indigo-950 border-indigo-100'
                      }`}
                    >
                      <span className="text-xs font-black uppercase block mb-1">
                        {idx === 0 ? '👑 1º Lugar' : `${idx + 1}º Lugar`}
                      </span>
                      <span className="text-3xl block my-1">{t.icon}</span>
                      <h4 className="font-black text-base uppercase truncate">{t.name}</h4>
                      <span className="font-mono-digits font-black text-2xl block mt-1">
                        {t.score} pts
                      </span>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
