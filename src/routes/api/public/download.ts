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
        const upstream = await fetch(target, {
          headers: { "user-agent": "Mozilla/5.0 MisaPlay" },
        });
        if (!upstream.ok || !upstream.body) {
          return new Response(`Upstream error ${upstream.status}`, { status: 502 });
        }
        const headers = new Headers();
        const ct = upstream.headers.get("content-type");
        if (ct) headers.set("content-type", ct);
        const cl = upstream.headers.get("content-length");
        if (cl) headers.set("content-length", cl);
        const safe = filename.replace(/["\r\n]/g, "_");
        headers.set("content-disposition", `attachment; filename="${safe}"`);
        headers.set("cache-control", "no-store");
        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});
