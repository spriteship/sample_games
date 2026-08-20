# Product Requirements Document: Last Light

**Status:** Draft v0.1  
**Date:** August 20, 2026  
**Product type:** Phaser-based, mobile-first, portrait, single-player action roguelite  
**Platforms:** Mobile web/PWA, iOS, and Android  
**Working title:** *Last Light*  
**Target release:** Soft launch, followed by global launch if product and technical gates are met

## 1. Executive summary

*Last Light* is a portrait-mode action roguelite in which the player moves a lone scavenger through compact, changing city districts while weapons fire automatically. Runs last 8–12 minutes. The player defeats dense enemy swarms, collects energy, chooses randomized upgrades, completes optional field objectives, evolves weapons through readable synergies, and extracts before the district is consumed by a supernatural storm.

The game takes the accessible one-thumb combat and escalating power fantasy associated with games such as *Survivor.io*, then differentiates itself with:

1. **Short, resumable expeditions:** one run is divided into three 3-minute sectors, each ending in a meaningful choice and creating a safe checkpoint.
2. **A changing battlefield:** players activate lights, open shortcuts, defend scavenging drones, and choose whether to extract or risk another sector.
3. **Transparent buildcraft:** every weapon and passive uses visible tags; compatible evolutions and projected stat changes are shown before selection.
4. **Fair progression:** no paid power, no loot boxes, and no energy system in the MVP. Monetization is limited to cosmetics and optional, capped reward ads.

### Product hypothesis

Players who enjoy the “bullet heaven” power curve want the genre’s low-friction controls and spectacular builds, but will prefer shorter sessions, more tactical map interaction, clearer choices, and progression that respects their time.

### MVP success definition

The MVP succeeds if new players understand the controls without text-heavy instruction, complete or meaningfully progress in their first run, form distinct builds across repeated runs, and voluntarily start another expedition.

## 2. Research summary

### What the genre proves

- *Survivor.io* markets one-hand controls, automatic combat against 1,000+ enemies, roguelite skill combinations, and escalating stage difficulty. Its App Store listing reports a 4.7 rating from roughly 244,000 ratings at the time of research, indicating broad demand for an accessible mobile version of the formula.
- In *Survivor.io*, enemies drop experience, level-ups present randomized skills, weapons combine with specific passives to evolve, and permanent gear/evolution systems carry progress between runs.
- *Brotato* validates compact runs, six-weapon builds, short waves, large item pools, and difficulty customization. Its official Steam page reports 96% positive English reviews from more than 31,000 reviews at the time of research.
- Later genre entries increasingly add map interaction, objectives, visible synergy tags, and staged missions to avoid a passive or repetitive 20–30 minute experience.

### Opportunities and guardrails

Community feedback around comparable games repeatedly flags excessive paid progression, too many stacked upgrade systems, repetitive late-game content, and number inflation without new play mechanics. Therefore:

- The first session must demonstrate movement, level-up choice, one evolution, an objective, and a boss.
- New systems unlock gradually and must create new decisions, not only larger numbers.
- The player must be able to inspect all odds, stats, tags, and evolution requirements.
- Losing must still produce useful progression, but permanent stats must not erase the need to move well.
- The game must remain fully playable without purchases or ads.

## 3. Product goals and non-goals

### Goals

- Deliver satisfying one-thumb combat within 10 seconds of entering a run.
- Make every 30 seconds produce a decision, threat change, reward, or visible power increase.
- Support at least three viable build archetypes in the MVP: close-control, projectile/critical, and elemental/status.
- Let a typical run finish in 8–12 minutes and resume safely after interruption.
- Maintain readable combat at 200 simultaneous enemies on target devices.
- Create a content structure that can accept new districts, enemies, heroes, and modifiers without new client architecture.
- Monetize without selling randomized or exclusive combat power.

### Non-goals for MVP

