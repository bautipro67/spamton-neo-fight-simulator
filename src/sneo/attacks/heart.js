// HEART ATTACK (rr 2, "HeartAttackNeo"): obj_sneo_bulletcontroller type 1.5, the enemy's partmode 34
// pose (Draw_0: his chest opens and makeheart sends out the hearts), and obj_sneo_wireheart, the heart
// on a wire the game really uses (difficulty 0: one heart; 1: one heart and two small ones; 2: one fast
// heart; 3/4 are not in the normal-route schedule, their lasers / bombs are only created if ported).
// Also obj_sneo_heartattack and its helpers (obj_sneo_heatattack_bullet, obj_sneo_heartattack_intro,
// obj_sneo_heartattack_glass_shard, obj_sneo_heartattack_chest_shake, obj_sneo_heart_defeated_fx): an
// older version that only obj_sneo_bulletcontroller_somn (unused) creates, ported as written.
import {
  global, Instance, defineObject, instance_create, instance_destroy, instancesOf, instance_number, objectExists,
  choose, random, random_range, lerp, lengthdir_x, lengthdir_y, point_direction, draw_sprite_ext, draw_self,
  draw_set_color, draw_line_width, snd_play, snd_volume, bgr,
} from '../rt.js?v=20261106131626';
import {
  first, camerax, cameray, callOr, scr_bullet_init, scr_lerpvar, scr_marker, scr_script_delayed, scr_doom,
  lerp_ease_in, lerp_ease_out,
} from '../common.js?v=20261106131626';
import { BasicBulletSneo, scr_afterimage_cut } from '../shots.js?v=20261106131626';
import { POSES } from '../enemy.js?v=20261106131626';
import { SneoBulletController } from './heads.js?v=20261106131626';

const sneo = () => first('obj_spamton_neo_enemy');
const ctrl = () => first('obj_sneo_bulletcontroller');
const alive = o => !!o && o.alive;
const turntimer = callOr('scr_turntimer', t => { if (global.turntimer < t) global.turntimer = t; });
// Objects other modules port (biglaser, spamtonshot, sine hands...): skipped while missing, so that
// instance_create never registers a stub for them.
const mk = (x, y, name) => (objectExists(name) ? instance_create(x, y, name) : null);
const each = name => (objectExists(name) ? instancesOf(name) : []);
const destroyAll = (...names) => { for (const n of names) for (const o of each(n)) instance_destroy(o); };
const set8 = (arr, vals) => { for (let k = 0; k < 8; k++) arr[k] = vals[k]; };

// obj_spamton_neo_enemy Create_0: the heart attack's fields, set here when enemy.js lacks them.
const HEART_DEFAULTS = {
  heart_attack_count: 10, heart_health: 25, heart_speed_scaling: 2, heart_1st_wave_timer: 6, heart_2nd_wave_timer: 11,
  heart_3rd_wave_timer: 16, heart_variant_arm_shoot_timer: 90, heart_turntimer: 1200, heart_hurt_timer_reduction: 27,
  heart_hurt_timer_reduction_bigshot: 108, heart_bullet_image_scale: 1.1, heart_bullet_speed_1st_wave: 0.1,
  heart_bullet_friction_1st_wave: 0.1, heart_bullet_speed_2nd_wave: 0.1, heart_bullet_friction_2nd_wave: 0.09,
  heart_bullet_speed_3rd_wave: 0.1, heart_bullet_friction_3rd_wave: 0.08, heart_bullet_gravity_acceleration: 1.075,
  heart_release_con: 0, heartattackoffsetx: 0, makeheart: 0, makeheartinit: 0, makehearttype: 0, makehearttimer: 0,
  makeheartalt: 0, siner: 0,
};
export function heartInit(s) {
  if (!s || s._heartInit) return s;
  for (const k in HEART_DEFAULTS) if (s[k] === undefined) s[k] = HEART_DEFAULTS[k];
  s.idealx ??= new Array(8).fill(0);
  s.idealrot ??= new Array(8).fill(0);
  s._heartInit = 1;
  return s;
}

// ---------------------------------------------------------------- obj_sneo_bulletcontroller

SneoBulletController.prototype.type1_5 = function () {
  this.hearttargettimer = (this.hearttargettimer ?? 0) - 1;
  const s = heartInit(this.sneo);
  if (this.init === 1) {
    if (s) s.partmode = 34;
    this.init = 2;
    this.btimer = 100;
  }
  if (this.btimer === 110 && s) {
    s.heart_release_con += 1;
    if (s.heart_release_con === 1) s.makeheart = 1;
  }
};
// Destroy_0's part that heads.js does not do yet: the heart fields go back to rest (a heart still out
// when the turn ends would leave heart_release_con at 1, and the next heart turn would make no heart),
// and he goes back to xstart (partmode 34 moved him 60 px right).
const baseDestroy = SneoBulletController.prototype.onDestroy;
SneoBulletController.prototype.onDestroy = function () {
  const s = this.sneo;
  if (alive(s)) {
    s.makeheartinit = 0;
    s.makeheartalt = 0;
    s.heart_release_con = 0;
    if (this.type === 1.5) s.x = s.xstart;
  }
  baseDestroy.call(this);
};

