// Real-time synchronization channel between Operator (Main Computer/Phone) and Projection Screen (TV / Second Monitor / Remote Device)
// Uses Supabase Realtime (for cross-device/remote internet sync) + BroadcastChannel & postMessage (for local zero-latency).

import { Team } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type ProjectionStage =
  | 'idle' // Waiting for game to start / on home screen or match setup
  | 'turn_waiting' // Team's turn, waiting to roll die
  | 'die_rolling' // Die is currently spinning
  | 'word_ready' // Die stopped, letter + points picked, ready to start timer
  | 'timer_running' // Timer active (1:20 countdown)
  | 'round_success' // Operator clicked "ACERTOU!"
  | 'round_timeout' // Time ran out or operator aborted
  | 'match_summary'; // Game finished

export type ProjectorLayout = 'split' | 'path' | 'stage';

export interface ProjectionState {
  stage: ProjectionStage;
  themeName?: string;
  ageRangeName?: string;
  roundMode?: 'single_team' | 'all_teams';
  boardLength?: number;
  winningScore?: number;
  projectorLayout?: ProjectorLayout;
  currentTeam?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    score: number;
  };
  teams: Team[];
  categoryCode?: string; // 'P', 'O', 'A', 'D', 'L', 'M'
  categoryName?: string; // 'Pessoa', 'Objeto', etc.
  roundScore?: number; // 1 to 6
  timeLeft: number; // e.g. 80 down to 0
  totalTime: number; // e.g. 80
  isUrgent: boolean; // last 10 seconds
  roundNumber: number;
  lastScoredTeamId?: string;
  lastScoredPoints?: number;
  winnerTeam?: {
    name: string;
    icon: string;
    score: number;
  };
  roomCode?: string;
  lastUpdateTimestamp: number;
}

export type SyncMessage =
  | { type: 'STATE_UPDATE'; state: ProjectionState }
  | { type: 'DICE_ROLL'; teamName: string }
  | { type: 'DICE_RESULT'; categoryCode: string; categoryName: string; score: number; teamName: string }
  | { type: 'TIMER_START'; timeLeft: number; totalTime: number }
  | { type: 'TIMER_TICK'; timeLeft: number; isUrgent: boolean }
  | { type: 'ROUND_SUCCESS'; points: number; teamName: string; teamIcon: string; teamId?: string; updatedTeams: Team[] }
  | { type: 'ROUND_TIMEOUT'; teamName: string }
  | { type: 'MATCH_FINISHED'; winnerName: string; winnerIcon: string; winnerScore: number; teams: Team[] }
  | { type: 'SET_PROJECTOR_LAYOUT'; layout: ProjectorLayout }
  | { type: 'REQUEST_CURRENT_STATE' }
  | { type: 'PING'; timestamp: number }
  | { type: 'PONG'; timestamp: number };

const LOCAL_CHANNEL_NAME = 'ia_proj_channel_v3';
const STORAGE_SYNC_KEY = 'ia_proj_live_state_v3';
const STORAGE_MSG_KEY = 'ia_proj_live_msg_v3';
const STORAGE_ROOM_KEY = 'ia_active_room_code';

export function getOrCreateRoomCode(): string {
  if (typeof window === 'undefined') return 'JOGO-1000';

  // Check URL query param first
  const urlParam = new URLSearchParams(window.location.search).get('room');
  if (urlParam) {
    const sanitized = urlParam.toUpperCase().trim();
    localStorage.setItem(STORAGE_ROOM_KEY, sanitized);
    return sanitized;
  }

  const existing = localStorage.getItem(STORAGE_ROOM_KEY);
  if (existing) return existing;

  const generated = `SALA-${Math.floor(1000 + Math.random() * 9000)}`;
  localStorage.setItem(STORAGE_ROOM_KEY, generated);
  return generated;
}

export function setCustomRoomCode(code: string): string {
  const sanitized = code.toUpperCase().trim() || `SALA-${Math.floor(1000 + Math.random() * 9000)}`;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_ROOM_KEY, sanitized);
  }
  syncService.reconnectRealtime(sanitized);
  return sanitized;
}

class ProjectionSyncService {
  private channel: BroadcastChannel | null = null;
  private supabaseRealtimeChannel: RealtimeChannel | null = null;
  private listeners: ((message: SyncMessage) => void)[] = [];
  private lastKnownState: ProjectionState | null = null;
  private openedWindows: Window[] = [];
  private lastProcessedStorageMsgId: string = '';
  private currentRoomCode: string = 'SALA-1000';
  private isSupabaseSubscribed: boolean = false;

