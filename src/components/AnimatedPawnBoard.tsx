import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Team, CategoryCode } from '../types';
import { CATEGORIES } from '../data/categories';
import { Trophy, Flag, Crown, Sparkles, ChevronRight, Zap, Target } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface AnimatedPawnBoardProps {
  teams: Team[];
  boardLength?: number; // default 50
  winningScore?: number; // default 50
  activeTeamId?: string;
  lastScoredTeamId?: string;
  lastScoredPoints?: number;
  compact?: boolean;
  onSelectTeam?: (team: Team) => void;
}

const CATEGORY_ORDER: CategoryCode[] = ['P', 'O', 'A', 'D', 'L', 'M'];

export default function AnimatedPawnBoard({
  teams,
  boardLength = 50,
  winningScore = 50,
  activeTeamId,
  lastScoredTeamId,
  lastScoredPoints,
  compact = false,
  onSelectTeam,
}: AnimatedPawnBoardProps) {
  const [viewMode, setViewMode] = useState<'track' | 'ranking'>('track');
  const [animatingPawnId, setAnimatingPawnId] = useState<string | null>(null);

  // Trigger sound and animation state when a team scores
  useEffect(() => {
    if (lastScoredTeamId && lastScoredPoints && lastScoredPoints > 0) {
      setAnimatingPawnId(lastScoredTeamId);
      
      // Play a quick succession of hops for each point moved
      const hops = Math.min(lastScoredPoints, 6);
      for (let i = 0; i < hops; i++) {
        setTimeout(() => {
          soundManager.playPawnHop(i);
        }, i * 140);
      }

      const timer = setTimeout(() => {
        setAnimatingPawnId(null);
      }, hops * 160 + 600);

      return () => clearTimeout(timer);
    }
  }, [lastScoredTeamId, lastScoredPoints]);

  // Determine top score & leader
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => b.score - a.score);
  }, [teams]);

  const leader = sortedTeams[0] && sortedTeams[0].score > 0 ? sortedTeams[0] : null;

  // Generate 50 tiles with rotating categories & special landmarks
  const tiles = useMemo(() => {
    const list = [];
    for (let i = 1; i <= boardLength; i++) {
      const catCode = CATEGORY_ORDER[(i - 1) % CATEGORY_ORDER.length];
      const isMilestone = i % 10 === 0;
      const isFinish = i === boardLength;
      list.push({
        number: i,
        category: catCode,
        isMilestone,
        isFinish,
        categoryDef: CATEGORIES[catCode],
      });
    }
    return list;
  }, [boardLength]);

  // Group teams by their current board position (capped at boardLength)
  const teamsByTile = useMemo(() => {
    const map = new Map<number, Team[]>();
    teams.forEach((t) => {
      // Position 0 = Start (before tile 1)
      const pos = Math.min(Math.max(0, t.score), boardLength);
      if (!map.has(pos)) {
        map.set(pos, []);
      }
      map.get(pos)!.push(t);
    });
    return map;
  }, [teams, boardLength]);

  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-xl border-2 border-indigo-500/30 rounded-[32px] p-4 sm:p-6 shadow-2xl text-white select-none overflow-hidden relative" id="animated-pawn-board">
      {/* Background glow ambiance */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header bar: Title, Leader & Quick stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-indigo-900/60 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-yellow-500/20 rotate-3">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                Tabuleiro da Vitória
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-900/80 border border-indigo-500/30 text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                {boardLength} Casas
              </span>
            </div>
            <p className="text-xs text-indigo-200/70 font-semibold">
              A primeira equipe a cruzar a linha de chegada vence a partida!
            </p>
          </div>
        </div>

        {/* Leader badge / Team standings preview */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {leader && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 text-xs font-black">
              <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span>LÍDER: {leader.name} ({leader.score} pts)</span>
            </div>
          )}

          <div className="flex items-center bg-indigo-950/80 p-1 rounded-xl border border-indigo-800/60">
            <button
              onClick={() => setViewMode('track')}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                viewMode === 'track' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-300 hover:text-white'
              }`}
            >
              Trilha
            </button>
            <button
              onClick={() => setViewMode('ranking')}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                viewMode === 'ranking' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-300 hover:text-white'
              }`}
            >
              Placar
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: TRACK OF 50 HOUSES */}
      {viewMode === 'track' && (
        <div className="space-y-4 relative z-10">
          {/* Start Gate & Finish Line Bar Overview */}
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 text-xs font-bold">
            <div className="flex items-center gap-2 text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="uppercase text-[11px] font-black tracking-wider">Largada (Casa 0)</span>
            </div>
            <div className="flex items-center gap-2 text-amber-300">
              <Flag className="w-4 h-4 text-yellow-400" />
              <span className="uppercase text-[11px] font-black tracking-wider">Chegada (Casa {boardLength})</span>
            </div>
          </div>

          {/* 50-Tile Serpentine / Responsive Grid Track */}
          <div className="max-h-[380px] sm:max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-2.5 p-2 rounded-3xl bg-slate-900/60 border border-indigo-900/50">
              {/* Start House (Casa 0) */}
              <div className="col-span-5 sm:col-span-10 p-2.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900/80 to-slate-900/80 border border-emerald-500/40 flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">
                    0
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-emerald-400 tracking-wider block">
                      Linha de Partida
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Peões prontos para avançar
                    </span>
                  </div>
                </div>

                {/* Pawns on Start */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {(teamsByTile.get(0) || []).map((t) => (
                    <PawnBadge
                      key={t.id}
                      team={t}
                      isLeader={leader?.id === t.id}
                      isActive={activeTeamId === t.id}
                      isAnimating={animatingPawnId === t.id}
                      onSelect={() => onSelectTeam && onSelectTeam(t)}
                    />
                  ))}
                </div>
              </div>

              {/* Numbered Tiles 1 to 50 */}
              {tiles.map((tile) => {
                const teamsOnTile = teamsByTile.get(tile.number) || [];
                const hasPawns = teamsOnTile.length > 0;
                const isFinish = tile.isFinish;
                const isMilestone = tile.isMilestone;

                // Category styling
                const cat = tile.categoryDef;

                return (
                  <div
                    key={tile.number}
                    className={`min-h-[64px] sm:min-h-[74px] p-1.5 sm:p-2 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden group ${
                      isFinish
                        ? 'bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-slate-900 border-yellow-400/80 shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-400/50'
                        : isMilestone
                        ? 'bg-indigo-900/40 border-indigo-400/60 shadow-md'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-indigo-700/60'
                    }`}
                  >
                    {/* Tile Header: Number & Category code */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-[11px] sm:text-xs font-black font-mono-digits px-1.5 py-0.5 rounded-lg ${
                          isFinish
                            ? 'bg-yellow-400 text-slate-950 font-black'
                            : isMilestone
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-800/90 text-slate-300'
                        }`}
                      >
                        {tile.number}
                      </span>

                      {isFinish ? (
                        <Flag className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                      ) : (
                        <span
                          className="text-[10px] font-black px-1 rounded uppercase"
                          style={{ color: cat.color }}
                          title={`${cat.name} (${cat.code})`}
                        >
                          {cat.code}
                        </span>
                      )}
                    </div>

                    {/* Milestone badge / Finish text */}
                    {isFinish && teamsOnTile.length === 0 && (
                      <div className="text-center py-1">
                        <span className="text-[9px] font-black uppercase text-yellow-400 tracking-tight block">
                          CHEGADA 🏁
                        </span>
                      </div>
                    )}

                    {/* Pawns rendered on this tile */}
                    <div className="flex items-center gap-1 flex-wrap justify-center mt-1 z-10">
                      <AnimatePresence>
                        {teamsOnTile.map((t) => (
                          <PawnBadge
                            key={t.id}
                            team={t}
                            isLeader={leader?.id === t.id}
                            isActive={activeTeamId === t.id}
                            isAnimating={animatingPawnId === t.id}
                            onSelect={() => onSelectTeam && onSelectTeam(t)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Subtle category color line at bottom */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1 opacity-70"
                      style={{ backgroundColor: isFinish ? '#f59e0b' : cat.color }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: DETAILED RANKING & DISTANCE TO FINISH */}
      {viewMode === 'ranking' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
          {sortedTeams.map((t, idx) => {
            const distanceLeft = Math.max(0, boardLength - t.score);
            const percentProgress = Math.min(100, (t.score / boardLength) * 100);
            const isFirst = idx === 0 && t.score > 0;
            const isWinner = t.score >= boardLength;

            return (
              <div
                key={t.id}
                className={`p-4 rounded-3xl border transition-all relative overflow-hidden ${
                  isWinner
                    ? 'bg-gradient-to-br from-yellow-500/30 to-slate-900 border-yellow-400 shadow-xl shadow-yellow-500/20'
                    : isFirst
                    ? 'bg-gradient-to-br from-indigo-900/60 to-slate-900 border-indigo-400/80 shadow-lg'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-indigo-400/40 flex items-center justify-center text-2xl shadow-inner">
                        {t.icon}
                      </div>
                      {isFirst && (
                        <div className="absolute -top-2 -right-2 bg-yellow-400 text-slate-950 p-1 rounded-full shadow-md">
                          <Crown className="w-3.5 h-3.5 fill-current" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-white uppercase text-sm truncate max-w-[140px]">
                        {t.name}
                      </h4>
                      <span className="text-xs text-indigo-300 font-bold">
                        Posição: Casa {Math.min(t.score, boardLength)} de {boardLength}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black font-mono-digits text-yellow-400 block">
                      {t.score}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      {t.score === 1 ? 'Ponto' : 'Pontos'}
                    </span>
                  </div>
                </div>

                {/* Progress bar to finish line */}
                <div className="space-y-1 mt-2">
                  <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 p-0.5 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isWinner
                          ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                          : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                      }`}
                      style={{ width: `${percentProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                    <span>Progresso: {Math.round(percentProgress)}%</span>
                    <span>
                      {isWinner ? (
                        <strong className="text-yellow-400 font-black">VENCEDOR! 🏆</strong>
                      ) : (
                        `Faltam ${distanceLeft} casas`
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Custom 3D Animated Pawn Component
// ----------------------------------------------------
interface PawnBadgeProps {
  key?: string | number;
  team: Team;
  isLeader?: boolean;
  isActive?: boolean;
  isAnimating?: boolean;
  onSelect?: () => void;
}

function PawnBadge({ team, isLeader, isActive, isAnimating, onSelect }: PawnBadgeProps) {
  return (
    <motion.div
      initial={{ scale: 0.6, y: -20, opacity: 0 }}
      animate={
        isAnimating
          ? {
              scale: [1, 1.4, 1.1, 1.3, 1],
              y: [0, -26, 0, -18, 0],
              rotate: [0, -12, 12, -6, 0],
              transition: { duration: 0.8, ease: 'easeOut' },
            }
          : {
              scale: 1,
              y: 0,
              opacity: 1,
            }
      }
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.25, zIndex: 30 }}
      onClick={onSelect}
      className={`relative cursor-pointer transition-shadow z-20 group ${
        isActive ? 'ring-2 ring-yellow-400 rounded-full' : ''
      }`}
      title={`${team.name}: ${team.score} pontos`}
    >
      {/* 3D Pawn Base + Icon */}
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-base font-black shadow-lg border-2 border-white/80 transform hover:-translate-y-1 transition-transform bg-gradient-to-b from-indigo-500 to-indigo-800 ${
          isLeader ? 'ring-2 ring-amber-400 shadow-amber-500/50' : 'shadow-black/50'
        }`}
      >
        <span>{team.icon || '♟️'}</span>
      </div>

      {/* Floating Crown for Leader */}
      {isLeader && (
        <div className="absolute -top-2.5 -right-1 bg-yellow-400 text-slate-950 p-0.5 rounded-full shadow-md pointer-events-none">
          <Crown className="w-2.5 h-2.5 fill-current" />
        </div>
      )}

      {/* Jumping Particle Effect */}
      {isAnimating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 2.5] }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-yellow-400/40 rounded-full blur-sm pointer-events-none"
        />
      )}
    </motion.div>
  );
}