// ---------------------------------------------------------------- partmode 34 (Draw_0, per part)

function wire(s, type) {
  const w = instance_create(s.x + 10, s.y + 80, 'obj_sneo_wireheart');
  w.boss = s;
  w.bossx = s.x + 10;
  w.bossy = s.y + 80;
  w.type = type;
  w.target = 3;
  w.damage = Math.floor(global.monsterat[s.myself] * 5 * 0.6);
  return w;
}
function makeHearts(s, hearttype) {
  if (s.makeheartinit === 0) {
    s.makeheartinit = 1;
    s.makehearttype = 0;
  }
  const t = s.makehearttype;
  if (hearttype === 0) wire(s, 0).special = s.hellmode;
  else if (hearttype === 1) {
    wire(s, 0).special = s.hellmode;
    wire(s, 1);
    wire(s, 1);
  } else if (hearttype === 2) {
    const w = wire(s, 0);
    w.bighearttype = 1;
    w.special = s.hellmode;
  } else if (hearttype === 3 || hearttype === 4) {
    if (t === 0) wire(s, 1);
    if (t === 0 || t === 3) { const w = wire(s, hearttype); if (hearttype === 3) w.altbiter = 3; }
    if (t === 0 || t === 4) { const w = wire(s, hearttype); if (hearttype === 3) w.altbiter = 4; }
  }
  for (let n = 0; n < 6; n++) {
    const shard = instance_create(s.x + 10, s.y + 80, 'obj_afterimage');
    shard.sprite_index = 'spr_bullet_laser_circle';
    shard.speed = 10 + random(2);
    shard.direction = 140 + random_range(-40, 40);
    shard.gravity = 1;
    shard.image_xscale = 0.5 + random(0.5);
    shard.image_yscale = shard.image_xscale;
  }
  s.makeheart = 0;
}

POSES[34] = (s, i) => {
  heartInit(s);
  const f = s.f ?? 2, d = s.difficulty;
  let hearttype = 0;
  if (d === 1) hearttype = 1;
  if (d === 2) hearttype = 2;
  if (d === 3) hearttype = 3;
  if (d === 4) hearttype = 4;
  s.hearttype = hearttype;
  let flyx = 0;
  if (s.heart_release_con === 1) flyx = -20;
  s.flyx = flyx;
  const ix = s.idealx, ir = s.idealrot;
  if (i === 0) {
    s.siner += 1;
    if (s.heart_release_con >= 2) s.heart_release_con = 0;
    if (s.heart_release_con === 0) {
      set8(ix, [0, 0, 0, 0, 0, 0, 0, 0]);
      set8(ir, [10, 30, -50, -50, 40, 60, -30, 30]);
      if (hearttype > 2 && instance_number('obj_sneo_wireheart') < 3 && s.makehearttimer < 1 && global.turntimer > 100 && s.makeheartinit === 1) {
        s.makehearttimer = 80;
        s.makeheart = 1;
        s.makehearttype = choose(3, 4);
        if (s.makeheartalt !== 0) {
          s.makehearttype = s.makeheartalt;
          s.makehearttimer = 120;
        }
      }
    }
    if (s.heart_release_con === 1) {
      set8(ix, [4, 0, 0, 0, 0, 15, 0, 4]);
      set8(ir, [-40, 90, 50, 50, -40, -100, 30, -30]);
    }
    if (global.turntimer < 20) {
      set8(ix, [0, 0, 0, 0, 0, 0, 0, 0]);
      set8(ir, [0, 0, 0, 0, 0, 0, 0, 0]);
    }
    if (s.makehearttimer > 0) s.makehearttimer -= 1;
    if (s.makeheart) makeHearts(s, hearttype);
  }
  if (global.turntimer < 20) {
    s.partrot[i] = lerp(s.partrot[i], 0, 0.14 * f);
    s.partx[i] = lerp(s.partx[i], 0, 0.1 * f);
    s.party[i] = lerp(0, s.party[i], 0.06 * f);
    s.heartattackoffsetx = lerp(s.heartattackoffsetx, 0, 0.06 * f);
    s.x = lerp(s.x, s.xstart, 0.1);
  } else {
    s.partrot[i] = lerp(s.partrot[i], ir[i] + random(4), 0.14 * f);
    s.partx[i] = lerp(s.partx[i] + flyx, ix[i], 0.1 * f);
    s.party[i] = lerp(s.party[i], 0, 0.06 * f);
    if (s.heart_release_con === 0) s.heartattackoffsetx = lerp(s.heartattackoffsetx, -10, 0.01 * f);
    if (s.heart_release_con === 1) s.heartattackoffsetx = lerp(s.heartattackoffsetx, -60, 0.01 * f);
    s.x = lerp(s.x, s.xstart + 60, 0.1);
  }
};

