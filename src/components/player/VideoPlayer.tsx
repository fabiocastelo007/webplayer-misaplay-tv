import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2, ExternalLink } from "lucide-react";

type Props = {
  src: string;
  poster?: string;
  /** When true (or src ends in .m3u8), use hls.js when needed. */
  hls?: boolean;
};

export function VideoPlayer({ src, poster, hls }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    setLoading(true);

    const isHls = hls ?? src.toLowerCase().includes(".m3u8");
    let instance: Hls | null = null;

    if (isHls && !video.canPlayType("application/vnd.apple.mpegurl") && Hls.isSupported()) {
      instance = new Hls({ enableWorker: true, lowLatencyMode: false });
      instance.loadSource(src);
      instance.attachMedia(video);
      instance.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setLoading(false);
          setError(`Falha no stream (${data.type}${data.details ? " · " + data.details : ""}).`);
        }
      });
    } else {
      video.src = src;
    }

    const onLoaded = () => setLoading(false);
    const onError = () => {
      setLoading(false);
      setError("Não foi possível carregar o vídeo neste navegador.");
    };
    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onError);
      if (instance) {
        instance.destroy();
      } else {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [src, hls]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black ring-1 ring-border/40">
      <video
        ref={videoRef}
        poster={poster}
        controls
        autoPlay
        playsInline
        className="h-full w-full"
      />
      {loading && !error ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="size-8 animate-spin text-white" />
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-sm text-white">
          <p className="font-medium">{error}</p>
          <p className="max-w-md text-xs text-white/70">
            Alguns canais ao vivo bloqueiam reprodução directa no navegador.
            Abra o link num leitor externo como VLC ou MX Player.
          </p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-black"
          >
            <ExternalLink className="size-4" /> Abrir num leitor externo
          </a>
        </div>
      ) : null}
    </div>
  );
}
