// Admin settings: servidores, planos, contactos e cores.
// Tudo armazenado em localStorage e aplicado em tempo de execução.

import { BRAND, PLANS, type Plan } from "./config";
import { XTREAM_SERVERS, type XtreamPackage } from "./xtream";

export type AdminServer = { id: XtreamPackage; label: string; dns: string };
export type AdminBrand = {
  name: string;
  site: string;
  email: string;
  phone: string;
  phoneRaw: string;
  whatsapp: string;
};
export type AdminColors = {
  background: string; // oklch string
  primary: string;
  accent: string;
};

export type AdminTexts = {
  welcomeTitle: string;
  welcomeSubtitle: string;
  signupNote: string;
  footerTagline: string;
  supportHours: string;
};

export type AdminSettings = {
  servers: AdminServer[];
  plans: Plan[];
  brand: AdminBrand;
  colors: AdminColors;
  texts: AdminTexts;
  loginPosters: string[];
  adminPassword: string;
};


const KEY = "misaplay_admin_settings";
const ADMIN_FLAG = "misaplay_is_admin";
const EVT = "misaplay-settings-changed";

export const DEFAULT_COLORS: AdminColors = {
  background: "oklch(0.10 0.01 260)",
  primary: "oklch(0.62 0.20 252)",
  accent: "oklch(0.60 0.23 25)",
};

export const DEFAULT_ADMIN_PASSWORD = "misaplay2026";

export const DEFAULT_TEXTS: AdminTexts = {
  welcomeTitle: "BEM-VINDO",
  welcomeSubtitle:
    "Acesse com seu usuário e senha. Validamos automaticamente nos servidores Max e Premium.",
  signupNote: "Não tem conta? Fale connosco no WhatsApp {phone}, {email}",
  footerTagline:
    "Misaplay TV — filmes, séries, TV ao vivo e desporto em um só lugar.",
  supportHours:
    "Renovações, dúvidas e suporte técnico via WhatsApp todos os dias das 08h às 22h.",
};

export const DEFAULT_LOGIN_POSTERS: string[] = [
  "https://image.tmdb.org/t/p/w500/kqjL17yufvn9OVLyXYpvtyrFfak.jpg",
  "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
  "https://image.tmdb.org/t/p/w500/zfbjgQE1uSd9wiPTX4VzsLi0rGG.jpg",
  "https://image.tmdb.org/t/p/w500/yOm993lsJyPmBodlYjgpPwBjXP9.jpg",
  "https://image.tmdb.org/t/p/w500/bX9KqgrATObqcrpZmtPDmwx9V6c.jpg",
  "https://image.tmdb.org/t/p/w500/h3jYanWMEJq6JJsCopy1h7cT2Hs.jpg",
  "https://image.tmdb.org/t/p/w500/jpZ4cIVjjAlYUbq2vfDjCdSp3rg.jpg",
  "https://image.tmdb.org/t/p/w500/Acm2VfMSrFa15TwCEnKQYcQGzhz.jpg",
  "https://image.tmdb.org/t/p/w500/qsdjk9oAKSQMWs0Vt5Pyfh6O4GZ.jpg",
  "https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",
  "https://image.tmdb.org/t/p/w500/5SArAyiyAB8aZSU3X5LlBQNUVH4.jpg",
  "https://image.tmdb.org/t/p/w500/6FRFIogh3zFnVWn7Z6zaixrIFsh.jpg",
];

export function defaultSettings(): AdminSettings {
  return {
    servers: XTREAM_SERVERS.map((s) => ({ ...s })),
    plans: PLANS.map((p) => ({ ...p })),
    brand: { ...BRAND },
    colors: { ...DEFAULT_COLORS },
    texts: { ...DEFAULT_TEXTS },
    loginPosters: [...DEFAULT_LOGIN_POSTERS],
    adminPassword: DEFAULT_ADMIN_PASSWORD,
  };
}


export function loadSettings(): AdminSettings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<AdminSettings>;
    const d = defaultSettings();
    return {
      servers: parsed.servers?.length ? parsed.servers : d.servers,
      plans: parsed.plans?.length ? parsed.plans : d.plans,
      brand: { ...d.brand, ...(parsed.brand ?? {}) },
      colors: { ...d.colors, ...(parsed.colors ?? {}) },
      texts: { ...d.texts, ...(parsed.texts ?? {}) },
      adminPassword: parsed.adminPassword || d.adminPassword,
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: AdminSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
  applySettings(s);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function onSettingsChanged(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}

/** Aplica configurações mutando os objetos exportados + tema CSS. */
export function applySettings(s: AdminSettings) {
  // Brand
  Object.assign(BRAND, s.brand);
  // Plans (substituir conteúdo)
  PLANS.splice(0, PLANS.length, ...s.plans);
  // Servers
  XTREAM_SERVERS.splice(0, XTREAM_SERVERS.length, ...s.servers);
  // Theme
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.style.setProperty("--background", s.colors.background);
    root.style.setProperty("--primary", s.colors.primary);
    root.style.setProperty("--accent", s.colors.accent);
    root.style.setProperty("--ring", s.colors.primary);
    root.style.setProperty("--destructive", s.colors.accent);
  }
}

export function hydrateSettings() {
  applySettings(loadSettings());
}

// ---- Admin session (hidden) ----

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ADMIN_FLAG) === "1";
}

export function tryAdminLogin(password: string): boolean {
  const s = loadSettings();
  if (password === s.adminPassword) {
    localStorage.setItem(ADMIN_FLAG, "1");
    window.dispatchEvent(new CustomEvent(EVT));
    return true;
  }
  return false;
}

export function grantAdmin() {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_FLAG, "1");
  window.dispatchEvent(new CustomEvent(EVT));
}

export function adminLogout() {
  localStorage.removeItem(ADMIN_FLAG);
  window.dispatchEvent(new CustomEvent(EVT));
}