- Multiplayer, guilds, PvP, leaderboards, chat, or social gifting.
- An endless mode.
- Gacha, randomized paid chests, stamina/energy gates, or purchasable stat boosts.
- Manual aiming, twin-stick controls, landscape mode, or controller support.
- User-generated content or mod support.
- A large narrative campaign or cinematic dialogue system.

## 4. Target audience

### Primary player: the mobile optimizer

- Age 16–40; plays in 5–15 minute gaps.
- Enjoys action, roguelites, build synergies, and visible power growth.
- Wants low input complexity but meaningful choices.
- May play for weeks if goals remain understandable and attainable.

### Secondary player: the action casual

- Attracted by simple movement, spectacle, and short sessions.
- Does not know genre terminology.
- Needs clear recommendations, forgiving early difficulty, and minimal menu complexity.

### Player needs

- “Let me start quickly.”
- “Make my choices feel different.”
- “Show me why I won or lost.”
- “Let me stop without losing a run.”
- “Do not make payment the solution to difficulty.”

## 5. Experience pillars

### 5.1 Move simply, decide deeply

The player only drags to move during combat. Depth comes from positioning, route choice, upgrade selection, objectives, and build composition.

### 5.2 From vulnerable to spectacular

Each run begins with a modest attack and ends with a visually and mechanically transformed build. Power increases must change coverage, rhythm, targeting, or status behavior—not only damage values.

### 5.3 The arena is a tool

Each district contains interactable fixtures and spatial decisions. Lamps create safe zones, shutters create temporary chokepoints, and scavenging objectives trade safety for rewards.

### 5.4 Fair failure

Damage is telegraphed, randomness has safeguards, and the run summary identifies avoidable causes of death. Failure awards resources and knowledge without trivializing future runs.

## 6. Core loops

### Moment-to-moment loop

1. Move to kite enemies and avoid telegraphed attacks.
2. Auto-attack using the current weapon set.
3. Collect energy shards and field pickups.
4. Level up and choose one of three upgrades.
5. Reposition as enemy composition and objectives change.

### Run loop

1. Choose a hero, starting weapon, and district.
2. Enter Sector 1 and build initial capabilities.
3. Complete or skip a field objective.
4. Defeat an elite, then choose one sector modifier.
5. Continue through Sectors 2 and 3 with a checkpoint after each.
6. Defeat the district boss and extract, or die and retain partial rewards.
7. Review build, damage sources, milestones, and suggested unlock progress.

### Meta loop

1. Spend scrap on permanent, capped utility upgrades.
2. Complete explicit challenges to unlock weapons, heroes, and districts.
3. Fill the Field Manual by encountering enemies and completing builds.
4. Select a new challenge, experiment with another build, and start a run.

## 7. Game structure and rules

### 7.1 Run format

| Element | MVP requirement |
|---|---|
| Orientation | Portrait |
| Target duration | 8–12 minutes |
| Sectors | 3 per district, 3 minutes each |
| Sector transitions | 15–25 second choice/reward screen; automatic checkpoint |
| Final boss | Appears at the end of Sector 3 |
| Win condition | Defeat boss and reach extraction circle within 30 seconds |
| Loss condition | HP reaches zero and no revive remains |
| Pause/resume | Manual pause plus automatic suspension on backgrounding; resume from most recent checkpoint or exact local snapshot where reliable |
| Base camera | Top-down; player stays within central 40% where possible |

### 7.2 Controls

- Touch and drag anywhere on the lower 70% of the screen to move.
- A virtual stick appears under the initial touch point; maximum displacement is capped.
- Release to stop.
- All weapons fire automatically.
- Pause is always available in the top-right corner and uses at least a 44 × 44 point touch target.
- Upgrade selections pause simulation completely.
- Haptics are used for level-up, elite arrival, low health, and evolution; each category can be disabled.

### 7.3 Combat

The combat model supports projectile, area, orbiting, chain, deployable, and dash-triggered weapons. Each damage event can carry one or more tags and status effects.

