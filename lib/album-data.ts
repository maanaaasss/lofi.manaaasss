export interface Track {
  name: string;
  url: string;
  picture?: string;
}

export interface Album {
  artist: string;
  cover: string;
  tracks: Track[];
}

/**
 * Album data loaded dynamically from /public/manifest.json.
 *
 * To add new tracks:
 *   1. Place files in /public/{Artist}/Music/{TrackName}.mp3
 *   2. Place thumbnail in /public/{Artist}/Thumbnail/{TrackName}.jpg (800x800)
 *   3. Run: node music/generate.mjs
 *   4. Refresh the page — tracks appear automatically.
 *
 * Folder convention:
 *   /public/{Artist}/Artist Profile.jpg    → cover art
 *   /public/{Artist}/Music/{Track}.mp3     → audio file
 *   /public/{Artist}/Thumbnail/{Track}.jpg → track thumbnail (must match song name)
 */

let cachedAlbums: Album[] = [];

export async function loadAlbums(): Promise<Album[]> {
  try {
    const res = await fetch("/manifest.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cachedAlbums = await res.json();
  } catch {
    cachedAlbums = [];
  }
  return cachedAlbums;
}

export function getAlbums(): Album[] {
  return cachedAlbums;
}

/**
 * Get all tracks from all albums, flattened, with artist metadata attached.
 */
export function getAllTracks(): { name: string; author: string; url: string; picture?: string }[] {
  return cachedAlbums.flatMap((album) =>
    album.tracks.map((track) => ({
      name: track.name,
      author: album.artist,
      url: track.url,
      picture: track.picture,
    })),
  );
}

/**
 * Get tracks for a specific artist.
 */
export function getArtistTracks(artist: string): { name: string; author: string; url: string; picture?: string }[] {
  const album = cachedAlbums.find((a) => a.artist === artist);
  if (!album) return [];
  return album.tracks.map((track) => ({
    name: track.name,
    author: album.artist,
    url: track.url,
    picture: track.picture,
  }));
}

/**
 * Shuffle an array using Fisher-Yates algorithm.
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