// ---------------------------------------------------------------- obj_sneo_wireheart

class WireHeart extends BasicBulletSneo {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_wireheart';
  }
  create() {
    scr_bullet_init(this);
    Object.assign(this, {
      element: 6, hp: 300, damagetimer: 0, defeated: 0, active: 1, destroyonhit: 0, target: 0, damage: 1, animtimer: 0,
      firedtimer: 0, destroyed: 0, rembossx: 0, rembossy: 0, invincibility_timer: 2, chargeshothitcount: 0,
      normalshothitcount: 0, image_xscale: 0, image_yscale: 0, bossx: this.xstart, bossy: this.ystart, boss: null,
      image_index: 0, image_speed: 0, init: 0, con: 1, timer: 0, moveframes: 30, targetx: 0, type: 0, shottype: 0,
      bighearttype: 0, special: 0, preset: -1, altbiter: 1, hpos: 5 + random(1.5),
    });
  }
  step() {
    const s = sneo(), diff = s ? s.difficulty : 0;
    if (this.init === 0) {
      this.image_xscale = 0.5;
      this.image_yscale = 0.5;
      this.destroyed = 0;
      this.shotcount = 0;
      this.bouncecount = 0;
      this.shottype = 0;
      this.shottimer = 0;
      this.init = 1;
      this.con = 1;
      if (alive(this.boss)) {
        this.rembossx = this.boss.x;
        this.rembossy = this.boss.y;
      } else {
        this.rembossx = this.bossx;
        this.rembossy = this.bossy;
      }
      this.xscale = 1;
      this.yscale = 1;
      if (this.type === 1) {
        this.sprite_index = 'spr_sneo_wireheart_smaller';
        this.moveframes *= 0.8;
        this.hp = 10;
      }
      scr_lerpvar(this, 'image_xscale', 0.5, this.xscale, 20, -1, 'out');
      scr_lerpvar(this, 'image_yscale', 0.5, this.yscale, 20, -1, 'out');
      if (this.type === 3) {
        this.sprite_index = 'spr_sneo_wireheart_biter';
        this.hp = 3;
        this.moveframes = 12;
      }
      if (this.type === 4) {
        this.sprite_index = 'spr_sneo_wireheart_bomb';
        this.hp = 1;
      }
    }
    if (this.con === 1) {
      if (this.bighearttype === 1) this.moveframes = 16;
      this.targetx = camerax() + 300 + random(70);
      this.targety = cameray() + 145 + random_range(-70, 70);
      if (this.type === 3) {
        if (this.altbiter > 0 && this.altbiter < 3) {
          this.targetx = camerax() + 150;
          this.targety = cameray() + (this.altbiter === 1 ? 240 : 75);
        } else {
          this.targetx = camerax() + 170 + random(70);
          this.targety = cameray() + 145 + random_range(-60, 60);
        }
        if (this.altbiter === 3) {
          this.targetx = camerax() + 350;
          this.targety = cameray() + 130 + random_range(-45, 0);
        }
        if (this.altbiter === 4) {
          this.targetx = camerax() + 350;
          this.targety = cameray() + 160 + random_range(45, 0);
        }
      }
      const h = first('obj_heart'), c = ctrl();
      if (h && c && c.hearttargettimer < 1 && this.type !== 3 && choose(0, 1, 2) === 0) {
        this.targety = h.y + 10;
        c.hearttargettimer = 6;
      }
      this.movetimer = 0;
      this.con = 2;
      if ((this.type === 0 || this.type === 1) && alive(this.boss)) this.boss.heart_release_con = 1;
    }
    if (this.con === 2) {
      this.movetimer += 1 / this.moveframes;
      this.x = lerp_ease_out(this.bossx, this.targetx, this.movetimer, 2);
      this.y = lerp_ease_out(this.bossy, this.targety, this.movetimer, 2);
      if (this.movetimer >= 1) {
        this.movetimer = 0;
        this.con = 3;
      }
    }
    if (this.con === 3) {
      if (this.type === 3 && this.altbiter > 0 && this.altbiter < 3) {
        this.movetimer += 1;
        if (this.altbiter === 1) this.y = lerp(cameray() + 240, cameray() + 75, this.movetimer / 21);
        if (this.altbiter === 2) this.y = lerp(cameray() + 75, cameray() + 240, this.movetimer / 21);
        if (this.movetimer >= 20) {
          this.movetimer = 0;
          this.con = 10;
          this.targety = this.y;
        }
      }
      if (this.type === 3 && this.altbiter > 2) {
        this.movetimer += 1;
        if (this.movetimer === 1) mk(this.x, this.y, 'obj_sneo_heart_laser');
        if (this.movetimer >= 16) {
          this.movetimer = 0;
          this.con = 10;
        }
      } else {
        this.con = 10;
        this.movetimer = 0;
      }
    }
    if (this.con === 10) {
      this.movetimer += 1 / this.moveframes;
      this.x = lerp_ease_in(this.targetx, this.bossx, this.movetimer, 2);
      this.y = lerp_ease_in(this.targety, this.bossy, this.movetimer, 2);
      if (((this.movetimer > 0.5 && this.type === 0) || (this.movetimer > 0.5 && this.type === 1 && diff > 2)) && alive(this.boss)) {
        this.boss.heart_release_con = 0;
      }
      if (this.movetimer >= 1) {
        this.movetimer = 0;
        this.shottimer = 0;
        this.con = 1;
      }
    }
    if (this.con === 2 || this.con === 3 || this.con === 10) {
      const radial = 5;
      if (Math.abs((this.x - this.targetx) / (this.targetx - this.bossx)) < 0.2) {
        this.shottimer -= 1;
        if (this.shottimer <= 0) {
          if (this.type === 0) {
            this.firedtimer = 4;
            let dir = 0;
            const g = first('obj_growtangle');
            if (this.bighearttype === 1 && g && this.y < g.y) dir = 25 + random(10);
            if (this.bighearttype === 1 && g && this.y > g.y) dir = random(10) * -1 - 25;
            for (let i = 0; i < radial; i++) {
              const r = this.radialshot(1, -0.3);
              r.direction = i / radial * 180 + 110 + dir;
              if (this.special == 1) r.direction += random_range(-10, 10);
              r.image_angle = r.direction;
              if (this.bighearttype === 1) {
                r.speed = 1;
                r.friction = -0.23;
              }
              if (diff === 0) r.grazepoints = 3;
              if (diff === 2) r.grazepoints = 2;
            }
            this.shottimer = this.bighearttype === 1 ? 6 : 10;
          } else if (this.type === 1) {
            this.firedtimer = 4;
            const h = first('obj_heart');
            for (let i = 0; i < radial; i++) {
              const r = this.radialshot(3, -0.2);
              r.direction = h ? point_direction(r.x, r.y, h.x + 10, h.y + 10) : 180;
              r.image_angle = r.direction;
              r.image_xscale = 0.5;
              r.image_yscale = 0.5;
            }
            this.shottimer = 6;
          }
        }
      }
    }
  }
  // An obj_collidebullet diamond (it has no Step: it flies until the turn's bullets are cleared).
  radialshot(speed, friction) {
    const r = instance_create(this.x, this.y, 'obj_collidebullet');
    scr_bullet_init(r);
    r.sprite_index = 'spr_diamondbullet';
    r.active = 1;
    r.speed = speed;
    r.friction = friction;
    r.depth = this.depth - 1;
    r.target = this.target;
    r.damage = this.damage;
    r.grazed = 0;
    r.element = 6;
    return r;
  }
  collision_obj_yheart_shot(shot) {
    if (this.invincibility_timer > 0 && shot.big == 0) {
      instance_destroy(shot);
      return;
    }
    this.invincibility_timer = 10;
    const s = sneo(), diff = s ? s.difficulty : 0;
    if (global.turntimer < 150) {
      this.hp = 0;
      if (this.type === 0 || (this.type === 1 && diff > 2 && global.turntimer > 20)) {
        global.turntimer = 20;
        for (const w of instancesOf('obj_sneo_wireheart')) {
          w.hp = 0;
          w.destroyed = 1;
        }
      }
    } else if (this.type === 0 || (this.type === 1 && diff > 2)) {
      if (shot.big == 1) {
        global.turntimer -= 80 - this.chargeshothitcount * 10;
        if (this.chargeshothitcount < 3) this.chargeshothitcount += 1;
      } else {
        global.turntimer -= 20 - this.normalshothitcount;
        if (this.normalshothitcount < 10) this.normalshothitcount += 1;
      }
    } else if (shot.big == 1) this.hp -= 5;
    else this.hp -= 1;
    instance_destroy(shot);
    this.damagetimer = 5;
    snd_play('snd_damage');
    if (this.hp <= 0) this.destroyed = 1;
  }
  draw() {
    const b = this.boss;
    if (alive(b)) {
      let xx = 50 - b.heart_release_con * 100;
      if (global.turntimer < 20) xx = 0;
      this.rembossx = lerp(this.rembossx, b.x + xx, 0.16);
      this.rembossy = b.y + 80;
    }
    if (this.destroyed === 1) this.invincibility_timer = 0;
    let hidesprite = 0;
    if (this.invincibility_timer > 0) {
      if ([10, 9, 6, 5, 3, 2].includes(this.invincibility_timer)) hidesprite = 1;
      this.invincibility_timer -= 1;
    }
    const x = this.x, y = this.y, rx = this.rembossx, ry = this.rembossy;
    if (hidesprite === 0) {
      if (this.type === 3 && this.altbiter > 0 && this.altbiter < 3) {
        const div = this.altbiter === 1 ? 5 : 6;
        for (let i = 6; i >= 0; i--) {
          draw_sprite_ext('spr_sneo_wireheart', 5, lerp(x, rx, i / div), lerp(y, ry, i / this.hpos), 0.75, 0.75, 0, this.image_blend, this.image_alpha);
        }
      } else {
        for (let i = 10; i >= 0; i--) {
          draw_sprite_ext('spr_sneo_wireheart', 4, lerp(x, rx, i / 9), lerp(y, ry, i / 9), this.image_xscale, this.image_yscale, 0, this.image_blend, this.image_alpha);
        }
      }
      this.animtimer += 1;
      this.firedtimer -= 1;
      this.image_index = 0;
      if (this.animtimer >= 5) this.image_index = 1;
      if (this.animtimer >= 10) this.animtimer = 0;
      if (this.firedtimer > 4) this.image_index = 3;
      draw_self(this);
      if (this.damagetimer > 0) {
        draw_sprite_ext(this.sprite_index, 2, x, y, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.damagetimer / 5);
        this.damagetimer -= 1;
      }
    }
    if (this.destroyed === 1) this.blowUp();
  }
  blowUp() {
    const x = this.x, y = this.y, rx = this.rembossx, ry = this.rembossy;
    snd_play('snd_bomb');
    const bomb = this.type === 4 && global.turntimer > 20 ? mk(x, y, 'obj_sneo_heart_bomb_explode') : null;
    if (bomb) bomb.depth = this.depth - 2;
    else if (!(this.type === 4 && global.turntimer > 20)) scr_afterimage_cut(this);
    for (let i = 10; i >= 0; i--) {
      const piece = scr_marker(lerp(x, rx, i / 9), lerp(y, ry, i / 9), 'spr_sneo_wireheart');
      piece.image_index = 4;
      piece.i = i;
      piece.depth = this.depth + 1;
      scr_script_delayed(piece, scr_afterimage_cut, i * 2);
      scr_script_delayed(piece, () => snd_play('snd_bomb'), i * 2);
      scr_script_delayed(piece, () => snd_volume('snd_bomb', 0.5, 0), i * 2);
      scr_doom(piece, i * 2 + 1);
    }
    const s = sneo();
    if (s && (this.altbiter === 1 || this.altbiter === 2)) s.makeheartalt = this.altbiter + 2;
    if (s && (this.type === 0 || (this.type === 1 && s.difficulty > 2))) {
      const m = s.myself;
      // scr_sideb_get_phase() < 3 always holds on the normal route.
      if (global.monsterhp[m] === global.monstermaxhp[m]) {
        const c = ctrl();
        if (c) c.mercyaccumulated += 3;
        const w = instance_create(global.monsterx[m], global.monstery[m] + 20 - global.hittarget[m] * 20, 'obj_dmgwriter');
        w.damage = 3;
        w.type = 5;
        global.hittarget[m] += 1;
      } else {
        global.monsterhp[0] -= Math.ceil(global.monstermaxhp[0] * 0.03);
        if (global.monsterhp[0] < 0) global.monsterhp[0] = 1;
      }
    }
    instance_destroy(this);
  }
}
defineObject('obj_sneo_wireheart', WireHeart);

