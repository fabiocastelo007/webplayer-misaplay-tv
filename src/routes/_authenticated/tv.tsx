import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { CatalogBrowser, PosterCard } from "@/components/catalog/CatalogBrowser";
import { xtream, type LiveStream } from "@/lib/xtream-api";

export const Route = createFileRoute("/_authenticated/tv")({
  head: () => ({ meta: [{ title: "TV ao Vivo — Misaplay" }] }),
  component: TvPage,
});

function TvPage() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen">
      <AppHeader />
      <CatalogBrowser
        title="TV ao Vivo"
        kind="live"
        fetchCategories={() => xtream.liveCategories()}
        fetchItems={async (cat) => {
          const list = await xtream.liveStreams(cat);
          return list.map((v: LiveStream) => ({
            id: v.stream_id,
            name: v.name,
            image: v.stream_icon,
            category_id: v.category_id,
          }));
        }}
        renderCard={(item) => (
          <button
            type="button"
            className="block w-full text-left"
            onClick={() =>
              navigate({
                to: "/watch/$type/$id",
                params: { type: "live", id: String(item.id) },
                search: { ext: "m3u8", title: item.name },
              })
            }
          >
            <PosterCard name={item.name} image={item.image} badge="Ao vivo" />
          </button>
        )}
      />
    </main>
  );
}