**Core player stats:** max HP, move speed, armor, dodge, pickup radius, damage, critical chance, critical multiplier, cooldown, area, projectile speed, duration, and luck.

**Damage rule, MVP:**

`final damage = base damage × skill multiplier × (1 + additive damage bonuses) × critical modifier × mitigation`

- Armor uses diminishing returns rather than flat subtraction.
- Contact damage has a 0.35-second per-enemy grace window to prevent instant multi-hit deaths.
- Enemy projectiles and elite attacks must show a minimum 0.5-second telegraph in early districts.
- Player invulnerability after taking damage: 0.6 seconds.
- Default critical chance: 5%; default critical multiplier: 150%.

### 7.4 Leveling and choice generation

- Enemies drop energy shards; shards are pulled toward the player within pickup radius.
- On level-up, gameplay pauses and three cards appear.
- A card may unlock a weapon/passive or raise an owned item by one rank.
- The player can hold up to **6 weapons** and **6 passives**.
- Weapons have 5 normal ranks and 1 evolved rank. Passives have 5 ranks.
- The first three level-ups guarantee at least one new weapon until the player owns two.
- If an evolution is available, the next elite or boss cache guarantees it.
- The same three choices may not repeat after a reroll.
- One free reroll is available per sector; meta progression can raise this to two, never more.
- Cards show DPS role, tags, current-to-next values, and compatible owned items.

### 7.5 Evolution system

A weapon evolves when all conditions are met:

1. The weapon is rank 5.
2. The player owns its required passive at any rank.
3. The player opens an elite or boss cache.

Evolution changes weapon behavior and presentation. Example: **Arc Coil + Conductive Gel → Tempest Grid**, changing a single-target chain attack into persistent linked storm nodes. Evolution pairings are visible in the pause menu and Field Manual after either component has been discovered.

### 7.6 Director and pacing

Each sector is defined by a budget curve rather than fixed spawns. The director selects enemies based on time, active population, spatial pressure, and the player’s recent damage intake.

| Sector time | Intended beat |
|---|---|
| 0:00–0:30 | Establish enemy family; safe build-up |
| 0:30–1:15 | Add directional pressure and first fixture/objective |
| 1:15–2:00 | Introduce ranged or denial enemy |
| 2:00–2:30 | Horde spike; enable a satisfying power check |
| 2:30–3:00 | Elite encounter and cache |

The director may reduce spawn pressure after the player loses 50% HP within 10 seconds, but must not change enemy health mid-fight. Dynamic assistance is disabled on Challenge difficulty and disclosed in settings.

## 8. Signature system: light and risk

The storm drains color and empowers enemies outside lit areas. Every sector contains two or three dormant fixtures. Standing near a fixture charges it; taking damage interrupts charging briefly.

Fixture examples:

- **Street lamp:** creates a temporary safe zone that slows basic enemies.
- **Security shutter:** closes an alley for 20 seconds, forming a chokepoint.
- **Scavenger drone:** follows the player for 30 seconds and drops bonus scrap if protected.
- **Signal beacon:** attracts a denser horde, then awards a rare upgrade cache.

At the end of Sectors 1 and 2, the player chooses one of two routes. Each route previews an enemy modifier and reward category, e.g. “Armored swarm / weapon upgrade” versus “More ranged enemies / healing and scrap.” This supplies agency without requiring a branching level-generation system in MVP.

## 9. MVP content

### 9.1 Heroes

| Hero | Starting identity | Unlock |
|---|---|---|
| Mara | Balanced scavenger; +10% pickup radius | Default |
| Ivo | Close-range specialist; moving builds Guard meter | Survive Sector 3 with 50%+ HP |
| Sable | Status specialist; first status application chains once | Trigger 500 status effects |

Heroes are sidegrades. Each has one passive and one starting weapon affinity; no hero has a paid-exclusive combat advantage.

### 9.2 Weapons

MVP includes 10 weapons:

