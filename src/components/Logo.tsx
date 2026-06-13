import logoAsset from "@/assets/misaplay-logo.png.asset.json";

type Props = { className?: string; alt?: string };

export function Logo({ className = "h-8 w-auto", alt = "Misaplay TV" }: Props) {
  return <img src={logoAsset.url} alt={alt} className={className} />;
}
