# GIF-maker 🎞️

En nettside som gjør videoklipp om til loopende GIF-er – helt uten server.
All konvertering skjer lokalt i nettleseren med [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm).

## Funksjoner

- Last opp en videofil (MP4, WebM, MOV m.m.) med dra-og-slipp
- Eller lim inn en YouTube-lenke / direkte videolenke og trykk «Hent video»
- Velg starttidspunkt (sekund) – eller trykk «Sett start til videoens posisjon» mens du ser på videoen
- Velg varighet, FPS og bredde
- Forhåndsvis loopen i videospilleren før du konverterer
- GIF-en looper uendelig og kan lastes ned direkte

## Om YouTube-lenker

GitHub Pages er ren statisk hosting uten egen server, så YouTube-videoer
hentes via offentlige [Piped](https://github.com/TeamPiped/Piped)-instanser
som proxyer videoen med åpne CORS-headere. Siden henter listen over levende
instanser dynamisk og prøver dem i tur og orden.

**Merk:** Disse tjenestene er tredjeparts og kan være nede eller midlertidig
blokkert av YouTube for enkeltvideoer. Hvis hentingen feiler: last ned videoen
med `yt-dlp` lokalt og last opp filen i stedet. Direkte videolenker (f.eks.
`.mp4`) fungerer når serveren de ligger på tillater CORS.

## Publisering på GitHub Pages

1. Opprett et nytt repository på github.com (f.eks. `gif-maker`)
2. Last opp `index.html` og `README.md` (eller push med git)
3. Gå til **Settings → Pages**, velg **Deploy from a branch**, branch `main`, mappe `/ (root)`
4. Siden blir tilgjengelig på `https://<brukernavn>.github.io/gif-maker/`

## Teknisk

- Én enkelt `index.html` – ingen byggetrinn, ingen avhengigheter å installere
- ffmpeg.wasm lastes fra CDN (unpkg) ved første konvertering (~25 MB, caches av nettleseren)
- Bruker enkelttråds-kjernen (`@ffmpeg/core-st`) som ikke trenger
  SharedArrayBuffer/cross-origin-isolation – derfor fungerer den på GitHub Pages
- GIF-kvaliteten optimaliseres med ffmpeg sin `palettegen`/`paletteuse`
