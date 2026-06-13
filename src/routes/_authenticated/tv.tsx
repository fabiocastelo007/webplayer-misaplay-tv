import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { FavoriteButton } from "@/components/catalog/FavoriteButton";
import { xtream, liveStreamUrl, type LiveStream } from "@/lib/xtream-api";
import { isFavorite, listFavorites, onFavoritesChanged } from "@/lib/favorites";

export const Route = createFileRoute("/_authenticated/tv")({
  head: () => ({ meta: [{ title: "TV ao Vivo — Misaplay TV" }] }),
  component: TvPage,
});

const FAV_CAT = "__favorites__";

function TvPage() {
  const cats = useQuery({
    queryKey: ["xtream", "live", "categories"],
    queryFn: () => xtream.liveCategories(),
    staleTime: 5 * 60_000,
  });
  const [activeCat, setActiveCat] = useState<string | "all" | typeof FAV_CAT>("all");
  const streams = useQuery({
    queryKey: ["xtream", "live", "streams", activeCat === FAV_CAT ? "all" : activeCat],
    queryFn: () =>
      xtream.liveStreams(
        activeCat === "all" || activeCat === FAV_CAT ? undefined : (activeCat as string),
      ),
    staleTime: 60_000,
  });
  const [query, setQuery] = useState("");

  // Favorites change tick to re-evaluate filter
  const [favTick, setFavTick] = useState(0);
  useEffect(() => onFavoritesChanged(() => setFavTick((v) => v + 1)), []);

  const filtered = useMemo(() => {
    void favTick;
    let list = streams.data ?? [];
    if (activeCat === FAV_CAT) {
      const favIds = new Set(listFavorites("live").map((f) => f.id));
      list = list.filter((c) => favIds.has(String(c.stream_id)));
    }
    const q = query.trim().toLowerCase();
    return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
  }, [streams.data, query, activeCat, favTick]);

  const [current, setCurrent] = useState<LiveStream | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const openChannel = async (ch: LiveStream) => {
    setCurrent(ch);
    setPanelOpen(false);
    const el = containerRef.current;
    if (el && !document.fullscreenElement) {
      try {
        await el.requestFullscreen();
      } catch {
        /* ignore */
      }
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setCurrent(null);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <main className="min-h-screen">
      <AppHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <h1 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">TV ao Vivo</h1>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto">
            <CatBtn active={activeCat === "all"} onClick={() => setActiveCat("all")}>Todos</CatBtn>
            <CatBtn active={activeCat === FAV_CAT} onClick={() => setActiveCat(FAV_CAT)}>
              <Heart className="mr-1 inline size-3.5" /> Favoritos
            </CatBtn>
            {cats.data?.map((c) => (
              <CatBtn
                key={c.category_id}
                active={activeCat === c.category_id}
                onClick={() => setActiveCat(c.category_id)}
              >
                {c.category_name}
              </CatBtn>
            ))}
          </div>
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar canal..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 bg-secondary/60 pl-9"
            />
          </div>
        </div>

        {streams.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando canais...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {activeCat === FAV_CAT ? "Sem canais favoritos. Toque no ❤ para adicionar." : "Nenhum canal encontrado."}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((ch) => (
              <li key={ch.stream_id}>
                <ChannelCard ch={ch} onPlay={openChannel} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fullscreen player: video on top, categories+channels strip below */}
      <div
        ref={containerRef}
        className={
          current
            ? "fixed inset-0 z-50 flex flex-col bg-black"
            : "pointer-events-none fixed inset-0 z-50 hidden"
        }
      >
        {current ? (
          <>
            {/* Player area */}
            <div className="relative flex-1 min-h-0">
              <div className="absolute inset-0">
                <VideoPlayer src={liveStreamUrl(current.stream_id)} hls poster={current.stream_icon} />
              </div>

              {/* Top bar */}
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent p-4">
                <div className="flex min-w-0 items-center gap-3 text-white">
                  {current.stream_icon ? (
                    <img src={current.stream_icon} alt="" className="h-8 w-8 rounded object-contain" />
                  ) : null}
                  <span className="truncate font-semibold">{current.name}</span>
                  <FavoriteButton
                    kind="live"
                    item={{ id: String(current.stream_id), name: current.name, image: current.stream_icon }}
                    className="ml-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPanelOpen((p) => !p)}
                    className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
                  >
                    {panelOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                    Canais
                  </button>
                  <button
                    onClick={() => {
                      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                      setCurrent(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
                  >
                    <X className="size-4" /> Fechar
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom panel: categorias + canais */}
            {panelOpen ? (
              <div className="shrink-0 border-t border-white/10 bg-black/85 backdrop-blur">
                <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                  <FsCat active={activeCat === "all"} onClick={() => setActiveCat("all")}>
                    Todos
                  </FsCat>
                  <FsCat active={activeCat === FAV_CAT} onClick={() => setActiveCat(FAV_CAT)}>
                    <Heart className="mr-1 inline size-3" /> Favoritos
                  </FsCat>
                  {cats.data?.map((c) => (
                    <FsCat
                      key={c.category_id}
                      active={activeCat === c.category_id}
                      onClick={() => setActiveCat(c.category_id)}
                    >
                      {c.category_name}
                    </FsCat>
                  ))}
                </div>
                <div className="flex gap-2 overflow-x-auto px-3 pb-3 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                  {filtered.map((ch) => {
                    const active = ch.stream_id === current.stream_id;
                    return (
                      <button
                        key={ch.stream_id}
                        onClick={() => setCurrent(ch)}
                        className={
                          "group/ch relative flex w-[120px] shrink-0 flex-col items-center gap-1 rounded-md p-2 text-white transition " +
                          (active ? "bg-white/20 ring-1 ring-white/60" : "bg-white/5 hover:bg-white/15")
                        }
                      >
                        <div className="flex h-12 w-full items-center justify-center">
                          {ch.stream_icon ? (
                            <img src={ch.stream_icon} alt="" className="max-h-12 max-w-full object-contain" />
                          ) : (
                            <span className="text-[10px]">{ch.name}</span>
                          )}
                        </div>
                        <span className="line-clamp-2 text-center text-[10px] leading-tight">{ch.name}</span>
                        {isFavorite("live", ch.stream_id) ? (
                          <Heart className="absolute right-1 top-1 size-3 fill-red-500 text-red-500" />
                        ) : null}
                      </button>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <p className="px-2 py-4 text-xs text-white/60">Sem canais nesta categoria.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <Footer />
    </main>
  );
}

function CatBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition " +
        (active
          ? "bg-foreground text-background"
          : "bg-secondary/60 text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function FsCat({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition " +
        (active ? "bg-white text-black" : "bg-white/10 text-white/80 hover:bg-white/20")
      }
    >
      {children}
    </button>
  );
}

function ChannelCard({ ch, onPlay }: { ch: LiveStream; onPlay: (c: LiveStream) => void }) {
  return (
    <div className="group relative">
      <button
        onClick={() => onPlay(ch)}
        className="flex w-full flex-col items-center gap-2 rounded-lg bg-secondary/50 p-3 ring-1 ring-border/40 transition hover:ring-primary"
      >
        <div className="flex aspect-square w-full items-center justify-center rounded bg-background/50 p-2">
          {ch.stream_icon ? (
            <img
              src={ch.stream_icon}
              alt={ch.name}
              loading="lazy"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground">{ch.name}</span>
          )}
        </div>
        <span className="line-clamp-2 text-center text-xs font-medium">{ch.name}</span>
      </button>
      <div className="absolute right-2 top-2">
        <FavoriteButton
          kind="live"
          item={{ id: String(ch.stream_id), name: ch.name, image: ch.stream_icon }}
        />
      </div>
    </div>
  );
}
