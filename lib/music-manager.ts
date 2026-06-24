import { Song } from "@/music/data";
import {
  createQueueManager,
  QueueItem,
  QueueManager,
  QueueManagerOptions,
} from "@/lib/queue-manager";
import { createStorageManager, StorageManager, initAlbumData } from "@/lib/storage-manager";

export interface MusicManager {
  storageManager: StorageManager;
  queueManager: QueueManager;
  analyser: AnalyserNode;

  play(): void;
  pause(): void;
  setPlaying(song: Song): void;
  destroy(): void;

  isPaused(): boolean;
  getTime(): number;
  getDuration(): number;
  setTime(time: number): void;

  getVolume(): number;
  setVolume(v: number): void;

  updateSongs(songs: Song[]): void;
}

export interface MusicManagerOptions
  extends Omit<QueueManagerOptions, "onUpdate"> {
  onNext?: (song: QueueItem | undefined) => void;
  onStateChange?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export function createMusicManager({
  onSongListUpdated,
  ...options
}: MusicManagerOptions): MusicManager {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  const audio = new Audio();

  const onStateChange = () => {
    options.onStateChange?.();
  };
  const onTimeUpdate = () => {
    options.onTimeUpdate?.(audio.currentTime, audio.duration);
  };

  const storageManager = createStorageManager();
  const queueManager = createQueueManager({
    onUpdate: (song) => {
      if (song) manager.setPlaying(song);
      options?.onNext?.(song);
      options.onTimeUpdate?.(0, 0);
    },
    onSongListUpdated,
  });

  const manager: MusicManager = {
    queueManager,
    storageManager,
    analyser,
    getTime(): number {
      return audio.currentTime;
    },
    getDuration(): number {
      return audio.duration;
    },
    setTime(time: number) {
      audio.currentTime = time;
    },
    isPaused(): boolean {
      return context.state === "suspended" || (audio != null && audio.paused);
    },
    getVolume(): number {
      return audio.volume;
    },
    setVolume(v) {
      audio.volume = v;
    },
    updateSongs(songs) {
      queueManager.updateSongs(songs);
    },
    async play() {
      if (context.state === "suspended") {
        await context.resume();
      }
      await audio.play();
    },
    pause() {
      void audio.pause();
    },
    setPlaying(song) {
      const wasPlaying = !this.isPaused();
      audio.src = song.url;
      if (wasPlaying) {
        this.play();
      }
    },
    destroy() {
      this.pause();
      audio.removeEventListener("play", onStateChange);
      audio.removeEventListener("pause", onStateChange);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", () => {
        manager.queueManager.next();
        manager.play();
      });
    },
  };

  // Wire up ended handler now that manager exists
  audio.addEventListener("ended", () => {
    manager.queueManager.next();
    manager.play();
  });

  // Async init: load manifest.json then populate queue
  (async () => {
    const source = context.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(context.destination);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onStateChange);
    audio.addEventListener("pause", onStateChange);

    await initAlbumData();
    queueManager.setSongs(storageManager.loadSongs());
  })();

  return manager;
}
