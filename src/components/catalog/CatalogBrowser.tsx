import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/xtream-api";

type Item = { id: number | string; name: string; image: string; category_id: string };

type Props = {
  title: string;
  kind: "vod" | "series" | "live";
  fetchCategories: () => Promise<Category[]>;
  fetchItems: (categoryId?: string) => Promise<Item[]>;
  renderCard: (item: Item) => ReactNode;
};

export function CatalogBrowser({ title, kind, fetchCategories, fetchItems, renderCard }: Props) {
  const cats = useQuery({
    queryKey: ["xtream", kind, "categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });

  const [activeCat, setActiveCat] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!activeCat && cats.data && cats.data.length > 0) {
      setActiveCat(cats.data[0].category_id);
    }
  }, [cats.data, activeCat]);

  const items = useQuery({
    queryKey: ["xtream", kind, "items", activeCat ?? "all"],
    queryFn: () => fetchItems(activeCat),
    enabled: !!activeCat,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const list = items.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => i.name.toLowerCase().includes(q));
  }, [items.data, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar título..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 bg-secondary/60 pl-9"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {cats.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando categorias...
            </div>
          ) : cats.error ? (
            <p className="text-sm text-destructive">Erro: {(cats.error as Error).message}</p>
          ) : (
            <ul className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {cats.data?.map((c) => {
                const active = c.category_id === activeCat;
                return (
                  <li key={c.category_id}>
                    <button
                      onClick={() => setActiveCat(c.category_id)}
                      className={
                        "w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition lg:whitespace-normal " +
                        (active
                          ? "bg-primary/15 text-foreground ring-1 ring-primary/40"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground")
                      }
                    >
                      {c.category_name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section>
          {items.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando catálogo...
            </div>
          ) : items.error ? (
            <p className="text-sm text-destructive">Erro: {(items.error as Error).message}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum título encontrado.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((item) => (
                <li key={String(item.id)}>{renderCard(item)}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export function PosterCard({
  name,
  image,
  badge,
}: {
  name: string;
  image: string;
  badge?: string;
}) {
  return (
    <div className="group overflow-hidden rounded-lg bg-secondary/50 ring-1 ring-border/40 transition hover:ring-primary/60">
      <div className="relative aspect-[2/3] w-full bg-secondary">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        ) : null}
        {badge ? (
          <span className="absolute left-2 top-2 rounded bg-accent/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug">{name}</p>
      </div>
    </div>
  );
}