- Pulse Pistol — nearest-target projectile; reliable single-target damage.
- Scrap Blades — orbiting defense; contact control.
- Arc Coil — chain lightning; anti-cluster.
- Flare Mortar — delayed area blast; high-risk positioning.
- Ember Trail — creates fire while moving; mobility build.
- Shard Fan — directional spread; close-range burst.
- Drone Nest — autonomous deployable; zone control.
- Gravity Well — periodic pull and damage; setup/control.
- Ricochet Disc — bouncing projectile; geometry payoff.
- Sun Lance — slow rotating beam; area and duration scaling.

Each weapon must have a distinct target-selection rule, silhouette, audio signature, and evolved behavior. No weapon may be strictly superior across damage, coverage, control, and safety.

### 9.3 Passives

MVP includes 10 passives: damage, cooldown, area, projectile speed, duration, move speed, max HP, armor, pickup radius, and critical chance. Names and art should reinforce the scavenged-light theme.

### 9.4 Districts

| District | Gameplay identity | Boss |
|---|---|---|
| Blackout Blocks | Open streets, lamps, basic melee/ranged mix; tutorial district | The Warden |
| Flooded Transit | Narrow platforms, moving hazards, chokepoints | Rail Maw |
| Glassworks | Reflective hazards, fragile cover, high projectile pressure | The Kiln Heart |

Each district requires one background tile set, at least two fixtures, one hazard family, one unique enemy, one boss, and three route modifiers.

### 9.5 Enemies

MVP includes at least:

- 5 basic archetypes: pursuer, sprinter, tank, ranged attacker, buffer.
- 3 advanced archetypes: charger, area-denial unit, spawner.
- 3 elites: enhanced behaviors, not only stat increases.
- 3 district bosses with at least three attacks and one phase change each.

At most two new enemy behaviors are introduced in a sector. Enemies use shape, color, motion, and sound redundantly so threats remain legible under heavy effects.

### 9.6 Pickups

- Energy shard: run XP.
- Repair kit: restores 25% max HP.
- Magnet pulse: collects all dropped shards.
- Overdrive cell: doubles attack speed for 10 seconds.
- Cache: grants one upgrade or evolution selection.
- Scrap bundle: persistent soft currency.

## 10. Progression and economy

### 10.1 Currencies

| Currency | Source | Sink | Cap/guardrail |
|---|---|---|---|
| Scrap | Runs, objectives, challenges | Utility grid upgrades | No inventory cap |
| Signal Keys | Explicit achievements | Unlock heroes, weapons, districts | Never sold |
| Prism | Purchase or limited challenges | Cosmetics only | No gameplay sink |

No currency converts into another in MVP. Every reward screen labels the source and intended use.

### 10.2 Utility grid

Permanent progression uses a small, finite grid of approximately 30 nodes. It improves convenience and survivability without becoming the dominant source of power.

- Maximum aggregate direct damage from the grid: +15%.
- Maximum aggregate HP: +20%.
- Utility examples: +pickup radius, one reroll per run, Field Manual details, one revive earned after completing a weekly challenge.
- Nodes can be respecced freely outside a run.
- Full MVP grid completion target: 15–20 hours for a median engaged player.

### 10.3 Unlock philosophy

- Unlocks come from readable challenges, not random drops.
- At least one content unlock is achievable in the first 30 minutes.
- The player sees progress toward the next two likely unlocks after every run.
- Duplicate items do not exist.
- Difficulty modifiers unlock after the first district clear and increase challenge/rewards without becoming required for story progression.

## 11. Difficulty and fairness

Three modes share content but adjust director budgets and telegraph timing:

- **Story:** 80% enemy damage, longer telegraphs, dynamic assistance enabled.
- **Standard:** intended balance.
- **Challenge:** 120% director budget, elite modifiers, dynamic assistance disabled, +25% scrap.

Difficulty can be changed between runs without penalty. Accessibility assists do not disable unlocks; only competitive features, if added later, may separate assisted scores.