// ---------------------------------------------------------------- obj_sneo_heartattack (unused version)

// distance_to_point: from the bounding box, as GameMaker measures it.
function distance_to_point(inst, px, py) {
  const dx = px < inst.bbox_left ? inst.bbox_left - px : px > inst.bbox_right ? px - inst.bbox_right : 0;
  const dy = py < inst.bbox_top ? inst.bbox_top - py : py > inst.bbox_bottom ? py - inst.bbox_bottom : 0;
  return Math.hypot(dx, dy);
}
const heartVars = () => heartInit(sneo()) ?? { ...HEART_DEFAULTS, difficulty: 0 };

class HeartAttack extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_heart';
  }
  create() {
    const s = heartVars();
    this.image_xscale = 1;
    this.image_yscale = 1;
    this.image_speed = 0;
    this.speed = 5;
    this.rand_angle = random(40);
    this.heart_health = s.heart_health;
    this.heart_speed_scaling = s.heart_speed_scaling;
    Object.assign(this, { con: 0, shootcon: 0, shoottimer: 0, bustertimer: 0, flyingheadtimer: 0, defeatedtimer: 0 });
    this.difficulty = s.difficulty;
    this.movementstyle = s.difficulty;
    if (this.movementstyle === 0) this.movementstyle = 1;
    this.attackcount = s.heart_attack_count;
    this.direction = 163 + random(34);
    this.shakex = 0;
    this.shakey = 0;
    this.aim = 0;
    this.alarm[1] = 15;
    if (this.difficulty === 1) this.speed = 5;
  }
  onDestroy() {
    destroyAll('obj_sneo_sine_hand_controller');
    for (const o of each('obj_sneo_sine_hand')) o.con = 1;
    const s = sneo();
    if (s) s.partmode = 1;
    if (global.turntimer > 2) global.turntimer = 2;
  }
  alarm0() {
    this.visible = true;
    this.con = 0;
    this.x = this.xstart;
    this.y = this.ystart;
    this.shootcon = 0;
    this.shoottimer = 0;
    this.direction = 162 + random(36);
  }
  alarm1() { turntimer(heartVars().heart_turntimer); }
  // The speed change per frame: difficulty 1 has its own; the others use the movement style.
  accel(d1, style1, other) {
    const k = this.heart_speed_scaling;
    if (this.difficulty === 1) this.speed += d1 * k;
    else {
      if (this.movementstyle === 1) this.speed += style1 * k;
      if (this.movementstyle !== 0) this.speed += other * k;
    }
  }
  introDone() {
    for (const o of each('obj_sneo_heartattack_intro')) {
      o.timer = 0;
      o.con = 1;
    }
  }
  step() {
    const s = heartVars();
    if (this.shakex > 0) this.shakex -= 1;
    if (this.shakey > 0) this.shakey -= 1;
    if (global.turntimer < 51) {
      global.turntimer = 50;
      this.attackcount = 0;
    }
    if (this.con === 0) {
      this.accel(0.5, 0.1, 0.4);
      let destination = 70 + random(3);
      if (this.movementstyle !== 2) destination = 152;
      if (distance_to_point(this, this.xstart, this.ystart) > destination) {
        if (this.movementstyle === 2) this.con = 2;
        else this.speed = 0;
        this.shootcon = 1;
        if (this.movementstyle === 2) this.shoottimer = -10;
      }
    }
    if (this.con === 2) {
      this.accel(-0.3, -0.1, -0.6);
      if (this.x > this.xstart - 12) {
        this.attackcount -= 1;
        if (this.attackcount > 0) {
          this.x = this.xstart;
          this.con = 2.1;
          this.shootcon = 0;
          this.shoottimer = 0;
          this.speed *= -0.4;
          this.visible = false;
          this.alarm[0] = this.difficulty === 2 ? 58 : 2;
          this.direction = 162 + random(36);
        } else {
          instance_destroy(this);
          this.introDone();
          destroyAll('obj_sneo_biglaser', 'obj_rouxls_power_up_orb');
        }
      }
    }
    if (this.con === 3) {
      destroyAll('obj_sneo_guymaker', 'obj_sneo_lilguy', 'obj_sneo_heatattack_bullet', 'obj_spamtonshot');
      this.defeatedtimer += 1;
      this.image_index = 0;
      if (this.defeatedtimer === 1) {
        for (let a = 0; a < 12; a++) instance_create(this.x, this.y, 'obj_sneo_heart_defeated_fx').direction = a * 30;
      }
      if (this.defeatedtimer > 20 && this.defeatedtimer < 50) {
        this.x += (this.xstart - this.x) * 0.1;
        this.y += (this.ystart - this.y) * 0.1;
      }
      if (this.defeatedtimer > 50) {
        this.image_alpha -= 0.1;
        if (this.image_alpha < 0) {
          instance_destroy(this);
          this.introDone();
        }
      }
    }
    if (this.shootcon === 1) {
      const t = this.shoottimer;
      if (t === 0 || t === 4) this.image_index = 1;
      if (t === 2 || t === 6) this.image_index = 0;
      this.shoottimer += 1;
      const st = this.shoottimer, w1 = s.heart_1st_wave_timer, w2 = s.heart_2nd_wave_timer, w3 = s.heart_3rd_wave_timer;
      if ((st === w1 || st === w2 || st === w3) && this.heart_health > 0) {
        let angle = 0 + this.rand_angle;
        if (st === w2) angle = 14 + this.rand_angle;
        for (let n = 0; n < 10; n++) {
          const b = instance_create(this.x, this.y, 'obj_sneo_heatattack_bullet');
          b.image_angle = angle;
          b.direction = angle;
          b.gravity_direction = angle;
          b.image_xscale = s.heart_bullet_image_scale;
          b.image_yscale = s.heart_bullet_image_scale;
          b.depth = this.depth - 1;
          if (st === w1) { b.speed = s.heart_bullet_speed_1st_wave; b.gravity = s.heart_bullet_friction_1st_wave; }
          if (st === w2) { b.speed = s.heart_bullet_speed_2nd_wave; b.gravity = s.heart_bullet_friction_2nd_wave; }
          if (st === w3) { b.speed = s.heart_bullet_speed_3rd_wave; b.gravity = s.heart_bullet_friction_3rd_wave; }
          angle += 36;
        }
      }
      if (this.shoottimer > 23) {
        this.shootcon = 0;
        this.con = 2;
        this.shoottimer = 0;
        this.rand_angle = random(40);
      }
    }
  }
  // Step_2: difficulty 1 and 2 aim his arm cannon (partmode 3/4) and fire obj_sneo_biglaser /
  // obj_spamtonshot; difficulty 2 also sends flying heads.
  endStep() {
    const s = sneo();
    if (!s) return;
    if (this.difficulty > 0) {
      this.bustertimer += 1;
      this.flyingheadtimer += 1;
    }
    const buster = (start, end, back) => {
      const h = first('obj_heart');
      if (this.bustertimer === start) {
        s.partmode = 3;
        s.armangle = point_direction(s.partxoff[1], s.partyoff[1], h ? h.x : 0, h ? h.y : 0);
        s.aimmode = 2;
        s.armaim = s.armangle;
        const d = mk(s.x, s.y, 'obj_sneo_biglaser');
        if (d) {
          d.direction = s.armangle - 90;
          d.image_angle = s.armangle - 90;
          d.depth += 1;
          d.damage = (s.damage ?? 0) * 2;
        }
      }
      this.aim = this.bustertimer >= start && this.bustertimer < end ? 1 : 0;
      if (this.bustertimer === end) {
        destroyAll('obj_sneo_biglaser');
        this.aimmode = 0;
        s.partmode = 4;
        s.armendx = s.x + s.partx[1] + s.partxoff[1] + lengthdir_x(s.armlength, s.partrot[1] - 93);
        s.armendy = s.y + s.party[1] + s.partyoff[1] + lengthdir_y(s.armlength, s.partrot[1] - 93);
        s.shot = mk(s.armendx, s.armendy, 'obj_spamtonshot');
      }
      if (this.bustertimer > end) {
        this.bustertimer = back;
        if (global.turntimer < 100) {
          s.partmode = 1;
          this.bustertimer = 999;
        }
      }
      for (const o of each('obj_spamtonshot')) o.dontexplode = 1;
    };
    if (this.difficulty === 1) buster(40, 90, 28);
    if (this.difficulty === 2) {
      buster(21, 71, -70);
      if (this.flyingheadtimer === 60) instance_create(this.x, this.y, 'obj_sneo_guymaker');
      if (this.flyingheadtimer === 90) {
        destroyAll('obj_sneo_guymaker');
        this.flyingheadtimer = -90;
      }
    }
    if (this.aim === 1) {
      const h = first('obj_heart');
      if (h) {
        s.armangle = point_direction(s.x + s.partxoff[1], s.y + s.partyoff[1], h.x + 8, h.y + 8) + 90;
        s.aimmode = 1;
        s.armaim = s.armangle;
      }
      for (const l of each('obj_sneo_biglaser')) {
        l.x = s.x + s.partx[1] + s.partxoff[1] + lengthdir_x(s.armlength, s.partrot[1] - 93);
        l.y = s.y + s.party[1] + s.partyoff[1] + lengthdir_y(s.armlength, s.partrot[1] - 93);
      }
    }
  }
  collision_obj_yheart_shot(shot) {
    if (this.con === 3) return;
    if (!this.visible) return;
    const s = heartVars();
    this.shakex = 6;
    this.shakey = 6;
    this.heart_health -= shot.damage;
    if (shot.damage > 2) global.turntimer -= s.heart_hurt_timer_reduction_bigshot;
    else global.turntimer -= s.heart_hurt_timer_reduction;
    snd_play('snd_damage');
    shot.user0();
    if (this.heart_health < 1) {
      this.con = 3;
      this.shootcon = 0;
      this.speed = 0;
      const e = sneo();
      if (e) e.partmode = 1;
      this.bustertimer = 999;
      if (global.turntimer > 2) global.turntimer = 37;
      destroyAll('obj_sneo_guymaker', 'obj_sneo_lilguy', 'obj_sneo_heatattack_bullet', 'obj_spamtonshot',
        'obj_sneo_biglaser', 'obj_rouxls_power_up_orb');
    }
    if (global.turntimer < 51) {
      global.turntimer = 50;
      this.attackcount = 0;
    }
  }
  draw() {
    draw_set_color(bgr(32768));
    draw_line_width(this.x, this.y, this.xstart, this.ystart, 2);
    draw_set_color(0xffffff);
    draw_sprite_ext(this.sprite_index, this.image_index, this.x + random(this.shakex), this.y + random(this.shakey), this.image_xscale, this.image_yscale, 0, 0xffffff, this.image_alpha);
  }
}
defineObject('obj_sneo_heartattack', HeartAttack);

