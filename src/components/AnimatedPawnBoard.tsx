import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Team, CategoryCode } from '../types';
import { CATEGORIES } from '../data/categories';
import {
  Trophy,
  Flag,
  Crown,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CornerDownRight,
  CornerDownLeft,
  ArrowRight,
  ArrowLeft,
  Zap,
  Target,
  Compass,
} from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Generate all tiles with categories & milestones
  const allTiles = useMemo(() => {
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

  // Group teams by their current board position (0 to boardLength)
  const teamsByTile = useMemo(() => {
    const map = new Map<number, Team[]>();
    teams.forEach((t) => {
      const pos = Math.min(Math.max(0, t.score), boardLength);
      if (!map.has(pos)) {
        map.set(pos, []);
      }
      map.get(pos)!.push(t);
    });
    return map;
  }, [teams, boardLength]);

  // Create serpentine path rows (10 tiles per row)
  // Row 0: 1 -> 10 (Left to Right)
  // Row 1: 11 -> 20 (Right to Left in snake layout)
  // Row 2: 21 -> 30 (Left to Right)
  // Row 3: 31 -> 40 (Right to Left)
  // Row 4: 41 -> 50 (Left to Right)
  const serpentineRows = useMemo(() => {
    const rowSize = 10;
    const rows = [];
    for (let start = 0; start < allTiles.length; start += rowSize) {
      const rowTiles = allTiles.slice(start, start + rowSize);
      const rowIndex = Math.floor(start / rowSize);
      const isReversed = rowIndex % 2 === 1; // Odd rows travel right-to-left
      const displayedTiles = isReversed ? [...rowTiles].reverse() : rowTiles;
      const isLastRow = start + rowSize >= allTiles.length;

      rows.push({
        rowIndex,
        isReversed,
        isLastRow,
        tiles: displayedTiles,
        firstTileNum: rowTiles[0]?.number || 1,
        lastTileNum: rowTiles[rowTiles.length - 1]?.number || boardLength,
      });
    }
    return rows;
  }, [allTiles, boardLength]);

  return (
    <div
      ref={containerRef}
      className={`w-full bg-slate-950/95 backdrop-blur-2xl border-2 border-indigo-500/40 rounded-[32px] p-3 sm:p-5 md:p-6 shadow-2xl text-white select-none relative overflow-hidden ${
        compact ? 'p-2.5 sm:p-3.5 rounded-2xl' : ''
      }`}
      id="animated-pawn-board"
    >
      {/* Dynamic atmospheric ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)] pointer-events-none" />

      {/* Header bar: Title, Trail Legend, Leader & Mode Switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-indigo-900/60 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-yellow-500/20 rotate-3 shrink-0">
            <Compass className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                Caminho do Tabuleiro
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-900/90 border border-indigo-500/40 text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                {boardLength} Casas Sinuosas
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 font-medium hidden sm:block">
              Trilha conectada com peões em tempo real até a vitória!
            </p>
          </div>
        </div>

        {/* Legend / Category Color Codes */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-bold">
          <span className="text-slate-400 mr-1 uppercase text-[10px]">Categorias:</span>
          {CATEGORY_ORDER.map((code) => {
            const cat = CATEGORIES[code];
            return (
              <span
                key={code}
                className="px-1.5 py-0.5 rounded text-[10px] font-black"
                style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                title={`${cat.name} (${cat.code})`}
              >
                {code}
              </span>
            );
          })}
        </div>

        {/* Leader Badge & Tab Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {leader && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black shadow-sm">
              <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="truncate max-w-[130px] sm:max-w-[160px]">
                {leader.icon} {leader.name} ({leader.score} pts)
              </span>
            </div>
          )}

          <div className="flex items-center bg-indigo-950/90 p-1 rounded-xl border border-indigo-800/60">
            <button
              onClick={() => setViewMode('track')}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                viewMode === 'track' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-300 hover:text-white'
              }`}
            >
              Caminho
            </button>
            <button
              onClick={() => setViewMode('ranking')}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                viewMode === 'ranking' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-300 hover:text-white'
              }`}
            >
              Placar
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: WINDING SERPENTINE PATH (O CAMINHO DO TABULEIRO) */}
      {viewMode === 'track' && (
        <div className="space-y-3 relative z-10">
          {/* Start Gate & Finish Podium Banner */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900/80 to-amber-950/80 border border-indigo-800/50 text-xs font-bold shadow-inner">
            <div className="flex items-center gap-2 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="uppercase text-[11px] font-black tracking-wider">
                🚩 Largada (Casa 0)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-300 text-[11px] font-semibold hidden md:flex">
              <span>Siga as setas do percurso</span>
              <span className="animate-pulse">➔ ⤸ ⬸ ⤹ ➔</span>
            </div>
            <div className="flex items-center gap-2 text-amber-300">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="uppercase text-[11px] font-black tracking-wider">
                🏆 Chegada (Casa {boardLength})
              </span>
            </div>
          </div>

          {/* Serpentine Road Viewport */}
          <div className="max-h-[480px] sm:max-h-[560px] overflow-y-auto pr-1.5 custom-scrollbar space-y-3">
            {/* Casa 0 - Portal de Largada */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900/90 to-indigo-950/90 border-2 border-emerald-500/50 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center font-black text-sm shadow-md shadow-emerald-500/30">
                  0
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-emerald-300 tracking-wider">
                      Portal de Largada
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 border border-emerald-600/30 font-bold">
                      Início
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Peões no ponto inicial aguardando o dado
                  </span>
                </div>
              </div>

              {/* Pawns waiting at start (Casa 0) */}
              <div className="flex items-center gap-2 flex-wrap justify-end min-h-[36px] w-full sm:w-auto bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Na Largada:</span>
                {(teamsByTile.get(0) || []).length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">Todos já avançaram! 🚀</span>
                ) : (
                  (teamsByTile.get(0) || []).map((t) => (
                    <PawnBadge
                      key={t.id}
                      team={t}
                      isLeader={leader?.id === t.id}
                      isActive={activeTeamId === t.id}
                      isAnimating={animatingPawnId === t.id}
                      onSelect={() => onSelectTeam && onSelectTeam(t)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Path Connection Line to First Tile */}
            <div className="flex items-center justify-center py-0.5">
              <div className="flex items-center gap-1.5 text-emerald-400/70 text-[11px] font-black uppercase tracking-widest bg-slate-900/70 px-3 py-0.5 rounded-full border border-emerald-500/20">
                <span>Entrando na Trilha</span>
                <span className="animate-bounce">↓</span>
              </div>
            </div>

            {/* Serpentine Rows (Snake Path) */}
            {serpentineRows.map((row, rowIdx) => {
              const isEven = row.rowIndex % 2 === 0;
              const isReversed = row.isReversed;
              const hasNextRow = rowIdx < serpentineRows.length - 1;

              return (
                <div key={row.rowIndex} className="relative">
                  {/* Row Path Container */}
                  <div
                    className={`relative p-2 sm:p-3 rounded-3xl border-2 transition-all ${
                      isEven
                        ? 'bg-slate-900/70 border-indigo-900/70 shadow-md'
                        : 'bg-slate-900/90 border-indigo-800/80 shadow-md'
                    }`}
                  >
                    {/* Road Track Header Direction Indicator */}
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 pb-1.5 border-b border-slate-800/80 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span>
                          Trecho {row.firstTileNum} a {row.lastTileNum}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-indigo-300">
                        <span>Sentido do Caminho:</span>
                        {isReversed ? (
                          <span className="flex items-center font-mono font-bold text-amber-300">
                            Direita para Esquerda <ArrowLeft className="w-3 h-3 ml-1" />
                          </span>
                        ) : (
                          <span className="flex items-center font-mono font-bold text-emerald-300">
                            Esquerda para Direita <ArrowRight className="w-3 h-3 ml-1" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stepping Stones / Tiles Grid */}
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-2.5 relative">
                      {/* Background connected road strip */}
                      <div className="absolute top-1/2 left-4 right-4 h-1 bg-indigo-500/20 -translate-y-1/2 rounded-full pointer-events-none z-0 hidden sm:block" />

                      {row.tiles.map((tile, tileIdx) => {
                        const teamsOnTile = teamsByTile.get(tile.number) || [];
                        const hasPawns = teamsOnTile.length > 0;
                        const isFinish = tile.isFinish;
                        const isMilestone = tile.isMilestone;
                        const cat = tile.categoryDef;

                        return (
                          <div
                            key={tile.number}
                            className={`min-h-[70px] sm:min-h-[82px] p-1.5 rounded-2xl border-2 transition-all flex flex-col justify-between relative overflow-hidden group shadow-md select-none z-10 ${
                              isFinish
                                ? 'bg-gradient-to-br from-amber-500/40 via-yellow-500/25 to-slate-900 border-amber-400 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/60'
                                : isMilestone
                                ? 'bg-gradient-to-b from-indigo-900/60 to-slate-950 border-indigo-400/70 shadow-lg'
                                : 'bg-slate-950/90 border-slate-800/90 hover:border-indigo-600/70'
                            }`}
                          >
                            {/* Stepping Stone Number & Category Code */}
                            <div className="flex items-center justify-between w-full">
                              <span
                                className={`text-[11px] sm:text-xs font-black font-mono-digits px-1.5 py-0.5 rounded-lg ${
                                  isFinish
                                    ? 'bg-amber-400 text-slate-950 font-black'
                                    : isMilestone
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-slate-800/90 text-slate-200'
                                }`}
                              >
                                {tile.number}
                              </span>

                              {isFinish ? (
                                <Flag className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                              ) : (
                                <span
                                  className="text-[10px] font-black px-1 rounded uppercase tracking-wider"
                                  style={{
                                    color: cat.color,
                                    backgroundColor: `${cat.color}20`,
                                  }}
                                  title={`${cat.name} (${cat.code})`}
                                >
                                  {cat.code}
                                </span>
                              )}
                            </div>

                            {/* Finish Text or Milestone Star */}
                            {isFinish && teamsOnTile.length === 0 && (
                              <div className="text-center py-0.5">
                                <span className="text-[8px] sm:text-[9px] font-black uppercase text-amber-300 tracking-tight block">
                                  CHEGADA 🏁
                                </span>
                              </div>
                            )}

                            {isMilestone && !isFinish && teamsOnTile.length === 0 && (
                              <div className="text-center py-0.5">
                                <span className="text-[8px] font-black uppercase text-indigo-300">
                                  ★ {tile.number}
                                </span>
                              </div>
                            )}

                            {/* Pawns Rendered on this Stepping Stone */}
                            <div className="flex items-center gap-1 flex-wrap justify-center mt-1 z-20 min-h-[28px]">
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

                            {/* 3D Stepping Stone Bottom Color Lip */}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-xl"
                              style={{
                                backgroundColor: isFinish ? '#f59e0b' : cat.color,
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Serpentine Turn Connector (Curva de Conexão entre Linhas) */}
                  {hasNextRow && (
                    <div className="flex items-center justify-center my-1 relative">
                      {isEven ? (
                        // Turn from Right to Left for next row
                        <div className="flex items-center justify-end w-full pr-6 sm:pr-10">
                          <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-700/60 px-3 py-1 rounded-full text-[10px] font-black uppercase text-amber-300 shadow-md">
                            <span>Curva da Trilha</span>
                            <CornerDownLeft className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                        </div>
                      ) : (
                        // Turn from Left to Right for next row
                        <div className="flex items-center justify-start w-full pl-6 sm:pl-10">
                          <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-700/60 px-3 py-1 rounded-full text-[10px] font-black uppercase text-emerald-300 shadow-md">
                            <CornerDownRight className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Curva da Trilha</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Final Victory Castle / Podium Announcement */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-amber-400/80 text-center shadow-xl">
              <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-xs sm:text-sm uppercase tracking-wide">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Pódio de Chegada — Alcance a Casa {boardLength} para Vencer!</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: DETAILED RANKING & PROGRESS TABLE */}
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
                className={`p-4 rounded-3xl border-2 transition-all relative overflow-hidden ${
                  isWinner
                    ? 'bg-gradient-to-br from-amber-500/30 to-slate-900 border-amber-400 shadow-xl shadow-amber-500/20'
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
                        <div className="absolute -top-2 -right-2 bg-amber-400 text-slate-950 p-1 rounded-full shadow-md">
                          <Crown className="w-3.5 h-3.5 fill-current" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-white uppercase text-sm truncate max-w-[140px]">
                        {t.name}
                      </h4>
                      <span className="text-xs text-indigo-300 font-bold">
                        Casa {Math.min(t.score, boardLength)} de {boardLength}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black font-mono-digits text-amber-400 block">
                      {t.score}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      {t.score === 1 ? 'Ponto' : 'Pontos'}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 mt-2">
                  <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 p-0.5 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isWinner
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400'
                          : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                      }`}
                      style={{ width: `${percentProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                    <span>Progresso: {Math.round(percentProgress)}%</span>
                    <span>
                      {isWinner ? (
                        <strong className="text-amber-400 font-black">VENCEDOR! 🏆</strong>
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
// Custom 3D Animated Pawn Component with Hop Physics
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
              scale: [1, 1.45, 1.1, 1.35, 1],
              y: [0, -28, 0, -18, 0],
              rotate: [0, -14, 14, -6, 0],
              transition: { duration: 0.85, ease: 'easeOut' },
            }
          : {
              scale: 1,
              y: 0,
              opacity: 1,
            }
      }
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.25, zIndex: 40 }}
      onClick={onSelect}
      className={`relative cursor-pointer transition-shadow z-20 group ${
        isActive ? 'ring-2 ring-amber-400 rounded-full' : ''
      }`}
      title={`${team.name}: ${team.score} pontos (Clique para selecionar)`}
    >
      {/* 3D Pawn Base + Icon */}
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-base font-black shadow-lg border-2 border-white/90 transform hover:-translate-y-1 transition-transform bg-gradient-to-b from-indigo-500 via-indigo-700 to-indigo-950 ${
          isLeader ? 'ring-2 ring-amber-400 shadow-amber-500/60' : 'shadow-black/60'
        }`}
        style={{
          boxShadow: isLeader
            ? '0 0 14px rgba(251, 191, 36, 0.6)'
            : '0 4px 8px rgba(0,0,0,0.5)',
        }}
      >
        <span>{team.icon || '♟️'}</span>
      </div>

      {/* Floating Crown for Leader */}
      {isLeader && (
        <div className="absolute -top-2.5 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow-md pointer-events-none">
          <Crown className="w-2.5 h-2.5 fill-current" />
        </div>
      )}

      {/* Jumping Particle Sparkle */}
      {isAnimating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 2.2, 2.8] }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0 bg-amber-400/50 rounded-full blur-sm pointer-events-none"
        />
      )}
    </motion.div>
  );
}

