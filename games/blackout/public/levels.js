import { WIDTH, HEIGHT, start, core, exit, terminal, walls, covers, lamps, cameras, guardPaths } from './world.js';

const border = [
  { x: 0, y: 0, w: WIDTH, h: 48 }, { x: 0, y: HEIGHT - 48, w: WIDTH, h: 48 },
  { x: 0, y: 0, w: 48, h: HEIGHT }, { x: WIDTH - 48, y: 0, w: 48, h: HEIGHT }
];
const rect = (x, y, w, h, art) => ({ x, y, w, h, ...(art ? { art } : {}) });
const path = points => points.map(([x, y]) => ({ x, y }));

const opening = (axis, position, center) => axis === 'vertical'
  ? [rect(position, 48, 38, center - 66 - 48), rect(position, center + 66, 38, 952 - center - 66)]
  : [rect(48, position, center - 74 - 48, 38), rect(center + 74, position, 1552 - center - 74, 38)];

const specifications = [
  ['Flooded Cargo Dock', 'Harbor Nine', 'RECOVER CARGO MANIFEST', 'Find the sealed manifest in the east loading bay. Use crates to break the dock guards’ sightlines.', 'PATROL DRILLS', 'Rookie', 'vertical', [455, 1030], [270, 650], 3, 1, 108, '#3587ad'],
  ['Server Vault', 'Grid Sector 4', 'TAKE ENCRYPTED DRIVE', 'Cross the two access corridors and take the encrypted drive. Disable cameras at the central terminal.', 'CAMERA SWEEP', 'Rookie', 'vertical', [500, 985], [620, 310], 4, 3, 102, '#36dbe5'],
  ['Hydroponics', 'The Greenhouse', 'SECURE SPECIMEN', 'Reach the specimen canister through the growing bays. Watch for guards behind the planters.', 'CLOSE COVER', 'Operative', 'horizontal', [345, 665], [335, 1210], 4, 2, 99, '#73b989'],
  ['Transit Platform', 'Line Zero', 'COLLECT TRANSIT KEY', 'Move across the deserted platforms and collect the magnetic access key. The patrols cover both crossings.', 'CROSSING FIRE', 'Operative', 'horizontal', [315, 645], [1135, 455], 5, 3, 95, '#dfaa68'],
  ['The Foundry', 'Forge Annex', 'RECLAIM REGULATOR', 'The furnace regulator is in the hot bay. Stay behind machinery and reach the exit before lockdown.', 'HEAVY PATROLS', 'Veteran', 'vertical', [520, 1080], [740, 250], 5, 3, 91, '#e17f52'],
  ['Cryogenic Lab', 'Sublevel Cold', 'RECOVER CRYO VIAL', 'Take the cryogenic vial from the sealed cold chamber. Cameras scan the bright floor.', 'LONG SIGHTLINES', 'Veteran', 'vertical', [425, 1010], [455, 690], 5, 4, 89, '#8de5f0'],
  ['Security Atrium', 'The Watchtower', 'STEAL SECURITY TABLET', 'Get the security tablet from the upper atrium. Expect overlapping cameras and armed guards.', 'OVERLAPPING SCANS', 'Elite', 'horizontal', [355, 690], [545, 1070], 6, 4, 86, '#69d4d4'],
  ['Stormwalk Skybridge', 'North Span', 'TAKE SIGNAL BEACON', 'Cross the exposed bridge for the signal beacon. Sprint only when the search cones turn away.', 'EXPOSED APPROACH', 'Elite', 'horizontal', [300, 675], [1210, 340], 6, 4, 82, '#79a6bc'],
  ['Reactor Ring', 'Core Containment', 'RETRIEVE REACTOR FUSE', 'Take the live fuse beyond the containment doors. Use the terminal to buy time on the way back.', 'LOCKDOWN PRESSURE', 'Nightmare', 'vertical', [480, 1000], [315, 700], 7, 5, 78, '#67dcb4'],
  ['Command Spire', 'Blackout Control', 'CAPTURE OVERRIDE MODULE', 'Reach the command module, then retrace your route through maximum security to extract.', 'FINAL EXTRACTION', 'Nightmare', 'vertical', [545, 1060], [675, 360], 7, 5, 75, '#c5e9e6']
];

