import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, PlayCircle, Tv } from "lucide-react";
import postersBg from "@/assets/posters-bg.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acessar — Misaplay Web Player" },
      { name: "description", content: "Entre no seu Web Player para assistir filmes, séries, TV ao vivo e esportes." },
      { property: "og:title", content: "Acessar — Misaplay Web Player" },
      { property: "og:description", content: "Entre no seu Web Player para assistir filmes, séries, TV ao vivo e esportes." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já está acessando o conteúdo.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Não foi possível entrar com o Google");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
    } catch {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Background poster grid */}
      <div className="absolute inset-0 -z-10">
        <img
          src={postersBg}
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-70"
          width={1920}
          height={1280}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.05 0.01 260 / 0.55) 0%, oklch(0.05 0.01 260 / 0.92) 65%, oklch(0.05 0.01 260) 100%)",
          }}
        />
      </div>

      {/* Top brand bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link to="/auth" className="flex items-center gap-2">
          <PlayCircle className="size-7 text-accent" aria-hidden />
          <span className="text-xl font-bold tracking-tight">
            <span className="brand-gradient-text">Misa</span>
            <span className="text-foreground">play</span>
          </span>
        </Link>
        <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
          <Tv className="size-4" aria-hidden />
          Web Player
        </div>
      </header>

      {/* Login card */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-md items-center justify-center px-6 pb-12">
        <div className="glass-card w-full rounded-2xl p-8 sm:p-10">
          <div className="mb-7 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">BEM-VINDO</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Acesse seu conteúdo: filmes, séries, TV ao vivo e esportes."
                : "Crie sua conta para começar a assistir."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-secondary/60 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 bg-secondary/60 text-base"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full text-base font-semibold"
              size="lg"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>▶ {mode === "signin" ? "ACESSAR CONTEÚDO" : "CRIAR CONTA"}</>
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
            className="h-12 w-full border-border/60 bg-secondary/40 text-base font-medium hover:bg-secondary"
          >
            <GoogleIcon /> Continuar com Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-primary hover:underline"
                >
                  Criar agora
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold text-primary hover:underline"
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.46-1.7 4.28-5.5 4.28-3.31 0-6.01-2.74-6.01-6.13S8.69 6.12 12 6.12c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.84 3.55 14.64 2.6 12 2.6 6.86 2.6 2.7 6.76 2.7 11.9c0 5.14 4.16 9.3 9.3 9.3 5.37 0 8.93-3.77 8.93-9.07 0-.61-.07-1.08-.16-1.54H12z" />
    </svg>
  );
}
