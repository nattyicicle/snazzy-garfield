# Practice Player

A private band-practice MVP built with Next.js, TypeScript, Tailwind CSS, and the Web Audio API.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal. If port `3000` is already in use, Next.js will choose the next available port.

## Song library

Songs are defined in `public/song-library/songs.json`.

For this workspace, `public/song-library/songs` is a lightweight symlink to the local Google Drive stem folders. That avoids duplicating many gigabytes of WAV files inside the project.

To refresh the linked library from Google Drive, run:

```bash
node scripts/import-drive-stems.mjs --link-all-drive
```

For a fully local copy instead, audio files can live under:

```text
public/song-library/songs/[song-id]/
```

Example:

```text
public/song-library/songs/blasphemy/master.mp3
public/song-library/songs/blasphemy/drums.mp3
public/song-library/songs/blasphemy/bass.mp3
public/song-library/songs/blasphemy/guitars.mp3
public/song-library/songs/blasphemy/vocals.mp3
```

The app handles missing files gracefully, so the mixer can still be reviewed if a Drive-backed file has not hydrated locally yet.

## Sharing with the band

The app is ready to deploy as a private Vercel site with stem audio hosted in
Cloudflare R2.

Set these Vercel environment variables:

```text
BAND_ACCESS_PASSWORD=your-shared-band-password
NEXT_PUBLIC_AUDIO_BASE_URL=https://your-r2-audio-domain.example.com
```

`BAND_ACCESS_PASSWORD` requires a shared password before anyone can open the
player. `NEXT_PUBLIC_AUDIO_BASE_URL` tells the browser where to fetch the audio
in production. Local development can leave it empty and keep using the local
Google Drive symlinks.

The current local song folders are symlinks into Google Drive. That works on
this computer, but those links will not work on Vercel. Upload the contents
behind `public/song-library/songs` into R2 under this object prefix:

```text
song-library/songs/
```

That preserves the existing paths in `public/song-library/songs.json`. For
example, this local path:

```text
/song-library/songs/blasphemy/0%20Lead%20Vocals.wav
```

will be fetched from:

```text
https://your-r2-audio-domain.example.com/song-library/songs/blasphemy/0%20Lead%20Vocals.wav
```

Recommended setup:

1. Create a Cloudflare R2 bucket for the stem files.
2. Give the bucket a public URL, preferably a custom domain.
3. Configure R2 CORS to allow the Vercel app domain.
4. Upload `public/song-library/songs` to R2 under `song-library/songs/`.
5. Add `BAND_ACCESS_PASSWORD` and `NEXT_PUBLIC_AUDIO_BASE_URL` in Vercel.
6. Redeploy the Vercel project and share the Vercel URL plus password.

For a temporary rehearsal link, run the app on this computer and expose it with
a tunnel service. That is fast, but the link only works while this computer and
the tunnel are running.
