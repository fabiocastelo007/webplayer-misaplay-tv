import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import mpegts from "mpegts.js";
import { Loader2, MoreVertical, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type Props = {
  src: string;
  poster?: string;
  /** When true (or src ends in .m3u8), use hls.js when needed. */
  hls?: boolean;
  /** Start playback at this position (seconds). */
  startAt?: number;
  /** Called periodically with playback progress. */
  onProgress?: (position: number, duration: number) => void;
};

type QualityOption = {
  label: string;
  /** -1 = auto (HLS adaptive). Otherwise HLS level index, or -2 for forced playbackRate fallback */
  value: number;
};

function toTsUrl(src: string): string | null {
  if (/\.m3u8(\?|$)/i.test(src)) return src.replace(/\.m3u8(\?|$)/i, ".ts$1");
  if (/\/live\/[^/]+\/[^/]+\/\d+$/i.test(src)) return src + ".ts";
  return null;
}

function labelForLevel(level: { height?: number; bitrate?: number }, index: number): string {
  if (level.height) return `${level.height}p`;
  if (level.bitrate) return `${Math.round(level.bitrate / 1000)} kbps`;
  return `Qualidade ${index + 1}`;
}

export function VideoPlayer({ src, poster, hls, startAt, onProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(0);
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);

  useEffect(() => {
    setStage(0);
    setError(null);
    setLoading(true);
    setQualities([]);
    setCurrentQuality(-1);
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
      hlsRef.current = hlsInstance;
      hlsInstance.loadSource(src);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hlsInstance!.levels.map((l, i) => ({
          label: labelForLevel(l, i),
          value: i,
        }));
        if (levels.length > 1) {
          setQualities([{ label: "Automático", value: -1 }, ...levels]);
          setCurrentQuality(-1);
        }
      });
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

    const onLoaded = () => {
      setLoading(false);
      if (startAt && startAt > 0 && Number.isFinite(startAt)) {
        try {
          video.currentTime = startAt;
        } catch {
          /* ignore */
        }
      }
    };
    const onError = () => {
      if (tryFallback()) return;
      setLoading(false);
      setError("Não foi possível carregar o vídeo neste navegador.");
    };
    let lastReport = 0;
    const onTime = () => {
      if (!onProgress) return;
      const now = Date.now();
      if (now - lastReport < 5000) return;
      lastReport = now;
      onProgress(video.currentTime || 0, video.duration || 0);
    };
    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("error", onError);
    video.addEventListener("timeupdate", onTime);

    return () => {
      if (onProgress && video.currentTime > 0) {
        try { onProgress(video.currentTime, video.duration || 0); } catch { /* ignore */ }
      }
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onError);
      video.removeEventListener("timeupdate", onTime);
      if (hlsInstance) hlsInstance.destroy();
      hlsRef.current = null;
      if (tsPlayer) {
        try {
          tsPlayer.pause();
          tsPlayer.unload();
          tsPlayer.detachMediaElement();
          tsPlayer.destroy();
        } catch {
          /* ignore */
        }
      }
      video.removeAttribute("src");
      video.load();
    };
  }, [src, hls, stage, startAt, onProgress]);

  const selectQuality = (value: number) => {
    setCurrentQuality(value);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = value; // -1 = auto
    }
  };

  // Fallback quality options for non-HLS streams (mp4 VOD)
  // We can't change source quality but can cap buffering hints via playbackRate is not useful.
  // Offer a "Economizar dados" toggle that lowers video element resolution via CSS only is cosmetic.
  // For real bitrate switch we only expose HLS levels.
  const showMenu = qualities.length > 1;

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

      {showMenu ? (
        <div className="absolute right-2 top-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Opções"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
              >
                <MoreVertical className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Qualidade do vídeo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {qualities.map((q) => (
                <DropdownMenuItem
                  key={q.value}
                  onClick={() => selectQuality(q.value)}
                  className="flex items-center justify-between"
                >
                  <span>{q.label}</span>
                  {currentQuality === q.value ? <Check className="size-4" /> : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <p className="px-2 py-1 text-[11px] text-muted-foreground">
                Use uma qualidade mais baixa se a internet estiver lenta.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      {loading && !error ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="size-8 animate-spin text-white" />
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-sm text-white">
          <p className="font-medium">{error}</p>
          {stage === 0 && toTsUrl(src) ? (
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
        </div>
      ) : null}
    </div>
  );
}
