import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, Plus, Pencil, Trash2, LogOut, Check, X, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_PROFILES,
  createProfile,
  defaultAvatarFor,
  deleteProfile,
  listProfiles,
  onProfilesChanged,
  setActiveProfile,
  updateProfile,
  type Profile,
} from "@/lib/profiles";
import { clearSession } from "@/lib/xtream";

export const Route = createFileRoute("/_authenticated/perfis")({
  head: () => ({ meta: [{ title: "Quem está assistindo? — Misaplay TV" }] }),
  component: PerfisPage,
});

const AVATARS = ["🦸", "👩", "🧑", "👦", "👧", "🐱", "🐶", "🦊", "🐼", "🦁", "🐯", "🐵"];

function PerfisPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [manage, setManage] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [pinFor, setPinFor] = useState<Profile | null>(null);
  const [pinTry, setPinTry] = useState("");

  useEffect(() => {
    setProfiles(listProfiles());
    return onProfilesChanged(() => setProfiles(listProfiles()));
  }, []);

  function pickProfile(p: Profile) {
    if (manage) {
      setEditing(p);
      return;
    }
    if (p.pin) {
      setPinFor(p);
      setPinTry("");
      return;
    }
    setActiveProfile(p.id);
    navigate({ to: "/" });
  }

  function confirmPin() {
    if (!pinFor) return;
    if (pinTry === pinFor.pin) {
      setActiveProfile(pinFor.id);
      navigate({ to: "/" });
    } else {
      toast.error("PIN incorreto");
      setPinTry("");
    }
  }

  function handleSignOut() {
    clearSession();
    navigate({ to: "/auth", replace: true });
  }

  const canAdd = profiles.length < MAX_PROFILES;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-10">
        <Logo className="mb-8 h-10 w-auto" />
        <h1 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Quem está assistindo?
        </h1>

        <div className="flex flex-wrap items-start justify-center gap-8">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => pickProfile(p)}
              className="group flex flex-col items-center gap-3"
            >
              <div className="relative">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-secondary text-5xl ring-2 ring-transparent transition group-hover:ring-primary sm:h-32 sm:w-32">
                  <span>{p.avatar || defaultAvatarFor(p.name)}</span>
                </div>
                {p.pin && !manage ? (
                  <Lock className="absolute -top-1 right-0 size-5 rounded-full bg-background p-0.5 text-yellow-500" />
                ) : null}
                {manage ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55">
                    <Pencil className="size-7 text-white" />
                  </div>
                ) : null}
              </div>
              <span className="text-base font-medium">{p.name}</span>
            </button>
          ))}

          {canAdd ? (
            <button
              onClick={() => setCreating(true)}
              className="group flex flex-col items-center gap-3"
            >
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground ring-2 ring-transparent transition group-hover:bg-secondary group-hover:text-foreground group-hover:ring-primary sm:h-32 sm:w-32">
                <Plus className="size-10" />
              </div>
              <span className="text-base font-medium text-muted-foreground">Adicionar</span>
            </button>
          ) : null}
        </div>

        <div className="mt-12 flex flex-col items-center gap-3">
          {profiles.length > 0 ? (
            <Button variant="outline" onClick={() => setManage((m) => !m)} className="px-8 tracking-wider">
              {manage ? "CONCLUIR" : "GERENCIAR PERFIS"}
            </Button>
          ) : null}
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-4" /> Encerrar sessão
          </button>
        </div>
      </div>

      {/* PIN dialog */}
      {pinFor ? (
        <Modal onClose={() => setPinFor(null)} title={`PIN — ${pinFor.name}`}>
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            value={pinTry}
            onChange={(e) => setPinTry(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => e.key === "Enter" && confirmPin()}
            placeholder="0000"
            className="h-12 text-center text-lg tracking-[0.5em]"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPinFor(null)}>Cancelar</Button>
            <Button onClick={confirmPin} disabled={pinTry.length < 4}>Entrar</Button>
          </div>
        </Modal>
      ) : null}

      {/* Create dialog */}
      {creating ? (
        <ProfileEditor
          onClose={() => setCreating(false)}
          onSubmit={({ name, avatar, pin }) => {
            const p = createProfile({ name, avatar, pin });
            if (!p) toast.error("Limite de perfis atingido");
            setCreating(false);
          }}
        />
      ) : null}

      {/* Edit dialog */}
      {editing ? (
        <ProfileEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={({ name, avatar, pin }) => {
            updateProfile(editing.id, { name, avatar, pin: pin || undefined });
            setEditing(null);
          }}
          onDelete={() => {
            if (confirm(`Apagar o perfil "${editing.name}"? O histórico será removido.`)) {
              deleteProfile(editing.id);
              setEditing(null);
            }
          }}
        />
      ) : null}
    </main>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-card p-6 ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProfileEditor({
  initial,
  onClose,
  onSubmit,
  onDelete,
}: {
  initial?: Profile;
  onClose: () => void;
  onSubmit: (v: { name: string; avatar: string; pin: string }) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATARS[0]);
  const [pin, setPin] = useState(initial?.pin ?? "");
  const [usePin, setUsePin] = useState(!!initial?.pin);

  return (
    <Modal title={initial ? "Editar perfil" : "Novo perfil"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">Avatar</Label>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                className={
                  "flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-2xl ring-2 transition " +
                  (avatar === a ? "ring-primary" : "ring-transparent hover:ring-border")
                }
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="pname" className="mb-2 block">Nome</Label>
          <Input
            id="pname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="Nome do perfil"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={usePin}
              onChange={(e) => {
                setUsePin(e.target.checked);
                if (!e.target.checked) setPin("");
              }}
            />
            Proteger com PIN (4 dígitos)
          </label>
          {usePin ? (
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              className="h-11 text-center tracking-[0.4em]"
            />
          ) : null}
        </div>
      </div>
      <div className="mt-6 flex justify-between gap-2">
        {onDelete ? (
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="size-4" /> Apagar
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!name.trim() || (usePin && pin.length < 4)}
            onClick={() => onSubmit({ name: name.trim(), avatar, pin: usePin ? pin : "" })}
          >
            <Check className="size-4" /> Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
