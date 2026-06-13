import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { CatalogBrowser, PosterCard } from "@/components/catalog/CatalogBrowser";
import { xtream, type VodStream } from "@/lib/xtream-api";

export const Route = createFileRoute("/_authenticated/filmes")({
  head: () => ({ meta: [{ title: "Filmes — Misaplay" }] }),
  component: FilmesPage,
});

function FilmesPage() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen">
      <AppHeader />
      <CatalogBrowser
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
        renderCard={(item) => {
          const ext = (item as unknown as { ext?: string }).ext || "mp4";
          return (
            <button
              type="button"
              className="block w-full text-left"
              onClick={() =>
                navigate({
                  to: "/watch/$type/$id",
                  params: { type: "movie", id: String(item.id) },
                  search: { ext, title: item.name },
                })
              }
            >
              <PosterCard name={item.name} image={item.image} badge="Filme" />
            </button>
          );
        }}
      />
    </main>
  );
}
