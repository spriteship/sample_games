import { call, config, paid, save, state, waitFor } from './spriteship.mjs';

const projectId = config.projectId;
const phase = process.argv[2] || 'art';
const art = [
  {
    slug: 'facility', assetType: 'tileset', name: 'BLACKOUT facility cover and machinery',
    prompt: 'Exactly twelve separate isolated props for a modern secure research facility viewed from a consistent angled top-down game camera: 1 waist-high matte navy equipment crate with cyan latch, 2 stacked pair of heavy graphite cargo crates, 3 tall server rack with narrow cyan status lights, 4 low rolling tool cart with amber indicator, 5 reinforced concrete cover block, 6 overhead pipe junction with floor supports, 7 blue-gray industrial vent housing, 8 rectangular floor drain grate, 9 freestanding amber security lamp on a steel post, 10 slim wall-mounted camera housing with amber lens, 11 compact access terminal with cyan screen, 12 circular armored power-core pedestal with an empty center. Each object complete, transparent cutout, matched physical scale, believable dark wet metal and concrete, no people, no labels, no ground tile, no stickers.'
  },
  {
    slug: 'mission', assetType: 'tileset', name: 'BLACKOUT mission props',
    prompt: 'Exactly eight separate isolated props for the same modern research facility and angled top-down game camera: 1 brilliant electric cyan power core inside a protective cylindrical frame, 2 orange emergency extraction beacon on a small steel base, 3 waist-high warning bollard with amber light, 4 dark armored sliding security door, 5 torn black cable bundle spilling cyan sparks, 6 slim flooded-floor warning light fixture, 7 steel floor hatch with geometric ribs, 8 small potted hardy fern in a square graphite planter. Complete transparent cutouts, consistent real physical scale, grounded contact, no text, no labels, no background or stickers.'
  },
  {
    slug: 'weapons', assetType: 'tileset', name: 'BLACKOUT six collectible pistols',
    prompt: 'Exactly six separate isolated pistol pickups for the same cinematic angled top-down stealth game, one complete pistol per cell, all viewed from the same elevated three-quarter camera and pointing toward the upper right: 1 graphite standard security service pistol with amber slide detail, 2 compact dark navy suppressed Ghost pistol with long slim suppressor and cyan accent, 3 lean rapid-fire Viper automatic pistol with vented shroud and warm amber detail, 4 chunky Breach heavy pistol with broad squared barrel and copper highlights, 5 sleek Arc stun pistol with cyan energy coil and insulated grip, 6 angular Twinshot burst pistol with split muzzle and two thin amber rails. Readable silhouettes at small game scale, premium industrial design, dark navy steel with restrained cyan and amber highlights, transparent cutouts, no hand, no person, no cartridges, no text, no label, no background.'
  },
  {
    slug: 'campaign-ground', assetType: 'texture', name: 'BLACKOUT campaign floor materials',
    prompt: 'Exactly ten separate overhead floor materials for ten distinct locations in one dark futuristic stealth campaign, each a seamless-feeling square surface fill with no props, people, lettering, walls or perspective objects. In order: 1 flooded cargo dock with wet ribbed blue steel and puddles, 2 server vault with graphite raised access floor and restrained cyan seam lights, 3 hydroponics with dark concrete and scattered moss-green organic staining, 4 underground transit platform with worn slate tile and narrow amber warning strips, 5 foundry with scorched riveted iron and subtle rust-orange heat stains, 6 cryogenic laboratory with pale blue frosted steel and fine ice cracks, 7 security atrium with polished black stone and fine cyan geometric inlay, 8 exterior stormwalk skybridge with rain-slick steel mesh and drainage channels, 9 reactor ring with dark ceramic panels and restrained teal radiation markings, 10 command spire with elegant charcoal and off-white high-tech geometric floor. Consistent overhead camera, restrained detail, readable under moving characters.'
  },
  {
    slug: 'campaign-objectives', assetType: 'tileset', name: 'BLACKOUT campaign mission artifacts',
    prompt: 'Exactly ten separate complete isolated mission artifact pickups, one per cell, for the same cinematic angled top-down stealth game, in this order: 1 sealed cargo manifest capsule with amber strip, 2 encrypted data drive with cyan security latch, 3 hydroponic specimen canister with green bioluminescent sample, 4 magnetic transit access key on a dark plinth, 5 compact furnace regulator with orange hot core, 6 frost-blue cryogenic vial in a protective cage, 7 tactical security tablet with cyan holographic inset, 8 stormwalk signal beacon with amber antenna, 9 reactor fuse with bright cyan contained energy, 10 command override module with white and teal facets. Matched scale and camera angle, dark premium industrial materials, strong silhouette, transparent cutout, no background, no hand, no text or labels.'
  },
  {
    slug: 'campaign-ground-b', assetType: 'texture', name: 'BLACKOUT industrial campaign floors',
    prompt: 'Four distinct overhead square floor materials for one dark futuristic stealth game, separate material families in this exact order: 1 foundry scorched riveted iron with subtle rust orange heat stains, 2 cryogenic laboratory pale blue frosted steel with fine ice cracks, 3 security atrium polished black stone with fine cyan geometric inlay, 4 exterior stormwalk skybridge rain slick steel mesh and drainage channels. Flat surface fills, no walls, props, writing or perspective objects. Low contrast under characters.'
  },
  {
    slug: 'campaign-ground-c', assetType: 'texture', name: 'BLACKOUT final campaign floors',
    prompt: 'Two distinct overhead square floor materials for one dark futuristic stealth game, separate material families in this exact order: 1 reactor ring dark ceramic panels with restrained teal radiation markings, 2 command spire elegant charcoal and off white high tech geometric floor. Flat surface fills, no walls, props, writing or perspective objects. Low contrast under characters.'
  },
  {
    slug: 'ground', assetType: 'texture', name: 'BLACKOUT floor materials',
    prompt: 'Four restrained top-down research facility floor materials: dark navy rain-wet poured concrete with subtle aggregate, worn blue-gray steel plate with geometric seams, charcoal anti-slip rubber, cool gray ceramic lab tile with sparse fine cracks. Flat seamless-feeling surface fills, no props, no writing, low contrast under game characters.'
  },
  {
    slug: 'menu', assetType: 'background', name: 'BLACKOUT key art', bgType: 'scene', bgViewType: 'topdown', backgroundResolution: '2K', aspectRatio: '16:9',
    prompt: 'Cinematic key art for a stealth heist: elevated angled top-down view of a lone dark-armored infiltrator on a rain-soaked research facility roof at night. Wet navy concrete and distant city haze, amber searchlight beams crossing the scene, a strong electric cyan glow from a sealed power-core vault in the far right. Believable graphic-novel realism, large dark negative space on the left for an HTML title overlay. One cohesive scene, dramatic lighting, no words, no logos, no UI.'
  }
];
const cast = [
  ['infiltrator', 'An original stealth infiltrator in compact graphite tactical armor and dark navy rain hood, short teal scarf, restrained cyan wrist device and practical boots. Slim agile silhouette. Full-body game character from a consistent elevated angled top-down camera, grounded feet, no background, no text.'],
  ['guard', 'A research-facility security guard in angular dark slate armored jacket, opaque black helmet with small amber visor slit, heavy utility boots, no visible weapons. Distinct broad silhouette from the infiltrator. Full-body game character from a consistent elevated angled top-down camera, grounded feet, no background, no text.']
];

