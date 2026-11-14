// RECREW COLUMNS (rr 6): obj_sneo_bulletcontroller type 6, obj_sneo_wall_controller_new (columns of
// mail sliding left on a track, with RECREW heads to shoot open and bombs), obj_sneo_wallbullet_new,
// obj_sneo_rotatingwall_bomb and its obj_mettaton_bomb_hitbox. Difficulties 0 and 1 (the schedule's).
// Skipped: difficulty 9 (the old obj_sneo_wall_controller), the unused difficulty 99 / 2 / 3 tables,
// and obj_sneo_staticwall_new / obj_sneo_rotatingwall_pipis / obj_sneo_pipis_bomb, which nothing in
// this attack creates.
import {
  global, defineObject, instance_create, instance_destroy, withObj, choose, random, merge_color, lerp, bgr,
  snd_play, snd_loop, snd_stop, draw_self, draw_sprite, draw_sprite_ext, collision_rectangle, instance_place,
  instance_nearest, Instance,
} from '../rt.js?v=20261114055614';
import {
  first, camerax, cameray, camerawidth, cameraheight, scr_bullet_init, snd_play_x, snd_play_pitch, defineShared,
} from '../common.js?v=20261114055614';
import { CollideBullet, RegularBullet } from '../bullets.js?v=20261114055614';
import { scr_afterimage_cut } from '../shots.js?v=20261114055614';
import { SneoBulletController } from './heads.js?v=20261114055614';

const sneo = () => first('obj_spamton_neo_enemy');
const wallctrl = () => first('obj_sneo_wall_controller_new');
const WALLBULLET = 'obj_sneo_wallbullet_new';

// obj_sneo_bulletcontroller, type 6.
SneoBulletController.prototype.type6 = function () {
  if (this.init === 1) {
    // (difficulty 9 made the old obj_sneo_wall_controller instead: unused)
    instance_create(0, 0, 'obj_sneo_wall_controller_new');
    this.init = 2;
  }
  if (global.turntimer <= 10 && global.turntimer > 9) {
    const s = this.sneo;
    // with (obj_spamton_neo_enemy) scr_move_to_rememberxy(8)
    if (s && s.alive) s.moveToRemembered(8);
    // (the game then sets global.turntime = 9, a typo with no effect)
  }
};

// obj_sneo_wall_controller_new Create_0: the walls of each difficulty, as scr_sneo_wall_create
// arguments [rows 1-5, frames after the previous wall, walltype]. Row codes: 0 mail, 1 empty,
// 2 RECREW head (breakable), 3 bomb, 4 red head (breaks the whole wall).
// Each group is [n, options]: n > 0 rolls rand = choose(1..n) first, n = 0 reuses the last rand.
const WALLS = {
  0: [
    [3, [
      [['00020', 1, 1], ['02300', 30, 1], ['03020', 30, 1]],
      [['02030', 1, 1], ['03020', 30, 1], ['02030', 30, 1]],
      [['00002', 1, 1], ['03200', 30, 1], ['02300', 30, 1]],
    ]],
    [3, [
      [['01100', 40, 1], ['02200', 6, 1], ['02200', 6, 1], ['02200', 6, 1]],
      [['00011', 40, 1], ['00022', 6, 1], ['00022', 6, 1], ['00022', 6, 1]],
      [['00110', 40, 1], ['00210', 6, 1], ['00220', 6, 1], ['00220', 6, 1]],
    ]],
    [0, [
      [['00002', 30, 1], ['02000', 30, 1], ['03020', 30, 1]],
      [['02000', 30, 1], ['00020', 30, 1], ['02030', 30, 1]],
      [['20000', 30, 1], ['00200', 30, 1], ['02300', 30, 1]],
    ]],
    [3, [
      [['01100', 40, 1], ['02200', 6, 1], ['02200', 6, 1], ['02200', 6, 1]],
      [['01100', 40, 1], ['02200', 6, 1], ['02200', 6, 1], ['02200', 6, 1]],
      [['01100', 40, 1], ['02200', 6, 1], ['02200', 6, 1], ['02200', 6, 1]],
    ]],
  ],
  1: [
    [4, [
      [['30020', 1, 1], ['02300', 20, 1], ['03020', 20, 1]],
      [['02030', 1, 1], ['03020', 20, 1], ['02030', 20, 1]],
      [['00032', 1, 1], ['03200', 20, 1], ['02300', 20, 1]],
      [['23000', 1, 1], ['00230', 20, 1], ['00320', 20, 1]],
    ]],
    [4, [
      [['30020', 20, 1], ['02300', 20, 1], ['03020', 20, 1]],
      [['02030', 20, 1], ['03020', 20, 1], ['02030', 20, 1]],
      [['00032', 20, 1], ['03200', 20, 1], ['02300', 20, 1]],
      [['23000', 20, 1], ['00230', 20, 1], ['00320', 20, 1]],
    ]],
    [0, [
      [['01100', 32, 1], ['02200', 6, 1], ['02200', 6, 1], ['02200', 6, 1]],
      [['00011', 32, 1], ['00022', 6, 1], ['00022', 6, 1], ['00022', 6, 1]],
      [['00110', 32, 1], ['00220', 6, 1], ['00220', 6, 1], ['00220', 6, 1]],
      [['11000', 32, 1], ['22000', 6, 1], ['22000', 6, 1], ['22000', 6, 1]],
    ]],
    [0, [
      [['00002', 20, 1], ['02000', 20, 1], ['03020', 20, 1]],
      [['02000', 20, 1], ['00020', 20, 1], ['02030', 20, 1]],
      [['20000', 20, 1], ['02000', 20, 1], ['02300', 20, 1]],
      [['00020', 20, 1], ['20000', 20, 1], ['00320', 20, 1]],
    ]],
    [4, [
      [['30020', 20, 1], ['02300', 20, 1], ['03020', 20, 1]],
      [['02030', 20, 1], ['03020', 20, 1], ['02030', 20, 1]],
      [['00032', 20, 1], ['03200', 20, 1], ['02300', 20, 1]],
      [['23000', 20, 1], ['00230', 20, 1], ['00320', 20, 1]],
    ]],
  ],
};
const SPOT_TABLES = [null, 'emptyspot', 'breakspot', 'pipispot', 'redbreakspot'];

