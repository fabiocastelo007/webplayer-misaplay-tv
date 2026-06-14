import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("url");
        const filename = url.searchParams.get("filename") || "download";
        if (!target || !/^https?:\/\//i.test(target)) {
          return new Response("Bad request", { status: 400 });
        }

        const fwd: Record<string, string> = {
          // Xtream/IPTV servers commonly gate on VLC-like UA
          "user-agent": "VLC/3.0.20 LibVLC/3.0.20",
          accept: "*/*",
        };
        const range = request.headers.get("range");
        if (range) fwd["range"] = range;

        let upstream: Response;
        try {
          upstream = await fetch(target, { headers: fwd, redirect: "follow" });
        } catch (e) {
          return new Response(`Falha ao contactar a fonte: ${(e as Error).message}`, { status: 502 });
        }

        // Accept any successful status (200, 206 partial content, etc.)
        if (upstream.status >= 400 || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(
            `Fonte respondeu ${upstream.status} ${upstream.statusText}${text ? " — " + text.slice(0, 200) : ""}`,
            { status: 502 },
          );
        }

        const headers = new Headers();
        const ct = upstream.headers.get("content-type") || "application/octet-stream";
        headers.set("content-type", ct);
        const cl = upstream.headers.get("content-length");
        if (cl) headers.set("content-length", cl);
        const cr = upstream.headers.get("content-range");
        if (cr) headers.set("content-range", cr);
        const ar = upstream.headers.get("accept-ranges");
        if (ar) headers.set("accept-ranges", ar);
        const safe = filename.replace(/["\r\n]/g, "_");
        headers.set("content-disposition", `attachment; filename="${safe}"`);
        headers.set("cache-control", "no-store");

        return new Response(upstream.body, {
          status: upstream.status === 206 ? 206 : 200,
          headers,
        });
      },
    },
  },
});