  constructor() {
    if (typeof window === 'undefined') return;

    this.currentRoomCode = getOrCreateRoomCode();

    // 1. BroadcastChannel (Browser internal fast bus)
    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(LOCAL_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (event.data) {
            this.handleIncoming(event.data as SyncMessage);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not available', err);
      }
    }

    // 2. Window PostMessage listener
    window.addEventListener('message', (e) => {
      if (e.data && typeof e.data === 'object' && e.data.__IA_SYNC_MSG__) {
        this.handleIncoming(e.data.payload as SyncMessage);
      }
    });

    // 3. Storage Event listener
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_MSG_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.id !== this.lastProcessedStorageMsgId) {
            this.lastProcessedStorageMsgId = parsed.id;
            this.handleIncoming(parsed.message as SyncMessage);
          }
        } catch {
          // ignore
        }
      } else if (e.key === STORAGE_SYNC_KEY && e.newValue) {
        try {
          const parsedState = JSON.parse(e.newValue);
          if (parsedState) {
            this.handleIncoming({ type: 'STATE_UPDATE', state: parsedState });
          }
        } catch {
          // ignore
        }
      }
    });

    // 4. Polling fallback for localStorage
    setInterval(() => {
      try {
        const rawState = localStorage.getItem(STORAGE_SYNC_KEY);
        if (rawState) {
          const parsedState = JSON.parse(rawState);
          if (
            parsedState &&
            (!this.lastKnownState ||
              parsedState.lastUpdateTimestamp > (this.lastKnownState.lastUpdateTimestamp || 0))
          ) {
            this.handleIncoming({ type: 'STATE_UPDATE', state: parsedState });
          }
        }
      } catch {
        // ignore
      }
    }, 350);

    // 5. Connect Supabase Realtime
    this.connectSupabaseRealtime(this.currentRoomCode);
  }

  public getRoomCode(): string {
    return this.currentRoomCode;
  }

  public reconnectRealtime(newRoomCode: string) {
    this.currentRoomCode = newRoomCode;
    this.connectSupabaseRealtime(newRoomCode);
  }

  private connectSupabaseRealtime(roomCode: string) {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      if (this.supabaseRealtimeChannel) {
        this.isSupabaseSubscribed = false;
        client.removeChannel(this.supabaseRealtimeChannel);
        this.supabaseRealtimeChannel = null;
      }

      this.isSupabaseSubscribed = false;
      const channelName = `room_${roomCode.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
      this.supabaseRealtimeChannel = client.channel(channelName, {
        config: {
          broadcast: { self: false },
        },
      });

      this.supabaseRealtimeChannel
        .on('broadcast', { event: 'sync' }, (payload) => {
          if (payload && payload.payload) {
            this.handleIncoming(payload.payload as SyncMessage);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isSupabaseSubscribed = true;
            console.log(`[Supabase Realtime] Conectado à sala: ${roomCode}`);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.isSupabaseSubscribed = false;
          }
        });
    } catch (err) {
      this.isSupabaseSubscribed = false;
      console.warn('Could not subscribe to Supabase Realtime:', err);
    }
  }

  public registerChildWindow(win: Window) {
    if (win && !this.openedWindows.includes(win)) {
      this.openedWindows.push(win);
    }
  }

  private handleIncoming(message: SyncMessage) {
    if (!message || !message.type) return;

    if (message.type === 'STATE_UPDATE') {
      this.lastKnownState = message.state;
    }
    this.listeners.forEach((fn) => {
      try {
        fn(message);
      } catch (err) {
        console.error('Error in sync listener', err);
      }
    });
  }

  public subscribe(fn: (message: SyncMessage) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  public broadcast(message: SyncMessage) {
    if (!message || !message.type) return;

    if (message.type === 'STATE_UPDATE') {
      message.state.roomCode = this.currentRoomCode;
      this.lastKnownState = message.state;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(message.state));
        } catch {
          // ignore
        }
      }

      // Persist state to Supabase table if configured (async fire-and-forget)
      const client = getSupabaseClient();
      if (client && this.currentRoomCode) {
        Promise.resolve(
          client
            .from('game_rooms')
            .upsert(
              {
                room_code: this.currentRoomCode,
                state: message.state,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'room_code' }
            )
        )
          .then(() => {})
          .catch(() => {});
      }
    }

    // 1. Supabase Cloud Realtime Broadcast (Internet cross-device)
    // Only send via WebSocket if the channel has completed the handshake (SUBSCRIBED)
    if (this.supabaseRealtimeChannel && this.isSupabaseSubscribed) {
      try {
        this.supabaseRealtimeChannel.send({
          type: 'broadcast',
          event: 'sync',
          payload: message,
        });
      } catch (err) {
        console.warn('Supabase Realtime send error:', err);
      }
    }

    // 2. BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('Broadcast channel postMessage error', err);
      }
    }

    // 3. Window PostMessage to Opener
    if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({ __IA_SYNC_MSG__: true, payload: message }, '*');
      } catch {
        // ignore
      }
    }

    // 4. Window PostMessage to Child Windows
    if (this.openedWindows.length > 0) {
      this.openedWindows = this.openedWindows.filter((w) => !w.closed);
      this.openedWindows.forEach((w) => {
        try {
          w.postMessage({ __IA_SYNC_MSG__: true, payload: message }, '*');
        } catch {
          // ignore
        }
      });
    }

    // 5. LocalStorage message dispatch
    if (typeof window !== 'undefined') {
      try {
        const msgId = `${Date.now()}_${Math.random()}`;
        this.lastProcessedStorageMsgId = msgId;
        localStorage.setItem(
          STORAGE_MSG_KEY,
          JSON.stringify({
            id: msgId,
            message,
          })
        );
      } catch {
        // ignore
      }
    }
  }

  public getLastKnownState(): ProjectionState | null {
    if (this.lastKnownState) return this.lastKnownState;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_SYNC_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.stage) {
            this.lastKnownState = parsed;
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return null;
  }
}

export const syncService = new ProjectionSyncService();
