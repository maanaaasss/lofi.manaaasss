import * as fs from "node:fs/promises";
import * as path from "node:path";

const AUDIO_FORMATS = ["mp3", "ogg", "wav", "mp4", "webm"];
const IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp"];

/**
 * Scans /public for artist folders and generates /public/manifest.json.
 *
 * Folder convention:
 *   /public/{Artist}/Artist Profile.jpg    → cover art
 *   /public/{Artist}/Music/{Track}.mp3     → audio file
 *   /public/{Artist}/Thumbnail/{Track}.jpg → track thumbnail (800x800 rule)
 *
 * Thumbnail naming must match the song name exactly.
 * Run: node music/generate.mjs
 */

async function pathExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function getFiles(dir) {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

export async function generateManifest() {
  const publicDir = "./public";
  const entries = await fs.readdir(publicDir);
  const albums = [];

  for (const entry of entries) {
    const artistDir = path.join(publicDir, entry);
    const stat = await fs.stat(artistDir);

    if (!stat.isDirectory()) continue;
    if (entry === "node_modules" || entry.startsWith(".")) continue;

    const coverPath = path.join(artistDir, "Artist Profile.jpg");
    const coverExists = await pathExists(coverPath);

    const musicDir = path.join(artistDir, "Music");
    const thumbDir = path.join(artistDir, "Thumbnail");

    const musicFiles = await getFiles(musicDir);
    const thumbFiles = await getFiles(thumbDir);

    // Index thumbnails by base name for matching
    const thumbMap = new Map();
    for (const t of thumbFiles) {
      const ext = path.extname(t).toLowerCase().slice(1);
      if (!IMAGE_FORMATS.includes(ext)) continue;
      const base = path.basename(t, path.extname(t));
      thumbMap.set(base, `/${entry}/Thumbnail/${t}`);
    }

    const tracks = [];
    for (const file of musicFiles) {
      const ext = path.extname(file).toLowerCase().slice(1);
      if (!AUDIO_FORMATS.includes(ext)) continue;

      const base = path.basename(file, path.extname(file));
      tracks.push({
        name: base,
        url: `/${entry}/Music/${file}`,
        picture: thumbMap.get(base) || undefined,
      });
    }

    // Only include artists that have an Artist Profile (even if 0 tracks)
    if (coverExists) {
      albums.push({
        artist: entry,
        cover: `/${entry}/Artist Profile.jpg`,
        tracks,
      });
    }
  }

  // Sort artists alphabetically
  albums.sort((a, b) => a.artist.localeCompare(b.artist));

  await fs.writeFile(
    path.join(publicDir, "manifest.json"),
    JSON.stringify(albums, null, 2),
  );

  const totalTracks = albums.reduce((sum, a) => sum + a.tracks.length, 0);
  console.log(`${albums.length} artists, ${totalTracks} tracks → public/manifest.json`);
}

if (process.argv[1] && (process.argv[1].endsWith("generate.mjs") || process.argv[1].endsWith("generate"))) {
  void generateManifest();
}
