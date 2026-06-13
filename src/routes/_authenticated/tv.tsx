import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X, ListVideo } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { xtream, liveStreamUrl, type LiveStream } from "@/lib/xtream-api";

export const Route = createFileRoute("/_authenticated/tv")({
  head: () => ({ meta: [{ title: "TV ao Vivo — Misaplay TV" }] }),
  component: TvPage,
});

function TvPage() {
  const cats = useQuery({
    queryKey: ["xtream", "live", "categories"],
    queryFn: () => xtream.liveCategories(),
    staleTime: 5 * 60_000,
  });
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const streams = useQuery({
    queryKey: ["xtream", "live", "streams", activeCat],
    queryFn: () => xtream.liveStreams(activeCat === "all" ? undefined : activeCat),
    staleTime: 60_000,
  });
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const list = streams.data ?? [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
  }, [streams.data, query]);

  const [current, setCurrent] = useState<LiveStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showList, setShowList] = useState(false);

  const openChannel = async (ch: LiveStream) => {
    setCurrent(ch);
    setShowList(false);
    // request fullscreen on user gesture
    const el = containerRef.current;
    if (el && !document.fullscreenElement) {
      try {
        await el.requestFullscreen();
      } catch {
        /* user denied or unsupported */
      }
    }
  };

  // Close player handler
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        // user exited fullscreen — stop playing
        setCurrent(null);
        setShowList(false);
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
            <CatBtn active={activeCat === "all"} onClick={() => setActiveCat("all")}>
              Todos
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
          <p className="text-sm text-muted-foreground">Nenhum canal encontrado.</p>
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

      {/* Fullscreen player container */}
      <div
        ref={containerRef}
        className={
          current
            ? "fixed inset-0 z-50 flex bg-black"
            : "pointer-events-none fixed inset-0 z-50 hidden"
        }
      >
        {current ? (
          <>
            <div className="relative flex-1">
              <VideoPlayer src={liveStreamUrl(current.stream_id)} hls poster={current.stream_icon} />

              {/* top bar */}
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent p-4">
                <div className="flex items-center gap-3 text-white">
                  {current.stream_icon ? (
                    <img src={current.stream_icon} alt="" className="h-8 w-8 rounded object-contain" />
                  ) : null}
                  <span className="font-semibold">{current.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowList((s) => !s)}
                    className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
                  >
                    <ListVideo className="size-4" /> Canais
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

            {/* channel sidebar overlay */}
            {showList ? (
              <aside className="absolute right-0 top-0 z-20 flex h-full w-[320px] max-w-[85vw] flex-col border-l border-white/10 bg-black/85 backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/10 p-3 text-white">
                  <span className="text-sm font-semibold">Trocar canal</span>
                  <button onClick={() => setShowList(false)} className="rounded p-1 hover:bg-white/10">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="border-b border-white/10 p-2">
                  <Input
                    placeholder="Buscar..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-9 bg-white/10 text-white placeholder:text-white/50"
                  />
                </div>
                <ul className="flex-1 overflow-y-auto py-1">
                  {filtered.map((ch) => (
                    <li key={ch.stream_id}>
                      <button
                        onClick={() => {
                          setCurrent(ch);
                          setShowList(false);
                        }}
                        className={
                          "flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-white hover:bg-white/10 " +
                          (ch.stream_id === current.stream_id ? "bg-white/15" : "")
                        }
                      >
                        {ch.stream_icon ? (
                          <img src={ch.stream_icon} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
                        ) : (
                          <div className="h-8 w-8 shrink-0 rounded bg-white/10" />
                        )}
                        <span className="line-clamp-2">{ch.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
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

function ChannelCard({ ch, onPlay }: { ch: LiveStream; onPlay: (c: LiveStream) => void }) {
  return (
    <button
      onClick={() => onPlay(ch)}
      className="group flex w-full flex-col items-center gap-2 rounded-lg bg-secondary/50 p-3 ring-1 ring-border/40 transition hover:ring-primary"
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
  );
}
