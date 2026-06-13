import { useEffect, useMemo, useState, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Search, Play, Info, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/catalog/FavoriteButton";
import { listFavorites, onFavoritesChanged, type FavKind } from "@/lib/favorites";
import type { Category } from "@/lib/xtream-api";

// Track image URLs that failed to load so we can hide them everywhere.
const brokenImages = new Set<string>();
const brokenListeners = new Set<() => void>();
function markBroken(url: string) {
  if (!url || brokenImages.has(url)) return;
  brokenImages.add(url);
  brokenListeners.forEach((l) => l());
}
function subscribeBroken(cb: () => void) {
  brokenListeners.add(cb);
  return () => brokenListeners.delete(cb);
}
function getBrokenSnapshot() {
  return brokenImages.size;
}
function useBrokenVersion() {
  return useSyncExternalStore(subscribeBroken, getBrokenSnapshot, getBrokenSnapshot);
}

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
  /** Hide the sticky category filter bar. */
  hideCategoryBar?: boolean;
  /** Slot rendered above all rows on the "all" view (e.g. Continue watching). */
  topSlot?: ReactNode;
};

const FAV_KIND_MAP: Record<Props["kind"], FavKind> = {
  vod: "vod",
  series: "series",
  live: "live",
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
  hideCategoryBar = false,
  topSlot,
}: Props) {
  const favKind = FAV_KIND_MAP[kind];
  const cats = useQuery({
    queryKey: ["xtream", kind, "categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });

  const [activeCat, setActiveCat] = useState<string | "all" | "favorites">("all");
  const [query, setQuery] = useState("");

  const featured = useQuery({
    queryKey: ["xtream", kind, "items", "featured"],
    queryFn: () => fetchItems(undefined),
    staleTime: 60_000,
    enabled: activeCat === "all",
  });

  const categoryView = useQuery({
    queryKey: ["xtream", kind, "items", activeCat],
    queryFn: () => fetchItems(activeCat === "all" ? undefined : (activeCat as string)),
    enabled: activeCat !== "all" && activeCat !== "favorites",
    staleTime: 60_000,
  });

  // Favorites view
  const [favVersion, setFavVersion] = useState(0);
  useEffect(() => onFavoritesChanged(() => setFavVersion((v) => v + 1)), []);
  const favoriteItems = useMemo<ShowcaseItem[]>(() => {
    void favVersion;
    return listFavorites(favKind).map((f) => ({
      id: f.id,
      name: f.name,
      image: f.image ?? "",
      category_id: "favorites",
      ext: f.ext,
    }));
  }, [favKind, favVersion]);

  const brokenVersion = useBrokenVersion();

  // Build per-category rows when activeCat = all
  const rows = useMemo(() => {
    void brokenVersion;
    if (activeCat !== "all" || !cats.data || !featured.data) return [];
    const byCat = new Map<string, ShowcaseItem[]>();
    for (const it of featured.data) {
      if (!it.image || brokenImages.has(it.image)) continue;
      const arr = byCat.get(it.category_id) ?? [];
      if (arr.length < 18) arr.push(it);
      byCat.set(it.category_id, arr);
    }
    return cats.data
      .map((c) => ({ cat: c, items: byCat.get(c.category_id) ?? [] }))
      .filter((r) => r.items.length > 0)
      .slice(0, rowLimit);
  }, [activeCat, cats.data, featured.data, rowLimit, brokenVersion]);

  const heroPool = useMemo(
    () => (featured.data ?? []).filter((i) => !!i.image && !brokenImages.has(i.image)).slice(0, 5),
    [featured.data, brokenVersion],
  );
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (heroPool.length < 2) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroPool.length), 6000);
    return () => clearInterval(t);
  }, [heroPool.length]);
  const hero = heroPool[heroIdx] ?? featured.data?.[0];

  const filtered = useMemo(() => {
    void brokenVersion;
    if (activeCat === "all") return [];
    const base = activeCat === "favorites" ? favoriteItems : (categoryView.data ?? []);
    const list = activeCat === "favorites" ? base : base.filter((i) => !!i.image && !brokenImages.has(i.image));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => i.name.toLowerCase().includes(q));
  }, [activeCat, categoryView.data, query, favoriteItems, brokenVersion]);

  return (
    <div>
      {/* HERO */}
      {activeCat === "all" && hero ? (
        <HeroBanner
          item={hero}
          title={title}
          onPlay={onPlay}
          onOpen={onOpen}
          dots={heroPool.length}
          activeDot={heroIdx}
          onDot={setHeroIdx}
        />
      ) : null}

      {/* Category bar */}
      {!hideCategoryBar ? (
        <div className="sticky top-[64px] z-20 border-b border-border/40 bg-background/85 backdrop-blur md:top-[60px]">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
            <CatChip active={activeCat === "all"} onClick={() => { setActiveCat("all"); setQuery(""); }}>
              Em destaque
            </CatChip>
            <CatChip active={activeCat === "favorites"} onClick={() => { setActiveCat("favorites"); setQuery(""); }}>
              <Heart className="size-3.5" /> Favoritos
            </CatChip>
            {cats.data?.map((c) => (
              <CatChip key={c.category_id} active={activeCat === c.category_id} onClick={() => setActiveCat(c.category_id)}>
                {c.category_name}
              </CatChip>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeCat === "all" ? (
          featured.isLoading ? (
            <Spinner />
          ) : featured.error ? (
            <ErrorBox error={featured.error as Error} />
          ) : (
            <div className="space-y-10">
              {topSlot}
              {favoriteItems.length > 0 ? (
                <CategoryRow
                  title="Os meus favoritos"
                  items={favoriteItems.slice(0, 18)}
                  onPlay={onPlay}
                  onOpen={onOpen}
                  renderCardBadge={renderCardBadge}
                  favKind={favKind}
                  onSeeAll={() => setActiveCat("favorites")}
                />
              ) : null}
              {rows.map(({ cat, items }) => (
                <CategoryRow
                  key={cat.category_id}
                  title={cat.category_name}
                  items={items}
                  onPlay={onPlay}
                  onOpen={onOpen}
                  renderCardBadge={renderCardBadge}
                  favKind={favKind}
                  onSeeAll={() => setActiveCat(cat.category_id)}
                />
              ))}
              {rows.length === 0 && favoriteItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum conteúdo disponível.</p>
              ) : null}
            </div>
          )
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold tracking-tight">
                {activeCat === "favorites"
                  ? "Os meus favoritos"
                  : cats.data?.find((c) => c.category_id === activeCat)?.category_name ?? title}
              </h2>
              <div className="relative max-w-sm flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 bg-secondary/60 pl-9"
                />
              </div>
            </div>
            {activeCat !== "favorites" && categoryView.isLoading ? (
              <Spinner />
            ) : activeCat !== "favorites" && categoryView.error ? (
              <ErrorBox error={categoryView.error as Error} />
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {activeCat === "favorites"
                  ? "Ainda não tem favoritos. Toque no ❤ para adicionar."
                  : "Nenhum título encontrado."}
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filtered.map((item) => (
                  <li key={String(item.id)}>
                    <PrimePoster
                      item={item}
                      onPlay={onPlay}
                      onOpen={onOpen}
                      badge={renderCardBadge?.(item)}
                      favKind={favKind}
                    />
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

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition " +
        (active ? "bg-foreground text-background" : "bg-secondary/60 text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
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
  dots = 0,
  activeDot = 0,
  onDot,
}: {
  item: ShowcaseItem;
  title: string;
  onPlay: (i: ShowcaseItem) => void;
  onOpen?: (i: ShowcaseItem) => void;
  dots?: number;
  activeDot?: number;
  onDot?: (i: number) => void;
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
        {dots > 1 ? (
          <div className="pointer-events-auto absolute bottom-6 right-6 z-10 flex gap-2">
            {Array.from({ length: dots }).map((_, i) => (
              <button
                key={i}
                onClick={() => onDot?.(i)}
                aria-label={`Slide ${i + 1}`}
                className={
                  "h-2 rounded-full transition-all " +
                  (i === activeDot ? "w-6 bg-foreground" : "w-2 bg-foreground/40 hover:bg-foreground/70")
                }
              />
            ))}
          </div>
        ) : null}
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
  favKind,
}: {
  title: string;
  items: ShowcaseItem[];
  onPlay: (i: ShowcaseItem) => void;
  onOpen?: (i: ShowcaseItem) => void;
  renderCardBadge?: (i: ShowcaseItem) => ReactNode;
  onSeeAll: () => void;
  favKind: FavKind;
}) {
  useBrokenVersion();
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
          {items.filter((it) => !!it.image && !brokenImages.has(it.image)).map((it) => (
            <div key={String(it.id)} className="w-[150px] shrink-0 snap-start sm:w-[170px]">
              <PrimePoster item={it} onPlay={onPlay} onOpen={onOpen} badge={renderCardBadge?.(it)} favKind={favKind} />
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
  favKind,
}: {
  item: ShowcaseItem;
  onPlay: (i: ShowcaseItem) => void;
  onOpen?: (i: ShowcaseItem) => void;
  badge?: ReactNode;
  favKind?: FavKind;
}) {
  const [broken, setBroken] = useState(false);
  if (!item.image || broken || brokenImages.has(item.image)) return null;
  return (
    <div className="group/card relative overflow-hidden rounded-lg bg-secondary/50 ring-1 ring-border/40 transition hover:ring-primary">
      <button
        type="button"
        onClick={() => (onOpen ?? onPlay)(item)}
        className="block w-full text-left"
      >
        <div className="relative aspect-[2/3] w-full bg-gradient-to-br from-secondary to-secondary/40">
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            onError={() => { markBroken(item.image); setBroken(true); }}
            className="h-full w-full object-cover transition group-hover/card:scale-105"
          />
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
      {favKind ? (
        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton
            kind={favKind}
            item={{ id: String(item.id), name: item.name, image: item.image, ext: item.ext }}
          />
        </div>
      ) : null}
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug">{item.name}</p>
      </div>
    </div>
  );
}
