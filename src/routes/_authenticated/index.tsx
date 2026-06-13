import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Film, Tv, Clapperboard, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
});

function Home() {
  const { session } = Route.useRouteContext() as {
    session: ReturnType<typeof import("@/lib/xtream").loadSession>;
  };
  const pkgLabel = session?.package === "MAX" ? "Pacote Max" : "Pacote Premium";
  const expIso = session?.user_info?.exp_date
    ? new Date(Number(session.user_info.exp_date) * 1000).toLocaleDateString("pt-BR")
    : null;

  const tiles = [
    {
      to: "/filmes",
      label: "Filmes",
      desc: "Lançamentos e clássicos sob demanda",
      icon: Film,
      grad: "from-primary/30 to-primary/5",
    },
    {
      to: "/series",
      label: "Séries",
      desc: "Temporadas e episódios completos",
      icon: Clapperboard,
      grad: "from-accent/30 to-accent/5",
    },
    {
      to: "/tv",
      label: "TV ao Vivo",
      desc: "Canais abertos, fechados e regionais",
      icon: Tv,
      grad: "from-emerald-500/30 to-emerald-500/5",
    },
  ] as const;

  return (
    <main className="min-h-screen">
      <AppHeader />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-10">
          <p className="text-sm text-muted-foreground">Olá, {session?.username}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            O que você quer assistir hoje?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Conectado em <strong className="text-foreground">{pkgLabel}</strong>
            {expIso ? <> · expira em {expIso}</> : null}.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3">
          {tiles.map(({ to, label, desc, icon: Icon, grad }) => (
            <li key={to}>
              <Link
                to={to}
                className={`group block rounded-2xl bg-gradient-to-br ${grad} p-6 ring-1 ring-border/50 transition hover:ring-primary/60`}
              >
                <Icon className="size-8 text-foreground/90" />
                <h2 className="mt-4 text-xl font-semibold">{label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Explorar <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
