import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Film, Tv, Clapperboard, User, Home, Users, Shield, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession, loadSession } from "@/lib/xtream";
import { Logo } from "@/components/Logo";
import { clearActiveProfile, getActiveProfile, onProfilesChanged, type Profile } from "@/lib/profiles";
import { isAdmin, onSettingsChanged } from "@/lib/settings";

export function AppHeader() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = typeof window !== "undefined" ? loadSession() : null;
  const pkgLabel = session?.package === "MAX" ? "Pacote Max" : "Pacote Premium";
  const expTs = session?.user_info?.exp_date ? Number(session.user_info.exp_date) * 1000 : null;
  const daysLeft = expTs ? Math.ceil((expTs - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const showExpiryAlert = daysLeft !== null && daysLeft <= 5;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    setProfile(getActiveProfile());
    setAdmin(isAdmin());
    const off1 = onProfilesChanged(() => setProfile(getActiveProfile()));
    const off2 = onSettingsChanged(() => setAdmin(isAdmin()));
    return () => { off1(); off2(); };
  }, []);

  const nav: { to: "/" | "/filmes" | "/series" | "/tv"; label: string; icon: typeof Home; exact?: boolean }[] = [
    { to: "/", label: "Início", icon: Home, exact: true },
    { to: "/filmes", label: "Filmes", icon: Film },
    { to: "/series", label: "Séries", icon: Clapperboard },
    { to: "/tv", label: "TV ao Vivo", icon: Tv },
  ];

  function handleSignOut() {
    clearSession();
    clearActiveProfile();
    navigate({ to: "/auth", replace: true });
  }

  function switchProfile() {
    clearActiveProfile();
    navigate({ to: "/perfis" });
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
          {profile ? (
            <button
              onClick={switchProfile}
              title="Trocar perfil"
              className="flex items-center gap-2 rounded-full bg-secondary/60 py-1 pl-1 pr-3 text-sm hover:bg-secondary"
            >
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-background text-base">
                {profile.avatar && (profile.avatar.startsWith("data:") || profile.avatar.startsWith("http")) ? (
                  <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <span>{profile.avatar ?? "👤"}</span>
                )}
              </span>
              <span className="hidden max-w-[120px] truncate sm:inline">{profile.name}</span>
              <Users className="size-3.5 text-muted-foreground" />
            </button>
          ) : null}
          {showExpiryAlert ? (
            <Link
              to="/conta"
              title={
                daysLeft! > 0
                  ? `Sua assinatura expira em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}`
                  : "Sua assinatura expirou"
              }
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-amber-400 hover:bg-secondary/60"
            >
              <Bell className="size-5 animate-pulse" />
              <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                {daysLeft! > 0 ? daysLeft : "!"}
              </span>
            </Link>
          ) : null}
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
