import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { isFavorite, onFavoritesChanged, toggleFavorite, type FavKind, type FavoriteItem } from "@/lib/favorites";

type Props = {
  kind: FavKind;
  item: Omit<FavoriteItem, "addedAt" | "kind">;
  className?: string;
  size?: number;
};

export function FavoriteButton({ kind, item, className = "", size = 16 }: Props) {
  const [fav, setFav] = useState(false);
  useEffect(() => {
    setFav(isFavorite(kind, item.id));
    return onFavoritesChanged(() => setFav(isFavorite(kind, item.id)));
  }, [kind, item.id]);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite({ kind, ...item });
      }}
      aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      title={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={
        "inline-flex items-center justify-center rounded-full bg-black/55 p-1.5 text-white backdrop-blur transition hover:bg-black/80 " +
        className
      }
    >
      <Heart size={size} className={fav ? "fill-red-500 text-red-500" : ""} />
    </button>
  );
}
