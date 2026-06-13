import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { xtreamLogin } from "@/lib/xtream.functions";
import { loadSession, saveSession, type XtreamUserInfo, type XtreamServerInfo, type XtreamPackage } from "@/lib/xtream";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import postersBg from "@/assets/posters-bg.jpg";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acessar — Misaplay TV" },
      { name: "description", content: "Entre com seu usuário e senha para assistir filmes, séries, TV ao vivo e desporto." },
      { property: "og:title", content: "Acessar — Misaplay TV" },
      { property: "og:description", content: "Entre com seu usuário e senha para assistir filmes, séries, TV ao vivo e desporto." },
    ],
  }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (loadSession()) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const login = useServerFn(xtreamLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { loadSettings } = await import("@/lib/settings");
      const servers = loadSettings().servers;
      const result = await login({ data: { username: username.trim(), password, servers } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      saveSession({
        package: result.package as XtreamPackage,
        dns: result.dns,
        username: result.username,
        password: result.password,
        user_info: result.user_info as unknown as XtreamUserInfo,
        server_info: result.server_info as unknown as XtreamServerInfo,
        loggedAt: Date.now(),
      });
      toast.success(`Conectado no ${result.package === "MAX" ? "Pacote Max" : "Pacote Premium"}`);
      navigate({ to: "/perfis" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
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

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo className="h-10 w-auto" />
        <a
          href={`https://wa.me/${BRAND.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
        >
          Suporte: {BRAND.phone}
        </a>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-md items-center justify-center px-6 pb-12">
        <div className="glass-card w-full rounded-2xl p-8 sm:p-10">
          <div className="mb-7 text-center">
            <Logo className="mx-auto mb-4 h-14 w-auto" />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">BEM-VINDO</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acesse com seu usuário e senha. Validamos automaticamente nos servidores Max e Premium.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="seu_usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={120}
                className="h-12 bg-secondary/60 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={200}
                className="h-12 bg-secondary/60 text-base"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full text-base font-semibold"
              size="lg"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : <>▶ ACESSAR CONTEÚDO</>}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Não tem conta? Fale connosco no WhatsApp{" "}
            <a
              href={`https://wa.me/${BRAND.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {BRAND.phone}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
