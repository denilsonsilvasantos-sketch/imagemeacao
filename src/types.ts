export type CategoryCode = 'P' | 'O' | 'A' | 'D' | 'L' | 'M';

export interface CategoryDef {
  code: CategoryCode;
  label: string;
  name: string;
  description: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  iconName: string;
  example: string;
  defaultScore: number;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
  icon: string;
  active: boolean;
  isCustom?: boolean;
}

export interface AgeRange {
  id: string;
  name: string;
  minAge: number;
  maxAge: number;
  active: boolean;
  isCustom?: boolean;
}

export interface ChallengeItem {
  id: string;
  themeId: string;
  ageRangeId: string;
  category: CategoryCode;
  word: string;
  score: number;
  hint?: string;
  reference?: string;
  cardIndex?: number;
  active: boolean;
  createdAt: string;
}

export interface ChallengeCard {
  id: string;
  themeId: string;
  ageRangeId: string;
  P: string;
  O: string;
  A: string;
  D: string;
  L: string;
  M: string;
  score: number;
  active: boolean;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
  icon: string;
  roundsPlayed: number;
  correctGuesses?: number;
  wrongGuesses?: number;
}

export interface RoundRecord {
  id: string;
  matchId: string;
  roundNumber: number;
  teamId: string;
  teamName: string;
  category: CategoryCode;
  categoryName: string;
  word: string;
  points: number;
  result: 'correct' | 'timeout' | 'aborted';
  timeUsedSeconds: number;
  totalTimeSeconds: number;
  timestamp: string;
}

export interface MatchState {
  id: string;
  themeId: string;
  themeName?: string;
  ageRangeId: string;
  ageRangeName?: string;
  teams: Team[];
  currentTeamIndex: number;
  roundNumber: number;
  usedWordIds: string[];
  status?: 'playing' | 'round_recap' | 'finished';
  roundHistory: RoundRecord[];
  turnTimeSeconds?: number;
  isFinished?: boolean;
  startedAt?: string;
  finishedAt?: string;
  createdAt?: string;
}

export type GamePhase =
  | 'home'
  | 'match_setup'
  | 'die_roll'
  | 'word_reveal'
  | 'active_timer'
  | 'round_result'
  | 'match_summary'
  | 'admin';

export interface GameSettings {
  roundDurationSeconds: number;
  soundEnabled: boolean;
  soundVolume: number;
  projectorMode: boolean;
  autoNextTeam: boolean;
}
