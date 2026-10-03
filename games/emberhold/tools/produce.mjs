import { api, call, paidTool, state, save } from './spriteship.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let s = await state();
const projectId = s.project.id;
console.log('Saved project style', JSON.stringify(await call('get_project_style_guide', { projectId })));
async function wait(label, result) {
  const ids = result.operations?.map(x => x.jobId) || (result.jobId ? [result.jobId] : []);
  for (const id of ids) {
    let attempts = 0;
    for (;;) {
      let j;
      try { j = await call('get_job', { jobId: id }); }
      catch(error) { console.log('POLL_RETRY',id,error.message.slice(0,120));await sleep(15000);continue; }
      console.log(label, id, j.status, j.wizardPhase || '', j.errorMessage || '');
      const ss = await state(); ss.jobs[label].statuses ||= {}; ss.jobs[label].statuses[id] = j; await save(ss);
      if (j.status === 'done') break;
      if (j.status === 'error') {
        if (j.retryMode === 'free' && attempts < 2) {
          const retry = await paidTool(label + '-recovery-' + (++attempts), 'retry_job', { jobId: id });
          if (retry.jobId !== id) throw new Error('Unexpected recovery identity');
          continue;
        }
        throw new Error('Generation failed: ' + JSON.stringify(j));
      }
      if (j.status === 'waiting_approval') throw new Error('Unexpected pending generation review: ' + JSON.stringify(j));
      await sleep(10000);
    }
  }
}
const art = [
  ['buildings', 'tileset', 'Emberhold settlement structures', 'Exactly eleven distinct standalone medieval buildings, each separate complete transparent cutout, elevated angled top-down camera, coherent physical scale and warm northwest lighting: 1 ivory stone Hearth Hall with large copper roof and glowing hearth chimney; 2 small timber cottage with copper gable roof; 3 lumber camp with stacked logs and saw canopy; 4 stone quarry shed with stone blocks and crane; 5 gold mine entrance with timber supports and ore cart; 6 farm with wheat beds and tiny windmill; 7 barracks with blue banners and training yard; 8 archery lodge with green canvas roof and archery target; 9 forge with glowing furnace and anvil; 10 tall stone watchtower with copper roof; 11 short wooden palisade wall segment. No incidental landscape, no gridlines, no lettering. Each entire building is visible including its ground contact.'],
  ['nature', 'terrain', 'Emberhold woodland and deposits', 'Exactly twelve separate standalone nature and resource props for an angled topdown fantasy strategy game: 1 large broad-canopy moss green oak tree; 2 tall dark spruce tree; 3 autumn amber birch tree; 4 rounded stone deposit boulder; 5 gold-veined ore deposit boulder; 6 small mossy rock cluster; 7 low fern bush; 8 wildflower patch; 9 tree stump; 10 pile of cut wood logs; 11 berry bush with red berries; 12 large pale twisted dead tree. Separate clean transparent cutouts, no sticker borders, soft northwest lighting. Entire subjects including base visible.'],
  ['landmarks', 'tileset', 'Emberhold beacons and Ash Crown', 'Exactly eight separate fantasy landmarks, elevated angled topdown, complete transparent isolated objects: 1 ancient ivory stone beacon tower unlit with circular stone dais; 2 same beacon tower with bright amber flame burning at top; 3 ruined stone archway draped in moss; 4 abandoned small roofless stone cottage; 5 sinister dark stone Ash Crown citadel with red cloth and ember-lit gate; 6 ash raider encampment of black tents and red banner; 7 ruined stone bridge segment; 8 large ancient standing runestone with amber magical crack but no writing. Northwest lighting, consistent painterly fantasy scale.'],
  ['ground', 'texture', 'Emberhold valley materials', 'Four earthy woodland ground fills: dense moss green grassy soil, warm ochre trampled earth, cool slate stony earth, dark ash scorched soil. Fine subtle painterly organic detail, soft subdued saturation to keep troops readable. Flat ground, no objects, no trees, no shadows of trees, no lettering.'],
  ['menu', 'background', 'Emberhold valley at dawn', 'Cinematic wide fantasy valley at dawn viewed from an elevated hillside. A warm glowing copper-roof medieval stronghold and hearth in lower right, lush mossy forest and winding river across middle, three ancient beacon towers along ridges in the distance, distant threatening dark citadel with ember-red windows on far northern peak. Layered atmospheric mist and elegant northwest sunlight, richly painted storybook realism, dramatic amber against slate blue. Open darker sky on left for interface title. Absolutely no text or lettering.']
];
const cast = [
  ['hero', 'Captain Elara, an original heroic young woman frontier captain, chestnut braided hair, ivory steel cuirass, deep teal cloak, copper accents, brown leather boots, carrying a short steel sword. Full body angled topdown game sprite. Strong readable silhouette and proportions, grounded feet, no scenery.'],
  ['guard', 'Frontier guard soldier, ivory steel helmet and cuirass, blue tabard, sturdy brown boots, steel sword and small round shield. Readable stout heroic proportions, full body elevated angled topdown game sprite, no scenery.'],
  ['ranger', 'Woodland ranger archer, moss green hood and cloak, brown leather armor and boots, copper buckle, holding a wooden longbow. Full body elevated angled topdown game sprite, readable heroic proportions, no scenery.'],
  ['raider', 'Ash Crown raider enemy, dark charcoal armor, ember red scarf, closed spiked helmet with tiny orange eye glow, blackened steel axe. Full body elevated angled topdown game sprite. Original fantasy enemy, no scenery.'],
  ['knight', 'Emberhold veteran knight, elegant ivory steel heavy plate armor, deep teal cloak, copper decorative trim, crested helmet, large sword and kite shield. Full body elevated angled topdown game sprite, original fantasy design, no scenery.'],
  ['brute', 'Ash Crown hulking armored brute champion, heavy charcoal iron plates, ember-orange cracks, red ragged loincloth, horned helmet, oversized dark warhammer. Full body elevated angled topdown sprite, large readable monstrous proportions. No scenery.'],
  ['worker', 'Frontier settler worker, sturdy original medieval villager, ochre wool tunic, brown leather apron, moss green hood lowered, short brown hair, rugged boots, carrying a small wooden-handled iron hatchet at the side. Full body elevated angled topdown game sprite with grounded feet, no scenery. Same refined painterly style, northwest lighting and readable proportions as the Emberhold captain.']
];
const phase = process.argv[2] || 'art';
if (phase === 'art') {
  for (const [slug, assetType, name, prompt] of art) {
    s = await state(); if (s.assets[slug]) continue;
    const args = { projectId, assetType, name, slug: 'emberhold-' + slug, prompt };
    if (assetType === 'background') Object.assign(args, { bgType: 'scene', bgViewType: 'topdown', aspectRatio: '16:9', backgroundResolution: '2K' });
    else if (assetType !== 'texture') args.targetTileSize = 512;
    const r = await paidTool('art-' + slug, 'create_asset', args);
    await wait('art-' + slug, r);
    const j = await call('get_job', { jobId: r.jobId });
    s = await state(); s.assets[slug] = { ids: j.assetIds || j.gridAssetIds || (r.assetId ? [r.assetId] : []), jobId: r.jobId }; await save(s);
    await sleep(15000);
  }
}
if (phase === 'cast') {
  for (const [slug, prompt] of cast) {
    s = await state(); if (s.characters[slug]) continue;
    const r = await paidTool('cast-' + slug, 'create_character', { projectId, prompt, characterImageSize: '1:1' });
    await wait('cast-' + slug, r);
    const j = await call('get_job', { jobId: r.jobId });
    s = await state(); s.characters[slug] = { ids: j.characterIds, jobId: r.jobId }; await save(s);
    await sleep(15000);
  }
}
if (phase === 'motion') {
  for (const [slug] of cast) {
    s = await state(); const c = s.characters[slug]; if (!c?.selectedId) throw new Error('Visually select a character first: ' + slug);
    const existing = await call('get_character', { characterId: c.selectedId });
    console.log('DIRECTION', slug, JSON.stringify(existing.animationDirection));
    for (const [label, animations, targetFacings, mirrorAnims] of [
      ['walk-v2', ['walk_down', 'walk_right', 'walk_up'], { walk_down: 's', walk_right: 'e', walk_up: 'n' }, { walk_left: 'walk_right' }],
      ['attack', ['attack'], { attack: 's' }, {}]
    ]) {
      const r = await paidTool('motion-' + slug + '-' + label, 'generate_character_animation', { characterId: c.selectedId, animationDirectionMode: 'four_direction', animations, targetFacings, mirrorAnims });
      await wait('motion-' + slug + '-' + label, r);
      const detail = await call('get_character', { characterId: c.selectedId });
      console.log('QUALITY', slug, JSON.stringify(detail.animationQualityGate));
      await sleep(15000);
    }
  }
}
