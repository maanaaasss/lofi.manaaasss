import { Song } from "@/music/data";

export interface QueueItem extends Song {
  /**
   * Absolute index in the queue
   */
  id: number;
}

export interface QueueManagerOptions {
  onUpdate?: (song: QueueItem | undefined) => void;
  onSongListUpdated?: (songs: QueueItem[]) => void;
}

export interface QueueManager {
  currentIndex: number;
  songs: QueueItem[];

  getPendingSongs(): QueueItem[];
  getCurrentSong(): QueueItem | undefined;
  setIndex(id: number): void;
  setSongs(songs: Song[]): void;
  updateSongs(songs: Song[]): void;

  previous(): void;
  next(): void;
}

export function createQueueManager(options: QueueManagerOptions): QueueManager {
  return {
    currentIndex: -1,
    songs: [],
    setSongs(songs: Song[]) {
      this.songs = songs.map((song, i) => ({ ...song, id: i }));

      // Ensure index is in the songs list
      this.setIndex(this.currentIndex === -1 ? 0 : this.currentIndex);

      // fire update
      options.onUpdate?.(this.getCurrentSong());
      options.onSongListUpdated?.(this.songs);
    },
    updateSongs(songs: Song[]) {
      const currentSong = this.getCurrentSong();
      this.songs = songs.map((song, i) => ({ ...song, id: i }));

      let newIndex = -1;
      if (currentSong) {
        newIndex = this.songs.findIndex((s) => s.url === currentSong.url);
      }

      if (newIndex !== -1) {
        this.currentIndex = newIndex;
        options.onSongListUpdated?.(this.songs);
      } else {
        this.setIndex(this.songs.length > 0 ? 0 : -1);
      }
    },
    getPendingSongs() {
      return this.songs.slice(this.currentIndex + 1);
    },
    getCurrentSong() {
      return this.songs[this.currentIndex];
    },
    setIndex(id) {
      let target: number;

      if (this.songs.length === 0) target = -1;
      else if (id >= this.songs.length) target = 0;
      else if (id < 0) target = this.songs.length - 1;
      else target = id;

      if (this.currentIndex === target) return;
      this.currentIndex = target;
      options.onUpdate?.(this.getCurrentSong());
    },
    next() {
      this.setIndex(this.currentIndex + 1);
    },
    previous() {
      this.setIndex(this.currentIndex - 1);
    },
  };
}
