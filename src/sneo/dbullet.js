// obj_dbulletcontroller (generic frame only: no Chapter 2 normal-route turn uses it for Spamton
// NEO; his weird-route PipisExplosion is type 51) and scr_bulletspawner.
import { global, defineObject, defineScript, instance_create } from './rt.js?v=20261106201714';
import { first, callOr } from './common.js?v=20261106201714';
import { BulletGenParent } from './bullets.js?v=20261106201714';

const monsterpop = callOr('scr_monsterpop', () => (global.monster ? global.monster[0] + global.monster[1] + global.monster[2] : 1));

export class DBulletController extends BulletGenParent {
  constructor() {
    super();
    this.sprite_index = 'spr_grazemask';
    this.visible = false;
  }
  create() {
    this.type = 1;
    this.btimer = 99;
    this.timermax = 12;
    this.damage = -1;
    this.grazepoints = -1;
    this.timepoints = -1;
    this.inv = -1;
    this.grazed = -1;
    this.grazetimer = -1;
    this.element = 'none';
    this.target = -1;
    this.ratio = 1;
    if (monsterpop() === 2) this.ratio = 1.6;
    if (monsterpop() === 3) this.ratio = 2.3;
    this.side = 1;
    this.difficulty = 0;
    this.made = 0;
    this.special = 0;
    this.init = 0;
    this.creator = 0;
    this.creatorid = null;
  }
  draw() {}
  step() {
    if (this.init === 0) {
      const g = first('obj_growtangle');
      if (g) {
        this.miny = g.y - g.sprite_height / 2;
        this.maxy = g.y + g.sprite_height / 2;
        this.minx = g.x - g.sprite_width / 2;
        this.maxx = g.x + g.sprite_width / 2;
      }
      this.init = 1;
    }
    this.btimer += 1;
  }
}
defineObject('obj_dbulletcontroller', DBulletController);

// scr_bulletspawner(x, y, obj) (monster scope)
export function scr_bulletspawner(self, x, y, obj) {
  const dc = instance_create(x, y, obj);
  dc.creator = self.myself;
  dc.creatorid = self;
  dc.target = self.mytarget;
  dc.damage = (global.monsterat?.[self.myself] ?? 13) * 5;
  return dc;
}
defineScript('scr_bulletspawner', scr_bulletspawner);