class WallControllerNew extends Instance {
  create() {
    Object.assign(this, {
      wallsize: 7, wallcountmax: 35, wallcount: 0, wallsetupcount: 0, timer: 0, timer2: 0, wallcreatetimermax: 30, con: 0,
    });
    this.difficulty = sneo()?.difficulty ?? 0;
    this.xx = camerax();
    this.yy = cameray();
    this.track1_x = camerax();
    this.track2_x = camerax() + 320;
    this.track3_x = camerax() + 640;
    this.x = 0;
    this.y = 0;
    this.bullet = [];
    // spotN[wallcountmax] = -1 (the lower entries become 0); here this.<table>[N][wall].
    const spots = () => { const a = new Array(this.wallcountmax + 1).fill(0); a[this.wallcountmax] = -1; return a; };
    for (const t of SPOT_TABLES) if (t) this[t] = [null, spots(), spots(), spots(), spots(), spots()];
    this.wallcreatetimer = new Array(this.wallcountmax).fill(this.wallcreatetimermax);
    this.wallspeed = new Array(this.wallcountmax).fill(-7);
    this.walltype = new Array(this.wallcountmax).fill(0);
    const groups = WALLS[this.difficulty];
    if (groups) {
      this.walltype.fill(1);
      let rand = 1;
      for (const [n, options] of groups) {
        if (n > 0) rand = choose(...Array.from({ length: n }, (_, i) => i + 1));
        for (const [rows, t, type] of options[rand - 1]) this.scr_sneo_wall_create(...[...rows].map(Number), t, type);
      }
      this.scr_sneo_wall_create(1, 1, 1, 1, 1, 9999, 0);
    }
  }
  scr_sneo_wall_create(a0, a1, a2, a3, a4, frames, type) {
    const w = this.wallsetupcount;
    [a0, a1, a2, a3, a4].forEach((code, k) => {
      if (SPOT_TABLES[code]) this[SPOT_TABLES[code]][k + 1][w] = k + 1;
    });
    this.wallcreatetimer[w] = frames;
    this.walltype[w] = type;
    this.wallsetupcount += 1;
  }
  spot(table, i) {
    const w = this.wallcount, t = this[table];
    return t[1][w] === i || t[2][w] === i || t[3][w] === i || t[4][w] === i || t[5][w] === i;
  }
  step() {
    this.timer += 1;
    if (global.turntimer < 1) { instance_destroy(this); return; }
    if (this.wallcount < this.wallcountmax && this.timer === this.wallcreatetimer[this.wallcount]) {
      const w = this.wallcount, n = this.wallsize, bx = camerax() + camerawidth();
      const by = i => this.yy + cameraheight() / 2 + i * 34;
      for (let i = 0; i < n; i++) {
        let b;
        if (i === 0 || i === n - 1) {
          b = this.bullet[i] = instance_create(bx, by(i) - 172, WALLBULLET);
          b.sprite_index = 'spr_sneo_bullet_box';
          b.image_xscale = 1.25;
          b.image_yscale = 1.6;
          b.destroyable = 0;
          b.image_blend = 0xffffff;
          b.wallnumber = w;
          if (i === 0) b.wallcontroller = 1;
          if (i === n - 1) {
            b = this.bullet[i] = instance_create(bx - 50, by(i) - 180, WALLBULLET);
            b.sprite_index = 'spr_sneo_wall_car';
            b.image_xscale = 1.25;
            b.image_yscale = 1.6;
            b.destroyable = 0;
            b.image_blend = 0xffffff;
            b.depth = this.depth - 1;
            b.wallnumber = w;
          }
        } else if (this.spot('emptyspot', i)) {
          // a gap
        } else if (this.spot('pipispot', i)) {
          b = this.bullet[i] = instance_create(bx, by(i) - 170, 'obj_sneo_rotatingwall_bomb');
          b.wallnumber = w;
        } else {
          b = this.bullet[i] = instance_create(bx, by(i) - 172, WALLBULLET);
          b.sprite_index = 'spr_sneo_mail';
          b.image_xscale = 1.2;
          b.image_yscale = 1.71;
          b.destroyable = 0;
          b.wallnumber = w;
          if (this.spot('breakspot', i)) {
            b.destroyable = 1;
            b.sprite_index = 'spr_sneo_crew';
            b.image_speed = 0.5;
            b.image_yscale = 1.2;
          } else if (this.spot('redbreakspot', i)) {
            b.destroyable = 1;
            b.red = 1;
            b.sprite_index = 'spr_sneo_crew';
            b.image_speed = 0.5;
            b.image_yscale = 1.2;
            b.image_blend = bgr(255);
          } else {
            b.image_blend = 0xffffff;
          }
        }
      }
      this.timer = 0;
      this.wallcount += 1;
    }
    this.timer2 += 1;
  }
  draw() {
    const right = camerax() + camerawidth(), ty = cameray() + cameraheight() - 180;
    for (const k of ['track1_x', 'track2_x', 'track3_x']) {
      this[k] += 4;
      if (this[k] > right) this[k] -= 960;
    }
    draw_sprite('spr_sneo_wall_track', 0, this.track1_x, ty);
    draw_sprite('spr_sneo_wall_track', 0, this.track2_x, ty);
    draw_sprite('spr_sneo_wall_track', 0, this.track3_x, ty);
  }
}
defineObject('obj_sneo_wall_controller_new', WallControllerNew);

