// Imports every battle-system module so their objects and scripts get registered.
import './misc.js?v=20261107052643';
import './text.js?v=20261107052643';
import './setup.js?v=20261107052643';
import './controller.js?v=20261107052643';
import './heroes.js?v=20261107052643';
import './fight.js?v=20261107052643';
import './damage.js?v=20261107052643';
import './spells.js?v=20261107052643';
import './endbattle.js?v=20261107052643';

export { startBattle } from './setup.js?v=20261107052643';
export { MonsterParent } from './misc.js?v=20261107052643';
