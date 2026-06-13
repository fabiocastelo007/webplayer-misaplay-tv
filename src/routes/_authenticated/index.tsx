import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { User, Play, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { PrimeShowcase, type ShowcaseItem } from "@/components/catalog/PrimeShowcase";
import { xtream, type VodStream, type Serie } from "@/lib/xtream-api";
import { listWatchHistory, onWatchHistoryChanged, removeFromHistory, type WatchEntry } from "@/lib/watch-history";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Início — Misaplay TV" }] }),
  component: Home,
});

function Home() {
  const { session } = Route.useRouteContext() as {
    session: ReturnType<typeof import("@/lib/xtream").loadSession>;
  };
  const navigate = useNavigate();

  const series = useQuery({
    queryKey: ["xtream", "series", "home"],
    queryFn: () => xtream.series(),
    staleTime: 5 * 60_000,
  });

  // Continue watching
  const [history, setHistory] = useState<WatchEntry[]>([]);
  useEffect(() => {
    setHistory(listWatchHistory());
    return onWatchHistoryChanged(() => setHistory(listWatchHistory()));
  }, []);

  const resume = (w: WatchEntry) => {
    if (w.type === "series") {
      navigate({
        to: "/watch/$type/$id",
        params: { type: "series", id: w.id },
        search: { ext: w.ext || "mp4", title: w.title, image: w.image },
      });
    } else if (w.type === "movie") {
      navigate({
        to: "/watch/$type/$id",
        params: { type: "movie", id: w.id },
        search: { ext: w.ext || "mp4", title: w.title, image: w.image },
      });
    }
  };

  const ContinueRow = history.length ? (
    <section>
      <h3 className="mb-3 text-lg font-semibold tracking-tight sm:text-xl">Continuar a assistir</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {history.slice(0, 18).map((w) => {
          const pct = w.duration > 0 ? Math.min(100, (w.position / w.duration) * 100) : 5;
          return (
            <div
              key={w.key}
              className="group relative w-[220px] shrink-0 overflow-hidden rounded-lg bg-secondary/50 ring-1 ring-border/40 hover:ring-primary"
            >
              <button onClick={() => resume(w)} className="block w-full text-left">
                <div className="relative aspect-video w-full bg-background">
                  {w.image ? (
                    <img src={w.image} alt={w.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 transition group-hover:opacity-100" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                    <span className="rounded-full bg-white/95 p-2 text-black">
                      <Play className="size-5 fill-current" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <p className="line-clamp-1 px-2 py-2 text-xs font-medium">{w.title}</p>
              </button>
              <button
                onClick={() => removeFromHistory(w.key)}
                aria-label="Remover do histórico"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition hover:bg-black/90 group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  ) : null;

  return (
    <main className="min-h-screen">
      <AppHeader />

      <PrimeShowcase
        title="Em destaque — Filmes"
        kind="vod"
        rowLimit={5}
        hideCategoryBar
        topSlot={ContinueRow}
        fetchCategories={() => xtream.vodCategories()}
        fetchItems={async (cat) => {
          const list = await xtream.vodStreams(cat);
          return list.map((v: VodStream) => ({
            id: v.stream_id,
            name: v.name,
            image: v.stream_icon,
            category_id: v.category_id,
            ext: v.container_extension,
          }));
        }}
        onPlay={(item: ShowcaseItem) =>
          navigate({
            to: "/watch/$type/$id",
            params: { type: "movie", id: String(item.id) },
            search: { ext: item.ext || "mp4", title: item.name, image: item.image },
          })
        }
      />

      {/* Featured series row */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Séries em destaque</h2>
          <Link to="/series" className="text-sm font-medium text-primary hover:underline">
            Ver tudo →
          </Link>
        </div>
        {series.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(series.data ?? []).slice(0, 24).map((s: Serie) => (
              <Link
                key={s.series_id}
                to="/serie/$id"
                params={{ id: String(s.series_id) }}
                className="w-[150px] shrink-0 overflow-hidden rounded-lg bg-secondary/50 ring-1 ring-border/40 hover:ring-primary sm:w-[170px]"
              >
                <div className="aspect-[2/3] w-full bg-secondary">
                  {s.cover ? (
                    <img src={s.cover} alt={s.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <p className="line-clamp-2 p-2 text-xs font-medium">{s.name}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Account / Sessão — agora no fim */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-secondary/40 p-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Sessão</p>
            <p className="truncate text-sm font-semibold">
              {session?.username} ·{" "}
              <span className="text-primary">
                {session?.package === "MAX" ? "Pacote Max" : "Pacote Premium"}
              </span>
            </p>
          </div>
          <Link
            to="/conta"
            className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-secondary"
          >
            <User className="size-4" /> Minha conta & renovar
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
