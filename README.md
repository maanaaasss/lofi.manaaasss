# manaaasss lofi

A beautiful and simple lofi music player.

![Preview](./public/preview.png)

## Run

1. **Clone the repository:**

   ```bash
   git clone https://github.com/manas/lofi.manaaasss.git
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Start development server:**

   ```bash
   pnpm dev
   ```

4. **Build for production:**
   ```bash
   pnpm build
   ```

---

## Add Songs

1. Add files to `public/`:
   - `public/{Artist}/Artist Profile.jpg` (Album Cover)
   - `public/{Artist}/Music/{Song}.mp3` (Audio)
   - `public/{Artist}/Thumbnail/{Song}.jpg` (Song Thumbnail)

2. Update tracklist:
   ```bash
   pnpm generate:music
   ```

---

## Credits

- **Brown Mellow**: [YouTube Channel](https://www.youtube.com/channel/UCTkwQDHFR-p9xq3LospkHIQ)
- **Kim Moongo**: [YouTube Channel](https://www.youtube.com/channel/UC-SK7bLti-RQTCjLDZB9mVA)
- **JK**: [YouTube Channel](https://www.youtube.com/channel/UC-CAenQpJqBgWC-Z74wjAYQ)
