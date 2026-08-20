# Last Light

A top-down survival game built with Phaser 3 and original SpriteShip assets.

## Features

- Keyboard, pointer, and touch movement
- Animated player walk and idle states
- Multiple enemy types, including an animated humanoid with walk and attack states
- SpriteShip-authored collision bodies
- Sixteen weapons and sixteen collectible types
- Desktop and mobile layouts
- A 90-second survival run with upgrades and a boss encounter

## Run locally

From the repository root:

```bash
npm install
npm run dev --workspace @spriteship/last-light
```

Open <http://127.0.0.1:4173>.

## Validate

```bash
npm test --workspace @spriteship/last-light
npm run build --workspace @spriteship/last-light
```

See [PRD.md](PRD.md) for the product requirements.
