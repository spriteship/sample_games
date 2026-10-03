# Emberhold delivery and validation

Delivery date: 2026-10-03. Native engine: Godot 4.7.2, Compatibility renderer, single-threaded Web export. Local play: http://localhost:4174.

## Production record

SpriteShip project: [Emberhold: The Last Hearth](https://spriteship.com/project/proj_1791027542095_991m). Authored map revision 2 is retained in the project and local lock. All illustrated game assets are SpriteShip deliveries; runtime code provides lighting, text, effects and synthesized audio. The current SpriteShip 0.7.9 agent package guided native exports, authored collision roles, map integration, quality review and synchronization.

Every selected static asset and portrait, complete native UI pack, native map bundle, and all seven whole-character exports was fetched again after the user changed the account watermark setting. No watermark was removed locally. No watermark was visible in reviewed collections, sampled character frames or gameplay screenshots. This is a sampled visual review, not a guarantee about every pixel of every delivered frame.

The actual API-key ledger records **14,360 credits net**, **14,760 charged**, **400 refunded**, and **135,790 credits remaining**. The user ceiling was 30,000. Quotes/reservations are not actual spend. A sanitized transaction record is in `.spriteship/production-audit.json`; credentials and signed URLs stay in ignored local files. No generation was purchased outside the authorized account or ceiling, and no key spending guard was raised or bypassed.

## Native acceptance scenarios

Run `npm test --workspace @spriteship/emberhold` from the repository root. The test uses its own `user://emberhold-smoke.json`, separate from the player save.

- Hero gathering and genuine autonomous wood/stone collection after settler travel.
- Four traversable routes from the settlement to beacons and citadel.
- Valid cottage placement, three Hearth gameplay levels and Barracks II.
- Completed guard, knight and ranger training queues.
- All three tiers of weapons, armor and gathering research, including tier limits.
- Passive farm production and damaged-building repair.
- Melee damage and ranger projectiles dealing damage on arrival.
- Save/load restoration of resources, troops and research.
- Citadel protection before the three beacons, beacon activation, final-boss release and victory.

This is a deterministic systems test with prepared resources and cleared beacon guards. It does **not** represent a completed human campaign playthrough or a measured campaign duration.

## Real-browser acceptance

`tools/browser-test.mjs` runs an isolated Chromium profile using real mouse and keyboard input. It does not attach to the user's signed-in browser or mutate game state through a debug API. `window.EMBERHOLD_STATE` is a read-only diagnostic snapshot.

The browser scenarios cover campaign introduction and WASD movement; settlers gathering wood and stone; mouse placement and construction of a cottage and barracks; completed guard and knight recruitment; Barracks II upgrade; command buttons; settings; save, browser reload and Continue; and an army expedition which defeats five enemies, heals and rekindles the first beacon. Screenshots cover 1440×900, 1280×720, 1920×1080 and square 900×900 viewports. Final-art checks require all seven character archetypes and actual delivered fortified artwork for Barracks II and Hearth III. The F5 shortcut is checked for saving without a browser reload.

Browser output and screenshots are retained locally in `/tmp/emberhold-browser-qa`; rerunning the test replaces those diagnostic artifacts. These are QA screenshots, not created game assets.

## Artwork review and known limitations

All delivered native `.tres` atlas rectangles were checked against their paired sheet dimensions. Six evenly spaced frames from every character animation were manually inspected. The full-resolution native sources are retained in ignored `.spriteship/source-exports`; delivery uses a paired 50% sheet/atlas transform for browser memory. Fixed first-frame calibration aligns character heights and feet while preserving untrimmed logical coordinates. Ground movement circles were authored back into SpriteShip and downloaded in fresh exports; full-body hurtboxes remain separate.

Provider `needs_review` flags are preserved in `.spriteship/quality.json`, alongside manual notes. Some clips have purple edge pixels, modest stride motion or imperfect facing/weapon consistency. Four-direction standing poses are one-frame images, not animated idle loops. This build is not SpriteShip native-engine certification.

Three building upgrade gameplay levels exist, but only two distinct artwork tiers were delivered. The royal collection failed; its advertised free retry was rejected by the API key's daily spending guard. Level III uses the fortified artwork, slightly larger, with an existing SpriteShip crown marker. An optional knight north attack failed and was refunded. Optional worker east/west chopping failed during background removal without an advertised recovery. Missing directions fall back to the delivered base attack. No uncertain-outcome job was blindly retried.

The game has one authored valley, five story chapters, a final battle and peaceful sandbox. It does not include multiplayer, voice acting, mobile touch controls or a multi-map campaign. The PRD's 35–60-minute duration is a design target, not a measured result. Performance and balance still need broader hardware and long-session testing; commercial AAA quality is not claimed. One persistent save slot is shared by campaign and sandbox at a fixed browser origin.

## Final verification record

- Final Godot import, expanded native acceptance test and Web export completed successfully, with no engine error or warning lines in their logs.
- Final real-browser run began at `2026-10-03T14:51:40.644Z` and completed successfully. All seven character archetypes were registered, upgraded artwork checks passed, five enemies were defeated and one beacon was rekindled. Browser console and page errors: **zero**. F5 saved without reloading.
- The final SpriteShip sync review checked **18 entities: 18 unchanged, zero changed, zero unavailable**. Godot-native character versions are pinned around actual native downloads, separately from the Phaser detail-contract versions.
- Every production-tool JavaScript file passed `node --check`. The staged diff's only whitespace warnings are four trailing-space lines in untouched upstream OFL font license notices, which were preserved as delivered. Ignored credentials and full source exports are excluded from Git. The public project scan found no signed artwork URLs or embedded local credential paths.
- Local HTML and WASM endpoints returned HTTP 200; WASM is served as `application/wasm`. The development server was left running on port 4174.

Compact final evidence: `.spriteship/validation.json`. The detailed local browser report is `/tmp/emberhold-browser-qa/report.json`.
