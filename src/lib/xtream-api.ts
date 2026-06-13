import { xtreamFetch } from "./xtream.functions";
import { loadSession } from "./xtream";

export type Category = { category_id: string; category_name: string; parent_id: number };

export type LiveStream = {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  category_id: string;
  epg_channel_id?: string;
};

export type VodStream = {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating?: string;
  rating_5based?: number;
  added?: string;
  category_id: string;
  container_extension: string;
};

export type Serie = {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  rating?: string;
  rating_5based?: number;
  category_id: string;
};

export type Episode = {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info?: { movie_image?: string; plot?: string; duration?: string };
};

export type SeriesInfo = {
  seasons: Array<{ season_number: number; name?: string; cover?: string }>;
  info: { name: string; cover: string; plot?: string; cast?: string; genre?: string; releaseDate?: string };
  episodes: Record<string, Episode[]>;
};

function creds() {
  const s = loadSession();
  if (!s) throw new Error("Sessão expirada. Faça login novamente.");
  return { dns: s.dns, username: s.username, password: s.password };
}

async function call<T>(action: string, params?: Record<string, string | number>): Promise<T> {
  const c = creds();
  const json = await xtreamFetch({ data: { ...c, action, params } });
  return json as unknown as T;
}

export const xtream = {
  liveCategories: () => call<Category[]>("get_live_categories"),
  liveStreams: (category_id?: string) =>
    call<LiveStream[]>("get_live_streams", category_id ? { category_id } : undefined),
  vodCategories: () => call<Category[]>("get_vod_categories"),
  vodStreams: (category_id?: string) =>
    call<VodStream[]>("get_vod_streams", category_id ? { category_id } : undefined),
  seriesCategories: () => call<Category[]>("get_series_categories"),
  series: (category_id?: string) =>
    call<Serie[]>("get_series", category_id ? { category_id } : undefined),
  seriesInfo: (series_id: number) => call<SeriesInfo>("get_series_info", { series_id }),
};

// Stream URL builders. dns + creds come from session.
export function liveStreamUrl(stream_id: number) {
  const { dns, username, password } = creds();
  return `${dns}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${stream_id}.m3u8`;
}

export function vodStreamUrl(stream_id: number, ext: string) {
  const { dns, username, password } = creds();
  return `${dns}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${stream_id}.${ext}`;
}

export function episodeStreamUrl(episode_id: string | number, ext: string) {
  const { dns, username, password } = creds();
  return `${dns}/series/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${episode_id}.${ext}`;
}
