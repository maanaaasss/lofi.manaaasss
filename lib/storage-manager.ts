import { Song } from "@/music/data";
import { loadAlbums, getAllTracks } from "@/lib/album-data";

export interface StorageManager {
  getCustomSongs(): Song[];
  loadSongs(): Song[];
  saveCustomSongs(songs: Song[]): void;
}

type Storage = {
  custom_songs: Song[];
};

export function createStorageManager(): StorageManager {
  return {
    saveCustomSongs(songs: Song[]) {
      localStorage.setItem("custom_songs", JSON.stringify(songs));
    },
    getCustomSongs() {
      const customSongs = localStorage.getItem("custom_songs");

      if (customSongs) {
        return JSON.parse(customSongs) as Storage["custom_songs"];
      }

      return [];
    },
    loadSongs() {
      return [...getAllTracks(), ...this.getCustomSongs()];
    },
  };
}

/**
 * Initialize album data by fetching manifest.json.
 * Must be called before storageManager.loadSongs().
 */
export async function initAlbumData(): Promise<void> {
  await loadAlbums();
}
