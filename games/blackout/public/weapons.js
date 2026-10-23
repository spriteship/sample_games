export const PISTOLS = Object.freeze({
  service: { name: 'Service Pistol', tag: 'BALANCED SIDEARM', description: 'Dependable security issue. A steady shot for close encounters.', magazine: 10, interval: .28, damage: 1, speed: 850, noise: 1, color: '#ffd39b', art: 'pistolService' },
  ghost: { name: 'Ghost .22', tag: 'SUPPRESSED', description: 'Quiet and precise. The best choice when you want to stay unseen.', magazine: 12, interval: .34, damage: 1, speed: 960, noise: 0, color: '#84eff4', art: 'pistolGhost' },
  viper: { name: 'Viper Auto', tag: 'RAPID FIRE', description: 'A fast automatic pistol that trades subtlety for pressure.', magazine: 18, interval: .13, damage: 1, speed: 820, noise: 2, spread: .035, color: '#ffb66d', art: 'pistolViper' },
  breach: { name: 'Breach .50', tag: 'HEAVY HITTER', description: 'One powerful round can disable a guard. Slow but decisive.', magazine: 6, interval: .56, damage: 2, speed: 900, noise: 6, color: '#ff9d72', art: 'pistolBreach' },
  arc: { name: 'Arc Pistol', tag: 'STUN ROUND', description: 'Energy rounds interrupt guards and buy time for a second shot.', magazine: 8, interval: .4, damage: 1, speed: 760, noise: 1, stun: 2, color: '#70efff', art: 'pistolArc' },
  twinshot: { name: 'Twinshot', tag: 'DOUBLE TAP', description: 'Two rounds per trigger pull for a quick close-range takedown.', magazine: 10, interval: .4, damage: 1, speed: 840, noise: 3, pellets: 2, spread: .055, color: '#ffca82', art: 'pistolTwinshot' }
});

// The five physical cargo boxes each contain a distinct upgrade.
export const CACHE_WEAPONS = Object.freeze({ 0: 'ghost', 1: 'viper', 5: 'breach', 6: 'arc', 9: 'twinshot' });
