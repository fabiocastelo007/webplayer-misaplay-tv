import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { CatalogBrowser, PosterCard } from "@/components/catalog/CatalogBrowser";
import { xtream, type Serie } from "@/lib/xtream-api";

export const Route = createFileRoute("/_authenticated/series")({
  head: () => ({ meta: [{ title: "Séries — Misaplay" }] }),
  component: SeriesPage,
});

function SeriesPage() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen">
      <AppHeader />
      <CatalogBrowser
        title="Séries"
        kind="series"
        fetchCategories={() => xtream.seriesCategories()}
        fetchItems={async (cat) => {
          const list = await xtream.series(cat);
          return list.map((s: Serie) => ({
            id: s.series_id,
            name: s.name,
            image: s.cover,
            category_id: s.category_id,
          }));
        }}
        renderCard={(item) => (
          <button
            type="button"
            className="block w-full text-left"
            onClick={() =>
              navigate({ to: "/serie/$id", params: { id: String(item.id) } })
            }
          >
            <PosterCard name={item.name} image={item.image} badge="Série" />
          </button>
        )}
      />
    </main>
  );
}
