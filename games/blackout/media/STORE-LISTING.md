# BLACKOUT: Core Heist — release kit

## Listing copy

**Short description:** Eleven locations. Six pistols. One way out. Infiltrate guarded facilities, steal the objective, and escape before lockdown.

**Description:** BLACKOUT: Core Heist is a top-down stealth action game built for desktop and touch browsers. Play an eleven-operation campaign across a research facility, cargo dock, server vault, hydroponics, transit platform, foundry, cryogenic lab, security atrium, skybridge, reactor ring, and command spire. Every operation has a distinct environment, patrol layout, camera coverage, and rising challenge. Slip behind cover, disable cameras, use an EMP pulse, and fight back with six collectible pistols. Open supply caches to inspect and equip a new weapon. Secure the mission artifact and reach extraction before lockdown.

**Feature bullets:**

- Eleven unlockable operations with browser-saved progress.
- Six distinct pistols, including suppressed, automatic, heavy, stun, and double-tap variants.
- Guard sight lines, gunfire, cover, cameras, EMP and timed extraction.
- SpriteShip art, characters, mission dialogs, and licensed Oxanium and Inter fonts.
- Desktop keyboard and mouse controls plus touch controls.

**Controls:** WASD or arrows move; Shift sprint; Space, F, or mouse click fire; R reload; E interact, open a cache, or equip a pistol; Q EMP; Escape pause. On touch devices, use the joystick and on-screen actions.

**Suggested tags:** action, stealth, top-down, sci-fi, shooter, singleplayer, browser, mobile-friendly.

**Free play:** https://spriteship.github.io/sample_games/blackout/

**Source:** https://github.com/spriteship/sample_games/tree/main/games/blackout

## Assets

| Use | File |
| --- | --- |
| Square-ish store cover, 630 × 500 | `../public/cover.png` |
| Social preview, 1200 × 630 | `../public/social-card.png` |
| Gameplay trailer, 20 seconds | `trailer.mp4` |
| Full successful gameplay, 34 seconds | `gameplay.mp4` |
| Screenshots, 1280 × 720 | `screenshots/01-title.png` through `screenshots/11-command-spire.png` |
| Playable HTML5 upload | `../dist/blackout-html5.zip` after packaging |

The gameplay video was captured from a successful Core Heist playthrough in Chrome. The extraction screenshot was recaptured after the result-layout adjustment using the same completed run's values.

## Store setup

The recommended itch.io setup is **HTML Game** with a free browser embed and optional donations. Upload `blackout-html5.zip` with `index.html` at the ZIP root; choose a responsive fullscreen launch, enable mobile support, upload the cover and screenshots, and add the gameplay trailer. itch.io's [HTML5 guide](https://itch.io/docs/creators/html5) says browser-playable HTML5 games accept donations. Its [pricing guide](https://itch.io/docs/creators/pricing) describes pay-what-you-want pricing. A fixed-price sale would use a downloadable listing instead, while the GitHub Pages version stays free.

The repo can provide the game and marketing files, but the store owner must connect payouts and publish the listing from their account. No storefront URL is advertised in-game until that listing exists.

## Packaging

From the repository root, after `npm test` and `npm run build:pages`:

```sh
npm run build --workspace @spriteship/blackout
cd games/blackout/dist
zip -qr blackout-html5.zip . -x blackout-html5.zip
```

The ZIP includes relative paths and the SpriteShip license. Source media remain outside the HTML5 ZIP to keep the download smaller. The commercial-use license is in `public/assets/spriteship/LICENSE.txt`; font licenses are beside the font files.