Randomness protections:

- Early weapon guarantee described in Section 7.4.
- Evolution components receive increased selection weight when their pair is owned.
- A run cannot offer only passives when an empty weapon slot exists, unless all available weapons are already owned or excluded.
- Healing pickup probability increases modestly below 30% HP, with a hard per-sector cap.

## 12. Onboarding and UX

### First-run flow

1. Launch to gameplay after age/privacy requirements; no account creation required.
2. A hand animation prompts drag-to-move; it disappears immediately after input.
3. The first enemies cannot kill the player during the opening 15 seconds.
4. First level-up explains: “Choose one. Weapons attack automatically.”
5. First objective introduces charging a lamp through animation and a three-word prompt.
6. First evolution pauses briefly and shows the two combined components.
7. After the run, the player receives one utility upgrade and sees one clear next challenge.

Target: a new player reaches controllable gameplay within 10 seconds after required consent screens and completes the tutorial with no more than 80 words of mandatory text.

### Required screens

- Home: Play, current challenge, hero, currencies, settings.
- District select: difficulty, possible rewards, discovered enemies, best result.
- Loadout: hero and starting weapon; stats drawer.
- In-run HUD: HP, XP, timer, sector, objective, pause.
- Upgrade overlay: three cards, reroll, synergy information.
- Pause/build screen: all weapons/passives, exact stats, evolution recipes.
- Results: outcome, time, build, damage by weapon, damage taken by source, rewards, challenge progress, Play Again.
- Field Manual: discovered content, behaviors, tags, evolution recipes.

## 13. Accessibility

- Left- or right-handed HUD layout.
- Adjustable virtual-stick size and dead zone.
- Reduced screen shake, flashes, particles, damage numbers, and haptics.
- High-contrast enemy outlines and projectile colors.
- Color-independent rarity and status indicators using icons/shapes.
- Scalable UI text with no essential text embedded in images.
- Separate music, effects, voice, and haptic controls.
- Game speed options of 90% and 100% outside Challenge mode.
- Assist sliders for enemy health, damage, and speed after three failed runs in one district; also available directly in Settings.
- Full gameplay remains possible with sound off.

## 14. Monetization

### MVP model

- Free download.
- Cosmetic hero outfits, weapon skins, trails, and profile elements sold directly for Prism.
- Cosmetic bundles show exact contents; no randomized purchase.
- Optional rewarded ads, capped at three per day, for one of:
  - +25% scrap after a completed run;
  - one cosmetic trial for the next run;
  - one additional daily cosmetic-shop refresh.
- Ads never appear during a run, after a loss without explicit opt-in, or to players who buy the ad-removal entitlement.

### Prohibited monetization

- No paid revives, paid rerolls, combat-stat items, Signal Keys, energy, loot boxes, or manipulative countdowns.
- No purchase is required to complete a challenge or fill the Field Manual.
- No dynamic pricing per player.

Monetization is excluded from the first prototype milestone; fun, performance, and retention signals are validated first.

## 15. Live operations after MVP

Live operations begin only after core quality gates pass.

- 6–8 week seasons add one district variant, one weapon or hero, challenges, and cosmetics.
- Gameplay content becomes permanently unlockable after its debut season.
- Daily challenge: fixed seed and loadout; one meaningful rule modifier.
- Weekly contract: multi-run objective with a cosmetic or Signal Key reward.
- Remote config controls director budgets, reward amounts, and event schedules, but not undisclosed per-player difficulty.
- Every season must add at least one new behavior, interaction, or build mechanic; stat-only content is insufficient.

## 16. Technical requirements

### Required technology stack

The game must be implemented as a web-native Phaser application. The production baseline is:

