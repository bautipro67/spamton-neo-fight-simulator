// Imports every Spamton NEO / bullet-phase module so their objects and scripts get registered.
import './common.js?v=20261106220732';
import './bullets.js?v=20261106220732';
import './board.js?v=20261106220732';
import './soul.js?v=20261106220732';
import './shots.js?v=20261106220732';
import './fluff.js?v=20261106220732';
import './dbullet.js?v=20261106220732';
import './enemy.js?v=20261106220732';

// Attack modules: a missing or broken one only disables that attack (enemy.js PORTED_RR).
// In fight order: Flying Heads, RECREW columns, heart attack, phone call + phone hands, face attack,
// NEO finale.
const ATTACK_MODULES = ['heads', 'columns', 'heart', 'phone', 'face', 'finale'];
await Promise.all(ATTACK_MODULES.map(m => import('./attacks/' + m + '.js' + new URL(import.meta.url).search).catch(e => {
  if (!String(e).includes('Failed to fetch')) console.warn('sneo attack module failed:', m, e);
})));
