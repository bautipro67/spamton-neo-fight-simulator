// Imports every battle-system module so their objects and scripts get registered.
import './misc.js?v=20261119142821';
import './text.js?v=20261119142821';
import './setup.js?v=20261119142821';
import './controller.js?v=20261119142821';
import './heroes.js?v=20261119142821';
import './fight.js?v=20261119142821';
import './damage.js?v=20261119142821';
import './spells.js?v=20261119142821';
import './endbattle.js?v=20261119142821';

export { startBattle } from './setup.js?v=20261119142821';
export { MonsterParent } from './misc.js?v=20261119142821';