| Layer | Required choice |
|---|---|
| Game framework | Phaser 4.2.x or latest compatible Phaser 4 patch release |
| Language | TypeScript with strict mode enabled |
| Renderer | WebGL; Canvas is a compatibility fallback, not a performance target |
| Build tooling | Vite and pnpm |
| Native packaging | Capacitor 8 for iOS and Android |
| In-game UI | Phaser scenes/containers for latency-sensitive HUD; accessible HTML/CSS overlays for settings, store, Field Manual, and other menu-heavy screens |
| Local persistence | IndexedDB through a small versioned repository layer; localStorage only for non-critical preferences |
| Backend | Firebase Authentication, Firestore, Cloud Functions, Remote Config, Analytics, and Cloud Messaging as needed |
| Error reporting | Sentry for TypeScript/runtime errors plus native crash reporting provided through the mobile wrapper |
| Testing | Vitest for simulation/unit tests and Playwright for browser flows; physical-device smoke and performance tests for native builds |
| Delivery | GitHub Actions for checks/web builds; Fastlane for TestFlight and Google Play tracks |
| Web hosting | Firebase Hosting or Cloudflare Pages; final choice based on the team's existing operations setup |

Pin exact dependency versions in the lockfile. Framework upgrades require a profiling pass and save-compatibility regression suite before adoption.

### Runtime architecture

- Keep deterministic combat simulation in framework-independent TypeScript modules. Phaser owns rendering, input, audio, scene lifecycle, and asset loading—not core balance rules.
- Represent high-volume enemies, projectiles, and pickups in compact arrays or typed arrays. Avoid one physics body, event emitter, or closure per entity.
- Use a uniform spatial hash for proximity queries and collision candidates. Do not run all-pairs collision checks.
- Pool Phaser sprites and reuse data slots for enemies, projectiles, pickups, particles, and damage numbers.
- Update distant or low-priority enemies at a reduced cadence while preserving deterministic movement results.
- Render repeated units from texture atlases and batch by texture/blend mode. Custom WebGL pipelines or instancing may be introduced only after profiling identifies render submission as the bottleneck.
- Run simulation on the main thread for the prototype. Move pathing or spatial work to Web Workers only if device profiles demonstrate a sustained CPU bottleneck and the transfer cost is justified.
- Use a fixed simulation timestep with interpolated rendering. Pause simulation when the document is hidden and write an atomic snapshot before suspension.
- Validate the 200-enemy target on Safari/WKWebView and Android System WebView early; desktop Chrome results are not an acceptable proxy for mobile performance.

### Performance

- 60 FPS target on recommended devices; stable 30 FPS fallback on minimum devices.
- Support 200 simultaneously active enemies and 500 visible pickups without simulation slowdown on minimum devices.
- p95 frame time: ≤20 ms recommended, ≤33 ms minimum.
- Peak memory: ≤1.2 GB on minimum devices.
- Initial compressed app download target: ≤100 MB; later districts may be downloadable asset packs.
- Cold launch to interactive home: ≤5 seconds on recommended devices, excluding first install setup.
- Gameplay load from Play tap: ≤3 seconds after assets are cached.

### Compatibility

- Minimum targets at production start: iOS 16+ and Android 10+, subject to Phaser/WebGL and WebView device testing before soft launch.
- Support current portrait phone aspect ratios and safe areas; tablets may pillarbox in MVP.
- Accountless local play is required. Optional platform/cloud account linking protects progress across devices.
- The web build must install as a PWA and display a clear unsupported-device message when required WebGL capabilities are unavailable.
- Native builds run the same bundled web game through Capacitor. Platform-specific code must be isolated behind typed adapters for purchases, ads, haptics, lifecycle, notifications, and secure storage.

### Save and offline behavior

- Core runs, unlocks, and progression work offline.
- Save locally after every choice, reward, and sector transition using atomic writes.
- Cloud sync uses revision IDs, timestamps, and a user-facing conflict choice; currencies are server-authoritative when online.
- A suspended run expires only after a major incompatible game update, in which case the player receives its earned rewards.
- Analytics and purchases queue safely during temporary loss of connectivity.

### Content architecture

