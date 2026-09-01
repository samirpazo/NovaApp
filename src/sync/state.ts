import { create } from 'zustand';

export type PullStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface PullResult {
  Cursor: number;
  Downloaded: number;
  Uploaded: number;
  Pages: number;
  DurationMs: number;
  FinishedAt: string;
}

interface SyncState {
  Status: PullStatus;
  Error: string | null;
  LastPull: PullResult | null;
  startPull: () => void;
  completePull: (result: PullResult) => void;
  failPull: (message: string) => void;
}

export const useSyncState = create<SyncState>((set) => ({
  Status: 'idle',
  Error: null,
  LastPull: null,
  startPull: () => set({ Status: 'syncing', Error: null }),
  completePull: (LastPull) => set({ Status: 'success', Error: null, LastPull }),
  failPull: (Error) => set({ Status: 'error', Error }),
}));
