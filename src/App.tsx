import { useState, useEffect } from 'react';
import {
  Theme,
  AgeRange,
  ChallengeItem,
  Team,
  MatchState,
  GameSettings,
  RoundMode,
} from './types';
import {
  getStoredThemes,
  saveThemes,
  getStoredAgeRanges,
  saveAgeRanges,
  getStoredChallenges,
  saveChallenges,
  getStoredSettings,
  saveSettings,
  resetDatabaseToDefaults,
  appendMatchRounds,
} from './utils/storage';
import { soundManager } from './utils/audio';
import Navbar from './components/Navbar';
import HomeScreen from './components/HomeScreen';
import MatchSetup from './components/MatchSetup';
import GameBoard from './components/GameBoard';
import MatchSummary from './components/MatchSummary';
import AdminPanel from './components/AdminPanel';
import ProjectorView from './components/ProjectorView';
import ProjectorModal from './components/ProjectorModal';
import { syncService, ProjectionState } from './utils/syncChannel';

type AppPhase = 'home' | 'match_setup' | 'game' | 'match_summary' | 'admin';

export default function App() {
  // Check if current window was opened specifically as the Projector screen (TV / 2nd screen)
  const isDedicatedProjectorWindow =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('mode') === 'projector' ||
      window.location.hash === '#projector');

  if (isDedicatedProjectorWindow) {
    return <ProjectorView />;
  }

  // Database state
  const [themes, setThemes] = useState<Theme[]>([]);
  const [ageRanges, setAgeRanges] = useState<AgeRange[]>([]);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [settings, setSettings] = useState<GameSettings>(getStoredSettings());

  // Navigation & Game State
  const [currentPhase, setCurrentPhase] = useState<AppPhase>('home');
  const [selectedThemeId, setSelectedThemeId] = useState<string>('biblia');
  const [selectedAgeRangeId, setSelectedAgeRangeId] = useState<string>('8-12');
  const [activeMatch, setActiveMatch] = useState<MatchState | null>(null);
  const [isProjectorModalOpen, setIsProjectorModalOpen] = useState(false);

  // Top-level sync & heartbeat for Operator Window -> Projector Window
  useEffect(() => {
    const sendCurrentState = () => {
      if (currentPhase === 'home' || currentPhase === 'match_setup' || currentPhase === 'admin') {
        const defaultTeams: Team[] = activeMatch?.teams || [
          { id: 'team-1', name: 'Equipe 1', score: 0, icon: '🦁', color: 'from-amber-500 to-orange-600', roundsPlayed: 0 },
          { id: 'team-2', name: 'Equipe 2', score: 0, icon: '🦅', color: 'from-sky-500 to-blue-600', roundsPlayed: 0 },
        ];
        const state: ProjectionState = {
          stage: 'idle',
          themeName: selectedThemeId,
          ageRangeName: selectedAgeRangeId,
          teams: defaultTeams,
          timeLeft: settings.roundDurationSeconds || 80,
          totalTime: settings.roundDurationSeconds || 80,
          isUrgent: false,
          roundNumber: 1,
          lastUpdateTimestamp: Date.now(),
        };
        syncService.broadcast({ type: 'STATE_UPDATE', state });
      }
    };

    sendCurrentState();

    // 1. Listen for requests from newly opened projector windows
    const unsubscribe = syncService.subscribe((msg) => {
      if (msg.type === 'REQUEST_CURRENT_STATE') {
        sendCurrentState();
      }
    });

    // 2. Continuous Heartbeat PING every 1500ms
    const pingInterval = setInterval(() => {
      syncService.broadcast({ type: 'PING', timestamp: Date.now() });
    }, 1500);

    return () => {
      unsubscribe();
      clearInterval(pingInterval);
    };
  }, [currentPhase, activeMatch, selectedThemeId, selectedAgeRangeId, settings.roundDurationSeconds]);

  // Initialize data on mount
  useEffect(() => {
    const loadedThemes = getStoredThemes();
    const loadedAges = getStoredAgeRanges();
    const loadedChallenges = getStoredChallenges();
    const loadedSettings = getStoredSettings();

    setThemes(loadedThemes);
    setAgeRanges(loadedAges);
    setChallenges(loadedChallenges);
    setSettings(loadedSettings);

    soundManager.setMuted(!loadedSettings.soundEnabled);
    soundManager.setVolume(loadedSettings.soundVolume);
  }, []);

  // Update handlers
  const handleUpdateThemes = (newThemes: Theme[]) => {
    setThemes(newThemes);
    saveThemes(newThemes);
  };

  const handleUpdateAgeRanges = (newAgeRanges: AgeRange[]) => {
    setAgeRanges(newAgeRanges);
    saveAgeRanges(newAgeRanges);
  };

  const handleUpdateChallenges = (newChallenges: ChallengeItem[]) => {
    setChallenges(newChallenges);
    saveChallenges(newChallenges);
  };

  const handleUpdateSettings = (partial: Partial<GameSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveSettings(updated);
    if (partial.soundEnabled !== undefined) {
      soundManager.setMuted(!partial.soundEnabled);
    }
    if (partial.soundVolume !== undefined) {
      soundManager.setVolume(partial.soundVolume);
    }
  };

  const handleResetDatabase = () => {
    resetDatabaseToDefaults();
    const loadedThemes = getStoredThemes();
    const loadedAges = getStoredAgeRanges();
    const loadedChallenges = getStoredChallenges();
    setThemes(loadedThemes);
    setAgeRanges(loadedAges);
    setChallenges(loadedChallenges);
  };

  // Flow navigation
  const handleStartGameSelection = (themeId: string, ageRangeId: string) => {
    setSelectedThemeId(themeId);
    setSelectedAgeRangeId(ageRangeId);
    setCurrentPhase('match_setup');
  };

  const handleConfirmTeamsAndStart = (
    teams: Team[],
    roundDurationSeconds: number,
    roundMode: RoundMode = settings.roundMode || 'single_team',
    targetScore: number = settings.boardLength || 50
  ) => {
    const newMatch: MatchState = {
      id: `match-${Date.now()}`,
      themeId: selectedThemeId,
      ageRangeId: selectedAgeRangeId,
      teams,
      currentTeamIndex: 0,
      roundNumber: 1,
      roundMode,
      targetScore,
      turnTimeSeconds: roundDurationSeconds,
      usedWordIds: [],
      roundHistory: [],
      isFinished: false,
      startedAt: new Date().toISOString(),
    };

    setActiveMatch(newMatch);
    setCurrentPhase('game');
  };

  const handleFinishMatch = (finalMatch: MatchState) => {
    const finishedMatch: MatchState = {
      ...finalMatch,
      isFinished: true,
      finishedAt: new Date().toISOString(),
    };
    setActiveMatch(finishedMatch);
    appendMatchRounds(finalMatch.roundHistory);
    setCurrentPhase('match_summary');

    const sorted = [...finalMatch.teams].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    syncService.broadcast({
      type: 'MATCH_FINISHED',
      winnerName: winner?.name || 'Equipe Campeã',
      winnerIcon: winner?.icon || '🏆',
      winnerScore: winner?.score || 0,
      teams: sorted,
    });
  };

  const handlePlayAgain = () => {
    if (!activeMatch) return;
    // Reset scores & rounds played for the same teams
    const resetTeams = activeMatch.teams.map((t) => ({
      ...t,
      score: 0,
      roundsPlayed: 0,
    }));

    const rematch: MatchState = {
      id: `match-${Date.now()}`,
      themeId: activeMatch.themeId,
      ageRangeId: activeMatch.ageRangeId,
      teams: resetTeams,
      currentTeamIndex: 0,
      roundNumber: 1,
      roundMode: activeMatch.roundMode || settings.roundMode || 'single_team',
      targetScore: activeMatch.targetScore || settings.boardLength || 50,
      turnTimeSeconds: activeMatch.turnTimeSeconds || settings.roundDurationSeconds,
      usedWordIds: [],
      roundHistory: [],
      isFinished: false,
      startedAt: new Date().toISOString(),
    };

    setActiveMatch(rematch);
    setCurrentPhase('game');
  };

  const currentTheme = themes.find((t) => t.id === selectedThemeId);
  const currentAgeRange = ageRanges.find((a) => a.id === selectedAgeRangeId);

  return (
    <div className={`min-h-screen bg-indigo-950 text-white flex flex-col font-sans selection:bg-yellow-400 selection:text-indigo-950 ${settings.projectorMode ? 'projector-mode' : ''}`}>
      {/* Dynamic Background subtle ambient grid and vibrant indigo glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))]" />
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Top Navigation Header */}
      <Navbar
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onGoHome={() => setCurrentPhase('home')}
        onOpenAdmin={() => setCurrentPhase('admin')}
        onOpenProjectorModal={() => setIsProjectorModalOpen(true)}
        currentPhase={currentPhase}
        themeName={currentTheme?.name}
        ageRangeName={currentAgeRange?.name}
      />

      {/* Projector Window Launcher Modal */}
      <ProjectorModal
        isOpen={isProjectorModalOpen}
        onClose={() => setIsProjectorModalOpen(false)}
      />

      {/* Primary Dynamic Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 relative z-10 w-full">
        {currentPhase === 'home' && (
          <HomeScreen
            themes={themes}
            ageRanges={ageRanges}
            challenges={challenges}
            onStartGame={handleStartGameSelection}
            onOpenAdmin={() => setCurrentPhase('admin')}
            projectorMode={settings.projectorMode}
          />
        )}

        {currentPhase === 'match_setup' && currentTheme && currentAgeRange && (
          <MatchSetup
            theme={currentTheme}
            ageRange={currentAgeRange}
            initialRoundMode={settings.roundMode}
            initialBoardLength={settings.boardLength}
            onConfirmTeams={handleConfirmTeamsAndStart}
            onBack={() => setCurrentPhase('home')}
          />
        )}

        {currentPhase === 'game' && activeMatch && (
          <GameBoard
            match={activeMatch}
            allChallenges={challenges}
            settings={settings}
            onUpdateMatch={setActiveMatch}
            onFinishMatch={handleFinishMatch}
            onBackToHome={() => setCurrentPhase('home')}
          />
        )}

        {currentPhase === 'match_summary' && activeMatch && (
          <MatchSummary
            match={activeMatch}
            onPlayAgain={handlePlayAgain}
            onGoHome={() => setCurrentPhase('home')}
          />
        )}

        {currentPhase === 'admin' && (
          <AdminPanel
            themes={themes}
            ageRanges={ageRanges}
            challenges={challenges}
            settings={settings}
            onUpdateThemes={handleUpdateThemes}
            onUpdateAgeRanges={handleUpdateAgeRanges}
            onUpdateChallenges={handleUpdateChallenges}
            onUpdateSettings={handleUpdateSettings}
            onResetToDefaults={handleResetDatabase}
            onBack={() => setCurrentPhase('home')}
          />
        )}
      </main>

      {/* Footer info in Vibrant Palette style */}
      <footer className="w-full py-4 text-center text-indigo-300 text-xs border-t border-indigo-900/60 bg-indigo-950/80 backdrop-blur-md">
        <p className="font-semibold uppercase tracking-wider">
          Imagem & Ação • Sistema Completo para Gincanas e Dinâmicas em Grupo
        </p>
      </footer>
    </div>
  );
}