// The yellow-shot hit flash the walls leave (obj_yshot_anim with spr_yheart_shot_hit3).
function hitAnim(self) {
  const anim = instance_create(self.x, self.y, 'obj_yshot_anim');
  anim.image_xscale = self.image_xscale;
  anim.image_yscale = self.image_yscale;
  anim.sprite_index = 'spr_yheart_shot_hit3';
  return anim;
}
// with (hitshot) event_user(0): a destroyed shot does not run it again.
const shotHit = shot => { if (shot && shot.alive) shot.user0(); };

// obj_sneo_wallbullet_new: one block of a column (mail, a RECREW head, the end boxes or the car).
class WallBulletNew extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_crew';
  }
  create() {
    scr_bullet_init(this);
    this.element = 6;
    this.destroyable = 1;
    this.red = 0;
    this.bighitbox = 1;
    this.image_speed = 0;
    this.image_blend = merge_color(bgr(15245824), bgr(16776960), 0.25 + Math.sin(0) * 0.25);
    const s = sneo();
    if (s) this.damage = global.monsterat[s.myself] * 5;
    const bc = first('obj_sneo_bulletcontroller');
    if (bc) this.target = bc.target;
    this.grazepoints = 2;
    this.wallcontroller = -1;
    this.wallspeed = -7;
    this.wallnumber = 0;
    this.walltype = 0;
    this.timer = 0;
    this.hp = 1;
  }
  // A non-breakable block lets a BIG SHOT through unless it hits the block's middle (12 px) or the
  // block has mail on the side the shot comes from (the `if (...) {} else if (...) exit` test).
  bigShotPasses(shot) {
    const mailAt = dy => instance_place(this, this.x, this.y + dy, WALLBULLET)
      && instance_nearest(this.x, this.y + dy, WALLBULLET).sprite_index === 'spr_sneo_mail';
    if ((shot.y < this.y && mailAt(-40)) || (shot.y > this.y && mailAt(40))) return false;
    return Math.abs(shot.y - this.y) > 12;
  }
  step() {
    if (global.turntimer < 1) { instance_destroy(this); return; }
    const wc = wallctrl();
    if (wc) this.x += wc.wallspeed[this.wallnumber];
    this.stepped = 1;
    if (this.sprite_index === 'spr_sneo_crew') {
      const hitshot = collision_rectangle(this.x - 18, this.y - 22, this.x + 19, this.y + 22, 'obj_yheart_shot', true, false);
      if (hitshot) {
        this.hitshot = hitshot;
        if (this.destroyable == 0 && hitshot.big == 1 && this.bigShotPasses(hitshot)) return;
        this.user0();
        if (this.destroyable == 1 && this.active == 1) {
          if (hitshot.alive && hitshot.big == 0) shotHit(hitshot);
          snd_play_pitch('snd_bomb', 1.1 + random(0.2));
          scr_afterimage_cut(this);
          hitAnim(this);
          instance_destroy(this);
        }
      }
    }
  }
  // The first block of a wall sets the wall's speed. The game runs this at the end of its Step, after
  // x += wallspeed; GameMaker steps the newest instances first, so the rest of the wall has already
  // moved by then. The runtime steps the oldest first, so it is done here to keep the wall aligned.
  endStep() {
    const wc = wallctrl();
    if (this.wallcontroller > -1 && this.stepped && wc) {
      const n = this.wallnumber;
      if (wc.walltype[n] === 0) {
        this.timer += 1;
        if (this.timer < 9) wc.wallspeed[n] = lerp(-16, -6, this.timer / 9);
        else if (this.timer < 150) wc.wallspeed[n] = lerp(-6, -6, (this.timer - 9) / 130);
      }
      if (wc.walltype[n] === 1) {
        this.timer += 1;
        if (this.timer < 16) wc.wallspeed[n] = lerp(-21, -5, this.timer / 15);
        else if (this.timer < 90) wc.wallspeed[n] = lerp(-5, -13, (this.timer - 15) / 70);
      }
    }
  }
  collision_obj_yheart_shot(shot) {
    if (this.destroyable == 0 && shot.big == 1 && this.bigShotPasses(shot)) return;
    this.hitshot = shot;
    this.user0();
    if (this.destroyable == 1 && this.active == 1) {
      if (this.hitshot.big == 0) shotHit(this.hitshot);
      snd_play_x('snd_bomb', 0.7, 1.1 + random(0.2));
      const cut = scr_afterimage_cut(this);
      cut.flash = true;
      hitAnim(this);
      instance_destroy(this);
    }
  }
  // Other_10: hit by a shot. The end boxes ignore it; heads break (a red one takes its whole wall);
  // mail and the car block the shot.
  user0() {
    if (this.sprite_index === 'spr_sneo_bullet_box') return;
    if (this.destroyable == 1) {
      if (this.hitshot.big == 0) shotHit(this.hitshot);
      if (this.red == 1) {
        withObj(WALLBULLET, b => {
          if (b.wallnumber === this.wallnumber) {
            snd_play_pitch('snd_bomb', 1.1 + random(0.2));
            const cut = scr_afterimage_cut(b);
            cut.flash = true;
            instance_destroy(b);
          }
        }, this);
        // (also obj_sneo_rotatingwall_pipis of this wall, which this attack never makes)
      }
      hitAnim(this);
    } else {
      shotHit(this.hitshot);
      snd_play('snd_bell');
    }
  }
}
defineObject(WALLBULLET, WallBulletNew);

