import { useEffect, useRef, useState, useMemo, MouseEventHandler } from "react";
import { Gradient } from "@/components/gradient";
import { createMusicManager, MusicManager } from "@/lib/music-manager";
import { createShortcutManager } from "@/lib/shortcut-manager";
import { MusicVisualizer } from "@/components/music-visualizer";
import { formatSeconds } from "@/lib/format";
import { AnimatePresence, motion } from "framer-motion";
import { QueueItem } from "@/lib/queue-manager";
import { Timeline, DurationControl } from "@/components/control/timeline";
import { extractPalette, ColorPalette, DEFAULT_PALETTE } from "@/lib/color-extraction";
import { getAlbums, getAllTracks, getArtistTracks, shuffleArray } from "@/lib/album-data";
import { initAlbumData } from "@/lib/storage-manager";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function MusicPlayer() {
  const timelineRef = useRef<DurationControl>();
  const timeLabelRef = useRef<HTMLParagraphElement>(null);

  const [musicManager, setMusicManager] = useState<MusicManager>();
  // trigger re-renders
  const [, setDigit] = useState(0);
  const [palette, setPalette] = useState<ColorPalette>(DEFAULT_PALETTE);

  const paused = musicManager?.isPaused() ?? true;
  const currentSong = musicManager?.queueManager.getCurrentSong();

  // Extract colors from album art when the song changes
  useEffect(() => {
    if (!currentSong?.picture) {
      setPalette(DEFAULT_PALETTE);
      return;
    }

    extractPalette(currentSong.picture).then(setPalette);
  }, [currentSong?.picture]);

  useEffect(() => {
    const manager = createMusicManager({
      onTimeUpdate: (currentTime, duration) => {
        if (timeLabelRef.current) {
          timeLabelRef.current.innerText = formatSeconds(currentTime);
        }

        timelineRef.current?.((currentTime / duration) * 100);
      },
      onStateChange: () => {
        setDigit((prev) => prev + 1);
      },
      onNext() {
        setDigit((prev) => prev + 1);
      },
      onSongListUpdated() {
        setDigit((prev) => prev + 1);
      },
    });

    const shortcut = createShortcutManager({ musicManager: manager });

    shortcut.bind();
    setMusicManager(manager);

    return () => {
      shortcut.destroy();
      manager.destroy();
    };
  }, []);

  // Listen to manifest updates from the Vite development server (hot reload)
  useEffect(() => {
    if (!musicManager) return;

    const hot = (import.meta as any).hot;
    if (hot) {
      const handleManifestUpdate = async () => {
        console.log("[HMR] Manifest updated, reloading songs...");
        await initAlbumData();
        const newSongs = musicManager.storageManager.loadSongs();
        musicManager.updateSongs(newSongs);
      };

      hot.on("manifest-update", handleManifestUpdate);
      return () => {
        hot.off("manifest-update", handleManifestUpdate);
      };
    }
  }, [musicManager]);

  const onClick: MouseEventHandler = (e) => {
    if (!musicManager || e.button !== 0) return;

    const target = e.target as Element;
    const isTrigger = target.matches(
      "[data-trigger-container] *, [data-trigger-container], [data-trigger]",
    );

    if (!isTrigger) return;

    if (musicManager.isPaused()) musicManager.play();
    else musicManager.pause();
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        ease: "easeInOut",
        duration: 0.5,
      }}
      className="relative flex flex-col h-svh px-12 py-12 z-[2] text-purple-100 md:px-24 md:py-16"
      onMouseDown={onClick}
    >
      {/* Top row: Title (left) + Menu (right) */}
      <div className="flex items-start justify-between" data-trigger-container={true}>
        <AnimatedTitle text={paused ? "Click to Play" : "lofi.manaaasss"} />
        {musicManager && <Menu musicManager={musicManager} />}
      </div>

      {/* Bottom row: Song info + Timeline (left) + Visualizer (right) */}
      <div
        data-trigger={true}
        className="flex items-end justify-between mt-auto gap-6"
      >
        <div className="flex flex-col gap-3 max-w-[600px] flex-1" data-trigger-container={true}>
          <AnimatePresence mode="wait" initial={false}>
            {currentSong ? <SongDisplay song={currentSong} /> : null}
          </AnimatePresence>
          <div className="flex items-center gap-3 ml-3">
            <div className="flex-1">
              <Timeline musicManager={musicManager} durationRef={timelineRef} />
            </div>
            <p ref={timeLabelRef} className="text-xs text-purple-300/50 tabular-nums whitespace-nowrap">
              --:--
            </p>
          </div>
        </div>
        <div className="w-full max-w-[300px]" data-trigger-container={true}>
          {musicManager && (
            <MusicVisualizer
              className="w-full h-[120px]"
              analyser={musicManager.analyser}
              fftSize={4096}
              barWidth={2}
              gap={6}
              smoothingTimeConstant={0.8}
              minDecibels={-100}
              maxDecibels={0}
              barColor={palette.primary}
            />
          )}
        </div>
      </div>

      {/* Background gradient */}
      <motion.div
        data-trigger-container={true}
        className="absolute inset-0 z-[-1]"
        animate={{
          opacity: paused ? 0.3 : 1,
        }}
        initial={{
          opacity: 0,
        }}
        transition={{
          ease: "easeInOut",
          duration: 1,
        }}
        style={{ filter: "brightness(0.7)" }}
      >
        <Gradient colors={palette} />
      </motion.div>
    </motion.main>
  );
}

// ─── Menu with Album Browsing ────────────────────────────────────────────────

