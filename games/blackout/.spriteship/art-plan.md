# BLACKOUT art direction and SpriteShip production

Project: [BLACKOUT: Core Heist](https://spriteship.com/project/proj_1792743954380_xsbt)  
Camera: angled top-down  
Palette: wet navy concrete, amber security light, electric cyan power glow  
Credit ceiling: 30,000 (user authorized)

## Small visual scope

- One infiltrator and one guard, each with a readable silhouette and four directional still/walk states.
- One twelve-piece facility collection for cover and machinery.
- One eight-piece mission collection for the core, extraction beacon, door and details.
- One six-piece exact pistol collection for the starting sidearm and five cache pickups.
- Four floor materials and one wide key-art background.
- Lighting, rain, reflections, view cones, HUD and audio cues are implemented in game code.

Generated collection extraction is exact: 12 of 12 facility props, 8 of 8 mission props, and 6 of 6 pistols. The selected character variants are recorded in the private production ledger and the public asset lock. The first guard candidate's automatic four-direction setup failed before any video charge; a second variant was selected. The infiltrator's walk-up and walk-down captures have matte quality flags after the free rematte pass. At game scale their delivered frames remain usable; retain the original full captures and review any future revision before replacing these files.

Exports in `public/assets/spriteship/` are the checked-in runtime art. The ignored `.spriteship/production.json` holds provider quotes, job results, and signed preview URLs; never commit it or the credential file.