const decorations = [
  [['cart', 230, 220], ['bollard', 400, 720], ['pipe', 720, 110], ['drain', 930, 420], ['cart', 1240, 850]],
  [['vent', 225, 210], ['cable', 390, 625], ['server', 675, 130], ['vent', 870, 800], ['cable', 1200, 370]],
  [['plant', 220, 210], ['plant', 450, 175], ['plant', 940, 560], ['plant', 1400, 485], ['drain', 400, 745]],
  [['bollard', 190, 540], ['hatch', 400, 280], ['floorlight', 750, 600], ['cart', 1230, 360], ['bollard', 1450, 730]],
  [['pipe', 220, 185], ['cable', 380, 770], ['vent', 815, 190], ['pipe', 1200, 520], ['hatch', 1410, 800]],
  [['vent', 270, 260], ['drain', 400, 700], ['vent', 850, 120], ['cable', 930, 850], ['hatch', 1260, 400]],
  [['plant', 180, 190], ['bollard', 380, 580], ['plant', 740, 140], ['bollard', 1080, 500], ['plant', 1470, 840]],
  [['drain', 170, 190], ['cable', 410, 700], ['floorlight', 800, 410], ['drain', 1160, 840], ['cable', 1430, 490]],
  [['pipe', 220, 205], ['hatch', 450, 820], ['cable', 800, 190], ['bollard', 1150, 570], ['vent', 1440, 680]],
  [['vent', 195, 235], ['floorlight', 435, 705], ['cable', 780, 180], ['bollard', 1130, 600], ['hatch', 1420, 850]]
];

