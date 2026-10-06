# Emberhold: The Last Hearth

A single-player painted 2D settlement strategy adventure, built in **Godot 4.7.2** for desktop browsers. Captain Elara gathers supplies, builds a refuge, raises an army, rekindles three beacons, and confronts Veyr, the Ash Regent.

Local game: **http://localhost:4174**

Public demo: **https://spriteship.github.io/sample_games/emberhold/**

[SpriteShip project](https://spriteship.com/project/proj_1791027542095_991m) · [Authored valley](https://spriteship.com/project/proj_1791027542095_991m/level-editor?mapId=map_1791027542158_krri) · [Product vision and story](PRD.md)

## Play

Choose Campaign for five chapters and the final battle, or Sandbox for a peaceful, well-supplied settlement with all building types unlocked. Three difficulty choices control campaign pressure. Victory lets you continue building.

Two settlers begin gathering wood and stone. Train more at the Hearth; select a settler to assign wood, stone, gold or food. Production camps supply additional passive income. Cottages increase capacity; the Hearth and Forge unlock stronger troops and research.

| Control | Action |
| --- | --- |
| WASD / ground click | Move Elara |
| Click deposit / enemy / structure | Gather / attack / inspect |
| E / Space | Nearby interaction / sword attack |
| Q / Shift | Heal nearby allies / dash toward cursor |
| Bottom building palette | Choose and place a structure |
| Right click | Cancel placement or stop current action |
| F / G / R | Army follows / defends home / rallies at Elara |
| T, then click ground | Army assault order |
| Scroll / middle drag / Home | Zoom / pan / recenter |
| B / J / Escape | Toggle palette / journal / pause |
| F5 or Save Settlement | Save |

Autosave runs every 45 seconds. Continue restores resources, construction, troops, exploration, chapters and settings after a browser reload. Keep the same browser and origin (`localhost:4174`); private browsing or clearing site data can remove saves. One settlement save slot is shared by campaign and sandbox. Starting a new settlement replaces that slot on the next save.

## Run and build

Node.js 22+ and Godot 4.7.2 with matching Web export templates are required to rebuild. The exported game itself needs neither Node dependencies nor a SpriteShip credential.

```sh
# From the repository root:
npm run build:emberhold
npm run dev:emberhold

# Engine acceptance scenarios:
npm test --workspace @spriteship/emberhold
```

Open `http://localhost:4174`. The server builds if `dist/index.html` is absent. Set `GODOT_BIN` if Godot is not discoverable in Applications or on PATH. Open `project.godot` to edit the native project. This is a Compatibility-renderer, single-threaded Web export, not a Phaser wrapper. The local server supplies the proper WASM MIME type.

`npm run build:pages` rebuilds Emberhold and packages it beside Last Light in `pages-dist/`. The existing GitHub Pages workflow publishes both on pushes to `main`. Linux x64 CI automatically downloads the official Godot 4.7.2 binary and matching Web templates, verifies pinned SHA-256 checksums, and installs only the required single-threaded Web templates. No SpriteShip credential is needed for deployment. Browser saves at the public GitHub Pages origin are separate from localhost saves.

## Source guide

- `scripts/game.gd`: economy, navigation, settlers, construction, research, recruitment, combat, raids, chapters and persistent saves.
- `scripts/world.gd`: native SpriteFrames playback, ground-contact sorting, authored terrain and scenery.
- `scripts/hud.gd`: responsive menus, journal, inspector, training progress, commands and SpriteShip UI integration.
- `scripts/data.gd`: units, structures, costs and dialogue.
- `assets/spriteship/runtime.json`: local asset routing and animation physics.
- `assets/spriteship/spriteship.lock.json`: pinned IDs, revisions, native bundles and synchronization dates.
- `.spriteship/art-plan.md` and `PRD.md`: production direction and game vision.

## Art provenance and refresh

Every illustrated asset—menu, terrain, trees, ore, structures and their upgrade tiers, characters, icons and ornamental UI—comes from this SpriteShip project. Fonts are supplied through SpriteShip with their OFL notices. UI text, lighting, particles, navigation and gameplay are engine code. Music and sound are synthesized at runtime, not imported audio assets.

All chosen artwork was downloaded again after the account's watermark setting changed, including native map and UI bundles and whole-character exports. No watermark was painted out or removed locally.

SpriteShip's full-resolution native character sheet/atlas pairs are retained in ignored `.spriteship/source-exports/`. Web delivery applies a documented **paired 50% scale to both PNG sheets and every `.tres` atlas region**. A fixed neutral-first-frame calibration keeps each character's visible height and ground contact consistent across differently padded clips. Ground-contact movement circles are explicitly authored back into SpriteShip per animation, separately from the full-body hurtboxes; the fresh native export carries those normalized roles. Untrimmed logical frame coordinates are preserved. Static scenery only trims transparent margins at render time.

To refresh artwork, set `SPRITESHIP_API_KEY`, or set `SPRITESHIP_ENV_FILE` to a private env file. This workspace also supports an ignored `.spriteship/local.env`. Never commit API keys, signed quotes, or the private production ledger.

```sh
node games/emberhold/tools/sync.mjs assets
node games/emberhold/tools/refresh-native.mjs ui
node games/emberhold/tools/refresh-native.mjs map
node games/emberhold/tools/integrate-map.mjs
node games/emberhold/tools/integrate-character.mjs
npm run build:emberhold
```

Run these serially: asset integration updates shared runtime and lock files. Refresh tools download existing assets without purchasing new generation. `produce.mjs`, `motion-batch.mjs`, `finish-motion.mjs`, `upgrades.mjs`, and `ui.mjs` are production tools that can spend credits; do not run them casually. The user-authorized production ceiling was 30,000 credits.

## Validation and scope

The engine scenario checks gathering, real settler travel and resource collection, four traversable beacon/citadel routes, placement, upgrades, completed training queues, combat damage, save restoration, beacon activation, citadel release and final victory. It is a deterministic systems test using prepared resources and cleared beacon guards, **not a claim that a human campaign playthrough has been completed**. Browser tests use real mouse/keyboard input and inspect the read-only `window.EMBERHOLD_STATE` diagnostic snapshot.

This is an original, playable single-player game with one authored valley and a complete campaign loop. It is not a commercial AAA production: there is no multiplayer, voice acting, mobile touch-control suite or multi-map campaign. The 35–60 minute campaign length is a pacing target. Provider animation quality flags and manual review notes are retained in `.spriteship/quality.json`; importing artwork does not imply SpriteShip native-engine certification.

Three gameplay upgrade levels are implemented. Two distinct eleven-building artwork tiers were delivered; level III currently reuses the fortified tier at a larger scale with a SpriteShip crown marker. The separate royal-art collection failed at the provider and its advertised free recovery was rejected by the API key's daily spending guard. One optional north-facing knight attack failed and was refunded; the settler's optional east/west chopping capture failed during background removal without an advertised recovery. These facings use their delivered base attack. These are documented visual-polish limitations, not missing economy or campaign mechanics.

Generated artwork license notices and individual font licenses remain alongside the assets. See `.spriteship/production-audit.json` and `QA.md` for the final spend and validation record.
