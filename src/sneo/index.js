// Imports every Spamton NEO / bullet-phase module so their objects and scripts get registered.
import './common.js?v=20261113111325';
import './bullets.js?v=20261113111325';
import './board.js?v=20261113111325';
import './soul.js?v=20261113111325';
import './shots.js?v=20261113111325';
import './fluff.js?v=20261113111325';
import './dbullet.js?v=20261113111325';
import './enemy.js?v=20261113111325';

// Attack modules: a missing or broken one only disables that attack (enemy.js PORTED_RR).
// In fight order: Flying Heads, RECREW columns, heart attack, phone call + phone hands, face attack,
// NEO finale.
const ATTACK_MODULES = ['heads', 'columns', 'heart', 'phone', 'face', 'finale'];
// The Weird Route fight (after the attacks: it extends the bullet controllers and the enemy).
const loadAttacks = Promise.all(ATTACK_MODULES.map(m => import('./attacks/' + m + '.js' + new URL(import.meta.url).search).catch(e => {
  if (!String(e).includes('Failed to fetch')) console.warn('sneo attack module failed:', m, e);
})));
await loadAttacks;
await import('./weird.js?v=20261113111325' + new URL(import.meta.url).search);
// The scenes before and after the fight (normal route).
await import('./scenes.js?v=20261113111325' + new URL(import.meta.url).search);
