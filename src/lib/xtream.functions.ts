import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { XTREAM_SERVERS, type XtreamPackage } from "./xtream";

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
type JsonObject = { [k: string]: JsonValue };

export type LoginResult =
  | {
      ok: true;
      package: XtreamPackage;
      dns: string;
      username: string;
      password: string;
      user_info: JsonObject;
      server_info: JsonObject;
    }
  | { ok: false; error: string };

const loginSchema = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200),
  servers: z
    .array(z.object({ id: z.enum(["MAX", "PREMIUM"]), label: z.string(), dns: z.string().url() }))
    .optional(),
});

type AttemptOk = {
  kind: "ok";
  json: {
    user_info: { auth?: number | string; status?: string };
    server_info?: Record<string, unknown>;
  };
};
type AttemptResult = AttemptOk | { kind: "invalid" } | { kind: "expired"; status: string } | { kind: "unreachable"; status?: number };

async function tryServer(dns: string, username: string, password: string): Promise<AttemptResult> {
  const url = `${dns}/player_api.php?username=${encodeURIComponent(
    username,
  )}&password=${encodeURIComponent(password)}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return { kind: "unreachable", status: res.status };
    const text = await res.text();
    let json: { user_info?: { auth?: number | string; status?: string }; server_info?: Record<string, unknown> };
    try {
      json = JSON.parse(text);
    } catch {
      return { kind: "unreachable" };
    }
    if (!json?.user_info) return { kind: "invalid" };
    if (Number(json.user_info.auth) !== 1) return { kind: "invalid" };
    const status = String(json.user_info.status ?? "").toLowerCase();
    if (status && status !== "active") return { kind: "expired", status: String(json.user_info.status) };
    return { kind: "ok", json: json as AttemptOk["json"] };
  } catch {
    return { kind: "unreachable" };
  }
}

export const xtreamLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }): Promise<LoginResult> => {
    const { username, password } = data;
    const servers = data.servers && data.servers.length ? data.servers : XTREAM_SERVERS;
    const issues: { label: string; reason: string }[] = [];
    for (const srv of servers) {
      const r = await tryServer(srv.dns, username, password);
      if (r.kind === "ok") {
        return {
          ok: true,
          package: srv.id,
          dns: srv.dns,
          username,
          password,
          user_info: r.json.user_info as unknown as JsonObject,
          server_info: (r.json.server_info ?? {}) as unknown as JsonObject,
        };
      }
      if (r.kind === "expired") {
        return { ok: false, error: "expired" };
      }
      issues.push({
        label: srv.label,
        reason:
          r.kind === "invalid"
            ? "credenciais inválidas"
            : r.status
              ? `servidor indisponível (HTTP ${r.status})`
              : "servidor fora do ar",
      });
    }
    const allUnreachable = issues.every(
      (i) => i.reason.includes("indisponível") || i.reason.includes("fora do ar"),
    );
    const detalhe = issues.map((i) => `${i.label}: ${i.reason}`).join(" • ");
    if (allUnreachable) {
      return {
        ok: false,
        error: `Não foi possível contactar os servidores agora. ${detalhe}. Tente novamente em instantes.`,
      };
    }
    return { ok: false, error: "not_found" };
  });

// --- Catalog proxy ---

const fetchSchema = z.object({
  dns: z.string().url(),
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
  action: z.string().min(1).max(60),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export const xtreamFetch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => fetchSchema.parse(data))
  .handler(async ({ data }): Promise<JsonValue> => {
    const qs = new URLSearchParams({
      username: data.username,
      password: data.password,
      action: data.action,
    });
    if (data.params) {
      for (const [k, v] of Object.entries(data.params)) qs.set(k, String(v));
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(`${data.dns}/player_api.php?${qs.toString()}`, {
        signal: ctrl.signal,
      });
      if (!res.ok) {
        console.warn(`[xtreamFetch] ${data.action} -> HTTP ${res.status}`);
        return [];
      }
      const text = await res.text();
      if (!text) return [];
      try {
        return JSON.parse(text) as JsonValue;
      } catch {
        console.warn(`[xtreamFetch] ${data.action} -> resposta não-JSON`);
        return [];
      }
    } catch (e) {
      console.warn(`[xtreamFetch] ${data.action} -> erro de rede`, e);
      return [];
    } finally {
      clearTimeout(t);
    }
  });