- Weapons, ranks, passives, enemies, waves, loot tables, and modifiers must be data-driven and validated at build time against TypeScript-compatible schemas.
- Combat randomness uses a stored run seed for reproduction and support diagnostics.
- Object pooling is required for enemies, projectiles, damage text, and pickups.
- Visual-effect density scales independently of simulation count.
- Remote tuning values require versioning, validation, and rollback.
- Static gameplay configuration ships as versioned JSON. Remote Config may select or override approved tuning values but cannot deliver executable code.

## 17. Analytics and experimentation

### Core events

- `tutorial_step_started/completed`
- `run_started`, including district, hero, weapon, difficulty, and seed
- `level_up_choice_shown/selected/rerolled`
- `objective_started/completed/failed/skipped`
- `sector_completed`
- `evolution_completed`
- `damage_dealt/received` aggregated by source at sector end
- `run_ended`, including result, duration, cause, build, rewards, and performance bucket
- `unlock_progressed/completed`
- `upgrade_purchased/respecced`
- `ad_offer_shown/accepted/completed`
- `store_item_viewed/purchased`
- `performance_summary` with FPS, memory, device tier, and active-count peaks

Do not transmit raw touch paths, message content, advertising identifiers without consent, or unnecessary personal data.

### KPI targets for soft launch

Targets are hypotheses to validate, not promises:

| Metric | Gate |
|---|---|
| Tutorial completion | ≥85% |
| First run reaches Sector 2 | ≥70% |
| First-session second-run start | ≥45% |
| Median completed run duration | 8–12 minutes |
| Crash-free sessions | ≥99.5% |
| D1 retention | ≥35% |
| D7 retention | ≥12% |
| D30 retention | ≥4% |
| Standard first-district clear within 5 attempts | 55–70% of players |
| Rewarded-ad opt-in among eligible DAU | 10–30%; investigate if materially higher |

### Initial experiments

- 3 × 3-minute sectors versus 2 × 5-minute sectors.
- Route choice before versus after sector rewards.
- Recommended-upgrade highlight on/off for new players.
- Results screen emphasizing build discovery versus meta progression.

No experiment may alter purchase prices per individual, disguise ads, or weaken consent/privacy flows.

## 18. Milestones

### M0 — Combat prototype (4–6 weeks)

- One arena, one hero, three weapons, three enemy types, XP/level-up, one elite.
- Validate movement feel, automatic targeting, readability, pooling, and 200-enemy performance.
- Exit gate: 80% of 10 internal/external testers voluntarily replay immediately; target devices maintain performance budget.

### M1 — Vertical slice (8–10 additional weeks)

- Complete Blackout Blocks district, five weapons, five passives, evolutions, two fixtures, first-run tutorial, results screen, local save.
- Exit gate: 20-player test meets ≥80% tutorial completion and median fun score ≥4/5; no critical usability issue remains.

### M2 — MVP alpha (10–14 additional weeks)

- All MVP heroes, weapons, districts, progression, accessibility, analytics, cloud sync, audio, and device-quality tiers.
- Exit gate: content complete, full run reproducible by seed, crash-free sessions ≥99%, economy simulation shows no hard progression wall.

### M3 — Soft launch (6–8 additional weeks)

- Store, consent, rewarded ads, customer support tools, remote config, localization, operations dashboards.
- Launch in 2–3 representative markets with staged acquisition.
- Global-launch decision after at least four weeks of stable cohort data and the KPI gates in Section 17.

## 19. MVP acceptance criteria

The MVP is release-candidate ready when:

- A new player can install, complete consent, and begin play without creating an account.
- All three districts can be completed on all three difficulties with every hero.
- Every weapon can reach rank 5 and evolve; all displayed stat deltas match simulation results.
- Three materially different builds can clear every Standard district in automated balance simulations and human tests.
- A run can be interrupted at every upgrade and sector boundary and resumed without lost or duplicated rewards.
- No combat power or progression key is purchasable.
- UI remains usable on supported aspect ratios and with 200% text scale where the OS permits it.
- Minimum devices meet the 30 FPS fallback target during the maximum supported enemy count.
- Analytics schemas are validated, consent-aware, deduplicated, and documented.
- Purchases restore correctly; failed or interrupted purchases never grant twice or lose entitlement.
- All P0/P1 defects are closed and crash-free sessions meet the soft-launch gate.

