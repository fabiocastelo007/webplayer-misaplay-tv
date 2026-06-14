import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, LogOut, Plus, Trash2, Save } from "lucide-react";
import {
  defaultSettings,
  isAdmin,
  loadSettings,
  saveSettings,
  tryAdminLogin,
  adminLogout,
  type AdminSettings,
} from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Administração — Misaplay TV" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [admin, setAdmin] = useState(false);
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    setAdmin(isAdmin());
  }, []);

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (tryAdminLogin(pwd)) {
      setAdmin(true);
      toast.success("Acesso de administrador concedido");
    } else {
      toast.error("Senha incorrecta");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Shield className="size-6 text-primary" />
          <h1 className="text-2xl font-bold">Administração</h1>
        </div>

        {!admin ? (
          <form onSubmit={handleLogin} className="glass-card mx-auto max-w-sm space-y-4 rounded-2xl p-6">
            <p className="text-sm text-muted-foreground">
              Área restrita. Insira a senha de administrador.
            </p>
            <div className="space-y-2">
              <Label htmlFor="pwd">Senha</Label>
              <Input
                id="pwd"
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">Entrar</Button>
            <p className="text-xs text-muted-foreground">
              Senha inicial: <code>misaplay2026</code> (altere após o primeiro acesso).
            </p>
          </form>
        ) : (
          <AdminPanel onLogout={() => { adminLogout(); setAdmin(false); }} />
        )}
      </main>
      <Footer />
    </div>
  );
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [s, setS] = useState<AdminSettings>(() => loadSettings());

  function persist(next: AdminSettings) {
    setS(next);
    saveSettings(next);
    toast.success("Configurações guardadas");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mudanças aplicam-se imediatamente em toda a aplicação.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => persist(defaultSettings())}>
            Restaurar padrão
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </div>

      <Tabs defaultValue="servers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="servers">Servidores</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="brand">Contactos</TabsTrigger>
          <TabsTrigger value="texts">Textos</TabsTrigger>
          <TabsTrigger value="posters">Cartazes</TabsTrigger>
          <TabsTrigger value="colors">Cores</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>


        <TabsContent value="servers" className="space-y-3">
          {s.servers.map((srv, i) => (
            <div key={i} className="glass-card grid gap-3 rounded-xl p-4 sm:grid-cols-[140px_1fr_1fr]">
              <div className="space-y-1">
                <Label>ID</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-secondary/60 px-2 text-sm"
                  value={srv.id}
                  onChange={(e) => {
                    const v = [...s.servers]; v[i] = { ...srv, id: e.target.value as "MAX" | "PREMIUM" };
                    setS({ ...s, servers: v });
                  }}
                >
                  <option value="MAX">MAX</option>
                  <option value="PREMIUM">PREMIUM</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={srv.label} onChange={(e) => {
                  const v = [...s.servers]; v[i] = { ...srv, label: e.target.value };
                  setS({ ...s, servers: v });
                }} />
              </div>
              <div className="space-y-1">
                <Label>DNS (http://… ou https://…)</Label>
                <div className="flex gap-2">
                  <Input value={srv.dns} onChange={(e) => {
                    const v = [...s.servers]; v[i] = { ...srv, dns: e.target.value.trim() };
                    setS({ ...s, servers: v });
                  }} />
                  <Button variant="ghost" size="icon" onClick={() => {
                    const v = s.servers.filter((_, idx) => idx !== i);
                    setS({ ...s, servers: v });
                  }}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setS({
              ...s, servers: [...s.servers, { id: "PREMIUM", label: "Novo servidor", dns: "https://" }],
            })}><Plus className="size-4" /> Adicionar servidor</Button>
            <Button size="sm" onClick={() => persist(s)}><Save className="size-4" /> Guardar</Button>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-3">
          {s.plans.map((p, i) => (
            <div key={i} className="glass-card grid gap-3 rounded-xl p-4 sm:grid-cols-[1fr_1fr_120px_140px_60px]">
              <div className="space-y-1"><Label>ID</Label>
                <Input value={p.id} onChange={(e) => { const v = [...s.plans]; v[i] = { ...p, id: e.target.value }; setS({ ...s, plans: v }); }} /></div>
              <div className="space-y-1"><Label>Nome</Label>
                <Input value={p.label} onChange={(e) => { const v = [...s.plans]; v[i] = { ...p, label: e.target.value }; setS({ ...s, plans: v }); }} /></div>
              <div className="space-y-1"><Label>Meses</Label>
                <Input type="number" min={1} value={p.months} onChange={(e) => { const v = [...s.plans]; v[i] = { ...p, months: Number(e.target.value) }; setS({ ...s, plans: v }); }} /></div>
              <div className="space-y-1"><Label>Preço (Kz)</Label>
                <Input type="number" min={0} value={p.price} onChange={(e) => { const v = [...s.plans]; v[i] = { ...p, price: Number(e.target.value) }; setS({ ...s, plans: v }); }} /></div>
              <div className="flex items-end">
                <Button variant="ghost" size="icon" onClick={() => setS({ ...s, plans: s.plans.filter((_, idx) => idx !== i) })}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setS({ ...s, plans: [...s.plans, { id: "novo", label: "Novo plano", months: 1, price: 0 }] })}><Plus className="size-4" /> Adicionar plano</Button>
            <Button size="sm" onClick={() => persist(s)}><Save className="size-4" /> Guardar</Button>
          </div>
        </TabsContent>

        <TabsContent value="brand" className="space-y-3">
          <div className="glass-card grid gap-3 rounded-xl p-4 sm:grid-cols-2">
            {([
              ["name", "Nome da marca"],
              ["site", "Website (sem https://)"],
              ["email", "Email de suporte"],
              ["phone", "Telefone (exibição)"],
              ["phoneRaw", "Telefone (apenas dígitos)"],
              ["whatsapp", "WhatsApp (apenas dígitos)"],
            ] as const).map(([k, label]) => (
              <div key={k} className="space-y-1">
                <Label>{label}</Label>
                <Input value={s.brand[k]} onChange={(e) => setS({ ...s, brand: { ...s.brand, [k]: e.target.value } })} />
              </div>
            ))}
          </div>
          <Button size="sm" onClick={() => persist(s)}><Save className="size-4" /> Guardar</Button>
        </TabsContent>

        <TabsContent value="texts" className="space-y-3">
          <div className="glass-card grid gap-3 rounded-xl p-4">
            {([
              ["welcomeTitle", "Título da página de login", "input"],
              ["welcomeSubtitle", "Subtítulo da página de login", "textarea"],
              ["signupNote", "Nota de inscrição (use {phone} e {email})", "textarea"],
              ["footerTagline", "Slogan do rodapé", "textarea"],
              ["supportHours", "Texto de suporte (rodapé)", "textarea"],
            ] as const).map(([k, label, kind]) => (
              <div key={k} className="space-y-1">
                <Label>{label}</Label>
                {kind === "textarea" ? (
                  <textarea
                    className="min-h-[68px] w-full rounded-md border border-input bg-secondary/60 p-2 text-sm"
                    value={s.texts[k]}
                    onChange={(e) => setS({ ...s, texts: { ...s.texts, [k]: e.target.value } })}
                  />
                ) : (
                  <Input
                    value={s.texts[k]}
                    onChange={(e) => setS({ ...s, texts: { ...s.texts, [k]: e.target.value } })}
                  />
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Dica: na "Nota de inscrição", os marcadores <code>{"{phone}"}</code> e <code>{"{email}"}</code> são
              substituídos automaticamente pelos contactos definidos na aba <strong>Contactos</strong>.
            </p>
          </div>
          <Button size="sm" onClick={() => persist(s)}><Save className="size-4" /> Guardar</Button>
        </TabsContent>


        <TabsContent value="posters" className="space-y-3">
          <div className="glass-card space-y-4 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Total: <strong>{s.loginPosters.length}</strong> cartazes
              </p>
              <div className="ml-auto flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-secondary/60 px-3 py-1.5 text-sm hover:bg-secondary">
                  <Plus className="size-4" /> Carregar imagens
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (!files.length) return;
                      const dataUrls = await Promise.all(
                        files.map((f) => compressImage(f, 400, 0.8)),
                      );
                      const next = { ...s, loginPosters: [...s.loginPosters, ...dataUrls] };
                      const ok = trySaveSettings(next);
                      if (ok) {
                        setS(next);
                        toast.success(`${dataUrls.length} imagem(ns) adicionada(s) e guardada(s)`);
                      } else {
                        toast.error("Espaço cheio. Remova alguns cartazes antes de adicionar mais.");
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setS({ ...s, loginPosters: [...s.loginPosters, ""] })
                  }
                >
                  <Plus className="size-4" /> Adicionar URL
                </Button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {s.loginPosters.map((u, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-input bg-secondary/40 p-2"
                >
                  <div className="flex size-6 shrink-0 items-center justify-center rounded bg-background text-[10px] font-bold">
                    {i + 1}
                  </div>
                  {u ? (
                    <img
                      src={u}
                      alt={`Cartaz ${i + 1}`}
                      className="h-16 w-11 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-16 w-11 shrink-0 rounded bg-muted" />
                  )}
                  <Input
                    value={u.startsWith("data:") ? `(imagem carregada • ${Math.round(u.length / 1024)} KB)` : u}
                    readOnly={u.startsWith("data:")}
                    placeholder="https://image.tmdb.org/t/p/w500/..."
                    className="font-mono text-xs"
                    onChange={(e) => {
                      if (u.startsWith("data:")) return;
                      const v = [...s.loginPosters];
                      v[i] = e.target.value;
                      setS({ ...s, loginPosters: v });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setS({
                        ...s,
                        loginPosters: s.loginPosters.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Carregue imagens do seu dispositivo (convertidas automaticamente)
              ou cole URLs de cartazes do TMDB
              (<code>image.tmdb.org/t/p/w500/...</code>). O número à esquerda
              identifica cada cartaz.
            </p>
          </div>
          <Button size="sm" onClick={() => persist(s)}>
            <Save className="size-4" /> Guardar
          </Button>
        </TabsContent>

        <TabsContent value="colors" className="space-y-3">

          <div className="glass-card grid gap-3 rounded-xl p-4 sm:grid-cols-3">
            {([
              ["background", "Fundo"],
              ["primary", "Primária (botões)"],
              ["accent", "Realce (destaque)"],
            ] as const).map(([k, label]) => (
              <div key={k} className="space-y-1">
                <Label>{label}</Label>
                <Input value={s.colors[k]} onChange={(e) => setS({ ...s, colors: { ...s.colors, [k]: e.target.value } })} />
                <p className="text-xs text-muted-foreground">Formato CSS, ex: <code>oklch(0.62 0.20 252)</code> ou <code>#3b82f6</code></p>
              </div>
            ))}
          </div>
          <Button size="sm" onClick={() => persist(s)}><Save className="size-4" /> Guardar e aplicar</Button>
        </TabsContent>

        <TabsContent value="security" className="space-y-3">
          <div className="glass-card space-y-3 rounded-xl p-4">
            <div className="space-y-1">
              <Label>Nova senha de administrador</Label>
              <Input type="text" value={s.adminPassword} onChange={(e) => setS({ ...s, adminPassword: e.target.value })} />
              <p className="text-xs text-muted-foreground">Use uma senha forte. Guarde-a em local seguro.</p>
            </div>
            <Button size="sm" onClick={() => persist(s)}><Save className="size-4" /> Guardar</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
