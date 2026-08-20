# SpriteShip Game Samples

Playable sample games built with assets created in [SpriteShip](https://spriteship.com/).

## Games

| Game | Engine | Description |
| --- | --- | --- |
| [Last Light](games/last-light) | Phaser 3 | A top-down survival game with animated characters, enemies, weapons, and collectibles. |

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:4173>.

## Workspace commands

```bash
npm run dev --workspace @spriteship/last-light
npm test
npm run build
```

Each sample under `games/` is independently runnable and owns its source, assets, tests, and build configuration.
