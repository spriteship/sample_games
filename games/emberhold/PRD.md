# Emberhold: The Last Hearth

## Vision

A complete single-player 2D settlement action-strategy game for the web, built in Godot. The player directly controls a frontier captain, gathers resources, commissions buildings, recruits and commands an army, and liberates an occupied valley. Premium painted fantasy sprites, atmospheric lighting, thoughtful composition and responsive interaction define the quality target. All illustrated assets are produced by SpriteShip; code supplies gameplay, layout, lighting and UI text.

## Story

The ancient hearthfires once kept the northern kingdoms warm. When Regent Veyr extinguished them to forge his Ash Crown, winter took the roads and his hollow soldiers took the towns. Captain Elara reaches the ruined valley of Emberhold with a handful of survivors and a coal from the last living hearth. The valley's three beacons can break the crown's power, but only a rebuilt settlement can protect them.

Mara, the practical quartermaster, guides the settlement. Orrin, a former royal smith, opens the forge. The imprisoned beacon wardens reveal Veyr's betrayal. Dialogue arrives at meaningful accomplishments rather than interrupting routine play. The final battle confronts the Ash Regent at the northern citadel; victory returns the valley's light and opens endless settlement play.

## Player experience

Begin on a beautiful woodland clearing beside the last living hearth, with two settlers already gathering wood and stone. Learn gathering through nearby trees and ore. Build your first lumber camp and cottage; recruit more settlers at the Hearth and assign their jobs. Establish barracks, recruit a patrol, defend the first raid, then explore outward. Hearth upgrades unlock stronger structures and troops; each reclaimed beacon advances the liberation story. Complete all three, prepare a veteran army, and assault the citadel. Campaign pacing targets roughly 35–60 minutes on normal difficulty; this is a design target, not a measured playthrough. Sandbox and continued settlement play after victory support longer sessions.

## Systems and acceptance requirements

- Direct hero control with WASD, click-to-move, contextual gathering, melee combat, a healing ability and dodge/dash. Hero death returns to the hearth with a resource penalty rather than invalidating hours of work.
- Wood, stone, gold and food are visible resources. Finite deposits replenish slowly; built camps produce their associated resources. Workers automate the economy and population limits constrain recruitment.
- Placement preview, resource costs, obstacle validation, construction progress, building selection, per-building levels, upgrades, repair and salvage. Buildings: Hearth Hall, cottage, lumber camp, quarry, gold mine, farm, barracks, archery lodge, forge, watchtower and palisade.
- Recruit guards, rangers and knights with different damage, range, cost and durability. Follow, defend, rally and attack commands. Avoidance and obstacle-aware navigation must keep units moving through the settlement.
- Forge research improves weapons, armor and gathering. Hearth upgrades unlock building tiers and stronger troops.
- Explorable authored valley with forest, resource ridges, ruined settlements, three distinct beacons and the northern citadel. Fog of discovery and a minimap communicate exploration.
- Enemy camps, local patrols, escalating settlement raids, melee raiders, armored brutes and a final boss with reinforcements. Player rangers and watchtowers provide ranged combat. Waves clearly warn before arriving; difficulty choices change pressure.
- Five campaign chapters: A Coal in the Dark, Walls Before Winter, The First Flame, Three Lights Against the Crown, The Last Hearth. Objectives progress from economy to recruitment to beacon control to final assault. Completing the campaign is possible and has a real ending.
- Main menu, settings, tutorial/help, pause, journal, contextual inspector, construction palette, unit commands, toast feedback, victory and defeat states. UI scales to browser dimensions and pointer input.
- Save/load in Godot user storage with autosave, manual saves, schema version, chapter and campaign state, resources, buildings, units, world nodes and settings. Browser reload restores the same settlement.
- Original illustrated menu scene, terrain donors, nature props, resource deposits, settlement structures, ruins, enemies, hero, soldiers, resource icons and decorative UI from SpriteShip. Preserve provenance and exports.
- Web export uses Godot's Compatibility renderer and no thread isolation requirement. A local server serves the production web build with correct WASM MIME and cache settings.

## Art direction

Angled top-down, painterly high-definition 2D. Mossy greens, slate-blue shadows, ivory stone and copper roofs; friendly settlements glow amber, the Ash Crown glows ember-red. Warm northwest light. Chunky readable silhouettes, believable timber/stone materials, consistent camera and scale. Hero roughly 64–80 visible pixels tall at normal zoom; buildings roughly 150–240 pixels across. No imitation of existing game branding. No generated text in art.

## Production budget

SpriteShip ceiling: 30,000 credits across all asset generation and recovery. Each generation is quoted and recorded before dispatch; stable idempotency keys prevent duplicate charges. Favor coherent multi-object collections and essential motion. Record actual ledger spend at handoff. The user has authorized this entire bounded production without follow-up questions.

## Delivery gate

Godot parses and runs without errors. Web export builds and loads. Exercise gathering, building, recruitment, combat, upgrades, saving/loading and campaign completion in automated engine scenarios; inspect the live browser at gameplay scale and test real input. Deliver the playable localhost URL, SpriteShip project link, source project, PRD, and an honest validation summary.
