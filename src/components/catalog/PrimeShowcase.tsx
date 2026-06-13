import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Search, Play, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/xtream-api";

export type ShowcaseItem = {
  id: number | string;
  name: string;
  image: string;
  category_id: string;
  ext?: string;
  plot?: string;
};

type Props = {
  title: string;
  kind: "vod" | "series" | "live";
  fetchCategories: () => Promise<Category[]>;
  fetchItems: (categoryId?: string) => Promise<ShowcaseItem[]>;
  onPlay: (item: ShowcaseItem) => void;
  onOpen?: (item: ShowcaseItem) => void;
  renderCardBadge?: (item: ShowcaseItem) => ReactNode;
  /** Max number of category rows on the home view. */
  rowLimit?: number;
};

export function PrimeShowcase({
  title,
  kind,
  fetchCategories,
  fetchItems,
  onPlay,
  onOpen,
  renderCardBadge,
  rowLimit = 8,
}: Props) {
  const cats = useQuery({
    queryKey: ["xtream", kind, "categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });

  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [query, setQuery] = useState("");

  const featured = useQuery({
    queryKey: ["xtream", kind, "items", "featured"],
    queryFn: () => fetchItems(undefined),
    staleTime: 60_000,
    enabled: activeCat === "all",
  });

  const categoryView = useQuery({
    queryKey: ["xtream", kind, "items", activeCat],
    queryFn: () => fetchItems(activeCat === "all" ? undefined : activeCat),
    enabled: activeCat !== "all",
    staleTime: 60_000,
  });

  // Build per-category rows when activeCat = all
  const rows = useMemo(() => {
    if (activeCat !== "all" || !cats.data || !featured.data) return [];
    const byCat = new Map<string, ShowcaseItem[]>();
    for (const it of featured.data) {
      const arr = byCat.get(it.category_id) ?? [];
      if (arr.length < 18) arr.push(it);
      byCat.set(it.category_id, arr);
    }
    return cats.data
      .map((c) => ({ cat: c, items: byCat.get(c.category_id) ?? [] }))
      .filter((r) => r.items.length > 0)
      .slice(0, rowLimit);
  }, [activeCat, cats.data, featured.data, rowLimit]);

  const heroPool = useMemo(
    () => (featured.data ?? []).filter((i) => !!i.image).slice(0, 5),
    [featured.data],
  );
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (heroPool.length < 2) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroPool.length), 6000);
    return () => clearInterval(t);
  }, [heroPool.length]);
  const hero = heroPool[heroIdx] ?? featured.data?.[0];

  const filtered = useMemo(() => {
    if (activeCat === "all") return [];
    const list = categoryView.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => i.name.toLowerCase().includes(q));
  }, [activeCat, categoryView.data, query]);

  return (
    <div>
      {/* HERO */}
      {activeCat === "all" && hero ? (
        <HeroBanner item={hero} title={title} onPlay={onPlay} onOpen={onOpen} />
      ) : null}

      {/* Category bar */}
      <div className="sticky top-[64px] z-20 border-b border-border/40 bg-background/85 backdrop-blur md:top-[60px]">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
          <button
            onClick={() => {
              setActiveCat("all");
              setQuery("");
            }}
            className={
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition " +
              (activeCat === "all"
                ? "bg-foreground text-background"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground")
            }
          >
            Em destaque
          </button>
          {cats.data?.map((c) => (
            <button
              key={c.category_id}
              onClick={() => setActiveCat(c.category_id)}
              className={
                "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition " +
                (activeCat === c.category_id
                  ? "bg-foreground text-background"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground")
              }
            >
              {c.category_name}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeCat === "all" ? (
          featured.isLoading ? (
            <Spinner />
          ) : featured.error ? (
            <ErrorBox error={featured.error as Error} />
          ) : (
            <div className="space-y-10">
              {rows.map(({ cat, items }) => (
                <CategoryRow
                  key={cat.category_id}
                  title={cat.category_name}
                  items={items}
                  onPlay={onPlay}
                  onOpen={onOpen}
                  renderCardBadge={renderCardBadge}
                  onSeeAll={() => setActiveCat(cat.category_id)}
                />
              ))}
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo disponível.</p>
              ) : null}
            </div>
          )
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold tracking-tight">
                {cats.data?.find((c) => c.category_id === activeCat)?.category_name ?? title}
              </h2>
              <div className="relative max-w-sm flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar nesta categoria..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 bg-secondary/60 pl-9"
                />
              </div>
            </div>
            {categoryView.isLoading ? (
              <Spinner />
            ) : categoryView.error ? (
              <ErrorBox error={categoryView.error as Error} />
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum título encontrado.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filtered.map((item) => (
                  <li key={String(item.id)}>
                    <PrimePoster item={item} onPlay={onPlay} onOpen={onOpen} badge={renderCardBadge?.(item)} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Carregando...
    </div>
  );
}

function ErrorBox({ error }: { error: Error }) {
  return <p className="text-sm text-destructive">Erro: {error.message}</p>;
}

function HeroBanner({
  item,
  title,
  onPlay,
  onOpen,
}: {
  item: ShowcaseItem;
  title: string;
  onPlay: (i: ShowcaseItem) => void;
  onOpen?: (i: ShowcaseItem) => void;
}) {
  return (
    <section className="relative h-[55vh] min-h-[360px] w-full overflow-hidden">
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-md opacity-60"
          aria-hidden
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      <div className="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-12 sm:px-6">
        <div className="grid w-full gap-6 sm:grid-cols-[200px_1fr] sm:items-end">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="hidden h-[300px] w-[200px] rounded-lg object-cover shadow-2xl ring-1 ring-border/60 sm:block"
            />
          ) : null}
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{title}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">{item.name}</h1>
            {item.plot ? (
              <p className="mt-3 line-clamp-3 text-sm text-foreground/80 sm:text-base">{item.plot}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="lg" onClick={() => onPlay(item)}>
                <Play className="size-5 fill-current" /> Assistir agora
              </Button>
              {onOpen ? (
                <Button size="lg" variant="secondary" onClick={() => onOpen(item)}>
                  <Info className="size-5" /> Detalhes
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryRow({
  title,
  items,
  onPlay,
  onOpen,
  renderCardBadge,
  onSeeAll,
}: {
  title: string;
  items: ShowcaseItem[];
  onPlay: (i: ShowcaseItem) => void;
  onOpen?: (i: ShowcaseItem) => void;
  renderCardBadge?: (i: ShowcaseItem) => ReactNode;
  onSeeAll: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
        <button onClick={onSeeAll} className="text-xs font-medium text-primary hover:underline">
          Ver tudo →
        </button>
      </div>
      <div className="group relative">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 z-10 hidden h-full w-12 items-center justify-start bg-gradient-to-r from-background to-transparent opacity-0 transition group-hover:opacity-100 md:flex"
          aria-label="Anterior"
        >
          <ChevronLeft className="size-7" />
        </button>
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((it) => (
            <div key={String(it.id)} className="w-[150px] shrink-0 snap-start sm:w-[170px]">
              <PrimePoster item={it} onPlay={onPlay} onOpen={onOpen} badge={renderCardBadge?.(it)} />
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 z-10 hidden h-full w-12 items-center justify-end bg-gradient-to-l from-background to-transparent opacity-0 transition group-hover:opacity-100 md:flex"
          aria-label="Próximo"
        >
          <ChevronRight className="size-7" />
        </button>
      </div>
    </section>
  );
}

export function PrimePoster({
  item,
  onPlay,
  onOpen,
  badge,
}: {
  item: ShowcaseItem;
  onPlay: (i: ShowcaseItem) => void;
  onOpen?: (i: ShowcaseItem) => void;
  badge?: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="group/card relative overflow-hidden rounded-lg bg-secondary/50 ring-1 ring-border/40 transition hover:ring-primary">
      <button
        type="button"
        onClick={() => (onOpen ?? onPlay)(item)}
        className="block w-full text-left"
      >
        <div className="relative aspect-[2/3] w-full bg-gradient-to-br from-secondary to-secondary/40">
          {item.image && !broken ? (
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              onError={() => setBroken(true)}
              className="h-full w-full object-cover transition group-hover/card:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
              {item.name}
            </div>
          )}
          {badge ? <div className="absolute left-2 top-2">{badge}</div> : null}
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 transition group-hover/card:opacity-100">
            <div className="w-full p-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-black">
                <Play className="size-3 fill-current" /> Assistir
              </span>
            </div>
          </div>
        </div>
      </button>
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug">{item.name}</p>
      </div>
    </div>
  );
}

// Keep a small hook used in mobile-stuck horizontal lists.
export function useStableEffect(fn: () => void, deps: unknown[]) {
  useEffect(fn, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
