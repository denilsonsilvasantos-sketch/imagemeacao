import { useState } from 'react';
import { motion } from 'motion/react';
import { Team, Theme, AgeRange, RoundMode } from '../types';
import {
  Users,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Play,
  ArrowLeft,
  Shield,
  Sparkles,
  Zap,
  Target,
  Trophy,
  HelpCircle,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface MatchSetupProps {
  theme: Theme;
  ageRange: AgeRange;
  initialRoundMode?: RoundMode;
  initialBoardLength?: number;
  onConfirmTeams: (
    teams: Team[],
    roundDurationSeconds: number,
    roundMode: RoundMode,
    targetScore: number
  ) => void;
  onBack: () => void;
}

const PRESET_TEAMS = [
  { name: 'Leões', icon: '🦁', color: 'from-amber-500 to-orange-600' },
  { name: 'Águias', icon: '🦅', color: 'from-sky-500 to-blue-600' },
  { name: 'Falcões', icon: '🟨', color: 'from-yellow-500 to-amber-600' },
  { name: 'Tigres', icon: '🐯', color: 'from-rose-500 to-red-600' },
  { name: 'Lobos', icon: '🐺', color: 'from-slate-600 to-slate-800' },
  { name: 'Guerreiros', icon: '🛡️', color: 'from-emerald-500 to-teal-600' },
  { name: 'Ovelhas', icon: '🐑', color: 'from-purple-500 to-indigo-600' },
  { name: 'Estrelas', icon: '⭐', color: 'from-fuchsia-500 to-pink-600' },
  { name: 'Tochas', icon: '🔥', color: 'from-orange-500 to-red-600' },
  { name: 'Coroas', icon: '👑', color: 'from-amber-400 to-yellow-600' },
  { name: 'Rochas', icon: '🪨', color: 'from-stone-500 to-stone-700' },
  { name: 'Arcas', icon: '⛵', color: 'from-cyan-500 to-blue-700' },
];

export default function MatchSetup({
  theme,
  ageRange,
  initialRoundMode = 'single_team',
  initialBoardLength = 50,
  onConfirmTeams,
  onBack,
}: MatchSetupProps) {
  const [teams, setTeams] = useState<Team[]>([
    {
      id: 'team-1',
      name: 'Equipe 1',
      score: 0,
      color: 'from-amber-500 to-orange-600',
      icon: '🦁',
      roundsPlayed: 0,
      correctGuesses: 0,
      wrongGuesses: 0,
    },
    {
      id: 'team-2',
      name: 'Equipe 2',
      score: 0,
      color: 'from-sky-500 to-blue-600',
      icon: '🦅',
      roundsPlayed: 0,
      correctGuesses: 0,
      wrongGuesses: 0,
    },
  ]);

  const [roundDuration, setRoundDuration] = useState<number>(80); // 80s = 1:20
  const [roundMode, setRoundMode] = useState<RoundMode>(initialRoundMode);
  const [boardLength, setBoardLength] = useState<number>(initialBoardLength || 50);

  const handleAddTeam = () => {
    if (teams.length >= 20) return; // reasonable technical ceiling
    soundManager.playClick();
    const nextNumber = teams.length + 1;
    const preset = PRESET_TEAMS[(nextNumber - 1) % PRESET_TEAMS.length];
    const newTeam: Team = {
      id: `team-${Date.now()}-${nextNumber}`,
      name: `Equipe ${nextNumber}`,
      score: 0,
      color: preset.color,
      icon: preset.icon,
      roundsPlayed: 0,
      correctGuesses: 0,
      wrongGuesses: 0,
    };
    setTeams([...teams, newTeam]);
  };

  const handleRemoveTeam = (id: string) => {
    if (teams.length <= 1) return;
    soundManager.playClick();
    setTeams(teams.filter((t) => t.id !== id));
  };

  const handleUpdateTeamName = (id: string, newName: string) => {
    setTeams(
      teams.map((t) => (t.id === id ? { ...t, name: newName } : t))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    soundManager.playClick();
    const updated = [...teams];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setTeams(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= teams.length - 1) return;
    soundManager.playClick();
    const updated = [...teams];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setTeams(updated);
  };

  const handleStartMatch = () => {
    soundManager.playClick();
    onConfirmTeams(teams, roundDuration, roundMode, boardLength);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-10 select-none" id="match-setup-screen">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="flex items-center gap-2 text-indigo-200 hover:text-white font-black text-sm uppercase tracking-wider transition-colors cursor-pointer bg-white/10 px-4 py-2 rounded-2xl border border-white/20 backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4 text-yellow-400" />
          <span>Voltar à seleção</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="bg-white/10 px-3.5 py-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
            <span className="text-yellow-400 text-xs font-black uppercase">Tema: {theme.name}</span>
          </div>
          <div className="bg-indigo-600/70 px-3.5 py-1.5 rounded-2xl border border-indigo-400/50 shadow-md">
            <span className="text-white text-xs font-black uppercase">{ageRange.name}</span>
          </div>
        </div>
      </div>

      {/* Screen Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight">
          Configuração da Partida
        </h1>
        <p className="text-indigo-200 text-sm sm:text-base font-bold uppercase tracking-wider mt-1">
          Defina o modo de mímica, o tabuleiro e as equipes
        </p>
      </div>

      {/* 1. MODO DE MÍMICA (UMA EQUIPE POR VEZ VS TODAS AO MESMO TEMPO) */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white text-indigo-950 shadow-2xl mb-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-100">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-indigo-950 uppercase tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-500" />
              <span>Modo de Rodada / Mímica</span>
            </h3>
            <p className="text-indigo-900/60 text-xs font-bold uppercase tracking-wider">
              Escolha a dinâmica de adivinhação da partida
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option A: Uma equipe por vez */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setRoundMode('single_team');
            }}
            className={`p-5 rounded-3xl border-3 text-left transition-all cursor-pointer relative overflow-hidden ${
              roundMode === 'single_team'
                ? 'bg-indigo-50 border-indigo-600 ring-4 ring-indigo-200 shadow-xl'
                : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">👤</span>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  roundMode === 'single_team' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {roundMode === 'single_team' ? 'ATIVO' : 'SELECIONAR'}
              </span>
            </div>
            <h4 className="text-lg font-black text-indigo-950 uppercase">
              Uma Equipe por Vez
            </h4>
            <p className="text-xs text-indigo-900/70 mt-1 font-medium leading-relaxed">
              Modo tradicional por turnos. Apenas a equipe da vez faz e adivinha a mímica/desenho durante o tempo.
            </p>
          </button>

          {/* Option B: Todas ao mesmo tempo */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setRoundMode('all_teams');
            }}
            className={`p-5 rounded-3xl border-3 text-left transition-all cursor-pointer relative overflow-hidden ${
              roundMode === 'all_teams'
                ? 'bg-amber-50 border-amber-500 ring-4 ring-amber-200 shadow-xl'
                : 'bg-slate-50 border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">⚡👥</span>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  roundMode === 'all_teams' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {roundMode === 'all_teams' ? 'ATIVO' : 'SELECIONAR'}
              </span>
            </div>
            <h4 className="text-lg font-black text-indigo-950 uppercase flex items-center gap-1.5">
              <span>Todas ao Mesmo Tempo</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black">SIMULTÂNEO</span>
            </h4>
            <p className="text-xs text-indigo-900/70 mt-1 font-medium leading-relaxed">
              Todas as equipes tentam adivinhar simultaneamente. Assim que alguém acertar, você clica e escolhe qual equipe pontuou!
            </p>
          </button>
        </div>
      </div>

      {/* 2. TABULEIRO & META DE PONTOS */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white text-indigo-950 shadow-2xl mb-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-100">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-indigo-950 uppercase tracking-tight flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span>Tabuleiro & Linha de Chegada</span>
            </h3>
            <p className="text-indigo-900/60 text-xs font-bold uppercase tracking-wider">
              Casas que os peões devem pular até vencer a partida
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[30, 40, 50, 60].map((houses) => (
            <button
              key={houses}
              type="button"
              onClick={() => {
                soundManager.playClick();
                setBoardLength(houses);
              }}
              className={`p-4 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                boardLength === houses
                  ? 'bg-yellow-400 border-yellow-500 text-indigo-950 shadow-lg scale-105 font-black ring-4 ring-yellow-200'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
              }`}
            >
              <span className="text-2xl sm:text-3xl font-black block font-mono-digits">
                {houses}
              </span>
              <span className="text-xs uppercase tracking-wider block">
                {houses === 50 ? 'Casas (Padrão ⭐)' : 'Casas'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Team Count Presets & Setup Card */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white text-indigo-950 shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 pointer-events-none opacity-60"></div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-6 border-b border-indigo-100 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-indigo-950 uppercase tracking-tight">
              Equipes Participantes ({teams.length})
            </h2>
            <p className="text-indigo-900/60 text-xs font-bold uppercase tracking-wider">
              Adicione quantas equipes desejar para a gincana
            </p>
          </div>

          <button
            onClick={handleAddTeam}
            disabled={teams.length >= 20}
            id="btn-add-team-main"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-yellow-400/25 border-2 border-yellow-300"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>+ Adicionar Equipe</span>
          </button>
        </div>

        {/* Team Cards List */}
        <div className="grid grid-cols-1 gap-3 relative z-10">
          {teams.map((team, idx) => (
            <div
              key={team.id}
              className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 border-2 border-indigo-100 hover:border-indigo-300 transition-all"
            >
              {/* Order Number Badge */}
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md">
                #{idx + 1}
              </div>

              {/* Emoji Icon Selector */}
              <div className="w-12 h-12 rounded-xl bg-white border-2 border-indigo-100 flex items-center justify-center text-2xl shadow-sm">
                {team.icon}
              </div>

              {/* Team Name Input */}
              <div className="flex-1">
                <label className="text-[10px] font-black text-indigo-900/60 uppercase tracking-widest block">
                  Nome da Equipe {idx + 1}
                </label>
                <input
                  type="text"
                  value={team.name}
                  onChange={(e) => handleUpdateTeamName(team.id, e.target.value)}
                  placeholder={`Equipe ${idx + 1}`}
                  className="w-full bg-transparent font-black text-indigo-950 text-lg focus:outline-none focus:border-b-2 focus:border-indigo-600 py-0.5"
                />
              </div>

              {/* Initial Position Display */}
              <div className="text-right px-3 border-l-2 border-indigo-100 hidden xs:block">
                <span className="text-[10px] font-black text-indigo-900/50 uppercase tracking-wider block">
                  Posição Inicial
                </span>
                <span className="font-black text-indigo-950 text-sm font-mono-digits">
                  Casa 0 (Partida)
                </span>
              </div>

              {/* Reorder Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  className={`p-2 rounded-xl border transition-all ${
                    idx === 0
                      ? 'text-indigo-200 border-indigo-100 cursor-not-allowed opacity-40'
                      : 'text-indigo-900 border-indigo-200 bg-white hover:bg-indigo-100 cursor-pointer shadow-sm'
                  }`}
                  title="Subir ordem"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === teams.length - 1}
                  className={`p-2 rounded-xl border transition-all ${
                    idx === 0
                      ? 'text-indigo-200 border-indigo-100 cursor-not-allowed opacity-40'
                      : 'text-indigo-900 border-indigo-200 bg-white hover:bg-indigo-100 cursor-pointer shadow-sm'
                  }`}
                  title="Descer ordem"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                {teams.length > 1 && (
                  <button
                    onClick={() => handleRemoveTeam(team.id)}
                    className="p-2 rounded-xl text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-all ml-1 cursor-pointer shadow-sm"
                    title="Remover equipe"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Turn indicator notice */}
        <div className="mt-6 p-5 rounded-2xl bg-yellow-400/20 border-2 border-yellow-400/40 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{teams[0]?.icon}</span>
            <div>
              <span className="text-xs uppercase font-black tracking-widest text-indigo-950/70 block">
                {roundMode === 'all_teams' ? 'Dinâmica: Todas Simultâneas' : 'Inicia a partida'}
              </span>
              <strong className="text-lg text-indigo-950 font-black uppercase">
                {roundMode === 'all_teams' ? 'TODAS AS EQUIPES DISPUTAM' : `VEZ DE: ${teams[0]?.name.toUpperCase()}`}
              </strong>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-indigo-900/60 uppercase block">Linha de Chegada</span>
            <span className="text-base font-black text-indigo-950 font-mono-digits">
              {boardLength} Casas
            </span>
          </div>
        </div>
      </div>

      {/* Start Match Button in Vibrant Palette style */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleStartMatch}
        id="btn-confirm-start-match"
        className="w-full py-6 px-8 rounded-[32px] bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-2xl uppercase tracking-wider shadow-2xl shadow-yellow-400/30 border-4 border-yellow-300 flex items-center justify-center gap-4 transition-all cursor-pointer"
      >
        <Play className="w-7 h-7 fill-current stroke-none" />
        <span>INICIAR PARTIDA NO TABULEIRO</span>
      </motion.button>
    </div>
  );
}