// obj_sneo_rotatingwall_bomb: a bomb in a column. Shot, it stops, ticks and blows up in a cross.
class RotatingWallBomb extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_mettaton_bomb1';
  }
  create() {
    scr_bullet_init(this);
    this.image_xscale = 1;
    this.image_yscale = 1;
    this.timer = 0;
    this.con = 0;
    this.element = 6;
    this.destroyable = 0;
    this.bighitbox = 1;
    this.image_speed = 0;
    const s = sneo();
    if (s) this.damage = global.monsterat[s.myself] * 5;
    const bc = first('obj_sneo_bulletcontroller');
    if (bc) this.target = bc.target;
    this.grazepoints = 2;
    this.wallspeed = -7;
    this.wallnumber = 0;
  }
  step() {
    if (global.turntimer < 1) { instance_destroy(this); return; }
    const wc = wallctrl();
    if (this.timer === 0 && wc) this.x += wc.wallspeed[this.wallnumber];
    if (this.timer > 0) this.timer += 1;
    if (this.timer === 6) {
      snd_play('snd_bomb');
      snd_stop(this.bomsfallsfx);
      this.sprite_index = 'spr_mettaton_bomb2';
      this.image_index = 0;
      instance_create(this.x, this.y, 'obj_shake');
      this.hitbox1 = instance_create(this.x, this.y, 'obj_mettaton_bomb_hitbox');
      this.hitbox1.image_xscale = 500;
      this.hitbox1.image_yscale = 0.5;
      this.hitbox2 = instance_create(this.x, this.y, 'obj_mettaton_bomb_hitbox');
      this.hitbox2.image_xscale = 0.2;
      this.hitbox2.image_yscale = 500;
    }
    if (this.timer === 12) instance_destroy(this);
  }
  collision_obj_yheart_shot(shot) {
    if (this.timer === 0) {
      snd_play('snd_damage');
      if (shot.big == 0) shotHit(shot);
      this.timer = 1;
      this.image_speed = 1;
      this.bomsfallsfx = snd_loop('snd_bombfall');
    }
  }
  draw() {
    draw_self(this);
    if (this.sprite_index === 'spr_mettaton_bomb2') {
      const { x, y, image_index: f, image_xscale: xs, image_yscale: ys, image_alpha: a } = this;
      for (let i = 1; i < 24; i++) {
        draw_sprite_ext('spr_mettaton_bomb3', f, x + 24 * i, y, xs, ys, 90, 0xffffff, a);
        draw_sprite_ext('spr_mettaton_bomb3', f, x - 24 * i, y, xs, ys, 90, 0xffffff, a);
        draw_sprite_ext('spr_mettaton_bomb3', f, x, y - 24 * i, xs, ys, 0, 0xffffff, a);
        draw_sprite_ext('spr_mettaton_bomb3', f, x, y + 24 * i, xs, ys, 0, 0xffffff, a);
      }
    }
  }
  cleanUp() {
    if (this.timer > 0) snd_stop(this.bomsfallsfx);
  }
}
defineObject('obj_sneo_rotatingwall_bomb', RotatingWallBomb);

