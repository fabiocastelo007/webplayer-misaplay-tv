import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  User,
  CalendarClock,
  CheckCircle2,
  MessageCircle,
  Download,
  Trash2,
  Play,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { loadSession } from "@/lib/xtream";
import { listDownloads, removeDownload, type DownloadItem } from "@/lib/downloads";
import { BRAND, PLANS, formatKz, whatsappRenewalLink, type Plan } from "@/lib/config";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({ meta: [{ title: "Minha Conta — Misaplay TV" }] }),
  component: ContaPage,
});

function ContaPage() {
  const { session } = Route.useRouteContext() as {
    session: ReturnType<typeof loadSession>;
  };
  const username = session?.username ?? "—";
  const pkg = session?.package ?? "PREMIUM";
  const pkgLabel = pkg === "MAX" ? "Pacote Max" : "Pacote Premium";
  const status = session?.user_info?.status ?? "—";
  const exp = session?.user_info?.exp_date
    ? new Date(Number(session.user_info.exp_date) * 1000)
    : null;
  const expLabel = exp ? exp.toLocaleDateString("pt-AO") : "—";
  const daysLeft = exp ? Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[0]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [progress, setProgress] = useState<Record<string, { loaded: number; total: number; done?: boolean; error?: string }>>({});

  useEffect(() => {
    setDownloads(listDownloads());
    const handler = () => setDownloads(listDownloads());
    window.addEventListener("misaplay-downloads-changed", handler);
    return () => window.removeEventListener("misaplay-downloads-changed", handler);
  }, []);

  const downloadWithProgress = async (item: DownloadItem) => {
    const extMatch = item.url.match(/\.([a-zA-Z0-9]{2,4})(?:\?|$)/);
    const ext = extMatch ? extMatch[1] : "mp4";
    const safe = item.title.replace(/[^a-zA-Z0-9-_. ]/g, "").slice(0, 100) || "video";
    const filename = `${safe}.${ext}`;
    const proxied = `/api/public/download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(filename)}`;
    setProgress((p) => ({ ...p, [item.id]: { loaded: 0, total: 0 } }));
    try {
      const res = await fetch(proxied);
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get("content-length") || 0);
      const reader = res.body.getReader();
      const chunks: BlobPart[] = [];
      let loaded = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.byteLength;
          setProgress((p) => ({ ...p, [item.id]: { loaded, total } }));
        }
      }
      const blob = new Blob(chunks);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
      setProgress((p) => ({ ...p, [item.id]: { loaded, total: total || loaded, done: true } }));
      toast.success(`Download concluído: ${item.title}`);
    } catch (e) {
      setProgress((p) => ({ ...p, [item.id]: { loaded: 0, total: 0, error: (e as Error).message } }));
      toast.error("Falha no download. Tente novamente.");
    }
  };

  const fmtBytes = (n: number) => {
    if (!n) return "0 B";
    const u = ["B", "KB", "MB", "GB"];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
  };

  const handleRenew = () => {
    const link = whatsappRenewalLink({ username, plan: selectedPlan, pkg });
    window.open(link, "_blank", "noopener,noreferrer");
    toast.success("Pedido enviado pelo WhatsApp. Aguarde a confirmação.");
  };

  return (
    <main className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Minha conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gere a sua assinatura, renove o pacote e aceda aos seus downloads offline.
        </p>

        {/* Subscription card */}
        <section className="mt-6 grid gap-4 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 to-accent/10 p-6 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <User className="size-4" /> Conta
            </div>
            <p className="mt-1 text-xl font-semibold">{username}</p>
            <p className="text-sm text-muted-foreground">{pkgLabel}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <CalendarClock className="size-4" /> Validade
            </div>
            <p className="mt-1 text-xl font-semibold">{expLabel}</p>
            <p className="flex items-center gap-1 text-sm">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span className="text-muted-foreground">
                Status: <span className="font-medium text-foreground">{status}</span>
                {daysLeft !== null
                  ? daysLeft > 0
                    ? ` · ${daysLeft} dia${daysLeft === 1 ? "" : "s"} restantes`
                    : " · expirado"
                  : null}
              </span>
            </p>
          </div>
        </section>

        {/* Renewal plans */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">Renovar assinatura</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha o seu plano. Ao confirmar, o pedido é enviado por WhatsApp para o nosso suporte.
            Assim que o servidor renovar a sua conta, você recebe a notificação de confirmação.
          </p>

          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => {
              const active = selectedPlan.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(p)}
                    className={
                      "flex w-full flex-col items-start rounded-2xl border p-5 text-left transition " +
                      (active
                        ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                        : "border-border/60 bg-secondary/40 hover:border-primary/60")
                    }
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {p.label}
                    </span>
                    <span className="mt-2 text-3xl font-extrabold">
                      {new Intl.NumberFormat("pt-PT").format(p.price)}
                      <span className="ml-1 text-base font-semibold text-muted-foreground">Kz</span>
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {p.months} {p.months === 1 ? "mês" : "meses"} de acesso
                    </span>
                    {active ? (
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        <CheckCircle2 className="size-3.5" /> Seleccionado
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-secondary/40 p-4">
            <div className="flex-1">
              <p className="text-sm">
                Plano <strong>{selectedPlan.label}</strong> · {pkgLabel} ·
                <strong className="ml-1">{formatKz(selectedPlan.price)}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Será enviada uma mensagem pré-preenchida para {BRAND.phone}.
              </p>
            </div>
            <Button onClick={handleRenew} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <MessageCircle className="size-5" /> Renovar via WhatsApp
            </Button>
          </div>
        </section>

        {/* Downloads */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Download className="size-6" /> Meus downloads
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Filmes e episódios que você baixou neste dispositivo para assistir offline.
          </p>

          {downloads.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              Nenhum download ainda. Abra um filme ou episódio e clique em
              <strong className="text-foreground"> "Baixar para assistir offline"</strong>.
            </div>
          ) : (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {downloads.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3 ring-1 ring-border/40"
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-md bg-secondary">
                    {d.image ? (
                      <img src={d.image} alt={d.title} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.kind === "movie" ? "Filme" : "Episódio"} ·{" "}
                      {new Date(d.addedAt).toLocaleDateString("pt-AO")}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="icon" title="Abrir/Reproduzir">
                    <a href={d.url} target="_blank" rel="noopener noreferrer">
                      <Play className="size-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Remover da lista"
                    onClick={() => removeDownload(d.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Contacts */}
        <section className="mt-12 grid gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-6 sm:grid-cols-3">
          <a href={`tel:+${BRAND.phoneRaw}`} className="flex items-center gap-3 text-sm hover:text-primary">
            <Phone className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="font-medium">{BRAND.phone}</p>
            </div>
          </a>
          <a href={`mailto:${BRAND.email}`} className="flex items-center gap-3 text-sm hover:text-primary">
            <Mail className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{BRAND.email}</p>
            </div>
          </a>
          <a
            href={`https://${BRAND.site}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm hover:text-primary"
          >
            <Globe className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Site</p>
              <p className="font-medium">{BRAND.site}</p>
            </div>
          </a>
        </section>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Voltar para o início
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
