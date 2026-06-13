import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Play, Download } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { xtream, episodeStreamUrl } from "@/lib/xtream-api";
import { addDownload, triggerDownload } from "@/lib/downloads";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/serie/$id")({
  component: SerieDetail,
});

function SerieDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const seriesId = Number(id);
  const { data, isLoading, error } = useQuery({
    queryKey: ["xtream", "series-info", seriesId],
    queryFn: () => xtream.seriesInfo(seriesId),
    staleTime: 5 * 60_000,
  });

  const seasonKeys = data ? Object.keys(data.episodes ?? {}).sort((a, b) => Number(a) - Number(b)) : [];
  const [season, setSeason] = useState<string | null>(null);
  useEffect(() => {
    if (!season && seasonKeys.length) setSeason(seasonKeys[0]);
  }, [seasonKeys, season]);

  const episodes = season && data ? data.episodes[season] ?? [] : [];
  const serieName = data?.info?.name ?? "Série";

  const downloadEpisode = (epId: string | number, ext: string, label: string, image?: string) => {
    const url = episodeStreamUrl(epId, ext);
    const filename = `${label}.${ext}`.replace(/[^a-zA-Z0-9-_. ]/g, "").slice(0, 100);
    triggerDownload(url, filename);
    addDownload({
      id: `series-${epId}`,
      kind: "episode",
      title: label,
      image,
      url,
      addedAt: Date.now(),
    });
  };

  const downloadSeason = async () => {
    if (!episodes.length) return;
    toast.success(`A iniciar download de ${episodes.length} episódios da Temporada ${season}`);
    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[i];
      const label = `${serieName} T${season}E${ep.episode_num} - ${ep.title}`;
      // small delay to avoid browser blocking concurrent downloads
      await new Promise((r) => setTimeout(r, 600));
      downloadEpisode(ep.id, ep.container_extension || "mp4", label, ep.info?.movie_image);
    }
  };

  return (
    <main className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/series">
            <ArrowLeft className="size-4" /> Voltar para Séries
          </Link>
        </Button>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando série...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Erro: {(error as Error).message}</p>
        ) : data ? (
          <>
            <header className="grid gap-6 sm:grid-cols-[220px_1fr]">
              <div className="aspect-[2/3] overflow-hidden rounded-lg bg-secondary shadow-xl">
                {data.info?.cover ? (
                  <img src={data.info.cover} alt={serieName} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{serieName}</h1>
                {data.info?.genre ? (
                  <p className="mt-1 text-sm text-muted-foreground">{data.info.genre}</p>
                ) : null}
                {data.info?.plot ? (
                  <p className="mt-3 max-w-3xl text-sm text-foreground/80">{data.info.plot}</p>
                ) : null}
              </div>
            </header>

            <div className="mt-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {seasonKeys.map((k) => (
                    <button
                      key={k}
                      onClick={() => setSeason(k)}
                      className={
                        "rounded-md px-3 py-1.5 text-sm transition " +
                        (season === k
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground")
                      }
                    >
                      Temporada {k}
                    </button>
                  ))}
                </div>
                {episodes.length > 0 ? (
                  <Button variant="secondary" size="sm" onClick={downloadSeason}>
                    <Download className="size-4" /> Baixar temporada
                  </Button>
                ) : null}
              </div>

              <ul className="grid gap-2">
                {episodes.map((ep) => (
                  <li key={ep.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3 ring-1 ring-border/40 hover:ring-primary/60">
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/watch/$type/$id",
                          params: { type: "series", id: String(ep.id) },
                          search: {
                            ext: ep.container_extension || "mp4",
                            title: `${serieName} · T${season} E${ep.episode_num} — ${ep.title}`,
                            image: ep.info?.movie_image,
                          },
                        })
                      }
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                        <Play className="size-4 fill-current" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          E{ep.episode_num} — {ep.title}
                        </p>
                        {ep.info?.plot ? (
                          <p className="line-clamp-1 text-xs text-muted-foreground">{ep.info.plot}</p>
                        ) : null}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Baixar episódio"
                      onClick={() =>
                        downloadEpisode(
                          ep.id,
                          ep.container_extension || "mp4",
                          `${serieName} T${season}E${ep.episode_num} - ${ep.title}`,
                          ep.info?.movie_image,
                        )
                      }
                    >
                      <Download className="size-4" />
                    </Button>
                  </li>
                ))}
                {episodes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem episódios nesta temporada.</p>
                ) : null}
              </ul>
            </div>
          </>
        ) : null}
      </div>
      <Footer />
    </main>
  );
}
