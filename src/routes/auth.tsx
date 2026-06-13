import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent, type ChangeEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { xtreamLogin } from "@/lib/xtream.functions";
import { loadSession, saveSession, type XtreamUserInfo, type XtreamServerInfo, type XtreamPackage } from "@/lib/xtream";
import { parseM3U, fetchM3U, saveM3USession } from "@/lib/m3u";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ListVideo } from "lucide-react";
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

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <M3UImportButton
            onLoaded={(count) => {
              toast.success(`${count} canais importados via M3U`);
              navigate({ to: "/perfis" });
            }}
          />

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

function M3UImportButton({ onLoaded }: { onLoaded: (count: number) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(
    "http://misaplay.online/get.php?username=&password=&type=m3u_plus&output=m3u8",
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadFromUrl() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const content = await fetchM3U(url.trim());
      finish(content, url.trim());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao obter lista");
    } finally {
      setBusy(false);
    }
  }

  function loadFromText() {
    if (!text.trim()) return;
    finish(text, "manual");
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const content = await f.text();
    finish(content, f.name);
  }

  function finish(content: string, source: string) {
    const channels = parseM3U(content);
    if (channels.length === 0) {
      toast.error("Nenhum canal válido encontrado na lista");
      return;
    }
    saveM3USession({ source, loadedAt: Date.now(), channels });
    // Stub xtream session so navigation gates pass; TV reads M3U automatically.
    saveSession({
      package: "MAX" as XtreamPackage,
      dns: "m3u://local",
      username: "m3u",
      password: "m3u",
      user_info: { username: "m3u", status: "Active", exp_date: null, is_trial: "0", active_cons: "0", max_connections: "1" } as XtreamUserInfo,
      server_info: { url: "m3u://local", port: "0", server_protocol: "m3u" } as XtreamServerInfo,
      loggedAt: Date.now(),
    });
    setOpen(false);
    onLoaded(channels.length);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mt-3 h-11 w-full" type="button">
          <ListVideo className="size-4" /> Importar lista M3U (Pacote Max offline)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar lista M3U</DialogTitle>
          <DialogDescription>
            Use esta opção se o Pacote Max não responder. A lista é carregada e armazenada no seu dispositivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>URL da lista (.m3u / .m3u8)</Label>
            <div className="flex gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://..." />
              <Button onClick={loadFromUrl} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Carregar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Substitua <code>username</code> e <code>password</code> no URL pelos seus dados.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Ou carregar ficheiro</Label>
            <Input type="file" accept=".m3u,.m3u8,text/plain" onChange={onFile} />
          </div>

          <div className="space-y-2">
            <Label>Ou colar conteúdo M3U</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="#EXTM3U..."
              className="h-28 font-mono text-xs"
            />
            <Button variant="secondary" onClick={loadFromText} className="w-full">
              Usar conteúdo colado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
