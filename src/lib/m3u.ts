// Client-side M3U fallback for when the Xtream panel blocks our server (geo-block / 503).
// The user's browser fetches the list directly, or pastes/uploads it.

export type M3UChannel = {
  stream_id: number;
  name: string;
  stream_icon: string;
  category_id: string;
  url: string;
};

export type M3USession = {
  source: string; // URL or "manual"
  loadedAt: number;
  username?: string;
  channels: M3UChannel[];
};

const KEY = "misaplay_m3u_session";

export function saveM3USession(s: M3USession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function loadM3USession(): M3USession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as M3USession) : null;
  } catch {
    return null;
  }
}

export function clearM3USession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function parseM3U(text: string): M3UChannel[] {
  const lines = text.split(/\r?\n/);
  const out: M3UChannel[] = [];
  let id = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXTINF")) continue;
    const attrs: Record<string, string> = {};
    for (const m of line.matchAll(/([a-zA-Z0-9_-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
    const comma = line.lastIndexOf(",");
    const name = (comma >= 0 ? line.slice(comma + 1) : attrs["tvg-name"] || "Canal").trim();
    let url = "";
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j].trim();
      if (!l) continue;
      if (l.startsWith("#")) continue;
      url = l;
      break;
    }
    if (!url) continue;
    out.push({
      stream_id: id++,
      name: name || "Canal",
      stream_icon: attrs["tvg-logo"] || "",
      category_id: attrs["group-title"] || "Outros",
      url,
    });
  }
  return out;
}

/** Try multiple strategies to fetch an M3U from the user's browser. */
export async function fetchM3U(url: string): Promise<string> {
  // Direct fetch first
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (r.ok) {
      const t = await r.text();
      if (t.includes("#EXTM3U") || t.includes("#EXTINF")) return t;
    }
  } catch {
    /* fallthrough */
  }
  // Public CORS proxy (best-effort)
  try {
    const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {
      cache: "no-store",
    });
    if (r.ok) return await r.text();
  } catch {
    /* fallthrough */
  }
  throw new Error(
    "Não foi possível obter a lista a partir do seu navegador (CORS). Abra o link no navegador, salve o ficheiro .m3u e carregue-o aqui.",
  );
}