function makeLevel(spec, index) {
  const [name, place, objective, briefing, challenge, difficulty, axis, cuts, gaps, guardCount, cameraCount, escapeTime, accent] = spec;
  const vertical = axis === 'vertical';
  const levelWalls = [...border, ...opening(axis, cuts[0], gaps[0]), ...opening(axis, cuts[1], gaps[1])];
  const boxes = vertical ? [
    rect(230, 458, 82, 63, 'crate'), rect(345, 574, 66, 63, 'stack'),
    rect(cuts[0] + 115, 160, 74, 70, 'server'), rect(cuts[0] + 295, 280, 74, 70, 'server'),
    rect(cuts[0] + 95, 530, 100, 48, 'concrete'), rect(cuts[0] + 300, 780, 79, 60, 'crate'),
    rect(cuts[1] + 90, 660, 78, 70, 'stack'), rect(1360, 590, 75, 72, 'server'),
    rect(cuts[1] + 145, 255, 74, 62, 'concrete'), rect(1430, 330, 64, 74, 'crate')
  ] : [
    rect(230, 768, 82, 63, 'crate'), rect(360, 833, 66, 63, 'stack'),
    rect(640, 790, 74, 70, 'server'), rect(810, 790, 74, 70, 'server'),
    rect(615, 520, 100, 48, 'concrete'), rect(850, 520, 79, 60, 'crate'),
    rect(1130, 510, 78, 70, 'stack'), rect(1360, 505, 75, 72, 'server'),
    rect(1160, 175, 74, 62, 'concrete'), rect(1430, 240, 64, 74, 'crate')
  ];
  const guardRegions = vertical ? [
    [170, 210, 340, 390], [cuts[0] + 60, 390, cuts[1] - 110, 470],
    [cuts[0] + 110, 650, cuts[1] - 110, 730], [cuts[1] + 95, 440, 1320, 530],
    [180, 660, 340, 740], [cuts[1] + 100, 760, 1430, 850], [cuts[1] + 100, 110, 1420, 205]
  ] : [
    [470, 770, 550, 870], [940, 770, 1030, 870],
    [750, 410, 820, 480], [1230, 420, 1320, 480],
    [180, 110, 310, 210], [650, 110, 800, 210], [1260, 110, 1350, 210]
  ];
  const patrols = guardRegions.slice(0, guardCount).map(([x0, y0, x1, y1]) => path([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]));
  const cameraSpots = vertical ? [
    [cuts[0] + 52, gaps[0], Math.PI], [cuts[1] + 52, gaps[1], Math.PI],
    [1330, 80, Math.PI / 2], [cuts[0] + 215, 80, Math.PI / 2], [cuts[1] + 210, 900, -Math.PI / 2]
  ] : [
    [gaps[0], cuts[0] + 55, -Math.PI / 2], [gaps[1], cuts[1] + 55, -Math.PI / 2],
    [1390, 100, Math.PI / 2], [450, 530, 0], [1250, 800, Math.PI]
  ];
  const levelCameras = cameraSpots.slice(0, cameraCount).map(([x, y, base], n) => ({ x, y, base, arc: .65 + n * .08, phase: n * 1.7 }));
  const levelStart = vertical ? { x: 165, y: 825 } : { x: 165, y: 835 };
  const levelCore = { x: 1380, y: 170 };
  const levelExit = { ...levelStart };
  const levelTerminal = vertical ? { x: cuts[0] + 255, y: 705 } : { x: 760, y: 465 };
  const levelLamps = vertical ? [
    [300, 330], [cuts[0] + 20, gaps[0]], [cuts[0] + 235, 120], [cuts[0] + 310, 480],
    [cuts[1] + 20, gaps[1]], [1200, 800], [1350, 210], [1460, 110]
  ] : [[300, 810], [gaps[1], cuts[1] + 20], [635, 790], [900, 450], [gaps[0], cuts[0] + 20], [1200, 490], [1350, 210], [1460, 110]];
  return {
    id: index + 1, name, place, objective, briefing, challenge, difficulty, axis, accent,
    floorRole: 'campaignFloor' + (index + 1), artifactRole: 'campaignArtifact' + (index + 1),
    start: levelStart, core: levelCore, exit: levelExit, terminal: levelTerminal,
    walls: levelWalls, covers: boxes, lamps: levelLamps.map(([x, y], n) => ({ x, y, c: n % 3 === 0 ? 'amber' : 'cyan' })),
    decor: decorations[index].map(([role, x, y]) => [role, x, y, 78, 78]),
    cameras: levelCameras, guardPaths: patrols, obstacles: [...levelWalls, ...boxes],
    escapeTime, guardSpeed: 72 + index * 3.7, sightRange: 210 + index * 5, alertRate: 31 + index * 1.2,
    waypoints: vertical ? [{ x: cuts[0] + 19, y: gaps[0] }, { x: cuts[1] + 19, y: gaps[1] }] : [{ x: gaps[1], y: cuts[1] + 19 }, { x: gaps[0], y: cuts[0] + 19 }]
  };
}

export const LEVELS = [
  {
    id: 0, name: 'Core Heist', place: 'Orbital Research Facility', objective: 'RETRIEVE POWER CORE',
    briefing: 'Enter the facility, take the cyan power core from the eastern vault, then return to your entry gate before lockdown ends. Open supply crates for new pistols.',
    challenge: 'FIRST INFILTRATION', difficulty: 'Rookie', axis: 'vertical', accent: '#61e7ee',
    floorRole: 'ground', artifactRole: 'core', start, core, exit, terminal, walls, covers, lamps, cameras, guardPaths,
    obstacles: [...walls, ...covers], escapeTime: 90, guardSpeed: 72, sightRange: 214, alertRate: 31,
    waypoints: [{ x: 497, y: 366 }, { x: 1023, y: 572 }]
  },
  ...specifications.map(makeLevel)
];
