// Perfis locais (até 2). Cada perfil isola favoritos e histórico.
// Os perfis são guardados POR USUÁRIO (username Xtream/M3U) para que cada
// conta veja apenas os seus próprios perfis.

import { loadSession } from "./xtream";
import { loadM3USession } from "./m3u";

export type Profile = {
  id: string;
  name: string;
  avatar?: string; // emoji or url
  pin?: string; // 4 dígitos opcional
  createdAt: number;
};

function currentUserKey(): string {
  if (typeof window === "undefined") return "_anon";
  try {
    const s = loadSession();
    if (s?.username) return `x:${s.username}`;
    const m = loadM3USession();
    if (m?.username) return `m:${m.username}`;
    if (m?.source) return `m:${m.source}`;
  } catch { /* ignore */ }
  return "_anon";
}

const PROFILES_PREFIX = "misaplay_profiles__";
const ACTIVE_PREFIX = "misaplay_active_profile__";
const EVT = "misaplay-profiles-changed";
export const MAX_PROFILES = 2;

function profilesKey() { return PROFILES_PREFIX + currentUserKey(); }
function activeKey() { return ACTIVE_PREFIX + currentUserKey(); }


const DEFAULT_AVATARS = ["🦸", "👩", "🧑", "👦", "👧", "🐱", "🐶", "🦊"];

export function defaultAvatarFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return DEFAULT_AVATARS[h % DEFAULT_AVATARS.length];
}

export function listProfiles(): Profile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? (JSON.parse(raw) as Profile[]) : [];
  } catch {
    return [];
  }
}

function persist(list: Profile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function createProfile(input: { name: string; avatar?: string; pin?: string }): Profile | null {
  const list = listProfiles();
  if (list.length >= MAX_PROFILES) return null;
  const p: Profile = {
    id: (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
    name: input.name.trim().slice(0, 30) || "Perfil",
    avatar: input.avatar || defaultAvatarFor(input.name),
    pin: input.pin?.trim() || undefined,
    createdAt: Date.now(),
  };
  persist([...list, p]);
  return p;
}

export function updateProfile(id: string, patch: Partial<Pick<Profile, "name" | "avatar" | "pin">>) {
  const list = listProfiles().map((p) => (p.id === id ? { ...p, ...patch, name: (patch.name ?? p.name).slice(0, 30) } : p));
  persist(list);
}

export function deleteProfile(id: string) {
  const list = listProfiles().filter((p) => p.id !== id);
  persist(list);
  if (getActiveProfileId() === id) clearActiveProfile();
  // limpar storage do perfil
  try {
    localStorage.removeItem(`misaplay_favorites__${id}`);
    localStorage.removeItem(`misaplay_watch_history__${id}`);
  } catch { /* ignore */ }
}

export function getActiveProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function getActiveProfile(): Profile | null {
  const id = getActiveProfileId();
  if (!id) return null;
  return listProfiles().find((p) => p.id === id) ?? null;
}

export function setActiveProfile(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function clearActiveProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function onProfilesChanged(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}