// obj_sneo_heatattack_bullet. Its Other_10 only fills wall-pattern tables (a copy of the RECREW
// wall controller's) that nothing reads, and nothing calls it.
class HeatAttackBullet extends BasicBulletSneo {
  constructor() {
    super();
    this.sprite_index = 'spr_neo_heart_bullet';
  }
  create() {
    scr_bullet_init(this);
    Object.assign(this, { element: 6, f: 1, destroyable: 0, angle_speed: 0, destroypoints: 1, dir: 0 });
    const s = sneo();
    if (s) this.damage = global.monsterat[s.myself] * 5;
    const c = ctrl();
    if (c) this.target = c.target;
    this.grazepoints = 2;
    this.newtype = 0;
    this.timer = 0;
  }
  step() {
    this.image_angle = this.dir;
    this.f += 1.4;
    this.x += lengthdir_x(this.f, this.dir);
    this.y += lengthdir_y(this.f, this.dir);
    if (global.turntimer < 1) instance_destroy(this);
  }
}
defineObject('obj_sneo_heatattack_bullet', HeatAttackBullet);

class HeartAttackIntro extends Instance {
  create() {
    const s = sneo();
    this.con = 0;
    this.timer = 0;
    this.chestoriginx = s ? s.partx[4] : 0;
    this.chestoriginy = s ? s.party[4] : 0;
  }
  step() {
    const s = sneo();
    this.timer += 1;
    if (!s) return;
    if (this.con === 0 && this.timer === 40) {
      destroyAll('obj_sneo_heartattack_chest_shake');
      s.partsprite[4] = 'spr_sneo_body_chest_breaks';
      s.partx[4] = this.chestoriginx;
      s.party[4] = this.chestoriginy;
      instance_create(s.x + 40, s.y + 80, 'obj_sneo_heartattack');
      [135, 170, 205, 240].forEach((dir, k) => {
        const shard = instance_create(s.x + 40, s.y + 80, 'obj_sneo_heartattack_glass_shard');
        if (k > 0) shard.image_index = k;
        shard.direction = dir;
      });
    }
    if (this.con === 1) {
      if (this.timer === 0) {
        for (const o of instancesOf('obj_sneo_heartattack_glass_shard')) {
          o.speed = 6;
          o.direction += 180;
          o.friction = 0;
          o.image_alpha = 0;
          o.con = 1;
          o.timer = 0;
        }
        for (const o of each('obj_sneo_sine_hand')) o.con = 1;
        destroyAll('obj_sneo_sine_hand_controller');
      }
      if (this.timer === 60) {
        s.partsprite[4] = 'spr_sneo_body';
        s.partsprite[5] = 'spr_sneo_head';
        instance_destroy(this);
      }
    }
  }
}
defineObject('obj_sneo_heartattack_intro', HeartAttackIntro);

