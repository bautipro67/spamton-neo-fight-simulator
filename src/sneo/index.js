// Imports every Spamton NEO / bullet-phase module so their objects and scripts get registered.
import './common.js?v=20261106021943';
import './bullets.js?v=20261106021943';
import './board.js?v=20261106021943';
import './soul.js?v=20261106021943';
import './shots.js?v=20261106021943';
import './dbullet.js?v=20261106021943';
import './enemy.js?v=20261106021943';

// Attack modules: a missing or broken one only disables that attack (enemy.js PORTED_RR).
// TODO: not ported yet: RECREW columns (rr 6), heart attack (2), phone call (8), phone hands (8.5),
// face attack (7), NEO finale (9); they fall back to Flying Heads.
const ATTACK_MODULES = ['heads'];
await Promise.all(ATTACK_MODULES.map(m => import('./attacks/' + m + '.js' + new URL(import.meta.url).search).catch(e => {
  if (!String(e).includes('Failed to fetch')) console.warn('sneo attack module failed:', m, e);
})));
