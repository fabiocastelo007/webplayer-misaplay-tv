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
      search: { ext, title: item.name },
    });
  };
  return (
    <main className="min-h-screen">
      <AppHeader />
      <PrimeShowcase
        title="Filmes"
        kind="vod"
        fetchCategories={() => xtream.vodCategories()}
        fetchItems={async (cat) => {
          const list = await xtream.vodStreams(cat);
          return list.map((v: VodStream) => ({
            id: v.stream_id,
            name: v.name,
            image: v.stream_icon,
            category_id: v.category_id,
            ext: v.container_extension,
          }));
        }}
        onPlay={play}
        renderCardBadge={() => (
          <span className="rounded bg-accent/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            Filme
          </span>
        )}
      />
      <Footer />
    </main>
  );
}
