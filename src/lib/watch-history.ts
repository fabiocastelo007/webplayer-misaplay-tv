// Continuar a assistir — progresso por (type,id). LocalStorage por perfil.
import { getActiveProfileId } from "./profiles";

export type WatchKind = "movie" | "series" | "live";

export type WatchEntry = {
  key: string;
  type: WatchKind;
  id: string;
  title: string;
  image?: string;
  ext?: string;
  position: number;
  duration: number;
  updatedAt: number;
  seriesId?: string;
};

const BASE = "misaplay_watch_history";
const EVT = "misaplay-watch-history-changed";

function storageKey() {
  const pid = getActiveProfileId();
  return pid ? `${BASE}__${pid}` : BASE;
}

export function listWatchHistory(): WatchEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    return (JSON.parse(raw) as WatchEntry[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveProgress(entry: Omit<WatchEntry, "updatedAt">) {
  if (typeof window === "undefined") return;
  if (entry.type === "live") return;
  if (entry.duration > 0 && entry.position / entry.duration > 0.97) {
    removeFromHistory(entry.key);
    return;
  }
  if (entry.position < 10) return;
  const list = listWatchHistory().filter((w) => w.key !== entry.key);
  list.unshift({ ...entry, updatedAt: Date.now() });
  localStorage.setItem(storageKey(), JSON.stringify(list.slice(0, 60)));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function removeFromHistory(key: string) {
  if (typeof window === "undefined") return;
  const list = listWatchHistory().filter((w) => w.key !== key);
  localStorage.setItem(storageKey(), JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function getProgress(key: string): WatchEntry | undefined {
  return listWatchHistory().find((w) => w.key === key);
}

export function onWatchHistoryChanged(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h);
  window.addEventListener("misaplay-profiles-changed", h);
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
    window.removeEventListener("misaplay-profiles-changed", h);
  };
}
