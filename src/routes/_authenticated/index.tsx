import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import {
  PrimeShowcase,
  type ShowcaseItem,
} from "@/components/catalog/PrimeShowcase";
import { xtream, type VodStream, type Serie } from "@/lib/xtream-api";

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

  return (
    <main className="min-h-screen">
      <AppHeader />

      {/* Hero carousel + featured movie rows (Prime-style) */}
      <PrimeShowcase
        title="Em destaque — Filmes"
        kind="vod"
        rowLimit={5}
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

      {/* Account quick link */}
      <section className="mx-auto max-w-7xl px-4 pt-2 sm:px-6">
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

      <Footer />
    </main>
  );
}
