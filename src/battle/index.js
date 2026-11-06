// Imports every battle-system module so their objects and scripts get registered.
import './misc.js?v=20261106144300';
import './text.js?v=20261106144300';
import './setup.js?v=20261106144300';
import './controller.js?v=20261106144300';
import './heroes.js?v=20261106144300';
import './fight.js?v=20261106144300';
import './damage.js?v=20261106144300';
import './spells.js?v=20261106144300';
import './endbattle.js?v=20261106144300';

export { startBattle } from './setup.js?v=20261106144300';
export { MonsterParent } from './misc.js?v=20261106144300';
