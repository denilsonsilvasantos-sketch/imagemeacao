import { useState } from 'react';
import { motion } from 'motion/react';
import { Team, Theme, AgeRange } from '../types';
import { Users, Plus, Trash2, ArrowUp, ArrowDown, Play, ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface MatchSetupProps {
  theme: Theme;
  ageRange: AgeRange;
  onConfirmTeams: (teams: Team[], roundDurationSeconds: number) => void;
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

  const handleUpdateTeamIcon = (id: string, newIcon: string) => {
    setTeams(
      teams.map((t) => (t.id === id ? { ...t, icon: newIcon } : t))
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
    onConfirmTeams(teams, roundDuration);
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
          Defina as equipes e a ordem de jogo
        </p>
      </div>

      {/* Team Count Presets & Setup Card */}
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

              {/* Initial Score Display */}
              <div className="text-right px-3 border-l-2 border-indigo-100 hidden xs:block">
                <span className="text-[10px] font-black text-indigo-900/50 uppercase tracking-wider block">
                  Pontos
                </span>
                <span className="font-black text-indigo-950 text-lg font-mono-digits">
                  0 pts
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
                Inicia a partida
              </span>
              <strong className="text-lg text-indigo-950 font-black uppercase">
                Vez da equipe: {teams[0]?.name.toUpperCase()}
              </strong>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-indigo-900/60 uppercase block">Tempo da Rodada</span>
            <span className="text-base font-black text-indigo-950 font-mono-digits">
              1:20 (80s)
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
        <span>INICIAR PARTIDA</span>
      </motion.button>
    </div>
  );
}
