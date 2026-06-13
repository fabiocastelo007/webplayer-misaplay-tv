// Client-safe Xtream helpers, constants, and session storage.

export type XtreamPackage = "MAX" | "PREMIUM";

export const XTREAM_SERVERS: { id: XtreamPackage; label: string; dns: string }[] = [
  { id: "MAX", label: "Pacote Max", dns: "http://misaplay.online" },
  { id: "PREMIUM", label: "Pacote Premium", dns: "https://live.angosmart.online" },
];

export type XtreamUserInfo = {
  username: string;
  status: string;
  exp_date: string | null;
  is_trial: string;
  active_cons: string;
  max_connections: string;
  allowed_output_formats?: string[];
};

export type XtreamServerInfo = {
  url: string;
  port: string;
  https_port?: string;
  server_protocol: string;
  timezone?: string;
};

export type XtreamSession = {
  package: XtreamPackage;
  dns: string;
  username: string;
  password: string;
  user_info: XtreamUserInfo;
  server_info: XtreamServerInfo;
  loggedAt: number;
};

const STORAGE_KEY = "misaplay_session";

export function saveSession(s: XtreamSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function loadSession(): XtreamSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as XtreamSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