if (phase === 'art') {
  for (const spec of art) {
    let s = await state();
    if (s.assets[spec.slug]) continue;
    const { slug, ...args } = spec;
    const response = await paid('art-' + slug, 'create_asset', { projectId, slug: 'blackout-' + slug, ...args, ...(spec.assetType === 'tileset' ? { targetTileSize: 256 } : {}) });
    const jobs = await waitFor('art-' + slug, response);
    s = await state();
    s.assets[slug] = { ids: jobs[0].gridAssetIds || jobs[0].assetIds || [response.assetId].filter(Boolean), jobId: response.jobId };
    await save(s);
  }
}
if (phase === 'cast') {
  for (const [slug, prompt] of cast) {
    let s = await state();
    if (s.characters[slug]) continue;
    const response = await paid('cast-' + slug, 'create_character', { projectId, prompt, characterImageSize: '1:1', cameraAngle: 60 });
    const jobs = await waitFor('cast-' + slug, response);
    s = await state();
    s.characters[slug] = { ids: jobs[0].characterIds || [], previews: jobs[0].characterPreviews || [], jobId: response.jobId };
    await save(s);
  }
}
if (phase === 'motion') {
  for (const [slug] of cast) {
    let s = await state();
    const choice = s.characters[slug]?.selectedId;
    if (!choice) throw new Error('Choose a visual candidate for ' + slug + ' first');
    if (s.characters[slug].motionDone) continue;
    const character = await call('get_character', { characterId: choice });
    console.log('CHARACTER_DIRECTION', slug, JSON.stringify(character.animationDirection));
    const args = {
      characterId: choice,
      animations: ['walk_down', 'walk_right', 'walk_up'],
      targetFacings: { walk_down: 's', walk_right: 'e', walk_up: 'n' },
      mirrorAnims: { walk_left: 'walk_right' },
      animationDirectionMode: 'four_direction'
    };
    const label = 'motion-' + slug + '-' + choice;
    const response = await paid(label, 'generate_character_animation', args);
    await waitFor(label, response);
    s = await state(); s.characters[slug].motionDone = true; await save(s);
  }
}
