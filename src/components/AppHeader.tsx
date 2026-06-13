import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Film, Tv, Clapperboard, User, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession, loadSession } from "@/lib/xtream";
import { Logo } from "@/components/Logo";

export function AppHeader() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = typeof window !== "undefined" ? loadSession() : null;
  const pkgLabel = session?.package === "MAX" ? "Pacote Max" : "Pacote Premium";

  const nav: { to: "/" | "/filmes" | "/series" | "/tv"; label: string; icon: typeof Home; exact?: boolean }[] = [
    { to: "/", label: "Início", icon: Home, exact: true },
    { to: "/filmes", label: "Filmes", icon: Film },
    { to: "/series", label: "Séries", icon: Clapperboard },
    { to: "/tv", label: "TV ao Vivo", icon: Tv },
  ];

  function handleSignOut() {
    clearSession();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link to="/" className="shrink-0">
            <Logo className="h-9 w-auto" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
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
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant={pathname.startsWith("/conta") ? "secondary" : "ghost"} size="sm">
            <Link to="/conta">
              <User className="size-4" />
              <span className="hidden sm:inline">{session?.username ?? "Conta"}</span>
            </Link>
          </Button>
          <span className="hidden text-xs text-muted-foreground lg:inline">{pkgLabel}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/40 px-3 py-2 md:hidden">
        {nav.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs " +
                (active ? "bg-secondary text-foreground" : "text-muted-foreground")
              }
            >
              <Icon className="size-3.5" /> {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