// obj_mettaton_bomb_hitbox (child of obj_regularbullet, invisible): hurts for 3 frames.
// spr_hitbox_10px_center (10x10, centred) is not extracted: the mask is the 20x20 centred
// spr_dodgeheart_centered_white at half the scale (the scale accessors halve what is set).
class MettatonBombHitbox extends RegularBullet {
  constructor() {
    super();
    this.mask_index = 'spr_dodgeheart_centered_white';
    this.visible = false;
  }
  get image_xscale() { return this._hbxs; }
  set image_xscale(v) { this._hbxs = v / 2; }
  get image_yscale() { return this._hbys; }
  set image_yscale(v) { this._hbys = v / 2; }
  create() {
    scr_bullet_init(this);
    this.wall_destroy = 1;
    this.image_alpha = 1;
    this.image_xscale = 1;
    this.image_yscale = 1;
    this.destroyonhit = 0;
    this.grazed = 1;
    this.element = 6;
    const s = sneo();
    if (s) this.damage = global.monsterat[s.myself] * 5;
    const bc = first('obj_sneo_bulletcontroller');
    if (bc) this.target = bc.target;
    this.grazepoints = 2;
    this.timer = 0;
    this.depth = -999999;
    this.creator = -1;
  }
  step() {
    this.timer += 1;
    if (this.timer === 3) { instance_destroy(this); return; }
    if (this.creator !== -1 && this.creator && this.creator.alive) {
      this.x = this.creator.x;
      this.y = this.creator.y;
    }
  }
  draw() {}
}
defineShared('obj_mettaton_bomb_hitbox', MettatonBombHitbox);
