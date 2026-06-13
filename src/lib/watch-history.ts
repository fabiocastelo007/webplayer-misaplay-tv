// Continuar a assistir — progresso por (type,id). LocalStorage only.

export type WatchKind = "movie" | "series" | "live";

export type WatchEntry = {
  key: string; // `${type}-${id}` (series uses episode id)
  type: WatchKind;
  id: string;
  title: string;
  image?: string;
  ext?: string;
  position: number; // seconds
  duration: number; // seconds (0 if unknown)
  updatedAt: number;
  // For series episodes, link back to the series detail page
  seriesId?: string;
};

const KEY = "misaplay_watch_history";
const EVT = "misaplay-watch-history-changed";

export function listWatchHistory(): WatchEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as WatchEntry[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveProgress(entry: Omit<WatchEntry, "updatedAt">) {
  if (typeof window === "undefined") return;
  if (entry.type === "live") return; // não rastrear ao vivo
  if (entry.duration > 0 && entry.position / entry.duration > 0.97) {
    // praticamente terminou — remover
    removeFromHistory(entry.key);
    return;
  }
  if (entry.position < 10) return; // ignorar arranque
  const list = listWatchHistory().filter((w) => w.key !== entry.key);
  list.unshift({ ...entry, updatedAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 60)));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function removeFromHistory(key: string) {
  if (typeof window === "undefined") return;
  const list = listWatchHistory().filter((w) => w.key !== key);
  localStorage.setItem(KEY, JSON.stringify(list));
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
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}
