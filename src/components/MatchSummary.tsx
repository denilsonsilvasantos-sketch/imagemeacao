import { useEffect } from 'react';
import { motion } from 'motion/react';
import { MatchState, RoundRecord } from '../types';
import { Trophy, Award, Medal, RotateCcw, Home, Clock, CheckCircle, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

interface MatchSummaryProps {
  match: MatchState;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export default function MatchSummary({
  match,
  onPlayAgain,
  onGoHome,
}: MatchSummaryProps) {
  const sortedTeams = [...match.teams].sort((a, b) => b.score - a.score);
  const winner = sortedTeams[0];
  const isTie = sortedTeams.length > 1 && sortedTeams[0].score === sortedTeams[1].score;

  useEffect(() => {
    soundManager.playSuccessFanfare();
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
    });
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 select-none" id="match-summary-screen">
      {/* Trophy & Winner Header */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center mb-8"
      >
        <div className="w-24 h-24 rounded-[32px] bg-yellow-400 border-4 border-yellow-300 flex items-center justify-center mx-auto mb-4 text-indigo-950 shadow-2xl shadow-yellow-400/30 transform -rotate-3">
          <Trophy className="w-14 h-14 fill-current stroke-none" />
        </div>

        <span className="text-xs font-black uppercase tracking-widest text-indigo-950 px-4 py-1.5 rounded-full bg-yellow-400 shadow-md">
          Partida Finalizada
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white uppercase mt-4 mb-2 tracking-tight">
          {isTie ? 'Empate Espetacular!' : `Vitória da Equipe ${winner.name}!`}
        </h1>
        <p className="text-indigo-200 text-base sm:text-lg font-bold uppercase tracking-wider">
          Parabéns a todos os participantes pela dedicação e criatividade!
        </p>
      </motion.div>

      {/* Podium Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {sortedTeams.map((team, idx) => {
          const isFirst = idx === 0;
          const isSecond = idx === 1;
          const isThird = idx === 2;

          return (
            <div
              key={team.id}
              className={`p-6 rounded-[32px] text-center flex flex-col items-center justify-between relative transition-all shadow-2xl ${
                isFirst
                  ? 'bg-white text-indigo-950 border-4 border-yellow-400 shadow-yellow-400/20 sm:scale-105'
                  : isSecond
                  ? 'bg-white/95 text-indigo-950 border-2 border-indigo-100'
                  : isThird
                  ? 'bg-white/90 text-indigo-950 border-2 border-indigo-100'
                  : 'bg-white/80 text-indigo-950'
              }`}
            >
              {/* Medal Badge */}
              <div className="mb-2">
                {isFirst ? (
                  <span className="px-3.5 py-1.5 rounded-full bg-yellow-400 text-indigo-950 text-xs font-black uppercase flex items-center gap-1 shadow-md">
                    👑 1º Lugar (Campeão)
                  </span>
                ) : isSecond ? (
                  <span className="px-3.5 py-1.5 rounded-full bg-indigo-100 text-indigo-950 text-xs font-black uppercase flex items-center gap-1 shadow-sm">
                    🥈 2º Lugar
                  </span>
                ) : isThird ? (
                  <span className="px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase flex items-center gap-1 shadow-sm">
                    🥉 3º Lugar
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-900/60 text-xs font-black uppercase">
                    {idx + 1}º Lugar
                  </span>
                )}
              </div>

              {/* Team Icon */}
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-3xl shadow-inner my-2">
                {team.icon}
              </div>

              {/* Team Name */}
              <h3 className="text-xl font-black text-indigo-950 uppercase mb-1">
                {team.name}
              </h3>

              {/* Final Score */}
              <div className="mt-3 py-2 px-6 rounded-2xl bg-indigo-50/80 border border-indigo-100 w-full">
                <span className="text-3xl font-black text-indigo-950 font-mono-digits">
                  {team.score}
                </span>
                <span className="text-[10px] font-black text-indigo-900/60 block uppercase tracking-wider">
                  {team.score === 1 ? 'Ponto Conquistado' : 'Pontos Conquistados'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Match Round Logs */}
      {match.roundHistory.length > 0 && (
        <div className="p-6 rounded-[32px] bg-white text-indigo-950 shadow-2xl mb-8">
          <h3 className="text-lg font-black text-indigo-950 uppercase tracking-tight mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span>Histórico das Rodadas ({match.roundHistory.length})</span>
          </h3>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {match.roundHistory.map((round) => (
              <div
                key={round.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs sm:text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 font-black text-indigo-400">
                    #{round.roundNumber}
                  </span>
                  <span className="font-black text-indigo-950 uppercase">
                    {round.teamName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-black uppercase">
                    Cat. {round.category}
                  </span>
                  <strong className="text-indigo-950 uppercase font-black">{round.word}</strong>
                </div>

                <div className="flex items-center gap-3">
                  {round.result === 'correct' ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-black uppercase">
                      <CheckCircle className="w-4 h-4" /> +{round.points} pt
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 font-bold uppercase">
                      <XCircle className="w-4 h-4" /> 0 pts
                    </span>
                  )}
                  <span className="text-indigo-900/50 text-xs font-mono font-bold">
                    {round.timeUsedSeconds}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onPlayAgain}
          id="btn-play-again"
          className="w-full sm:w-auto py-5 px-10 rounded-[32px] bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-xl uppercase tracking-wider shadow-2xl shadow-yellow-400/30 border-4 border-yellow-300 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-6 h-6 stroke-[3]" />
          <span>JOGAR NOVAMENTE</span>
        </button>

        <button
          onClick={onGoHome}
          id="btn-summary-home"
          className="w-full sm:w-auto py-5 px-10 rounded-[32px] bg-white/10 hover:bg-white/20 text-white font-black text-xl uppercase tracking-wider border border-white/20 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Home className="w-6 h-6 text-yellow-400" />
          <span>INÍCIO</span>
        </button>
      </div>
    </div>
  );
}
