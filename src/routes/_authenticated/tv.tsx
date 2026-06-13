import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { PrimeShowcase, type ShowcaseItem } from "@/components/catalog/PrimeShowcase";
import { xtream, type LiveStream } from "@/lib/xtream-api";

export const Route = createFileRoute("/_authenticated/tv")({
  head: () => ({ meta: [{ title: "TV ao Vivo — Misaplay TV" }] }),
  component: TvPage,
});

function TvPage() {
  const navigate = useNavigate();
  const play = (item: ShowcaseItem) =>
    navigate({
      to: "/watch/$type/$id",
      params: { type: "live", id: String(item.id) },
      search: { ext: "m3u8", title: item.name },
    });
  return (
    <main className="min-h-screen">
      <AppHeader />
      <PrimeShowcase
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
        onPlay={play}
        renderCardBadge={() => (
          <span className="rounded bg-emerald-500/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Ao vivo
          </span>
        )}
      />
      <Footer />
    </main>
  );
}
