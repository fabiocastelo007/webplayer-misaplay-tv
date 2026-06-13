import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import mpegts from "mpegts.js";
import { Loader2, ExternalLink } from "lucide-react";

type Props = {
  src: string;
  poster?: string;
  /** When true (or src ends in .m3u8), use hls.js when needed. */
  hls?: boolean;
};

/** Derive an MPEG-TS URL from an Xtream-style HLS URL: /live/u/p/123.m3u8 -> /live/u/p/123.ts */
function toTsUrl(src: string): string | null {
  if (/\.m3u8(\?|$)/i.test(src)) return src.replace(/\.m3u8(\?|$)/i, ".ts$1");
  if (/\/live\/[^/]+\/[^/]+\/\d+$/i.test(src)) return src + ".ts";
  return null;
}

export function VideoPlayer({ src, poster, hls }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // 0: try HLS/native, 1: try mpegts.js with .ts URL
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
    setError(null);
    setLoading(true);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    setLoading(true);

    const isHls = hls ?? src.toLowerCase().includes(".m3u8");
    let hlsInstance: Hls | null = null;
    let tsPlayer: ReturnType<typeof mpegts.createPlayer> | null = null;

    const tryFallback = () => {
      const tsUrl = toTsUrl(src);
      if (stage === 0 && tsUrl && mpegts.getFeatureList().mseLivePlayback) {
        setStage(1);
        return true;
      }
      return false;
    };

    if (stage === 1) {
      // MPEG-TS over HTTP via mpegts.js
      const tsUrl = toTsUrl(src) ?? src;
      tsPlayer = mpegts.createPlayer(
        { type: "mpegts", isLive: true, url: tsUrl, cors: true },
        { enableWorker: true, liveBufferLatencyChasing: true, lazyLoad: false },
      );
      tsPlayer.attachMediaElement(video);
      tsPlayer.load();
      Promise.resolve(tsPlayer.play()).catch(() => {});
      tsPlayer.on(mpegts.Events.ERROR, () => {
        setLoading(false);
        setError("Não foi possível carregar o stream.");
      });
    } else if (isHls && !video.canPlayType("application/vnd.apple.mpegurl") && Hls.isSupported()) {
      hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsInstance.loadSource(src);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          if (tryFallback()) return;
          setLoading(false);
          setError(`Falha no stream (${data.type}${data.details ? " · " + data.details : ""}).`);
        }
      });
    } else {
      video.src = src;
    }

    const onLoaded = () => setLoading(false);
    const onError = () => {
      if (tryFallback()) return;
      setLoading(false);
      setError("Não foi possível carregar o vídeo neste navegador.");
    };
    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onError);
      if (hlsInstance) hlsInstance.destroy();
      if (tsPlayer) {
        try {
          tsPlayer.pause();
          tsPlayer.unload();
          tsPlayer.detachMediaElement();
          tsPlayer.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
      video.removeAttribute("src");
      video.load();
    };
  }, [src, hls, stage]);

  const tsUrl = toTsUrl(src);

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
            Tente novamente ou abra o link num leitor externo como VLC / MX Player.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {tsUrl && stage === 0 ? (
              <button
                onClick={() => {
                  setError(null);
                  setStage(1);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                Tentar leitor alternativo
              </button>
            ) : null}
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-black"
            >
              <ExternalLink className="size-4" /> Abrir num leitor externo
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
