import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { PlayCircle, LogOut, Film, Tv, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession, loadSession } from "@/lib/xtream";

export function AppHeader() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = typeof window !== "undefined" ? loadSession() : null;
  const pkgLabel = session?.package === "MAX" ? "Pacote Max" : "Pacote Premium";

  const nav = [
    { to: "/filmes", label: "Filmes", icon: Film },
    { to: "/series", label: "Séries", icon: Clapperboard },
    { to: "/tv", label: "TV ao Vivo", icon: Tv },
  ] as const;

  function handleSignOut() {
    clearSession();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <PlayCircle className="size-7 text-accent" aria-hidden />
            <span className="text-lg font-bold tracking-tight">
              <span className="brand-gradient-text">Misa</span>
              <span className="text-foreground">play</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className={
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition " +
                    (active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground")
                  }
                >
                  <Icon className="size-4" /> {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {session?.username} · {pkgLabel}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
