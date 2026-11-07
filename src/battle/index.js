// Imports every battle-system module so their objects and scripts get registered.
import './misc.js?v=20261107001913';
import './text.js?v=20261107001913';
import './setup.js?v=20261107001913';
import './controller.js?v=20261107001913';
import './heroes.js?v=20261107001913';
import './fight.js?v=20261107001913';
import './damage.js?v=20261107001913';
import './spells.js?v=20261107001913';
import './endbattle.js?v=20261107001913';

export { startBattle } from './setup.js?v=20261107001913';
export { MonsterParent } from './misc.js?v=20261107001913';
