import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Heart, Maximize2, Tv } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
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
  const [autoPicked, setAutoPicked] = useState(false);
  useEffect(() => {
    if (autoPicked || !cats.data) return;
    const angola = cats.data.find((c) => /angola/i.test(c.category_name));
    if (angola) setActiveCat(angola.category_id);
    setAutoPicked(true);
  }, [cats.data, autoPicked]);
  const streams = useQuery({
    queryKey: ["xtream", "live", "streams", activeCat === FAV_CAT ? "all" : activeCat],
    queryFn: () =>
      xtream.liveStreams(
        activeCat === "all" || activeCat === FAV_CAT ? undefined : (activeCat as string),
      ),
    staleTime: 60_000,
  });
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<LiveStream | null>(null);
  const playerWrapRef = useRef<HTMLDivElement>(null);

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

  const goFullscreen = async () => {
    const el = playerWrapRef.current;
    if (el && !document.fullscreenElement) {
      try {
        await el.requestFullscreen();
      } catch {
        /* ignore */
      }
    }
  };

  const openChannel = (ch: LiveStream) => {
    setCurrent(ch);
  };

  return (
    <main className="min-h-screen">
      <AppHeader />

      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4">
        <h1 className="mb-3 text-xl font-bold tracking-tight sm:text-2xl">TV ao Vivo</h1>

        <div className="grid gap-3 lg:grid-cols-[200px_280px_minmax(0,1fr)]">
          {/* Categories column */}
          <aside className="rounded-xl bg-secondary/40 ring-1 ring-border/40">
            <div className="max-h-[70vh] overflow-y-auto py-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              <CatRow active={activeCat === "all"} onClick={() => setActiveCat("all")}>
                <Tv className="size-3.5" /> Todos
              </CatRow>
              <CatRow active={activeCat === FAV_CAT} onClick={() => setActiveCat(FAV_CAT)}>
                <Heart className="size-3.5" /> Favoritos
              </CatRow>
              {cats.data?.map((c) => (
                <CatRow
                  key={c.category_id}
                  active={activeCat === c.category_id}
                  onClick={() => setActiveCat(c.category_id)}
                >
                  {c.category_name}
                </CatRow>
              ))}
            </div>
          </aside>

          {/* Channels column */}
          <section className="rounded-xl bg-secondary/40 ring-1 ring-border/40">
            <div className="border-b border-border/40 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar canal..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 bg-background/60 pl-8 text-sm"
                />
              </div>
            </div>
            <ul className="max-h-[calc(70vh-56px)] overflow-y-auto py-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {streams.isLoading ? (
                <li className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Carregando...
                </li>
              ) : filtered.length === 0 ? (
                <li className="px-3 py-4 text-sm text-muted-foreground">
                  {activeCat === FAV_CAT ? "Sem favoritos." : "Nenhum canal."}
                </li>
              ) : (
                filtered.map((ch) => {
                  const active = current?.stream_id === ch.stream_id;
                  return (
                    <li key={ch.stream_id}>
                      <button
                        onClick={() => openChannel(ch)}
                        className={
                          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition " +
                          (active
                            ? "bg-primary/15 font-semibold text-primary ring-1 ring-primary/60"
                            : "hover:bg-secondary")
                        }
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {ch.stream_icon ? (
                            <img
                              src={ch.stream_icon}
                              alt=""
                              loading="lazy"
                              className="h-6 w-6 shrink-0 rounded object-contain"
                            />
                          ) : (
                            <Tv className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{ch.name}</span>
                        </span>
                        <FavoriteButton
                          kind="live"
                          item={{ id: String(ch.stream_id), name: ch.name, image: ch.stream_icon }}
                          className="!bg-transparent !p-0 !text-muted-foreground hover:!text-foreground"
                        />
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          {/* Player column */}
          <section className="min-w-0">
            <div
              ref={playerWrapRef}
              className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-border/40"
            >
              {current ? (
                <>
                  <VideoPlayer
                    src={liveStreamUrl(current.stream_id)}
                    hls
                    poster={current.stream_icon}
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-3">
                    <div className="pointer-events-auto flex min-w-0 items-center gap-2 text-white">
                      {current.stream_icon ? (
                        <img src={current.stream_icon} alt="" className="h-7 w-7 rounded object-contain" />
                      ) : null}
                      <span className="truncate text-sm font-semibold">{current.name}</span>
                    </div>
                    <button
                      onClick={goFullscreen}
                      className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
                    >
                      <Maximize2 className="size-3.5" /> Tela cheia
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Tv className="size-10 opacity-50" />
                  <p className="text-sm">Selecione um canal para começar</p>
                </div>
              )}
            </div>
            {current ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-3 py-2 ring-1 ring-border/40">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
                    <span className="size-1.5 animate-pulse rounded-full bg-red-500" /> Ao vivo
                  </span>
                  <span className="truncate text-sm font-medium">{current.name}</span>
                </div>
                <FavoriteButton
                  kind="live"
                  item={{ id: String(current.stream_id), name: current.name, image: current.stream_icon }}
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function CatRow({
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
        "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition " +
        (active
          ? "bg-primary/15 font-semibold text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}
