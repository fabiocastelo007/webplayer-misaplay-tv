import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { episodeStreamUrl, liveStreamUrl, vodStreamUrl } from "@/lib/xtream-api";
import { addDownload, triggerDownload } from "@/lib/downloads";
import { getProgress, saveProgress } from "@/lib/watch-history";
import { toast } from "sonner";

const searchSchema = z.object({
  ext: z.string().default("mp4"),
  title: z.string().optional(),
  image: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/watch/$type/$id")({
  validateSearch: (s) => searchSchema.parse(s),
  component: WatchPage,
});

function WatchPage() {
  const { type, id } = Route.useParams();
  const { ext, title, image } = Route.useSearch();

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

  const canDownload = type !== "live";
  const backTo = type === "live" ? "/tv" : type === "movie" ? "/filmes" : "/series";
  const histKey = `${type}-${id}`;
  const resumeAt = type !== "live" ? getProgress(histKey)?.position : undefined;

  const handleProgress = useCallback(
    (position: number, duration: number) => {
      if (type === "live") return;
      saveProgress({
        key: histKey,
        type: type as "movie" | "series",
        id,
        title: title || `Item ${id}`,
        image,
        ext,
        position,
        duration,
      });
    },
    [type, histKey, id, title, image, ext],
  );

  const handleDownload = () => {
    const safe = (title || `misaplay-${id}`).replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 80);
    const filename = `${safe}.${ext}`;
    triggerDownload(url, filename);
    addDownload({
      id: `${type}-${id}`,
      kind: type === "series" ? "episode" : "movie",
      title: title || `Item ${id}`,
      image,
      url,
      addedAt: Date.now(),
    });
    toast.success("Download iniciado — guardado em 'Minha Conta'");
  };

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
          <VideoPlayer
            src={url}
            hls={isHls}
            poster={image}
            startAt={resumeAt}
            onProgress={type !== "live" ? handleProgress : undefined}
          />
        ) : (
          <p className="text-sm text-destructive">Conteúdo inválido.</p>
        )}

        {canDownload ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handleDownload} variant="secondary">
              <Download className="size-4" /> Baixar para assistir offline
            </Button>
          </div>
        ) : null}

        {canDownload ? (
          <p className="mt-4 text-xs text-muted-foreground">
            O ficheiro é entregue directamente pelo servidor. Tempo depende da sua ligação.
          </p>
        ) : null}
      </div>
      <Footer />
    </main>
  );
}