## 20. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Product feels like a clone | Weak identity and legal/market risk | Use original world, art, enemies, names, timings, and signature fixture/route systems; conduct IP review before launch |
| Combat becomes visually unreadable | Unfair deaths and device strain | Threat-priority rendering, effect budgets, outlines, damage-number limits, scalable VFX |
| Random choices produce dead runs | Frustration | Early guarantees, synergy weighting, rerolls, visible recipes, seeded balance tests |
| Meta upgrades trivialize skill | Shallow long-term play | Hard caps, sidegrade unlocks, difficulty modifiers, track clear rates by grid power |
| Runs feel repetitive | Churn | Objectives, route previews, district hazards, enemy behavior mixing, season requirement for mechanical novelty |
| Short sessions feel interrupted | Lost progress | Sector checkpoints and atomic local snapshots |
| Ethical monetization underperforms | Revenue risk | Keep production scope lean, validate cosmetic demand, test a transparent cosmetic pass post-MVP; do not compensate with paid power |
| Enemy count breaks low-end devices | Narrow addressable market | Pooling, spatial queries, simplified offscreen simulation, VFX scaling, early device lab tests |

## 21. Open product decisions

Resolve during prototype/vertical slice:

1. Whether exact mid-sector state can be safely resumed on web, iOS, and Android or only sector checkpoints are guaranteed.
2. Whether hero affinity changes selection weights or only starting loadout.
3. Final art direction and age rating target.
4. Initial localization languages based on soft-launch markets and acquisition plan.
5. Cosmetic pricing and whether a non-expiring cosmetic pass is viable after retention validation.
6. Whether to use direct StoreKit/Google Play Billing adapters or a managed purchase service.

## 22. Research sources

Research accessed August 20, 2026.

- [Survivor.io — Apple App Store](https://apps.apple.com/us/app/survivor-io/id1528941310): official positioning, one-hand controls, swarm scale, roguelite combinations, rating, and free-to-play model.
- [Survivor.io beginner guide — BlueStacks](https://www.bluestacks.com/blog/game-guides/survivor-io/sio-beginner-guide-en.html): run structure, automatic attacks, randomized skill choices, gear, permanent evolution, and idle rewards.
- [Survivor.io skills and evolution guide — BlueStacks](https://www.bluestacks.com/blog/game-guides/survivor-io/sio-skills-evolution-guide-en.html): three-choice level-ups, weapon/passive categories, and evolution conditions.
- [Brotato — Steam](https://store.steampowered.com/app/1942280/Brotato/): official feature set, short wave structure, six-weapon builds, large item pool, accessibility tuning, and review signal.
- [The survivor-like genre’s evolution — GamesRadar](https://www.gamesradar.com/games/action/vampire-survivors-kicked-off-a-game-development-gold-rush-but-has-a-legitimately-new-genre-emerged-between-the-cash-ins/): map interaction, staged missions, and synergy-tag innovations across later genre entries.
- [Survivor.io community feedback letter — Reddit](https://www.reddit.com/r/Survivorio/comments/1q8ln62/letter_to_habby_about_survivorio_game_suggestions/): qualitative feedback about upgrade overload, paid progression, and feature pacing. Treated as directional community sentiment, not representative quantitative research.

## 23. Legal and originality note

This document describes a game in the same broad action-roguelite genre, not a reproduction of *Survivor.io*. Production must not reuse its title, characters, enemy designs, UI layout, icons, audio, text, level designs, economy values, proprietary data, or marketing creative. Before public release, counsel should review the final name, visual identity, store assets, and comparative marketing.
