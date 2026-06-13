import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/xtream";
import { PlayCircle, LogOut, Film, Tv, Trophy, Clapperboard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { session } = Route.useRouteContext() as { session: ReturnType<typeof import("@/lib/xtream").loadSession> };

  function handleSignOut() {
    clearSession();
    navigate({ to: "/auth", replace: true });
  }

  const pkgLabel = session?.package === "MAX" ? "Pacote Max" : "Pacote Premium";
  const expIso = session?.user_info?.exp_date
    ? new Date(Number(session.user_info.exp_date) * 1000).toLocaleDateString("pt-BR")
    : null;

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2">
          <PlayCircle className="size-7 text-accent" aria-hidden />
          <span className="text-xl font-bold tracking-tight">
            <span className="brand-gradient-text">Misa</span>
            <span className="text-foreground">play</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {session?.username} · {pkgLabel}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Bem-vindo ao Web Player</h1>
        <p className="mt-4 text-base text-muted-foreground">
          Conectado em <strong className="text-foreground">{pkgLabel}</strong>
          {expIso ? <> · expira em {expIso}</> : null}.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Em breve: catálogo de filmes, séries, TV ao vivo e esportes.
        </p>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Film, label: "Filmes" },
            { icon: Clapperboard, label: "Séries" },
            { icon: Tv, label: "TV ao Vivo" },
            { icon: Trophy, label: "Esportes" },
          ].map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="glass-card flex flex-col items-center gap-2 rounded-xl px-4 py-6 text-sm"
            >
              <Icon className="size-6 text-primary" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
