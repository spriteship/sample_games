# BLACKOUT: Core Heist

An eleven-operation top-down stealth campaign built for the browser. Begin at a rain-soaked research facility, then infiltrate a cargo dock, server vault, hydroponics, transit platform, foundry, cryogenic lab, security atrium, skybridge, reactor ring and command spire. Each operation has its own SpriteShip floor and artifact art, routes, patrols, camera coverage and lockdown timer. Guards fire when they spot you, while cover blocks both sight and shots. Your pistol can disable guards; an EMP pulse stuns nearby security, and the optional surveillance terminal disables cameras for 25 seconds.

## Play locally

From the repository root:

```sh
npm run dev:blackout
```

Open <http://127.0.0.1:4175>. Choose an unlocked operation and read its SpriteShip briefing dialog before launching. WASD or arrow keys move, Shift sprints, Space or F fires at the nearest visible guard, mouse click fires toward the pointer, R reloads, E opens nearby supply caches and interacts with objectives, Q fires the EMP pulse, and Escape pauses. On touch screens, use the joystick and Fire, EMP, and interact buttons. Take the mission artifact and return to the extraction gate before lockdown ends. A successful extraction unlocks the next operation; progress is saved in the browser.

Five supply caches reveal distinct pistols: Ghost .22 (suppressed), Viper Auto (rapid fire), Breach .50 (heavy), Arc Pistol (stun), and Twinshot (double tap). The player starts with a balanced Service Pistol. Opening a cache pauses the mission and shows the weapon, traits, damage, fire rate, and magazine size. Take and equip it with E, or leave it with Escape. The previous pistol stays in that cache for later swapping. Each unopened cache also refills ammo and EMP, lowers exposure, and adds eight seconds to the lockdown clock if the core has already been taken.

## Build and test

```sh
npm test --workspace @spriteship/blackout
npm run build --workspace @spriteship/blackout
```

The static source is in `public/`; the build copies it to `dist/`. `npm run build:pages` also includes BLACKOUT in the sample catalog.

## SpriteShip artwork

[SpriteShip project](https://spriteship.com/project/proj_1792743954380_xsbt) · `.spriteship/project.json` records the project and 30,000-credit production ceiling. The public `assets/spriteship/runtime.json` maps runtime sprites to their original exported sheets. Selected art includes two characters, facility props, mission props, six exact pistol cutouts, ten campaign floor materials, ten artifact pickups, SpriteShip mission dialogs and cards, licensed Oxanium and Inter fonts, and cinematic key art. Gameplay, lights, view cones, weather and synthesized cues are engine code.

The [production audit](.spriteship/production-audit.json) records **2,940 net credits spent** against the 30,000-credit ceiling, including exact job-ledger charges. SpriteShip's automated quality gate still flags matte cleanup on several walk clips and a loop issue on one infiltrator clip after the free rematte pass. The delivered frames were inspected at game scale and retained for this sample; those flags are preserved in the asset lock for future revision.

To refresh private exports, set `SPRITESHIP_API_KEY` or `SPRITESHIP_ENV_FILE` and run the tools in `tools/`. Private quotes, job records, and exported ZIPs are ignored by Git. The checked-in PNGs need no SpriteShip credential to run.
