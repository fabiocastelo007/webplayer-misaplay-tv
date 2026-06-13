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

export type AdminSettings = {
  servers: AdminServer[];
  plans: Plan[];
  brand: AdminBrand;
  colors: AdminColors;
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

export function defaultSettings(): AdminSettings {
  return {
    servers: XTREAM_SERVERS.map((s) => ({ ...s })),
    plans: PLANS.map((p) => ({ ...p })),
    brand: { ...BRAND },
    colors: { ...DEFAULT_COLORS },
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

export function adminLogout() {
  localStorage.removeItem(ADMIN_FLAG);
  window.dispatchEvent(new CustomEvent(EVT));
}
