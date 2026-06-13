import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { episodeStreamUrl, liveStreamUrl, vodStreamUrl } from "@/lib/xtream-api";

const searchSchema = z.object({
  ext: z.string().default("mp4"),
  title: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/watch/$type/$id")({
  validateSearch: (s) => searchSchema.parse(s),
  component: WatchPage,
});

function WatchPage() {
  const { type, id } = Route.useParams();
  const { ext, title } = Route.useSearch();

  let url = "";
  let isHls = false;
  if (type === "live") {
    url = liveStreamUrl(Number(id));
    isHls = true;
  } else if (type === "movie") {
    url = vodStreamUrl(Number(id), ext);
  } else if (type === "series") {
    url = episodeStreamUrl(id, ext);
  }

  const backTo = type === "live" ? "/tv" : type === "movie" ? "/filmes" : "/series";

  return (
    <main className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to={backTo}>
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </Button>

        {title ? (
          <h1 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        ) : null}

        {url ? (
          <VideoPlayer src={url} hls={isHls} />
        ) : (
          <p className="text-sm text-destructive">Conteúdo inválido.</p>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Caso o vídeo não carregue, o servidor pode estar bloqueando reprodução via navegador. Tente em outro navegador ou rede.
        </p>
      </div>
    </main>
  );
}
