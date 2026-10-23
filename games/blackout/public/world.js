export const WIDTH = 1600;
export const HEIGHT = 1000;
export const start = { x: 170, y: 825 };
export const core = { x: 1370, y: 180 };
export const exit = { x: 155, y: 826 };
export const terminal = { x: 766, y: 715 };

export const walls = [
  { x: 0, y: 0, w: WIDTH, h: 48 }, { x: 0, y: 952, w: WIDTH, h: 48 },
  { x: 0, y: 0, w: 48, h: HEIGHT }, { x: 1552, y: 0, w: 48, h: HEIGHT },
  { x: 478, y: 48, w: 38, h: 260 }, { x: 478, y: 424, w: 38, h: 528 },
  { x: 1004, y: 48, w: 38, h: 468 }, { x: 1004, y: 628, w: 38, h: 324 },
  { x: 1130, y: 350, w: 230, h: 28 },
  { x: 175, y: 135, w: 175, h: 25 },
  { x: 633, y: 390, w: 208, h: 24 },
  { x: 1240, y: 746, w: 215, h: 28 }
];
export const covers = [
  { x: 230, y: 462, w: 82, h: 63, art: 'crate' }, { x: 347, y: 575, w: 66, h: 63, art: 'stack' },
  { x: 632, y: 177, w: 74, h: 70, art: 'server' }, { x: 785, y: 293, w: 74, h: 70, art: 'server' },
  { x: 608, y: 548, w: 100, h: 48, art: 'concrete' }, { x: 847, y: 772, w: 79, h: 60, art: 'crate' },
  { x: 1108, y: 680, w: 78, h: 70, art: 'stack' }, { x: 1360, y: 600, w: 75, h: 72, art: 'server' },
  { x: 1165, y: 270, w: 74, h: 62, art: 'concrete' }, { x: 1434, y: 327, w: 64, h: 74, art: 'crate' }
];
export const obstacles = [...walls, ...covers];
export const lamps = [
  { x: 310, y: 340, c: 'amber' }, { x: 505, y: 360, c: 'amber' },
  { x: 642, y: 88, c: 'cyan' }, { x: 894, y: 470, c: 'amber' },
  { x: 1020, y: 570, c: 'amber' }, { x: 1200, y: 820, c: 'amber' },
  { x: 1340, y: 214, c: 'cyan' }, { x: 1460, y: 120, c: 'cyan' }
];
export const cameras = [
  { x: 525, y: 352, base: Math.PI, arc: .8, phase: 0 },
  { x: 1050, y: 570, base: Math.PI, arc: .9, phase: 2 },
  { x: 1330, y: 75, base: Math.PI / 2, arc: .8, phase: 4 }
];
export const guardPaths = [
  [{ x: 285, y: 230 }, { x: 385, y: 350 }, { x: 330, y: 700 }, { x: 180, y: 650 }],
  [{ x: 625, y: 200 }, { x: 890, y: 215 }, { x: 873, y: 332 }, { x: 630, y: 340 }],
  [{ x: 680, y: 690 }, { x: 890, y: 720 }, { x: 910, y: 545 }, { x: 660, y: 530 }],
  [{ x: 1190, y: 570 }, { x: 1425, y: 525 }, { x: 1460, y: 210 }, { x: 1180, y: 190 }]
];

export function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
export function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function distanceToRect(point, rect) {
  return Math.hypot(point.x - clamp(point.x, rect.x, rect.x + rect.w), point.y - clamp(point.y, rect.y, rect.y + rect.h));
}
export function circleOverlapsRect(x, y, radius, rect) {
  const px = clamp(x, rect.x, rect.x + rect.w);
  const py = clamp(y, rect.y, rect.y + rect.h);
  return (x - px) ** 2 + (y - py) ** 2 < radius ** 2;
}
export function moveCircle(point, dx, dy, radius = 17, solids = obstacles) {
  let { x, y } = point;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(1, radius * .7)));
  for (let index = 0; index < steps; index++) {
    const nextX = x + dx / steps;
    if (!solids.some(rect => circleOverlapsRect(nextX, y, radius, rect))) x = nextX;
    const nextY = y + dy / steps;
    if (!solids.some(rect => circleOverlapsRect(x, nextY, radius, rect))) y = nextY;
  }
  return { x, y };
}
export function segmentRectEntry(a, b, rect) {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - rect.x], [dx, rect.x + rect.w - a.x], [-dy, a.y - rect.y], [dy, rect.y + rect.h - a.y]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return null; t0 = Math.max(t0, t); }
    else { if (t < t0) return null; t1 = Math.min(t1, t); }
  }
  return t0 <= t1 ? t0 : null;
}
export function segmentHitsRect(a, b, rect) { return segmentRectEntry(a, b, rect) !== null; }
export function hasLineOfSight(a, b, solids = obstacles) { return !solids.some(rect => segmentHitsRect(a, b, rect)); }
export function rayDistance(origin, angle, range, solids = obstacles) {
  const end = { x: origin.x + Math.cos(angle) * range, y: origin.y + Math.sin(angle) * range };
  let fraction = 1;
  for (const rect of solids) {
    const entry = segmentRectEntry(origin, end, rect);
    if (entry !== null) fraction = Math.min(fraction, entry);
  }
  return range * fraction;
}
export function sees(observer, point, range, halfAngle, solids = obstacles) {
  const dx = point.x - observer.x, dy = point.y - observer.y;
  const d = Math.hypot(dx, dy);
  if (d > range || d < .001) return false;
  const diff = Math.atan2(Math.sin(Math.atan2(dy, dx) - observer.angle), Math.cos(Math.atan2(dy, dx) - observer.angle));
  return Math.abs(diff) < halfAngle && hasLineOfSight(observer, point, solids);
}
