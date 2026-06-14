// Tracks files the user has downloaded (offline). LocalStorage only.

export type DownloadItem = {
  id: string; // unique key (type+streamId or episodeId)
  kind: "movie" | "episode";
  title: string;
  image?: string;
  url: string;
  size?: number;
  addedAt: number;
};

const KEY = "misaplay_downloads";

export function listDownloads(): DownloadItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DownloadItem[];
  } catch {
    return [];
  }
}

export function addDownload(item: DownloadItem) {
  if (typeof window === "undefined") return;
  const list = listDownloads().filter((i) => i.id !== item.id);
  list.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  window.dispatchEvent(new CustomEvent("misaplay-downloads-changed"));
}

export function removeDownload(id: string) {
  if (typeof window === "undefined") return;
  const list = listDownloads().filter((i) => i.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("misaplay-downloads-changed"));
}

export async function triggerDownload(url: string, filename: string) {
  if (typeof window === "undefined") return;
  // Route through our server proxy so the response carries
  // Content-Disposition: attachment and the browser saves the file
  // directly instead of opening the video in a new tab.
  const proxied = `/api/public/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = proxied;
  document.body.appendChild(iframe);
  setTimeout(() => {
    try { document.body.removeChild(iframe); } catch { /* ignore */ }
  }, 60_000);
}

