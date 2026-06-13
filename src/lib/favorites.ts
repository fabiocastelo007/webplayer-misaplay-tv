// Favoritos por tipo (vod/series/live). LocalStorage only.

export type FavKind = "vod" | "series" | "live";

export type FavoriteItem = {
  kind: FavKind;
  id: string;
  name: string;
  image?: string;
  ext?: string;
  addedAt: number;
};

const KEY = "misaplay_favorites";
const EVT = "misaplay-favorites-changed";

export function listFavorites(kind?: FavKind): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
    return kind ? list.filter((f) => f.kind === kind) : list;
  } catch {
    return [];
  }
}

function save(list: FavoriteItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function isFavorite(kind: FavKind, id: string | number): boolean {
  return listFavorites(kind).some((f) => f.id === String(id));
}

export function toggleFavorite(item: Omit<FavoriteItem, "addedAt">): boolean {
  if (typeof window === "undefined") return false;
  const list = listFavorites();
  const idx = list.findIndex((f) => f.kind === item.kind && f.id === item.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    save(list);
    return false;
  }
  list.unshift({ ...item, addedAt: Date.now() });
  save(list.slice(0, 500));
  return true;
}

export function onFavoritesChanged(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}
