import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { XTREAM_SERVERS, type XtreamPackage } from "./xtream";

const inputSchema = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200),
});

type LoginResult =
  | {
      ok: true;
      package: XtreamPackage;
      dns: string;
      username: string;
      password: string;
      user_info: Record<string, unknown>;
      server_info: Record<string, unknown>;
    }
  | { ok: false; error: string };

async function tryServer(dns: string, username: string, password: string) {
  const url = `${dns}/player_api.php?username=${encodeURIComponent(
    username,
  )}&password=${encodeURIComponent(password)}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      user_info?: { auth?: number | string; status?: string };
      server_info?: Record<string, unknown>;
    };
    if (!json?.user_info) return null;
    if (Number(json.user_info.auth) !== 1) return null;
    return json;
  } catch {
    return null;
  }
}

export const xtreamLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<LoginResult> => {
    const { username, password } = data;
    for (const srv of XTREAM_SERVERS) {
      const json = await tryServer(srv.dns, username, password);
      if (json?.user_info) {
        const status = String(json.user_info.status ?? "").toLowerCase();
        if (status && status !== "active") {
          return { ok: false, error: `Conta encontrada em ${srv.label}, mas status: ${json.user_info.status}` };
        }
        return {
          ok: true,
          package: srv.id,
          dns: srv.dns,
          username,
          password,
          user_info: json.user_info as Record<string, unknown>,
          server_info: (json.server_info ?? {}) as Record<string, unknown>,
        };
      }
    }
    return { ok: false, error: "Usuário ou senha inválidos nos servidores Max e Premium." };
  });
