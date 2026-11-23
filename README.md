# SIRR — bir iç seyir

An immersive WebGL journey in six chapters through nature, time and the self: **Uyanış, Yaratılış, Nefs, Zaman, Sükûn, Dönüş**. It is one continuous scroll through one day, from before dawn to the next dawn. Its intellectual foundation is in the Qur'an, authentic hadith and classical scholarship. Every reference is traceable in an opt-in sources panel, and nothing sacred is used as decoration.

![SIRR — the lake at dusk](public/og.jpg)

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000 (development, hot reload)
npm run preview      # production build + local static server on http://localhost:3000
```

Requirements: Node 20 or newer. No database, no server code, no API keys.

URL options: `?q=low|medium|high` forces a quality tier. `?qa=1` exposes the store and renderer to the QA scripts (it changes nothing visible).

## Deploying

SIRR is a **fully static site**. `npm run build` writes plain HTML, JS and CSS to `out/` (`output: 'export'` in `next.config.ts`).

| Host | How |
|---|---|
| **Vercel** | Import the repository. `vercel.json` sets the build, the `out/` directory, caching and security headers. |
| **Netlify** | Import the repository. `netlify.toml` does the same. |
| **Cloudflare Pages** | Workers & Pages → Create → Pages → Connect to Git → pick the repository. Build command `npm run build`, output directory `out`, environment variable `NODE_VERSION=22`. Headers come from `public/_headers`. |
| **Any static host / CDN** (GitHub Pages, S3 + CloudFront, nginx) | Upload the contents of `out/`. Serve `/_next/static/*` with `Cache-Control: public, max-age=31536000, immutable`, and everything else with `no-cache`. |

The site must be served over **HTTPS** or from `localhost`; browsers restrict some WebGL and audio features otherwise. It is built to live at the domain root. For a sub-path (e.g. GitHub Pages project sites), set `basePath` in `next.config.ts`.

### Environment variables

All optional. See [`.env.example`](.env.example).

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL without a trailing slash, e.g. `https://sirr.example.org`. Enables the canonical link and the social preview image (`public/og.jpg`); without it, no image tags are emitted rather than broken ones. Set it at build time. |

### Privacy

No cookies, no analytics, no third-party requests at runtime (the fonts are self-hosted at build time). The only thing stored is the optional "word for tomorrow" in Chapter 06. It stays in the visitor's own `localStorage` and can be removed with "Unut". The sources panel and the text version say so.

## The experience

| # | Chapter | World | The gesture |
|---|---|---|---|
| 01 | **Uyanış** | Valley at blue hour, grass and wildflowers in the wind | Stop moving: the wind calms. Touch the flower. The camera ends inside a dewdrop. |
| 02 | **Yaratılış** | A flower at insect scale, 3 m petals, a forest of stamens | Turn the flower; long-press to light its veins. One petal wilts, upside down, and turns to glass. |
| 03 | **Nefs** | A single mirror in an endless dark hall | Polish the fogged glass. A faceless reflection of you appears, a moment behind. The mirror becomes water. |
| 04 | **Zaman** | Dunes at 'asr, walking toward a low sun | Hurry and the sun sinks faster, for good. Heap up sand; the wind takes it back. |
| 05 | **Sükûn** | A lake at dusk, one tree, then stars | Touch the water. Better: be still. The surface becomes a mirror and the light breathes. |
| 06 | **Dönüş** | The first valley at sunrise; a figure ahead facing the sun | Leave one word for tomorrow. The journey loops back to Uyanış, fog thinner. |

Each chapter is entered through a different light: warm, silver, sand, dusk, dawn. Scenes swap inside that light, never with a cut.

**Controls:** scroll / swipe to move · `1–6` jump to a chapter · `S` sound (off by default) · `K` sources · `Esc` close · **Metin** reading mode (the whole journey as text).

## Architecture

- **Next.js** (static export) · **React 19** · **three.js** via **@react-three/fiber**
- **postprocessing** (bloom, tone mapping, vignette, grain; depth of field on high)
- **zustand** for state read in the render loop · **lenis** for native-feeling smooth scroll
- No textures, models or audio files: everything is procedural (shaders, geometry, WebAudio). See [`docs/03-ASSETS.md`](docs/03-ASSETS.md) for the planned production assets.

```
src/
  app/               page (server-rendered text journey = no-WebGL and screen-reader version), layout, icon
  content/           chapters.ts (all text, timing, sources per chapter) · sources.ts (typed references) · layout.ts (scroll map)
  scenes/<chapter>/  one folder per chapter: the scene, its camera path, its pieces
  scenes/registry.ts chapter id → lazy scene + camera path
  camera/            CameraRig (the only code that moves the camera) · cameraState
  components/        experience (Canvas, SceneManager, PostFX, error handling) · typography · navigation · ui
  materials/         shared WindField/atmosphere uniforms, petal material, dawn environment
  shaders/           shared GLSL chunks (noise, wind, fog)
  interactions/      wind driver, stillness detection
  audio/             procedural ambient engine with per-chapter profiles
  store/             experience (scroll, chapter, quality, faults) · narrative (discoveries, panels)
tools/               QA scripts, social image capture, static server
docs/                proposal, research references, asset plan, QA report
```

**Key ideas**

- **Text is never in a scene.** Questions, timing and sources live in `content/`. Change a line or its timing without touching WebGL.
- **One persistent canvas.** `SceneManager` mounts the current chapter, and the next one hidden as you approach a threshold. The next chapter's shaders compile in the background, and its GPU resources are disposed when it unmounts.
- **The camera's smoothed position decides the chapter**, so swaps always happen inside threshold light.
- **Quality tiers** (`utils/device.ts`): chosen from CPU, memory and the actual GPU, then stepped down at runtime by `PerformanceMonitor` if frames drop.

### Adding or editing a chapter

1. Edit its entry in `src/content/chapters.ts`: `beats` (text plus timing as chapter progress 0–1), `stillLine`, `discoveries`, `thresholdTone`, `sources`.
2. Add any new references to `src/content/sources.ts`, with the right `type` (`quran`, `hadith`, `athar`, `tafsir`, `scholar`, `original`) and `status`.
3. A new world goes in `src/scenes/<id>/`. Export a default component taking `{ active }`, write a `CameraPath` (positions, targets, knots, fov keys), and register both in `src/scenes/registry.ts`.

### Religious content: the rule

- Summaries in `sources.ts` are **project summaries, explicitly labelled as not a meal**. `meal` stays `null` until verified, licensed text (e.g. Diyanet Kur'an Yolu, with permission) is inserted.
- Hadith carry their collection, number and grade. Disputed gradings are shown as disputed.
- Sayings of Companions are typed `athar`, never `hadith`.
- Everything on screen is original project writing, labelled as such in the panel. No verse is printed in the scene.
- See [`docs/02-RESEARCH-REFERENCES.md`](docs/02-RESEARCH-REFERENCES.md), including the "do not use" list.

> **Before public launch:** a qualified theology reviewer should sign off on `src/content/sources.ts`. Entries marked `pending-review` and `check-numbering` must be verified against the editions used.

## Quality assurance

```bash
npm run build
node tools/serve-static.mjs out 3100                                     # serve the exported site
node tools/qa-walkthrough.mjs http://localhost:3100 qa-out high,medium,low  # fps, hitches, black frames, screenshots
node tools/qa-walkthrough.mjs http://localhost:3100 qa-out low mobile       # 390×844 touch viewport
node tools/qa-leak.mjs        # GPU memory must stay flat across three full journeys
node tools/qa-a11y.mjs        # reduced motion, keyboard, reading mode, screen-reader hiding
node tools/qa-faults.mjs      # chunk download failure, GPU context loss and restore
node tools/capture-og.mjs     # regenerate public/og.jpg from the experience
node tools/qa-baseline-fps.mjs  # empty-page fps: rules out battery-saver caps before reading results
```

The scripts drive your installed Chrome headless, with a throwaway profile. Set `CHROME_PATH` if Chrome lives elsewhere. Measured results and known gaps: [`docs/04-QA.md`](docs/04-QA.md).

**Error handling.** A crash in the 3D world, or a chapter that fails to download, switches to the text journey with a notice and a reload option. A lost GPU context shows a notice and recovers by itself when the browser restores it. Failing post-processing just turns itself off. If the world has not started after 20 s, the visitor is offered the text.

## Browser support

Tested headless in Chrome (Windows / Direct3D). Expected to work in current Edge, Firefox and Safari 16.4+ (WebGL 2), but **not yet verified there or on real phones**; see the open items in `docs/04-QA.md`. Without WebGL, the page is the text journey.

## Licences

Runtime dependencies (licences checked from the installed packages): three.js, React, Next.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing, zustand and lenis are MIT; postprocessing is Zlib. Fonts: Cormorant Garamond and Inter (SIL Open Font License), self-hosted via `next/font`. No third-party images, models or audio are used.

## Documents

- [`docs/01-PROPOSAL.md`](docs/01-PROPOSAL.md): creative direction, narrative, architecture diagrams
- [`docs/02-RESEARCH-REFERENCES.md`](docs/02-RESEARCH-REFERENCES.md): verses, hadith with grades, scholars, "do not use" list
- [`docs/03-ASSETS.md`](docs/03-ASSETS.md): asset plan and licences for production assets
- [`docs/04-QA.md`](docs/04-QA.md): performance, memory and accessibility measurements; open items
