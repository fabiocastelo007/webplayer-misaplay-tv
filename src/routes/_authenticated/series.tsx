import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { PrimeShowcase, type ShowcaseItem } from "@/components/catalog/PrimeShowcase";
import { xtream, type Serie } from "@/lib/xtream-api";

export const Route = createFileRoute("/_authenticated/series")({
  head: () => ({ meta: [{ title: "Séries — Misaplay TV" }] }),
  component: SeriesPage,
});

function SeriesPage() {
  const navigate = useNavigate();
  const open = (item: ShowcaseItem) =>
    navigate({ to: "/serie/$id", params: { id: String(item.id) } });
  return (
    <main className="min-h-screen">
      <AppHeader />
      <PrimeShowcase
        title="Séries"
        kind="series"
        hideCategoryBar
        fetchCategories={() => xtream.seriesCategories()}
        fetchItems={async (cat) => {
          const list = await xtream.series(cat);
          return list.map((s: Serie) => ({
            id: s.series_id,
            name: s.name,
            image: s.cover,
            category_id: s.category_id,
            plot: s.plot ?? s.genre,
          }));
        }}
        onPlay={open}
        onOpen={open}
      />
      <Footer />
    </main>
  );
}