function Menu({ musicManager }: { musicManager: MusicManager }) {
  return (
    <Popover>
      <PopoverTrigger
        id="menu-trigger"
        aria-label="Menu"
        className={cn(
          buttonVariants({
            variant: "ghost",
            className: "max-md:absolute max-md:top-8 max-md:right-8",
          }),
        )}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
        Menu
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="!bg-black/30 !backdrop-blur-2xl !border-white/10"
      >
        <AlbumList musicManager={musicManager} />
        <PlayerControls musicManager={musicManager} />
      </PopoverContent>
    </Popover>
  );
}

// ─── Album List ──────────────────────────────────────────────────────────────

function AlbumList({ musicManager }: { musicManager: MusicManager }) {
  const albums = getAlbums();
  const playAlbum = (artist: string) => {
    const tracks = getArtistTracks(artist);
    if (tracks.length === 0) return;
    musicManager.queueManager.setSongs(tracks);
    musicManager.play();
  };

  const shuffleAll = () => {
    const all = getAllTracks();
    if (all.length === 0) return;
    musicManager.queueManager.setSongs(shuffleArray(all));
    musicManager.play();
  };

  return (
    <div className="flex flex-col -mx-2 -mt-2">
      {albums.map((album) => {
        const hasTracks = album.tracks.length > 0;
        return (
          <button
            key={album.artist}
            className={cn(
              "relative flex flex-row text-left items-center gap-3 rounded-xl p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",
              hasTracks
                ? "hover:bg-purple-200/5 cursor-pointer"
                : "opacity-40 cursor-default",
            )}
            onClick={() => hasTracks && playAlbum(album.artist)}
            disabled={!hasTracks}
          >
            <img
              alt={album.artist}
              src={album.cover}
              className="size-12 rounded-md object-cover"
            />
            <div>
              <p className="text-sm font-medium">{album.artist}</p>
              <p className="text-xs text-purple-200">
                {album.tracks.length === 0
                  ? "No tracks yet"
                  : `${album.tracks.length} track${album.tracks.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </button>
        );
      })}

      {/* Shuffle All */}
      <button
        className={cn(
          buttonVariants({ variant: "secondary" }),
          "mt-2 gap-2",
        )}
        onClick={shuffleAll}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" x2="21" y1="20" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" x2="21" y1="15" y2="21" />
          <line x1="4" x2="9" y1="4" y2="9" />
        </svg>
        Shuffle All
      </button>
    </div>
  );
}

// ─── Player Controls ─────────────────────────────────────────────────────────

function PlayerControls({ musicManager }: { musicManager: MusicManager }) {
  const [volume, setVolume] = useState(() => musicManager.getVolume());

  return (
    <div className="flex flex-row items-center gap-2 mt-2">
      {musicManager.isPaused() ? (
        <button
          aria-label="play"
          className={cn(buttonVariants({ variant: "secondary" }))}
          onClick={() => musicManager.play()}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
        </button>
      ) : (
        <button
          aria-label="pause"
          className={cn(buttonVariants({ variant: "secondary" }))}
          onClick={() => musicManager.pause()}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            <rect width="4" height="16" x="6" y="4" />
            <rect width="4" height="16" x="14" y="4" />
          </svg>
        </button>
      )}
      {/* Previous */}
      <button
        aria-label="Previous"
        className={cn(buttonVariants({ variant: "secondary" }))}
        onClick={() => musicManager.queueManager.previous()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
          <polygon points="11 19 2 12 11 5 11 19" />
          <polygon points="22 19 13 12 22 5 22 19" />
        </svg>
      </button>
      {/* Next */}
      <button
        aria-label="Next"
        className={cn(buttonVariants({ variant: "secondary" }))}
        onClick={() => {
          musicManager.queueManager.next();
          if (musicManager.isPaused()) musicManager.play();
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
          <polygon points="13 19 22 12 13 5 13 19" />
          <polygon points="2 19 11 12 2 5 2 19" />
        </svg>
      </button>
      <VolumeSlider musicManager={musicManager} />
    </div>
  );
}

function VolumeSlider({ musicManager }: { musicManager: MusicManager }) {
  const [value, setValue] = useState(() => musicManager.getVolume());

  return (
    <>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {value > 0.2 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
        {value > 0.7 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
      </svg>
      <Slider
        className="flex-1 rounded-full"
        aria-valuetext="Volume"
        value={value}
        onValueChange={(v) => {
          setValue(v);
          musicManager.setVolume(v);
        }}
      />
    </>
  );
}

// ─── Song Display & Title ────────────────────────────────────────────────────

function SongDisplay({ song }: { song: QueueItem }) {
  return (
    <motion.div
      key={song.id}
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -10, opacity: 0 }}
      transition={{ ease: "easeInOut", duration: 0.3 }}
      className="flex flex-row items-center gap-4 rounded-xl p-3"
    >
      {song.picture && (
        <img alt="picture" src={song.picture} className="size-20 rounded-lg object-cover" />
      )}
      <div>
        <p className="font-medium">{song.name}</p>
        <p className="text-xs text-purple-200">{song.author}</p>
      </div>
    </motion.div>
  );
}

function AnimatedTitle({ text }: { text: string }) {
  const words = useMemo(() => text.split(" "), [text]);
  let index = 0;

  return (
    <h1 className="text-6xl font-light leading-[0.9] tracking-[-0.1em] md:text-8xl md:leading-[0.9] md:tracking-[-0.1em] whitespace-nowrap">
      {words.map((word, i) => (
        <motion.span key={i} className="inline-block mr-6 break-keep">
          {word.split("").map((c, j) => (
            <motion.span
              key={`${c}-${j}`}
              className="inline-block"
              initial={{ y: 20, opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                transition: {
                  ease: "easeInOut",
                  delay: index++ * 0.04,
                  duration: 0.2,
                },
              }}
            >
              {c}
            </motion.span>
          ))}
        </motion.span>
      ))}
    </h1>
  );
}