class GlassShard extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_body_chest_breaks_piece';
  }
  create() {
    this.con = 0;
    this.timer = 1;
    this.speed = 6;
    this.friction = 0.2;
    this.image_speed = 0;
    this.image_xscale = 2;
    this.image_angle = random(360);
    this.imagE_yscale = 2; // sic: image_yscale stays 1
  }
  step() {
    if (this.con === 0) {
      this.timer += 1;
      this.image_angle += 10 / this.timer;
      this.image_alpha -= 0.04;
    }
    if (this.con === 1) {
      this.timer += 1;
      this.image_angle -= 10 / this.timer;
      this.image_alpha += 0.04;
      if (this.x > this.xstart) instance_destroy(this);
    }
  }
}
defineObject('obj_sneo_heartattack_glass_shard', GlassShard);

class ChestShake extends Instance {
  create() {
    const s = sneo();
    this.chestoriginx = s ? s.partx[4] : 0;
    this.chestoriginy = s ? s.party[4] : 0;
  }
  step() {
    const s = sneo();
    if (!s) return;
    s.partsprite[5] = 'spr_sneo_head_heartattack';
    s.partx[4] = this.chestoriginx - 3 + random(6);
    s.party[4] = this.chestoriginy - 3 + random(6);
  }
}
defineObject('obj_sneo_heartattack_chest_shake', ChestShake);

class HeartDefeatedFx extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_neo_heart_defeated_fx';
  }
  create() {
    this.con = 0;
    this.timer = 0;
    this.speed = 6;
    this.friction = 0.5;
    this.image_angle = random(360);
    this.image_xscale = 0.7;
    this.image_yscale = 0.7;
  }
  step() {
    this.timer += 1;
    this.image_alpha -= 0.05;
    this.image_angle += (40 - this.timer) / 10;
    if (this.speed < 0) this.speed = 0;
  }
}
defineObject('obj_sneo_heart_defeated_fx', HeartDefeatedFx);
