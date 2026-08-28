import {
  Theme,
  AgeRange,
  ChallengeItem,
  CategoryCode,
  GameSettings,
  RoundRecord,
} from '../types';
import { DEFAULT_THEMES, DEFAULT_AGE_RANGES, DEFAULT_CHALLENGES } from '../data/seedData';

const KEYS = {
  THEMES: 'ia_themes_v2',
  AGE_RANGES: 'ia_age_ranges_v2',
  CHALLENGES: 'ia_challenges_v2',
  SETTINGS: 'ia_settings_v2',
  MATCH_HISTORY: 'ia_match_history_v2',
};

export const DEFAULT_SETTINGS: GameSettings = {
  roundDurationSeconds: 80, // 1:20 (80s default from spec)
  soundEnabled: true,
  soundVolume: 0.8,
  projectorMode: false,
  autoNextTeam: true,
};

export function getStoredThemes(): Theme[] {
  try {
    const raw = localStorage.getItem(KEYS.THEMES);
    if (!raw) {
      localStorage.setItem(KEYS.THEMES, JSON.stringify(DEFAULT_THEMES));
      return DEFAULT_THEMES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_THEMES;
  }
}

export function saveThemes(themes: Theme[]): void {
  try {
    localStorage.setItem(KEYS.THEMES, JSON.stringify(themes));
  } catch (e) {
    console.error('Error saving themes', e);
  }
}

export function getStoredAgeRanges(): AgeRange[] {
  try {
    const raw = localStorage.getItem(KEYS.AGE_RANGES);
    if (!raw) {
      localStorage.setItem(KEYS.AGE_RANGES, JSON.stringify(DEFAULT_AGE_RANGES));
      return DEFAULT_AGE_RANGES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_AGE_RANGES;
  }
}

export function saveAgeRanges(ageRanges: AgeRange[]): void {
  try {
    localStorage.setItem(KEYS.AGE_RANGES, JSON.stringify(ageRanges));
  } catch (e) {
    console.error('Error saving age ranges', e);
  }
}

export function getStoredChallenges(): ChallengeItem[] {
  try {
    const raw = localStorage.getItem(KEYS.CHALLENGES);
    if (!raw) {
      localStorage.setItem(KEYS.CHALLENGES, JSON.stringify(DEFAULT_CHALLENGES));
      return DEFAULT_CHALLENGES;
    }
    const parsed: ChallengeItem[] = JSON.parse(raw);
    return parsed.length > 0 ? parsed : DEFAULT_CHALLENGES;
  } catch {
    return DEFAULT_CHALLENGES;
  }
}

export function saveChallenges(items: ChallengeItem[]): void {
  try {
    localStorage.setItem(KEYS.CHALLENGES, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving challenges', e);
  }
}

export function getStoredSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function getStoredMatchHistory(): RoundRecord[] {
  try {
    const raw = localStorage.getItem(KEYS.MATCH_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendMatchRounds(rounds: RoundRecord[]): void {
  try {
    const current = getStoredMatchHistory();
    const updated = [...rounds, ...current].slice(0, 500); // keep last 500
    localStorage.setItem(KEYS.MATCH_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving match history', e);
  }
}

export function resetDatabaseToDefaults(): void {
  localStorage.setItem(KEYS.THEMES, JSON.stringify(DEFAULT_THEMES));
  localStorage.setItem(KEYS.AGE_RANGES, JSON.stringify(DEFAULT_AGE_RANGES));
  localStorage.setItem(KEYS.CHALLENGES, JSON.stringify(DEFAULT_CHALLENGES));
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  localStorage.removeItem(KEYS.MATCH_HISTORY);
}

// Filter age ranges that actually have registered content for the selected theme
export function getAvailableAgeRangesForTheme(
  themeId: string,
  allChallenges: ChallengeItem[],
  allAgeRanges: AgeRange[]
): AgeRange[] {
  const matchingAgeIds = new Set(
    allChallenges
      .filter((c) => c.active && (c.themeId.toLowerCase() === themeId.toLowerCase() || c.themeId === themeId))
      .map((c) => c.ageRangeId.toLowerCase())
  );

  return allAgeRanges.filter(
    (ar) => ar.active && matchingAgeIds.has(ar.id.toLowerCase())
  );
}

// Find an available word for a theme + age range + category that hasn't been used yet in this match
export function drawRandomWord(
  themeId: string,
  ageRangeId: string,
  category: CategoryCode,
  usedWordIds: string[],
  allChallenges: ChallengeItem[]
): { item: ChallengeItem | null; totalAvailable: number; remainingCount: number } {
  // Normalize match comparison
  const candidates = allChallenges.filter((item) => {
    if (!item.active) return false;
    const sameTheme =
      item.themeId.toLowerCase() === themeId.toLowerCase() ||
      item.themeId === themeId;
    const sameAge =
      item.ageRangeId.toLowerCase() === ageRangeId.toLowerCase() ||
      item.ageRangeId === ageRangeId;
    const sameCat = item.category.toUpperCase() === category.toUpperCase();
    return sameTheme && sameAge && sameCat;
  });

  const totalAvailable = candidates.length;
  const unused = candidates.filter((item) => !usedWordIds.includes(item.id));
  const remainingCount = unused.length;

  if (unused.length === 0) {
    return { item: null, totalAvailable, remainingCount: 0 };
  }

  const randomIndex = Math.floor(Math.random() * unused.length);
  return { item: unused[randomIndex], totalAvailable, remainingCount };
}
