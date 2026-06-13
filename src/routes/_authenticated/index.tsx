import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Film, Tv, Clapperboard, ArrowRight, User } from "lucide-react";
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
  const pkgLabel = session?.package === "MAX" ? "Pacote Max" : "Pacote Premium";
  const expIso = session?.user_info?.exp_date
    ? new Date(Number(session.user_info.exp_date) * 1000).toLocaleDateString("pt-BR")
    : null;

  // Quick "Séries" highlights row at top
  const series = useQuery({
    queryKey: ["xtream", "series", "home"],
    queryFn: () => xtream.series(),
    staleTime: 5 * 60_000,
  });

  return (
    <main className="min-h-screen">
      <AppHeader />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Olá, {session?.username}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              O que você quer assistir hoje?
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Conectado em <strong className="text-foreground">{pkgLabel}</strong>
              {expIso ? <> · expira em {expIso}</> : null}.
            </p>
          </div>
          <Link
            to="/conta"
            className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-secondary/60 px-3 py-2 text-sm hover:bg-secondary"
          >
            <User className="size-4" /> Minha conta & renovar
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3">
          {[
            { to: "/filmes" as const, label: "Filmes", desc: "Lançamentos e clássicos", icon: Film, grad: "from-primary/30 to-primary/5" },
            { to: "/series" as const, label: "Séries", desc: "Temporadas completas", icon: Clapperboard, grad: "from-accent/30 to-accent/5" },
            { to: "/tv" as const, label: "TV ao Vivo", desc: "Canais e desporto", icon: Tv, grad: "from-emerald-500/30 to-emerald-500/5" },
          ].map(({ to, label, desc, icon: Icon, grad }) => (
            <li key={to}>
              <Link
                to={to}
                className={`group block rounded-2xl bg-gradient-to-br ${grad} p-6 ring-1 ring-border/50 transition hover:ring-primary/60`}
              >
                <Icon className="size-7 text-foreground/90" />
                <h2 className="mt-3 text-xl font-semibold">{label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Explorar <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured movies section (Prime-style hero + rows) */}
      <section>
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
