import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, CheckCircle, XCircle, AlertTriangle, BellRing, Sparkles, Users, Crown } from 'lucide-react';
import { soundManager } from '../utils/audio';
import confetti from 'canvas-confetti';
import { syncService } from '../utils/syncChannel';
import { Team, RoundMode } from '../types';

interface GameTimerProps {
  initialSeconds?: number;
  word: string;
  categoryLabel: string;
  categoryCode: string;
  categoryColor: string;
  categoryBg: string;
  teamName: string;
  teamColor: string;
  teamIcon: string;
  teamId?: string;
  teams?: Team[];
  roundMode?: RoundMode;
  scoreValue: number;
  projectorMode?: boolean;
  onSuccess: (timeUsed: number, scoringTeamId?: string) => void;
  onTimeout: () => void;
  onAbort: () => void;
}

export default function GameTimer({
  initialSeconds = 80,
  word,
  categoryLabel,
  categoryCode,
  categoryColor,
  categoryBg,
  teamName,
  teamColor,
  teamIcon,
  teamId,
  teams = [],
  roundMode = 'single_team',
  scoreValue = 1,
  projectorMode = false,
  onSuccess,
  onTimeout,
  onAbort,
}: GameTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [showConfirmSuccess, setShowConfirmSuccess] = useState(false);
  const [showConfirmAbort, setShowConfirmAbort] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Formatting seconds as M:SS (e.g. 1:20, 0:09)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isUrgent = timeLeft <= 10 && timeLeft > 0;

  useEffect(() => {
    syncService.broadcast({
      type: 'TIMER_START',
      timeLeft: initialSeconds,
      totalTime: initialSeconds,
    });
  }, [initialSeconds]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsTimedOut(true);
            soundManager.playTimeoutAlarm();
            syncService.broadcast({
              type: 'TIMER_TICK',
              timeLeft: 0,
              isUrgent: true,
            });
            onTimeout();
            return 0;
          }

          const nextVal = prev - 1;
          const nextUrgent = nextVal <= 10 && nextVal > 0;

          syncService.broadcast({
            type: 'TIMER_TICK',
            timeLeft: nextVal,
            isUrgent: nextUrgent,
          });

          // Sound cues
          if (prev <= 11) {
            soundManager.playUrgentTick();
          } else {
            soundManager.playTimerTick();
          }

          return nextVal;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, onTimeout]);

  // Handle ACERTOU button click
  const handleOpenSuccessModal = () => {
    setIsRunning(false);
    setShowConfirmSuccess(true);
  };

  const handleConfirmSuccess = (chosenTeamId?: string) => {
    setShowConfirmSuccess(false);
    soundManager.playSuccessFanfare();

    // Fire joyful celebratory confetti!
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#10b981', '#38bdf8', '#ec4899', '#8b5cf6'],
    });

    const timeUsed = initialSeconds - timeLeft;
    onSuccess(timeUsed, chosenTeamId || teamId);
  };

  const handleCancelSuccess = () => {
    setShowConfirmSuccess(false);
    setIsRunning(true);
  };

  // Handle ENCERRAR TEMPO click
  const handleOpenAbortModal = () => {
    setIsRunning(false);
    setShowConfirmAbort(true);
  };

  const handleConfirmAbort = () => {
    setShowConfirmAbort(false);
    onAbort();
  };

  const handleCancelAbort = () => {
    setShowConfirmAbort(false);
    setIsRunning(true);
  };

  const progressPercent = ((initialSeconds - timeLeft) / initialSeconds) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center select-none" id="active-game-timer">
      {/* Top Banner: Turn & Category in Play in Vibrant Palette style */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-[24px] bg-white text-indigo-950 shadow-xl mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yellow-400 flex items-center justify-center text-2xl shadow-md transform -rotate-3">
            {roundMode === 'all_teams' ? '⚡' : teamIcon || '🦁'}
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-900/60 block">
              {roundMode === 'all_teams' ? 'Dinâmica Simultânea' : 'Vez da Equipe'}
            </span>
            <h3 className="text-xl font-black text-indigo-950 uppercase">
              {roundMode === 'all_teams' ? 'Todas as Equipes Disputam' : teamName}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-4 py-2 rounded-2xl text-xs font-black uppercase bg-indigo-600 text-white shadow-md">
            {categoryCode} — {categoryLabel}
          </span>
          <span className="px-4 py-2 rounded-2xl text-sm font-black uppercase bg-yellow-400 text-indigo-950 shadow-md border-2 border-yellow-300">
            ⭐ +{scoreValue} {scoreValue === 1 ? 'Casa' : 'Casas'}
          </span>
        </div>
      </div>

      {/* Big Word Card in Floating White Canvas with Tilted Badge */}
      <div className="w-full text-center p-8 sm:p-12 pt-14 sm:pt-16 rounded-[48px] bg-white text-indigo-950 shadow-2xl relative mb-6">
        {/* Floating Tilted Category Badge */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 sm:w-18 sm:h-18 bg-yellow-400 rounded-2xl border-4 border-indigo-950 flex items-center justify-center shadow-xl rotate-3">
          <span className="text-indigo-950 text-2xl sm:text-3xl font-black">
            {categoryCode}
          </span>
        </div>

        <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-indigo-400 mb-2 mt-2">
          PALAVRA EM JOGO:
        </p>

        <h1
          id="active-target-word"
          className={`font-black tracking-tight text-indigo-950 uppercase drop-shadow-sm ${
            projectorMode
              ? 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl py-2'
              : 'text-4xl sm:text-5xl md:text-6xl py-2'
          }`}
        >
          {word}
        </h1>

        <p className="text-indigo-900/60 font-black text-base sm:text-lg uppercase tracking-wider mt-2">
          🤫 Represente sem falar!
        </p>
      </div>

      {/* High-Contrast Digital Countdown Timer Card */}
      <div className="w-full max-w-md bg-white rounded-[32px] p-6 sm:p-8 flex flex-col items-center justify-center shadow-2xl border-b-8 border-red-200 relative overflow-hidden mb-6">
        <span className="text-xs font-black uppercase tracking-widest text-indigo-900/50 mb-2">
          {isTimedOut
            ? 'TEMPO ESGOTADO'
            : isUrgent
            ? 'ÚLTIMOS SEGUNDOS!'
            : 'TEMPO RESTANTE'}
        </span>

        {/* Big Digital Monospace Display */}
        <span
          id="timer-digits"
          className={`font-mono-digits font-black tracking-tighter leading-none transition-colors ${
            projectorMode
              ? 'text-7xl sm:text-8xl md:text-9xl'
              : 'text-6xl sm:text-7xl md:text-8xl'
          } ${
            isTimedOut
              ? 'text-red-600 animate-pulse'
              : isUrgent
              ? 'text-red-500 animate-bounce'
              : 'text-red-500'
          }`}
        >
          {formatTime(timeLeft)}
        </span>

        {/* Linear Progress Bar */}
        <div className="w-full h-3.5 bg-indigo-50 rounded-full mt-6 overflow-hidden border border-indigo-100">
          <div
            className={`h-full transition-all duration-300 ${
              isUrgent ? 'bg-red-500 animate-pulse' : 'bg-red-500'
            }`}
            style={{ width: `${100 - progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Action Buttons */}
      {!isTimedOut ? (
        <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ACERTOU Button */}
          <button
            onClick={handleOpenSuccessModal}
            id="btn-round-acertou"
            className="flex items-center justify-center gap-3 px-8 py-5 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-2xl shadow-xl shadow-emerald-500/25 uppercase tracking-wide transition-all cursor-pointer border-2 border-emerald-400 order-1"
          >
            <CheckCircle className="w-7 h-7 stroke-[3]" />
            <span>ACERTOU!</span>
          </button>

          {/* ENCERRAR TEMPO Button */}
          <button
            onClick={handleOpenAbortModal}
            id="btn-round-encerrar"
            className="flex items-center justify-center gap-2 px-6 py-5 rounded-3xl bg-white hover:bg-slate-100 text-slate-600 font-black text-lg uppercase shadow-lg border-2 border-slate-200 transition-all cursor-pointer order-2"
          >
            <XCircle className="w-5 h-5 text-slate-400" />
            <span>ENCERRAR TEMPO</span>
          </button>
        </div>
      ) : (
        /* Timeout state button */
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="flex items-center gap-2 text-yellow-400 font-black text-2xl mb-4 animate-bounce">
            <BellRing className="w-8 h-8" />
            <span>TEMPO ESGOTADO!</span>
          </div>
          <button
            onClick={onAbort}
            id="btn-voltar-ao-dado"
            className="w-full py-5 px-8 rounded-3xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-xl uppercase tracking-wider shadow-2xl shadow-yellow-400/30 border-4 border-yellow-300 transition-all cursor-pointer"
          >
            VOLTAR AO DADO (0 PONTOS)
          </button>
        </div>
      )}

      {/* Confirmation Modal: Acerto em equipe (Suporta "Todas as Equipes" e "Equipe Individual") */}
      <AnimatePresence>
        {showConfirmSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg p-6 sm:p-8 rounded-[36px] bg-white text-indigo-950 shadow-2xl text-center border-4 border-emerald-500 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle className="w-10 h-10 stroke-[3]" />
              </div>

              {roundMode === 'all_teams' ? (
                <>
                  <h2 className="text-2xl sm:text-3xl font-black text-indigo-950 uppercase mb-1">
                    Qual equipe acertou?
                  </h2>
                  <p className="text-indigo-900/70 text-xs sm:text-sm font-semibold mb-6">
                    Clique na equipe que acertou a mímica de <strong className="text-indigo-950 font-black">"{word}"</strong> para avançar <strong>+{scoreValue} {scoreValue === 1 ? 'casa' : 'casas'}</strong> no tabuleiro:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleConfirmSuccess(t.id)}
                        className="p-4 rounded-2xl bg-indigo-50 hover:bg-emerald-500 hover:text-white border-2 border-indigo-100 hover:border-emerald-600 transition-all flex items-center gap-3 text-left group cursor-pointer shadow-sm"
                      >
                        <span className="text-2xl sm:text-3xl p-1 bg-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                          {t.icon}
                        </span>
                        <div className="flex-1 overflow-hidden">
                          <span className="text-sm font-black uppercase text-indigo-950 group-hover:text-white block truncate">
                            {t.name}
                          </span>
                          <span className="text-xs text-indigo-900/60 group-hover:text-emerald-100 font-bold block">
                            Casa {t.score} → {t.score + scoreValue}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleCancelSuccess}
                    id="btn-cancel-acertou"
                    className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Voltar ao Cronômetro
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl sm:text-3xl font-black text-indigo-950 uppercase mb-2">
                    A equipe acertou?
                  </h2>
                  <p className="text-indigo-900/70 text-sm font-semibold mb-6">
                    Confirmar que a equipe <strong className="text-indigo-950 font-black">{teamName}</strong> acertou a palavra{' '}
                    <strong className="text-indigo-950 font-black">"{word}"</strong> e avança{' '}
                    <strong className="text-emerald-600 font-black">+{scoreValue} {scoreValue === 1 ? 'casa' : 'casas'}</strong> no tabuleiro.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleConfirmSuccess(teamId)}
                      id="btn-confirm-acertou"
                      className="py-4 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                    >
                      SIM, ACERTOU!
                    </button>
                    <button
                      onClick={handleCancelSuccess}
                      id="btn-cancel-acertou"
                      className="py-4 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-base uppercase tracking-wider transition-all cursor-pointer"
                    >
                      CONTINUAR
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal: Tem certeza que deseja encerrar o tempo? */}
      <AnimatePresence>
        {showConfirmAbort && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 sm:p-8 rounded-[32px] bg-white text-indigo-950 shadow-2xl text-center border-4 border-yellow-400"
            >
              <div className="w-16 h-16 rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-10 h-10 stroke-[2.5]" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-indigo-950 uppercase mb-2">
                Encerrar o tempo?
              </h2>
              <p className="text-indigo-900/80 text-sm font-bold mb-1">
                O tempo ainda não acabou.
              </p>
              <p className="text-indigo-900/60 text-xs mb-6 font-semibold">
                Se encerrar agora, a rodada será finalizada sem avanço de peões (0 pontos).
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCancelAbort}
                  id="btn-abort-continuar"
                  className="py-4 px-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-sm uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  CONTINUAR JOGO
                </button>
                <button
                  onClick={handleConfirmAbort}
                  id="btn-abort-encerrar"
                  className="py-4 px-4 rounded-2xl bg-red-100 hover:bg-red-200 text-red-600 font-black text-sm uppercase tracking-wider transition-all cursor-pointer"
                >
                  ENCERRAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

