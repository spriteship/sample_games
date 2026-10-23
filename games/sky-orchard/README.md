# Pip & the Sky Orchard

A ten-level Phaser 3 platform adventure inspired by the supplied bright floating-island reference. Pip, a fox courier, gathers sun seeds to open each island's gate while Mallow the owl follows and Bramble creatures patrol the route.

**[Play on GitHub Pages](https://spriteship.github.io/sample_games/sky-orchard/)** · [Watch the gameplay preview](media/gameplay.mp4)

![Sky Orchard cover](media/cover.png)

## Screenshots

| First Flight | The Violet Grove | The Sun Orchard |
| --- | --- | --- |
| ![Pip jumping in level one](media/first-flight.png) | ![Pip jumping in level five](media/violet-grove.png) | ![Pip jumping in level ten](media/sun-orchard.png) |

The [title screen](media/menu.png) and [campaign finale](media/finale.png) are also available. The [cover image](media/cover.png) is assembled from the game's SpriteShip assets by `tools/make-cover.sh` using ImageMagick.

## Play

From the repository root:

```bash
npm run dev:sky-orchard
```

Open <http://127.0.0.1:4285>. `npm run build:sky-orchard` copies the self-contained game to `games/sky-orchard/dist/`.

- Move: A/D or left/right arrows
- Jump: Space, W, or up arrow; press again in mid-air for a double jump
- Short taps make short hops; holding jump reaches higher platforms
- Stomp Brambles from above. Three hearts and a mid-level checkpoint help with retries.
- Gather every larger sun seed to open the exit. Small coins raise the run score.
- Touch controls appear on coarse-pointer devices. Progress through unlocked levels is saved locally.

## Campaign

1. First Flight
2. Mushroom Mile
3. Breezy Bridges
4. Honeydrop Heights
5. The Violet Grove
6. Lantern Ledges
7. Whispering Canopy
8. Thunderberry Run
9. Cloudbreak Crossing
10. The Sun Orchard

The levels use seeded authored parameters, so their routes remain stable across retries. Later routes add longer jumps, moving platforms, more patrols, and more hazards.

## Art and credits

All characters, terrain, props, and the sky backdrop were generated for this game in SpriteShip project `proj_1792746064854_ufby`. The selected original cast is Pip (`Pip__a_small_brave_cinnamon_or_1792746179524_cpd5`), Bramble (`Bramble__a_mischievous_round_p_1792746190265_o2uh`), and Mallow (`Mallow__a_tiny_floating_cream_1792746240039_a6wu`). The backdrop and prop collection are stored as `orchard-sky`, `floating-island-kit`, and `orchard-props`. Their locally bundled animation atlases and manifest data live in `public/assets/animations/`; [SpriteShip's asset license](public/assets/SPRITESHIP-LICENSE.txt) is included.

Net SpriteShip spending for this production was **1,800 credits** of the authorized 20,000. A failed Mallow motion job and revised Pip walk attempts were refunded and recovered at zero additional credits. The revised Pip walk has cleaner edges and a more visible gait; the original idle scored better, so it remains in the game. The game makes no SpriteShip API calls at runtime.

## Verification

Run `npm test --workspace @spriteship/sky-orchard` to validate the ten routes and jump geometry. The browser play pass covered a first-level gap and seed, a late-level 126 px gap, hazards, checkpoints, exit locking, all ten level transitions, and all four animation atlases.
