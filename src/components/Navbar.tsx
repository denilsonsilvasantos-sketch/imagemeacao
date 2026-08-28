import { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Tv,
  Maximize2,
  Minimize2,
  Settings,
  Home,
  BookOpen,
  Sparkles,
  Dices,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { GameSettings } from '../types';

interface NavbarProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onGoHome: () => void;
  onOpenAdmin: () => void;
  onOpenProjectorModal: () => void;
  currentPhase: string;
  themeName?: string;
  ageRangeName?: string;
}

export default function Navbar({
  settings,
  onUpdateSettings,
  onGoHome,
  onOpenAdmin,
  onOpenProjectorModal,
  currentPhase,
  themeName,
  ageRangeName,
}: NavbarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleSound = () => {
    const nextState = !settings.soundEnabled;
    soundManager.setMuted(!nextState);
    onUpdateSettings({ soundEnabled: nextState });
    if (nextState) soundManager.playClick();
  };

  const toggleFullscreen = () => {
    soundManager.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <header className="w-full bg-indigo-950/90 backdrop-blur-md border-b border-indigo-900/80 sticky top-0 z-40 px-4 py-3.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & Current Match Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.playClick();
              onGoHome();
            }}
            id="nav-logo-btn"
            className="flex items-center gap-3 text-left group transition-all cursor-pointer"
          >
            {/* Tilted Vibrant Yellow IA Badge */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/20 transform -rotate-3 group-hover:rotate-0 transition-transform">
              <span className="text-indigo-950 text-2xl font-black italic tracking-tighter">IA</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl sm:text-2xl text-white tracking-tight uppercase">
                  IMAGEM & AÇÃO
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-yellow-400 text-indigo-950 font-heading">
                  Gincana
                </span>
              </div>
              <p className="text-[11px] text-indigo-300 font-bold uppercase tracking-widest hidden md:block">
                Edição Bíblica & Dinâmicas
              </p>
            </div>
          </button>

          {/* Active game badges */}
          {themeName && currentPhase !== 'home' && currentPhase !== 'admin' && (
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-indigo-800/80">
              <div className="bg-white/10 px-3.5 py-1.5 rounded-2xl border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs uppercase font-bold text-white">{themeName}</span>
              </div>
              {ageRangeName && (
                <div className="bg-indigo-600/60 px-3.5 py-1.5 rounded-2xl border border-indigo-400/50 shadow-md">
                  <span className="text-xs uppercase font-extrabold text-indigo-100">{ageRangeName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Open Dedicated Projection Window (2nd Screen / TV) */}
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenProjectorModal();
            }}
            id="nav-btn-projector"
            title="Abrir Modo Projeção (2ª Tela / TV para o Público)"
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-yellow-300 bg-yellow-400 hover:bg-yellow-300 text-indigo-950 font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-yellow-400/20"
          >
            <Tv className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Modo Projeção (TV)</span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={toggleSound}
            id="nav-btn-sound"
            title={settings.soundEnabled ? 'Desativar Som' : 'Ativar Som'}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              settings.soundEnabled
                ? 'bg-indigo-900/80 text-yellow-400 border-indigo-700/60 hover:bg-indigo-800'
                : 'bg-red-950/70 text-red-300 border-red-700/60 hover:bg-red-900/60'
            }`}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            id="nav-btn-fullscreen"
            title="Tela Cheia"
            className="p-2.5 rounded-2xl bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 hover:bg-indigo-800 hover:text-white transition-all hidden md:flex cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Admin / Content Management */}
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenAdmin();
            }}
            id="nav-btn-admin"
            className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              currentPhase === 'admin'
                ? 'bg-yellow-400 text-indigo-950 shadow-xl shadow-yellow-400/25'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 shadow-lg shadow-indigo-600/30'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden xs:inline">Conteúdo</span>
          </button>
        </div>
      </div>
    </header>
  );
}
