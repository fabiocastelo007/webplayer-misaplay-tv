import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { PrimeShowcase, type ShowcaseItem } from "@/components/catalog/PrimeShowcase";
import { xtream, type VodStream } from "@/lib/xtream-api";

export const Route = createFileRoute("/_authenticated/filmes")({
  head: () => ({ meta: [{ title: "Filmes — Misaplay TV" }] }),
  component: FilmesPage,
});

function FilmesPage() {
  const navigate = useNavigate();
  const play = (item: ShowcaseItem) => {
    const ext = item.ext || "mp4";
    navigate({
      to: "/watch/$type/$id",
      params: { type: "movie", id: String(item.id) },
      search: { ext, title: item.name, image: item.image },
    });
  };
  return (
    <main className="min-h-screen">
      <AppHeader />
      <PrimeShowcase
        title="Filmes"
        kind="vod"
        hideCategoryBar
        fetchCategories={() => xtream.vodCategories()}
        fetchItems={async (cat) => {
          const list = await xtream.vodStreams(cat);
          return list.map((v: VodStream) => {
            const x = v as VodStream & { plot?: string; releaseDate?: string; release_date?: string; episode_run_time?: string | number; genre?: string };
            const yearSrc = x.releaseDate || x.release_date || v.added || "";
            const year = /\d{4}/.exec(String(yearSrc))?.[0];
            const runtime = x.episode_run_time ? `${x.episode_run_time} min` : undefined;
            return {
              id: v.stream_id,
              name: v.name,
              image: v.stream_icon,
              category_id: v.category_id,
              ext: v.container_extension,
              plot: x.plot,
              year,
              duration: runtime,
              rating: v.rating_5based,
              genre: x.genre,
            };
          });
        }}
        onPlay={play}
      />
      <Footer />
    </main>
  );
}
