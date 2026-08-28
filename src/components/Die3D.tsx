import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CategoryCode } from '../types';
import { CATEGORIES, CATEGORY_CODES } from '../data/categories';
import { soundManager } from '../utils/audio';
import { Sparkles, Dices, RotateCcw } from 'lucide-react';

interface Die3DProps {
  onRollComplete: (category: CategoryCode) => void;
  disabled?: boolean;
  isRolling?: boolean;
  setIsRolling?: (rolling: boolean) => void;
  forcedResult?: CategoryCode | null;
  projectorMode?: boolean;
}

// Rotation angles to face each letter directly to the camera
const FACE_ROTATIONS: Record<CategoryCode, { rx: number; ry: number }> = {
  P: { rx: 0, ry: 0 },
  O: { rx: 0, ry: 180 },
  A: { rx: 0, ry: -90 },
  D: { rx: 0, ry: 90 },
  L: { rx: -90, ry: 0 },
  M: { rx: 90, ry: 0 },
};

export default function Die3D({
  onRollComplete,
  disabled = false,
  isRolling: externalIsRolling,
  setIsRolling: externalSetIsRolling,
  forcedResult = null,
  projectorMode = false,
}: Die3DProps) {
  const [internalIsRolling, setInternalIsRolling] = useState(false);
  const isRolling = externalIsRolling !== undefined ? externalIsRolling : internalIsRolling;
  const setIsRolling = externalSetIsRolling || setInternalIsRolling;

  const [currentRotations, setCurrentRotations] = useState<{ rx: number; ry: number }>({
    rx: -15,
    ry: 25,
  });
  const [selectedCategory, setSelectedCategory] = useState<CategoryCode | null>(null);
  const [hasRolledOnce, setHasRolledOnce] = useState(false);

  // Trigger the roll animation
  const handleRoll = () => {
    if (disabled || isRolling) return;

    soundManager.playDiceRoll();
    setIsRolling(true);
    setSelectedCategory(null);

    // Pick uniform random category from P, O, A, D, L, M (equal probability)
    const targetCategory =
      forcedResult ||
      CATEGORY_CODES[Math.floor(Math.random() * CATEGORY_CODES.length)];

    // Add 3 to 5 full 360-degree rotations for dramatic tumbling
    const fullSpinsX = (3 + Math.floor(Math.random() * 2)) * 360;
    const fullSpinsY = (3 + Math.floor(Math.random() * 2)) * 360;

    const targetAngles = FACE_ROTATIONS[targetCategory];

    const finalRx = fullSpinsX + targetAngles.rx;
    const finalRy = fullSpinsY + targetAngles.ry;

    setCurrentRotations({ rx: finalRx, ry: finalRy });

    // Settle after ~1.6s
    setTimeout(() => {
      setIsRolling(false);
      setSelectedCategory(targetCategory);
      setHasRolledOnce(true);
      soundManager.playLetterChime();
      onRollComplete(targetCategory);
    }, 1600);
  };

  const dieSizeClass = projectorMode
    ? 'w-48 h-48 md:w-56 md:h-56'
    : 'w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48';

  return (
    <div className="flex flex-col items-center justify-center select-none">
      {/* 3D Scene container */}
      <div
        className="relative perspective-1000 my-4 py-6 flex items-center justify-center cursor-pointer group"
        onClick={handleRoll}
        id="die-3d-container"
      >
        {/* Soft dynamic floor shadow */}
        <div
          className={`absolute -bottom-6 w-36 h-8 sm:w-44 sm:h-10 bg-amber-500/20 blur-xl rounded-full transition-all duration-700 ${
            isRolling ? 'scale-75 opacity-30 animate-pulse' : 'scale-100 opacity-70'
          }`}
        />

        {/* The 3D Cube */}
        <motion.div
          className={`relative transform-style-3d ${dieSizeClass}`}
          animate={{
            rotateX: currentRotations.rx,
            rotateY: currentRotations.ry,
          }}
          transition={{
            duration: isRolling ? 1.6 : 0.6,
            ease: isRolling ? [0.22, 1, 0.36, 1] : 'easeOut',
          }}
          whileHover={!isRolling && !disabled ? { scale: 1.05 } : {}}
          whileTap={!isRolling && !disabled ? { scale: 0.95 } : {}}
        >
          {/* Face 1: P (Pessoa) - Front */}
          <div className="absolute inset-0 die-face-1 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 border-4 border-amber-200/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.6),0_10px_25px_rgba(245,158,11,0.5)] text-white">
            <span className="text-6xl sm:text-7xl font-extrabold font-heading drop-shadow-md">
              P
            </span>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full mt-1">
              Pessoa
            </span>
          </div>

          {/* Face 2: O (Objeto) - Back */}
          <div className="absolute inset-0 die-face-2 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 border-4 border-sky-200/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.6),0_10px_25px_rgba(14,165,233,0.5)] text-white">
            <span className="text-6xl sm:text-7xl font-extrabold font-heading drop-shadow-md">
              O
            </span>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full mt-1">
              Objeto
            </span>
          </div>

          {/* Face 3: A (Ação) - Right */}
          <div className="absolute inset-0 die-face-3 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 border-4 border-emerald-200/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.6),0_10px_25px_rgba(16,185,129,0.5)] text-white">
            <span className="text-6xl sm:text-7xl font-extrabold font-heading drop-shadow-md">
              A
            </span>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full mt-1">
              Ação
            </span>
          </div>

          {/* Face 4: D (Desafio) - Left */}
          <div className="absolute inset-0 die-face-4 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-rose-400 via-rose-500 to-red-600 border-4 border-rose-200/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.6),0_10px_25px_rgba(244,63,94,0.5)] text-white">
            <span className="text-6xl sm:text-7xl font-extrabold font-heading drop-shadow-md">
              D
            </span>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full mt-1">
              Desafio
            </span>
          </div>

          {/* Face 5: L (Lugar/Livro) - Top */}
          <div className="absolute inset-0 die-face-5 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-purple-400 via-purple-500 to-indigo-600 border-4 border-purple-200/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.6),0_10px_25px_rgba(168,85,247,0.5)] text-white">
            <span className="text-6xl sm:text-7xl font-extrabold font-heading drop-shadow-md">
              L
            </span>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full mt-1">
              Lugar
            </span>
          </div>

          {/* Face 6: M (Mistério) - Bottom */}
          <div className="absolute inset-0 die-face-6 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-400 via-fuchsia-500 to-pink-600 border-4 border-fuchsia-200/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.6),0_10px_25px_rgba(217,70,239,0.5)] text-white">
            <span className="text-6xl sm:text-7xl font-extrabold font-heading drop-shadow-md">
              M
            </span>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full mt-1">
              Mistério
            </span>
          </div>
        </motion.div>
      </div>

      {/* Action button & indicator in Vibrant Palette style */}
      <div className="mt-4 flex flex-col items-center relative z-10">
        <button
          onClick={handleRoll}
          disabled={disabled || isRolling}
          id="btn-roll-die"
          className={`flex items-center gap-3 px-10 py-5 rounded-3xl font-black text-xl uppercase tracking-wider shadow-2xl transition-all cursor-pointer ${
            isRolling
              ? 'bg-yellow-500/60 text-indigo-950 cursor-not-allowed animate-pulse'
              : disabled
              ? 'bg-indigo-900/40 text-indigo-400 border border-indigo-800 cursor-not-allowed'
              : 'bg-yellow-400 hover:bg-yellow-300 text-indigo-950 shadow-yellow-400/30 border-4 border-yellow-300 hover:scale-105'
          }`}
        >
          <Dices className={`w-7 h-7 stroke-[2.5] ${isRolling ? 'animate-spin' : ''}`} />
          <span>{isRolling ? 'GIRANDO O DADO...' : 'GIRAR DADO'}</span>
        </button>

        <p className="text-indigo-900/60 font-bold text-xs uppercase tracking-wider mt-4 text-center">
          P = Pessoa • O = Objeto • A = Ação • D = Desafio • L = Lugar • M = Mistério
        </p>
      </div>
    </div>
  );
}
