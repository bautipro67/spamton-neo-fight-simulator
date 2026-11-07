// NEO FINALE (rr 9, "NeoFinale", difficulty 0, dc.target = 3): obj_sneo_bulletcontroller type 9 and
// obj_finale_growtangle (the box bursts outward into a black backdrop), obj_sneo_warped_box (the box
// drawn as two triangles that get sucked toward the mouth; it clamps the SOUL), obj_sneo_final_forme
// (+ _hitbox, _mouth_back), obj_sneo_dollar (the money he inhales), obj_sneo_fakeheart (the SOUL
// swallowed and spat out), obj_wreckpausespew (the PLAY / PAUSE / REWIND sign), obj_sneo_lastattack
// (+ _hitbox) and obj_sneo_bigshot (his own BIG SHOTs), obj_rouxls_power_up_orb, obj_fadein,
// obj_sneo_smoke. Ported but unreachable in the game (the final forme never enters state 4):
// obj_sneo_final_orb, obj_sneo_finale_bullet; obj_basicbullet_sneo_finale is the final forme's parent.
// Also: obj_spamton_neo_enemy Other_12 (user2: the finale's damage, a share of each hero's current
// HP through scr_damage_sneo_final_attack), obj_yheart_shot Other_12 and its Step's "sucked" branch
// (nothing calls Other_12 in Chapter 2), and the enemy's stoprumblesfx countdown (a STEP_HOOK).
import {
  global, G, S, Instance, defineObject, instance_create, instance_destroy, instancesOf, withObj,
  random, random_range, irandom, lerp, clamp, merge_color, point_direction, point_distance,
  lengthdir_x, lengthdir_y, draw_self, draw_sprite, draw_sprite_ext, draw_triangle, draw_circle,
  draw_set_colour, draw_get_color, draw_set_alpha, draw_get_alpha,
  snd_play, snd_loop, snd_stop, snd_volume, snd_pitch, bgr,
} from '../rt.js?v=20261107140756';
import {
  first, camerax, cameray, i_ex, eq, ge, defineShared, scr_bullet_init, scr_movetowards, scr_inverselerp,
  scr_ease_in, lerp_ease_in, scr_remapvalue, move_towards_point, snd_play_x, draw_sprite_ext_centerscale,
  room_width, room_height,
} from '../common.js?v=20261107140756';
import { BulletParent, CollideBullet, RegularBullet } from '../bullets.js?v=20261107140756';
import { BasicBulletSneo, YHeartShot } from '../shots.js?v=20261107140756';
import { SneoBulletController } from './heads.js?v=20261107140756';
import { SpamtonNeoEnemy, STEP_HOOKS } from '../enemy.js?v=20261107140756';

const sneo = () => first('obj_spamton_neo_enemy');
const heart = () => first('obj_heart');
const box = () => first('obj_growtangle');
const forme = () => first('obj_sneo_final_forme');
const lastattack = () => first('obj_sneo_lastattack');
const controller = () => first('obj_sneo_bulletcontroller');
const WHITE = 0xffffff, YELLOW = bgr(65535), BLUE = bgr(15245824), CYAN = bgr(16776960);
const PI = 3.141592653589793;

// d = instance_exists(obj_shake) ? obj_shake : instance_create(0, 0, obj_shake); d.shakex = d.shakey = n
function shake(n) {
  if (!i_ex('obj_shake')) instance_create(0, 0, 'obj_shake');
  withObj('obj_shake', d => { d.shakex = Math.ceil(n); d.shakey = Math.ceil(n); });
}
function scr_orbitx(cx, cy, px, py, ang) {
  if (ang === 0) return px;
  return cx + lengthdir_x(point_distance(cx, cy, px, py), point_direction(cx, cy, px, py) + ang);
}
function scr_orbity(cx, cy, px, py, ang) {
  if (ang === 0) return py;
  return cy + lengthdir_y(point_distance(cx, cy, px, py), point_direction(cx, cy, px, py) + ang);
}
const enemyUser2 = () => withObj('obj_spamton_neo_enemy', e => e.user2());

// ---------------------------------------------------------------- the controller (type 9)

SneoBulletController.prototype.type9 = function () {
  const gt = box();
  if (this.init === 1) {
    global.turntimer = 1200;
    if (gt) instance_create(gt.x, gt.y, 'obj_finale_growtangle');
    this.init = 2;
    this.special = 1;
    this.btimer = 0;
    this.sneodollarcount = 0; // (Create)
    withObj('obj_sneo_hitdetector', h => { h.active = false; });
  }
  if (this.special === 1 && this.btimer === 45) {
    this.special = 2;
    instance_create(gt.x, gt.y, 'obj_sneo_warped_box');
    const d = instance_create(camerax() + 680, this.sneo ? this.sneo.y : cameray() + 40, 'obj_sneo_final_forme');
    d.intro = -1;
    d.damage = this.damage;
    d.target = this.target;
    d.speed = 16.75;
    d.direction = 180;
    d.friction = 0.5;
    this.btimer = 0;
  }
  if (this.special === 2 && this.btimer === 70) {
    withObj('obj_sneo_warped_box', b => { b.state = 1; });
    withObj('obj_sneo_final_forme_hitbox', b => { b.destroyable = 1; });
    withObj('obj_sneo_final_forme', f => { f.destroyable = 1; f.image_index += 1; });
    this.special = 3;
  }
  if (this.special === 3 && this.btimer >= 10) {
    // dollar waves: [y offset range, y base, startscale] per sneodollarcount 0..6
    const WAVES = [[100, 100, 1], [100, 200, 1], [200, 100, 1.5], [100, 100, 1], [100, 200, 1], [200, 100, 1.5], [200, 100, 2]];
    const [ry, by, sc] = WAVES[this.sneodollarcount] ?? WAVES[0];
    const xx = this.minx - random(30) - 40;
    const yy = gt.y - random(ry) + by;
    const d = instance_create(xx, yy, 'obj_sneo_dollar');
    d.startscale = sc;
    this.sneodollarcount = (this.sneodollarcount + 1) % 7;
    this.btimer = 3;
    d.speed = 0.1;
  }
};

// ---------------------------------------------------------------- obj_finale_growtangle

class FinaleGrowtangle extends BulletParent {
  constructor() { super(); this.sprite_index = 'spr_battlebg_0'; }
  create() {
    const gt = box();
    this.image_xscale = 0;
    this.image_yscale = 0;
    this.image_alpha = 0.3;
    this.maxtimer = 15;
    this.timeincrease = 1;
    this.timer = this.maxtimer - this.timeincrease;
    this.growcon = 1;
    this.image_speed = 0;
    this.image_blend = merge_color(0x008000, 0x00ff00, 0.5);
    this.target_angle = 0;
    this.fullgrow = 0;
    this.keep = 0;
    this.megakeep = 0;
    this.maxxscale = gt ? gt.maxxscale : 2;
    this.maxyscale = gt ? gt.maxyscale : 2;
    if (gt) {
      this.sprite_index = gt.spr_custom_box;
      gt.depth -= 2;
      this.depth = gt.depth + 1;
    }
  }
  step() {
    this.growth = 0;
    if (this.timer < this.maxtimer * 5 && this.growcon === 1) this.growth = 1;
    if (this.timer > 0 && this.growcon === 3) this.growth = 1;
    if (this.growth !== 1) return;
    if (this.growcon === 1) this.timer += this.timeincrease;
    this.timeincrease += 0.025;
    if (this.growcon === 3) this.timer -= 1;
    const t = this.timer / this.maxtimer;
    this.image_xscale = this.maxxscale * t;
    this.image_yscale = this.maxyscale * t;
    this.image_angle = 180 + 180 * t + this.target_angle;
    this.image_alpha = Math.min(1, 0.5 + t * 0.5);
    const d = instance_create(this.x, this.y, 'obj_afterimage');
    d.sprite_index = this.sprite_index;
    d.image_xscale = this.image_xscale / (this.maxxscale / 2);
    d.image_yscale = this.image_yscale / (this.maxyscale / 2);
    d.image_angle = this.image_angle;
    d.depth = this.depth - 3;
    if (this.growcon === 1 && eq(this.timer, this.maxtimer)) {
      d.image_xscale = this.image_xscale;
      d.image_yscale = this.image_yscale;
      d.sprite_index = box()?.sprite_index ?? this.sprite_index;
      d.image_blend = WHITE;
      d.depth -= 1;
      d.image_alpha = 1;
    } else {
      d.image_blend = this.image_blend;
      d.image_alpha = (1 - this.timer / (this.maxtimer * 5)) * 0.5 + 0.1;
    }
    d.image_speed = 0;
    if (this.timer >= this.maxtimer * 5 && this.growcon === 1) {
      this.growcon = 2;
      this.image_angle = this.target_angle;
    }
    if (this.growcon === 3 && this.timer <= this.maxtimer) {
      global.turntimer = 0;
      instance_destroy(this);
    }
  }
  draw() {
    draw_sprite_ext('spr_battlebg_stretch', 1, this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    draw_sprite_ext(this.sprite_index, 0, this.x, this.y, this.image_xscale / (this.maxxscale / 2), this.image_yscale / (this.maxyscale / 2), this.image_angle, this.image_blend, this.image_alpha);
  }
}
defineObject('obj_finale_growtangle', FinaleGrowtangle);

// ---------------------------------------------------------------- obj_sneo_warped_box

class SneoWarpedBox extends BulletParent {
  constructor() { super(); this.sprite_index = 'spr_battlebg_0'; }
  create() {
    const gt = box();
    this.depth = gt.depth;
    gt.image_alpha = 0;
    this.minx = gt.x - gt.sprite_width / 2;
    this.maxx = gt.x + gt.sprite_width / 2;
    this.miny = gt.y - gt.sprite_height / 2;
    this.maxy = gt.y + gt.sprite_height / 2;
    this.suckx = gt.x + 100;
    this.upper_sucky = gt.y - 40;
    this.lower_sucky = gt.y + 40;
    this.suckpower = 0;
    this.timer = 0;
    this.snapback = 0;
    this.target = 0;
    this.state = 0;
    this.inhale = 0;
    this.inhalespeed = 0;
    // obj_battlesolid.image_xscale = 3: every solid, the growtangle included (its walls move out of the way).
    withObj('obj_battlesolid', b => { b.image_xscale = 3; b.image_yscale = 3; });
    this.intro = 0;
    this.stopthesucc = 0;
  }
  onDestroy() {
    const gt = box();
    if (gt) { gt.image_alpha = 1; gt.keep = 1; }
    withObj('obj_battlesolid', b => { b.image_xscale = 2; b.image_yscale = 2; });
  }
  endStep() {
    const h = heart();
    if (!h) return;
    if (this.state === 0) {
      if (h.x < this.minx + 3) h.x = this.minx + 3;
      if (h.y < this.miny + 3) h.y = this.miny + 3;
      if (h.y > this.maxy - 20) h.y = this.maxy - 20;
      if (h.x > this.maxx - 20) h.x = this.maxx - 20;
      return;
    }
    const rborder = lerp(this.maxx, this.suckx, this.suckpower), uborder = this.miny, dborder = this.maxy;
    if (this.snapback === 0 && this.stopthesucc === 0) h.x += this.suckpower;
    if (this.snapback <= 0 && global.turntimer <= 30 && h.x >= rborder - 22) {
      this.snapback = this.suckpower;
      if (this.suckpower > 0.5 && !i_ex('obj_shake')) {
        const d = instance_create(0, 0, 'obj_shake');
        d.shakex = Math.ceil(this.suckpower * 4);
        d.shakey = Math.ceil(this.suckpower * 4);
      }
    }
    if (this.snapback > 0) {
      h.x -= 20 * scr_ease_in(this.snapback, 2);
      this.snapback -= 0.1;
    }
    if (h.x < this.minx + 3) h.x = this.minx + 3;
    if (h.x > rborder - 20) h.x = rborder - 20;
    const xoffset = (h.x - (this.minx + 3)) / (rborder - 20 - (this.minx + 3));
    const uppersuckoffset = (this.upper_sucky - this.miny) * xoffset * this.suckpower;
    const lowersuckoffset = (this.maxy - this.lower_sucky) * xoffset * this.suckpower;
    if (h.y < uborder + 3 + uppersuckoffset) h.y = uborder + 3 + uppersuckoffset;
    if (h.y > dborder - 20 - lowersuckoffset) h.y = dborder - 20 - lowersuckoffset;
    if (h.y < uborder + 3) h.y = uborder + 3;
    if (h.y > dborder - 20) h.y = dborder - 20;
  }
  draw() {
    const colo = draw_get_color();
    if (this.inhalespeed > 0 && this.inhale < 1) this.inhale = clamp(this.inhale + this.inhalespeed, 0, 1);
    const sp = this.suckpower, ux = this.upper_sucky, lx = this.lower_sucky;
    const rx = lerp(this.maxx, this.suckx, sp);
    const _minx = lerp(this.minx, rx - 8, this.inhale);
    const _maxy = lerp(this.maxy, lerp(this.maxy, lx, sp) + 8, this.inhale);
    const _miny = lerp(this.miny, lerp(this.miny, ux, sp) - 8, this.inhale);
    draw_set_colour(0x00c000);
    draw_set_alpha(this.image_alpha);
    draw_triangle(_minx, _miny, rx, lerp(_miny, ux, sp), rx, lerp(_maxy, lx, sp), false);
    draw_triangle(_minx, _miny, _minx, _maxy, rx, lerp(_maxy, lx, sp), false);
    draw_set_colour(0);
    const rx4 = lerp(this.maxx - 4, this.suckx - 4, sp);
    draw_triangle(_minx + 4, _miny + 4, rx4, lerp(_miny + 4, ux + 3, sp), rx4, lerp(_maxy - 4, lx - 3, sp), false);
    draw_triangle(_minx + 4, _miny + 4, _minx + 4, _maxy - 4, rx4, lerp(_maxy - 4, lx - 3, sp), false);
    draw_set_colour(colo);
    draw_set_alpha(1);
    if (this.state === 1) {
      if (this.timer >= 60) this.timer -= 1;
      if (this.timer >= 59) this.suckpower = this.timer / 60;
      else this.suckpower = scr_ease_in(this.timer / 60, 3);
    } else if (this.state === 2) {
      if (this.timer > 30) this.timer = 30;
      if (this.snapback === 0) this.snapback = -1;
      if (this.timer > 0) this.timer -= 1;
      this.suckpower = scr_ease_in(this.timer / 30, -2);
    }
  }
}
defineObject('obj_sneo_warped_box', SneoWarpedBox);

// ---------------------------------------------------------------- obj_basicbullet_sneo_finale

class BasicBulletSneoFinale extends BasicBulletSneo {
  constructor() { super(); this.sprite_index = 'spr_sneo_bullet0'; }
  create() {
    scr_bullet_init(this);
    this.element = 6;
    this.f = 2;
    this.destroyable = 0;
    this.angle_speed = 0;
    this.destroypoints = 1;
    const s = sneo();
    if (s) this.damage = global.monsterat[s.myself] * 5;
    const bc = controller();
    if (bc) this.target = bc.target;
    this.grazepoints = 4;
  }
  step() {
    if (this.x >= room_width + 100 || this.x <= -100 || this.y >= room_height + 100 || this.y <= -100) { instance_destroy(this); return; }
    this.direction += this.angle_speed;
    this.image_angle = this.direction;
  }
  user5() {
    if (this.active == 1) {
      if (this.target !== 3) (S.scr_damage_proportional || S.scr_damage)(this); // scr_damage_proportional is not ported
      if (this.target === 3) S.scr_damage_all(this);
      if (this.destroyonhit == 1) instance_destroy(this);
    }
  }
}
defineObject('obj_basicbullet_sneo_finale', BasicBulletSneoFinale);

// ---------------------------------------------------------------- obj_sneo_final_forme

const formeHurtable = f => (f.destroyable && f.state === 0) || (f.state === 1 && f.formtimer < 30);

class SneoFinalForme extends BasicBulletSneoFinale {
  constructor() { super(); this.sprite_index = 'spr_sneo_final_forme'; }
  create() {
    super.create();
    this.element = 6;
    const s = sneo();
    if (s) this.damage = Math.floor(global.monsterat[s.myself] * 5 / 3);
    const bc = controller();
    if (bc) this.target = bc.target;
    Object.assign(this, {
      grazepoints: 4, steptimer: 0, stepping: true, pushback: 0, advancespeed: 3, image_speed: 0, mouthopen: false,
      destroyonhit: 0, introtimer: 0, intro: 0, mouthx: 90, mouthy: 142,
    });
    instance_create(this.x, this.y, 'obj_sneo_final_forme_hitbox');
    Object.assign(this, {
      state: 0, formtimer: 0, stepdir: -1, made: 0, fakeheart: null, fakeheart_speed: 0, effecttimer: 0, lerptimer: 0,
      inhalesfx: 0, hurtalpha: 0, bullet_suck_x1: 20, bullet_suck_x2: 130, bullet_suck_y1: 100, bullet_suck_y2: 190,
      movetimer: 0, moveframes: 12, movecon: 0, timer2: 0, timer3: 0, headoffset_x: 0, headoffset_y: 0, dmgcon: 0,
      pitchtimer: -1,
    });
    this.back = instance_create(this.x, this.y, 'obj_sneo_final_forme_mouth_back');
    this.back.depth = this.depth + 1;
    const h = heart();
    if (h) this.back.depth = h.depth + 1;
    this.hidemouthback = 0;
    this.playback_sprite = 'spr_sneo_playback';
  }
  onDestroy() {
    withObj('obj_sneo_hitdetector', h => { h.active = true; });
    withObj('obj_sneo_final_forme_mouth_back', m => instance_destroy(m));
    if (this.inhalesfx === 1) snd_stop('snd_sneo_overpower'); // (the sim's turn end can cut the inhale short)
  }
  collision_obj_yheart_shot(shot) {
    shot.user0();
    this.hurtalpha = 1;
    if (!formeHurtable(this)) return;
    snd_play('snd_damage');
    this.hurtalpha = 1;
    if (this.destroyable == 1) {
      if (shot.big == 0) {
        this.x += 6;
        this.formtimer += 4;
      } else {
        this.pushback = 10;
        this.formtimer += 10;
      }
    }
  }
  // Other_15: touching it is the finale's damage.
  user5() {
    if (this.active == 1) {
      enemyUser2();
      if (this.destroyonhit == 1) instance_destroy(this);
    }
  }
  step() {
    if (!i_ex('obj_sneo_final_forme_hitbox')) instance_create(this.x, this.y, 'obj_sneo_final_forme_hitbox');
    if (this.intro === 1) return;
    // snd_pitch_time(snd_sneo_overpower, 1, 90): the inhale's pitch slides from 0.1 to 1.
    if (this.pitchtimer >= 0 && this.pitchtimer < 90) {
      this.pitchtimer += 1;
      snd_pitch('snd_sneo_overpower', lerp(0.1, 1, this.pitchtimer / 90));
    }
    this.formtimer += 1;
    if (this.grazed == 1) {
      this.grazetimer += 1;
      if (this.grazetimer >= 30) { this.grazetimer = 0; this.grazed = 0; }
    }
    const gt = box(), h = heart(), bc = controller();
    if (this.state < 2) {
      if (this.state === 0) this.stepdir = -1;
      if (this.state === 0 && this.formtimer >= 25) this.steptimer += 0.05;
      if (ge(this.steptimer, PI)) {
        this.steptimer -= PI;
        shake(2);
        snd_play('snd_screenshake');
        if (this.state === 1) this.stepdir = 1;
      }
      if (!(this.state === 11 && this.formtimer >= 65)) this.y = this.ystart - Math.sin(this.steptimer) * 40;
      if (!(this.state === 0 && this.formtimer < 25)) this.x += 1.6 * this.stepdir;
      if ((this.destroyable && this.state === 0 && this.x > gt.x + 140) || (this.state === 1 && this.formtimer < 30 && this.x > gt.x + 140)) {
        this.x += 4 * this.stepdir;
        this.pushback = 0;
      }
      if (this.destroyable) {
        withObj('obj_sneo_warped_box', b => {
          b.suckx = Math.min(gt.x + 150, this.x + 106);
          b.timer = scr_movetowards(b.timer, clamp(scr_inverselerp(520, gt.x + 100, this.x), 0, 1) * 60, 2);
          b.upper_sucky = this.y + 129;
          b.lower_sucky = this.y + 159;
        });
      }
      if (this.pushback > 0) {
        this.x += this.pushback * 0.6666666666666666;
        this.pushback -= 1;
      }
      if (formeHurtable(this)) {
        if (this.inhalesfx === 0) {
          this.inhalesfx = 1;
          snd_loop('snd_sneo_overpower');
          snd_pitch('snd_sneo_overpower', 0.1);
          this.pitchtimer = 0;
          snd_volume('snd_sneo_overpower', 0.75, 0);
          const wreck = instance_create(this.x, this.y, 'obj_wreckpausespew');
          wreck.depth = this.depth - 1;
        }
        this.effecttimer += 1;
        if (this.effecttimer % 6 === 0) {
          for (let i = 0; i < 3; i++) {
            const d = instance_create(this.x + this.mouthx, this.y + this.mouthy, 'obj_rouxls_power_up_orb');
            d.direction = irandom(40) + i * 40 + 120;
            d.lifetime = 12;
            d.depth = this.depth + 1;
            d.image_blend = this.image_blend;
          }
        }
      }
      if ((this.state === 0 && this.x < gt.x - gt.sprite_width / 2.5) || (this.state === 0 && h && h.x > this.x + 70)) {
        this.state = 10;
        this.formtimer = 0;
        if (bc) bc.special += 1;
        this.fakeheart = instance_create(h ? h.x : this.x, h ? h.y : this.y, 'obj_sneo_fakeheart');
      } else if (this.state === 0 && this.formtimer >= 320) {
        if (bc) bc.special += 1;
        this.state += 1;
        this.formtimer = 45;
      } else if (this.state === 1 && this.formtimer >= 45) {
        withObj('obj_wreckpausespew', w => { w.image_index = 1; });
        withObj('obj_sneo_dollar', d => { d.fade = 1; });
        this.state += 1;
        this.formtimer = 45;
        if (this.x > gt.x + 70) withObj('obj_sneo_warped_box', b => { b.state = 2; });
        this.image_index = 4;
        this.image_angle = 1;
        snd_stop('snd_sneo_overpower');
        this.pitchtimer = -1;
        withObj('obj_sneo_warped_box', b => { b.stopthesucc = 1; });
      }
    } else if (this.state === 2 && this.formtimer >= 45) {
      this.state += 1;
      this.image_index = 5;
      this.formtimer = 0;
      this.steptimer = PI - this.steptimer;
      withObj('obj_sneo_final_forme_hitbox', b => { b.destroyable = false; });
      global.turntimer = 360;
    } else if (this.state === 3) {
      if (this.movecon === 0) {
        this.movetimer += 1 / this.moveframes;
        this.image_angle = lerp_ease_in(this.image_angle, 25, this.movetimer, 2);
        if (eq(this.movetimer, 1)) {
          this.movetimer = 0;
          this.movecon = 1;
        }
      }
      if (this.movecon === 2) {
        this.timer3 += 1;
        if (this.timer3 > 20) {
          this.movetimer += 1 / this.moveframes;
          this.image_angle = lerp_ease_in(this.image_angle, -1, this.movetimer, 2);
          this.headoffset_x = lerp(0, -12, this.movetimer);
          this.headoffset_y = lerp(0, 2, this.movetimer);
        }
      }
      if (this.timer2 < 100) this.timer2 += 1;
      this.x = lerp(this.x, camerax() + 439, this.timer2 / 100);
      if (this.x > gt.x + 70) withObj('obj_sneo_warped_box', b => { b.state = 2; });
      else {
        withObj('obj_sneo_warped_box', b => {
          b.suckx = Math.min(gt.x + 150, this.x + 106);
          b.timer = clamp(scr_inverselerp(camerax() + 520, gt.x + 100, this.x), 0, 1) * 60;
          b.upper_sucky = this.y + 129;
          b.lower_sucky = this.y + 159;
        });
      }
      if (this.x > camerax() + 438) {
        this.x = camerax() + 438;
        this.movecon = 2;
        if (this.movecon === 2 && eq(this.movetimer, 1)) {
          instance_destroy(this);
          const aa = instance_create(this.x, this.ystart - Math.abs(Math.sin(this.steptimer + 0.15) * 40), 'obj_sneo_lastattack');
          const g2 = box();
          if (g2) {
            aa.yspot[0] = g2.y - g2.sprite_height / 2 - aa.y_offset + 40;
            aa.yspot[1] = g2.y + g2.sprite_height / 2 - aa.y_offset - 40;
          }
          global.turntimer = 300;
          return;
        }
      }
    } else if (this.state === 4 && this.formtimer >= 25) {
      // Never reached (nothing sets state 4).
      this.formtimer = 0;
      this.state = 5;
      instance_create(this.x + this.mouthx, this.y + this.mouthy, 'obj_sneo_final_orb');
      this.image_index = 5;
    } else if (this.state === 10) {
      this.fakeheart_speed = scr_movetowards(this.fakeheart_speed, 10, 1);
      const fh = this.fakeheart;
      if (fh && fh.alive) {
        let tx = this.x + this.mouthx + 5;
        if (fh.x > tx - 10) tx += 20;
        move_towards_point(fh, tx, this.y + this.mouthy, this.fakeheart_speed);
      }
      withObj('obj_sneo_warped_box', b => { b.inhalespeed += 0.01; });
      if (this.x > this.x + this.mouthx + 10) {
        this.image_index = 4;
        snd_stop('snd_sneo_overpower');
      }
      if (this.formtimer > 45) {
        if (fh) { fh.speed = 0; fh.direction = 0; }
        this.state = 11;
        this.formtimer = 0;
        this.image_index = 4;
        this.hidemouthback = 1;
        snd_stop('snd_sneo_overpower');
        this.pitchtimer = -1;
        withObj('obj_sneo_warped_box', b => { b.image_alpha = 0; b.timer = 0; });
        if (fh) fh.state = 1;
        withObj('obj_sneo_dollar', d => { d.fade = 1; });
      }
    } else if (this.state === 11) {
      if (this.formtimer < 15) return;
      if (this.x < camerax() + 438) this.x += 4;
      if (this.x > camerax() + 438 && this.formtimer < 65) this.formtimer = 65;
      if (this.formtimer % 5 === 0 && this.formtimer >= 30 && this.formtimer <= 65) {
        const hurt = snd_play('snd_hurt1');
        snd_pitch(hurt, random_range(1.4, 2));
        shake(1);
        if (this.dmgcon === 0) {
          this.dmgcon = 1;
          global.inv = -1;
          enemyUser2();
        }
      }
      if (this.formtimer === 50 && gt) {
        gt.timer = 0;
        gt.growcon = 1;
        gt.image_alpha = 1;
      }
      if (this.formtimer === 65) {
        withObj('obj_sneo_warped_box', b => { b.inhale = 0; b.inhalespeed = 0; b.image_alpha = 1; });
        if (gt) gt.image_alpha = 0;
      }
      if (this.x > camerax() + 438) {
        if (this.formtimer < 50 && gt) {
          gt.timer = 0;
          gt.growcon = 1;
          gt.image_alpha = 1;
        }
        this.formtimer = 0;
        this.state = 12;
        const fh = this.fakeheart;
        if (fh) {
          fh.x = this.x + this.mouthx;
          fh.y = this.y + this.mouthy;
          fh.state = 2;
        }
        this.image_index = 5;
      }
    } else if (this.state === 12) {
      withObj('obj_wreckpausespew', w => { w.image_index = 1; });
      if (this.movetimer < 1 && !eq(this.movetimer, 1)) {
        this.movetimer += 1 / this.moveframes;
        this.headoffset_x = lerp(0, -12, this.movetimer);
        this.headoffset_y = lerp(0, 2, this.movetimer);
      }
      if (this.formtimer >= 30 && ge(this.movetimer, 1)) {
        this.state = 2;
        this.formtimer = 0;
        this.image_index = 4;
        instance_destroy(this);
        instance_create(this.x, this.ystart - Math.abs(Math.sin(this.steptimer + 0.15) * 40), 'obj_sneo_lastattack');
        return;
      }
    }
    if (this.state >= 11) {
      this.steptimer += 0.05;
      if (ge(this.steptimer, PI)) {
        this.steptimer -= PI;
        shake(2);
        snd_play('snd_screenshake');
      }
      this.y = this.ystart - Math.sin(this.steptimer) * 40;
    }
  }
  draw() {
    if (eq(this.image_index, 5) && this.hidemouthback === 0) {
      withObj('obj_sneo_final_forme_mouth_back', m => {
        m.image_index = 7;
        m.x = this.x + this.headoffset_x;
        m.y = this.y + this.headoffset_y;
        m.visible = true;
      });
    } else withObj('obj_sneo_final_forme_mouth_back', m => { m.visible = false; });
    const bob = this.steptimer + (this.state < 2 ? 0.15 : 0.05);
    draw_sprite_ext(this.sprite_index, 3, this.x, this.ystart - Math.abs(Math.sin(bob) * 40), 1, 1, 0, this.image_blend, 1);
    if (this.image_angle !== 0) {
      draw_sprite_ext('spr_sneo_final_forme_head_rotate_origin', this.image_index, this.x + 138 + this.headoffset_x, this.y + 135 + this.headoffset_y, this.image_xscale, this.image_yscale, this.image_angle, WHITE, 1);
    } else if ((this.state >= 2 && this.state < 10) || (this.state === 11 && this.formtimer >= 30 && this.formtimer <= 70)) {
      const sh = this.state === 3 ? 2 : 1;
      draw_sprite(this.sprite_index, this.image_index, this.x + random_range(-sh, sh), this.ystart - Math.abs(Math.sin(bob) * 40 + random_range(-sh, sh)));
    } else {
      draw_sprite_ext(this.sprite_index, this.image_index, this.x + this.headoffset_x, this.y + this.headoffset_y, this.image_xscale, this.image_yscale, this.image_angle, this.image_blend, this.image_alpha);
    }
    if (formeHurtable(this)) {
      if (this.hurtalpha > 0) this.hurtalpha -= 0.1;
      draw_sprite_ext(this.sprite_index, this.image_index, this.x, this.y, 1, 1, 0, YELLOW, this.hurtalpha);
    }
    if (this.intro !== 0) {
      this.image_index = 4;
      this.introtimer += 1;
      this.image_blend = merge_color(0, WHITE, clamp((this.introtimer / 30 - 0.5) / 1.5, 0, 1));
      draw_sprite_ext(this.sprite_index, 2, this.x, this.y, 1, 1, 0, this.intro === 1 ? merge_color(0, WHITE, clamp(this.introtimer / 30, 0, 1)) : WHITE, 1);
      if (this.introtimer >= 68) {
        this.intro = 0;
        this.image_index = 4;
        this.image_alpha = 1;
        this.image_blend = WHITE;
      }
    }
  }
}
defineObject('obj_sneo_final_forme', SneoFinalForme);

// The shootable part (the mouth). Shots push the final forme back while it inhales.
class SneoFinalFormeHitbox extends BasicBulletSneo {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_final_forme_hitbox';
    this.visible = false;
  }
  create() {
    super.create();
    this.destroyonhit = false;
    this.parent = forme();
  }
  endStep() {
    const p = forme();
    if (p) {
      this.parent = p;
      this.x = p.x;
      this.y = p.y;
    }
    if (i_ex('obj_sneo_lastattack')) instance_destroy(this);
  }
  collision_obj_yheart_shot(shot) {
    shot.user0();
    const f = forme();
    if (f && !formeHurtable(f)) return;
    snd_play('snd_damage');
    if (f) {
      f.hurtalpha = 1;
      if (this.destroyable == 1 && this.parent) {
        if (shot.big == 0) {
          this.parent.x += 7;
          this.parent.formtimer += 5;
        } else {
          this.parent.pushback = 13;
          this.parent.formtimer += 13;
        }
      }
    }
  }
}
defineObject('obj_sneo_final_forme_hitbox', SneoFinalFormeHitbox);

class SneoFinalFormeMouthBack extends Instance {
  constructor() { super(); this.sprite_index = 'spr_sneo_final_forme'; }
  create() {
    this.image_index = 7;
    this.image_speed = 0; // (the frame is set every draw anyway; this keeps it from advancing in between)
  }
  endStep() {
    const f = forme();
    if (f) {
      this.x = f.x + f.headoffset_x;
      this.y = f.y + f.headoffset_y;
    }
  }
}
defineObject('obj_sneo_final_forme_mouth_back', SneoFinalFormeMouthBack);

// ---------------------------------------------------------------- obj_sneo_dollar

class SneoDollar extends RegularBullet {
  constructor() { super(); this.sprite_index = 'spr_spamton_dollar'; }
  create() {
    super.create();
    this.element = 6;
    this.image_alpha = 0;
    this.startscale = 1;
    this.destroyable = 0;
    const s = sneo();
    if (s) this.damage = Math.floor(global.monsterat[s.myself] * 5 / 3);
    const bc = controller();
    if (bc) this.target = bc.target;
    this.grazepoints = 4;
    this.fade = 0;
  }
  step() {
    if (this.fade === 1) {
      this.image_alpha -= 0.1;
      this.speed = 0;
      if (this.image_alpha <= 0) { instance_destroy(this); return; }
    }
    super.step();
    if (!this.alive) return;
    const f = forme();
    if (!f) return;
    const mx = f.x + f.mouthx, my = f.y + f.mouthy;
    if (this.x > mx - 50) this.y += clamp(my - this.y, -5, 5);
    if (this.x < mx - 10) {
      this.direction = point_direction(this.x, this.y, mx, my);
      this.friction = -0.1;
    }
    const sc = lerp(this.startscale, 1, clamp(scr_inverselerp(mx - 200, mx - 50, this.x), 0, 1));
    this.image_xscale = sc;
    this.image_yscale = sc;
    if (this.x > mx + 50) {
      instance_destroy(this);
      snd_play('snd_swallow');
    }
  }
  user5() {
    if (this.fade === 1) return;
    if (this.active == 1) {
      enemyUser2();
      if (this.destroyonhit == 1) instance_destroy(this);
    }
  }
  draw() {
    if (this.image_alpha < 1 && this.fade === 0) this.image_alpha += 0.1;
    draw_self(this);
  }
}
defineObject('obj_sneo_dollar', SneoDollar);

// ---------------------------------------------------------------- obj_sneo_fakeheart

class SneoFakeheart extends BulletParent {
  constructor() { super(); this.sprite_index = 'spr_yellowheart'; }
  create() {
    const h = heart();
    if (h) {
      this.depth = h.depth;
      h.image_alpha = 0;
      h.color = 0;
    }
    global.inv = 300;
    this.state = 0;
    this.heartspeed = 14;
    this.startangle = 0;
  }
  onDestroy() {
    if (global.turntimer <= 0) global.inv = -1;
    const h = heart();
    if (h) {
      h.image_alpha = 1;
      h.x = this.x;
      h.y = this.y;
      h.color = 1;
    }
  }
  endStep() {
    const h = heart();
    if (this.state === 0) this.image_angle -= this.speed * 2;
    else if (this.state === 1) {
      this.image_alpha = 0;
      this.image_angle = 0;
      this.x = (box()?.x ?? this.x) + 400;
      this.speed = 0;
      this.direction = 0;
    } else if (this.state === 2) {
      this.image_angle += 60;
      this.image_alpha = 1;
      this.x -= 20;
      const gt = box();
      const _minx = gt ? gt.x - gt.sprite_width / 2 + 4 : camerax() + 160;
      if (this.x <= _minx + 20) {
        this.x = _minx;
        if (h) { h.x = this.x; h.y = this.y; }
        this.state = 3;
        global.inv = -1;
        enemyUser2();
        const hero = first('obj_heroparent');
        withObj('obj_dmgwriter', d => {
          d.depth = this.depth - 2;
          if (hero) { d.x = hero.x; d.y = hero.y; }
        });
        if (h) h.color = 1;
        this.image_angle %= 360;
        if (this.image_angle < 180) this.image_angle += 360;
        this.startangle = this.image_angle;
        this.heartspeed = 8;
      }
    } else if (this.state === 3) {
      if (h) {
        h.x += this.heartspeed;
        this.x = h.x;
      }
      this.heartspeed -= 1.5;
      this.image_angle = scr_remapvalue(8, 0, this.heartspeed, this.startangle, 0);
      if (this.heartspeed <= 0) {
        if (h) { h.color = 1; h.image_alpha = 1; }
        instance_destroy(this);
      }
    }
  }
  draw() {
    const h = heart();
    const sub = h ? h.image_index : 0;
    const xx = scr_orbitx(this.x + 9, this.y + 9, this.x, this.y, this.image_angle);
    const yy = scr_orbity(this.x + 9, this.y + 9, this.x, this.y, this.image_angle);
    if (this.image_xscale !== 1 || this.image_yscale !== 1) {
      draw_sprite_ext_centerscale(this, this.sprite_index, sub, this.x, this.y, this.image_xscale, this.image_yscale, this.image_angle, WHITE, this.image_alpha);
    } else draw_sprite_ext(this.sprite_index, sub, xx, yy, this.image_xscale, this.image_yscale, this.image_angle, WHITE, this.image_alpha);
  }
}
defineObject('obj_sneo_fakeheart', SneoFakeheart);

// ---------------------------------------------------------------- obj_wreckpausespew

class WreckPauseSpew extends Instance {
  create() {
    this.playback_sprite = 'spr_sneo_playback';
    this.image_speed = 0;
  }
  // Sim safeguard: the GML turn cannot end while this is up; here an attack switch can.
  step() { if (!i_ex('obj_sneo_bulletcontroller')) instance_destroy(this); }
  draw() { draw_sprite(this.playback_sprite, this.image_index, camerax() + 20, cameray() + 400); }
}
defineObject('obj_wreckpausespew', WreckPauseSpew);

// ---------------------------------------------------------------- obj_rouxls_power_up_orb

class RouxlsPowerUpOrb extends Instance {
  constructor() { super(); this.sprite_index = 'spr_bullet_laser_circle'; }
  create() {
    Object.assign(this, {
      init: 0, image_alpha: 0, lifetime: 30, xx: this.x, yy: this.y, timer: 0, radius: 5, parenttarget: -1, thin: 0,
      _type: 0, track_target: null, xoff: 0, yoff: 0, max_radius: 6, distance_multiplier: 1,
    });
  }
  draw() {
    const pt = this.parenttarget;
    if (pt !== -1 && !(pt && pt.alive)) { instance_destroy(this); return; }
    if (pt !== -1) {
      this.xstart = pt.x;
      this.ystart = pt.y;
    }
    if (this.init === 0) {
      this.init = 1;
      if (this.thin) this.lifetime /= 2;
      if (this.track_target) { this.xstart = 0; this.ystart = 0; }
      let dist = random_range(70, 90) * this.distance_multiplier;
      if (this._type === 1) dist = random_range(40, 45);
      this.x = this.xx = this.xstart + lengthdir_x(dist, this.direction);
      this.y = this.yy = this.ystart + lengthdir_y(dist, this.direction);
    }
    if (this.track_target) {
      this.xoff = this.track_target.x;
      this.yoff = this.track_target.y;
    }
    this.timer += 1;
    if (this.timer > this.lifetime) { instance_destroy(this); return; }
    const p = this.timer / this.lifetime;
    this.image_alpha = 1;
    if (this.thin) {
      this.image_blend = WHITE;
      this.image_yscale = 0.25;
      this.image_angle = this.direction;
      draw_self(this);
      this.x = lerp(this.xx, this.xstart, scr_ease_in(p, 2)) + this.xoff;
      this.y = lerp(this.yy, this.ystart, scr_ease_in(p, 2)) + this.yoff;
    } else {
      const prevAlpha = draw_get_alpha();
      draw_set_colour(this.image_blend);
      draw_circle(this.x, this.y, this.radius - 2, false);
      draw_set_alpha(this.image_alpha);
      this.x = lerp(this.xx, this.xstart, scr_ease_in(p, 2)) + this.xoff;
      this.y = lerp(this.yy, this.ystart, scr_ease_in(p, 2)) + this.yoff;
      draw_circle(this.x, this.y, this.radius, false);
      if (this.radius - 3 > 0) {
        draw_set_colour(WHITE);
        draw_circle(this.x, this.y, this.radius - 2, false);
      }
      draw_set_alpha(prevAlpha);
      this.radius = lerp(this.max_radius, 1, p);
    }
  }
}
defineShared('obj_rouxls_power_up_orb', RouxlsPowerUpOrb);

// ---------------------------------------------------------------- obj_sneo_lastattack

class SneoLastAttack extends Instance {
  constructor() { super(); this.sprite_index = 'spr_sneo_lastattack_head'; }
  create() {
    const gt = box();
    this.x_offset = 66;
    this.y_offset = 135;
    this.skip_1st_part_hp = 12;
    this.skip_2nd_part_hp = 17;
    this.yspot = gt
      ? [gt.y - gt.sprite_height / 2 - this.y_offset, gt.y + gt.sprite_height / 2 - this.y_offset, this.y]
      : [this.y, this.y, this.y];
    Object.assign(this, {
      lastshoty: this.y, rand: 80, ycurrent: 1, con: 0, movetimer: 0, shottimer: 0, timer: 0, count: 0, mouthtopy: 0,
      mouthbottomy: 0, shotmouthopen: 0, shotmouthopentimer: 0, mouthangle: 0, init: 0, remx: this.x, hurtalpha: 0,
    });
    instance_create(this.x, this.y, 'obj_sneo_lastattack_hitbox');
    this.endattack = 0;
    withObj('obj_wreckpausespew', w => { w.image_index = 2; });
  }
  onDestroy() { withObj('obj_wreckpausespew', w => instance_destroy(w)); }
  step() {
    // Sim safeguard (see obj_wreckpausespew).
    if (!i_ex('obj_sneo_bulletcontroller')) { instance_destroy(this); return; }
    if (this.init === 0) {
      this.remx = this.x;
      this.movetimer += 1;
      this.init = 1;
    }
    if (this.con === 0) {
      this.movetimer += 1;
      if (this.movetimer <= 14) this.y = lerp(this.y, this.yspot[this.ycurrent], 0.122);
      else {
        this.movetimer = 0;
        this.count += 1;
        this.ycurrent += 1;
        if (this.ycurrent >= 2) this.ycurrent = 0;
      }
      this.shottimer += 1;
      if (this.shottimer >= 15) {
        this.lastshoty = this.y;
        const b = instance_create(this.x + 100, this.y + this.y_offset, 'obj_sneo_bigshot');
        b.hspeed = -6;
        b.friction = -0.25;
        this.shottimer = 0 + this.count / 4;
        this.shotmouthopen = 1;
        this.shotmouthopentimer = 0;
        this.rand = 70 + irandom(5);
        snd_play_x('snd_chargeshot_fire', 0.75, 0.7);
      }
      if (this.count === 10 || this.endattack === 1) {
        this.con = 1;
        this.timer = 0;
        this.endattack = 1;
      }
    }
    if (this.shotmouthopen === 1) {
      this.shotmouthopentimer += 1;
      this.mouthtopy = -Math.sin(this.shotmouthopentimer / 3) * 30;
      this.mouthbottomy = -this.mouthtopy;
      this.mouthangle = this.mouthtopy;
      if (this.mouthbottomy < 0) {
        this.mouthangle = 0;
        this.mouthtopy = 0;
        this.mouthbottomy = 0;
        this.shotmouthopentimer = 0;
        this.shotmouthopen = 0;
      }
    }
    if (this.con === 1) {
      this.timer += 1;
      const t = this.timer;
      this.y = lerp(this.y, (this.yspot[0] + this.yspot[1]) / 2, 0.1);
      if (t < 10) {
        this.mouthbottomy = lerp(this.mouthbottomy, 0, 0.2);
        this.mouthtopy = lerp(this.mouthtopy, 20, 0.2);
      }
      if (t >= 10 && t < 25) {
        this.mouthbottomy = lerp(this.mouthbottomy, 120, 0.04);
        this.mouthtopy = lerp(this.mouthtopy, -100, 0.04);
        this.mouthangle = lerp(this.mouthangle, -45, 0.05);
      }
      if (t >= 10) {
        this.mouthtopy += Math.sin(t * 2) * 4;
        this.mouthbottomy -= Math.sin(t * 2) * 4;
        this.mouthangle -= Math.sin(t) * 5;
        this.x += random_range(-1, 1);
        this.y += random_range(-1, 1);
      }
      if (t === 11) {
        const b = instance_create(this.x + 131, this.y + this.y_offset, 'obj_sneo_bigshot');
        b.image_xscale = 0;
        b.image_yscale = 0;
        b.sprite_index = 'spr_sneo_bigshot_l';
        this.shottimer = 0;
        for (const p of [0.4, 0.6, 0.8, 0.9]) snd_play_x('snd_chargeshot_fire', 0.7, p);
      }
    }
  }
  draw() {
    if (this.hurtalpha > 0) this.hurtalpha -= 0.1;
    const hx = this.x + this.mouthbottomy / 2 + this.x_offset;
    draw_sprite('spr_sneo_final_forme', 3, this.x, this.y);
    draw_sprite_ext('spr_sneo_lastattack_head_top', 0, hx + 60, this.y + this.mouthtopy + this.y_offset, 1, 1, this.mouthangle, WHITE, 1);
    draw_sprite(this.sprite_index, 1, hx, this.y + this.mouthbottomy + this.y_offset);
    draw_sprite_ext('spr_sneo_lastattack_head_top', 0, hx + 60, this.y + this.mouthtopy + this.y_offset, 1, 1, this.mouthangle, YELLOW, this.hurtalpha);
    draw_sprite_ext(this.sprite_index, 1, hx, this.y + this.mouthbottomy + this.y_offset, 1, 1, 0, YELLOW, this.hurtalpha);
  }
}
defineObject('obj_sneo_lastattack', SneoLastAttack);

class SneoLastAttackHitbox extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_whitepx_10';
    this.visible = false;
  }
  create() {
    this.destroyonhit = false;
    this.parent = lastattack();
    if (this.parent) {
      this.x = this.parent.x + this.parent.x_offset + 30;
      this.y = this.parent.y + this.parent.y_offset - 40;
    }
    this.image_xscale = 4;
    this.image_yscale = 6;
  }
  step() { if (!i_ex('obj_sneo_bulletcontroller')) instance_destroy(this); } // sim safeguard
  endStep() {
    const p = lastattack();
    if (p) {
      this.parent = p;
      this.x = p.x + p.x_offset + 30;
      this.y = p.y + p.y_offset - 40;
    }
  }
  collision_obj_yheart_shot(shot) {
    shot.user0();
    const la = lastattack();
    if (!la || la.endattack === 2) return;
    snd_play('snd_damage');
    la.hurtalpha = 1;
    if (la.endattack === 0) la.skip_1st_part_hp -= shot.damage;
    if (la.skip_1st_part_hp < 1 && la.endattack === 0) la.endattack = 1;
    if (la.skip_2nd_part_hp < 1 && la.endattack === 1) {
      withObj('obj_sneo_bigshot', b => {
        b.playerhit = 1;
        b.damage = 0;
        b.user0();
      });
      la.endattack = 2;
    }
  }
}
defineObject('obj_sneo_lastattack_hitbox', SneoLastAttackHitbox);

// ---------------------------------------------------------------- obj_sneo_bigshot

class SneoBigshot extends CollideBullet {
  constructor() { super(); this.sprite_index = 'spr_sneo_bigshot_s'; }
  create() {
    scr_bullet_init(this);
    Object.assign(this, {
      element: 6, destroyonhit: 0, f: 2, destroyable: 1, angle_speed: 0, destroypoints: 1, attackisdone: 0, damage: 50,
      image_xscale: 1, image_yscale: 2, timer: 0, playerhit: 0, flashsiner: 0,
    });
    const h = heart();
    this.depth = (h ? h.depth : 0) - 5;
    Object.assign(this, { explosion_alpha: 1, explosion_hide: 0, xx: this.x, yy: this.y, grazepoints: 4, timer2: 0, explodesfx: 0 });
    const s = sneo();
    if (s) this.damage = Math.floor(global.monsterat[s.myself] * 5 / 3);
    const bc = controller();
    if (bc) this.target = bc.target;
  }
  step() {
    if (this.sprite_index === 'spr_sneo_bigshot_l') {
      this.timer2 += 1;
      const la = lastattack();
      if (la) this.depth = this.timer2 < 11 ? la.depth + 1 : la.depth - 1;
      if (this.timer2 < 16) {
        this.image_xscale = lerp(0, 2, this.timer2 / 15);
        this.image_yscale = lerp(0, 2, this.timer2 / 15);
      }
      if (this.timer2 === 15) {
        this.hspeed = -1;
        this.friction = -0.05;
      }
      this.x += random_range(-1, 1);
      this.y = this.ystart + random_range(-4, 4);
      if (this.x < camerax() + 400) {
        this.user0();
        this.playerhit = 1;
        this.damage = 0;
        const l2 = lastattack();
        if (l2) l2.endattack = 2;
      }
    } else this.image_xscale = lerp(this.image_xscale, 2, 0.2);
    if (this.timer !== 0) this.timer += 1;
    if (this.timer > 13) {
      instance_create(camerax() + 320, cameray() + 240, 'obj_sneo_smoke');
      instance_destroy(this);
      snd_volume('snd_rumble', 0, 70);
      const s = sneo();
      if (s) s.stoprumblesfx = 70;
    }
  }
  user0() {
    if (!this.playerhit) return;
    if (this.timer > 0) return;
    this.timer = 1;
    this.destroyable = 0;
    this.attackisdone = 1;
    this.depth -= 40;
    this.hspeed = 0;
    const la = lastattack();
    if (la) la.endattack = 3;
    this.xx = this.x;
    this.yy = this.y;
  }
  user5() {
    if (this.sprite_index === 'spr_sneo_bigshot_l') {
      this.playerhit = 1;
      this.user0();
      enemyUser2();
    } else if (this.active == 1) {
      enemyUser2();
      if (this.destroyonhit == 1) instance_destroy(this);
    }
  }
  draw() {
    if (this.explosion_hide === 0) draw_self(this);
    if (this.timer > 0) {
      const la = lastattack();
      if (la) la.endattack = 3; // (so the endattack == 2 fade below never runs)
      if (this.explodesfx === 0) {
        this.explodesfx = 1;
        snd_loop('snd_rumble');
        snd_play_x('snd_explosion', 0.6, 1);
      }
      draw_sprite_ext('spr_sneo_bigcircle', 0, this.x - 50, this.y, this.image_xscale + this.timer * 2, this.image_yscale + this.timer, 0, WHITE, 1);
      draw_sprite_ext('spr_pixel_white', 0, camerax() - 20, cameray() - 20, 220, 220, 0, WHITE, clamp(this.timer / 12, 0, 1));
    }
  }
  onDestroy() {
    const d = instance_create(camerax(), cameray(), 'obj_fadein');
    withObj('obj_fadeout', f => instance_destroy(f));
    d.image_blend = WHITE;
    d.fadespeed = -0.034;
    global.turntimer = 1;
    withObj('obj_sneo_lastattack', l => instance_destroy(l));
    withObj('obj_sneo_lastattack_hitbox', l => instance_destroy(l));
    if (this.sprite_index === 'spr_sneo_bigshot_l') {
      withObj('obj_spamton_neo_enemy', e => {
        const m = e.myself;
        if (global.monsterhp[m] === global.monstermaxhp[m] && S.scr_sideb_get_phase() < 3) {
          const bc = controller();
          if (bc) bc.mercyaccumulated += 5;
          global.hittarget ??= [0, 0, 0];
          const w = instance_create(global.monsterx[m], global.monstery[m] + 20 - (global.hittarget[m] ?? 0) * 20, 'obj_dmgwriter');
          w.damage = 5;
          w.type = 5;
          global.hittarget[m] = (global.hittarget[m] ?? 0) + 1;
        } else {
          global.monsterhp[0] -= Math.ceil(global.monstermaxhp[0] * 0.05);
          if (global.monsterhp[0] < 0) global.monsterhp[0] = 1;
        }
      });
    }
  }
}
defineObject('obj_sneo_bigshot', SneoBigshot);

// ---------------------------------------------------------------- effects: obj_fadein, obj_sneo_smoke

class FadeIn extends Instance {
  constructor() { super(); this.sprite_index = 'spr_pixel_white'; }
  create() {
    this.image_blend = 0;
    this.fadespeed = -0.08;
    this.image_alpha = 1;
    this.length = 10 + room_width / 4;
    this.height = 10 + room_height / 4;
    this.x = -20;
    this.y = -20;
    this.depth = -1000; // (on top, as the sim's obj_fadeout)
  }
  draw() {
    this.image_alpha += this.fadespeed;
    draw_sprite_ext(this.sprite_index, this.image_index, this.x, this.y, this.length, this.height, 0, this.image_blend, this.image_alpha);
    if (this.image_alpha <= 0) instance_destroy(this);
  }
}
defineShared('obj_fadein', FadeIn);

class SneoSmoke extends Instance {
  constructor() { super(); this.sprite_index = 'spr_sneo_smoke'; }
  create() { this.timer = 0; }
  draw() {
    const s = lerp(2, 2.15, this.timer / 75);
    this.image_xscale = s;
    this.image_yscale = s;
    this.image_alpha = lerp(1, 0, this.timer / 75);
    this.timer += 1;
    draw_self(this);
    if (this.timer > 75) instance_destroy(this);
  }
}
defineShared('obj_sneo_smoke', SneoSmoke);

// ---------------------------------------------------------------- unreachable: obj_sneo_final_orb, obj_sneo_finale_bullet

class SneoFinalOrb extends BasicBulletSneo {
  constructor() { super(); this.sprite_index = 'spr_sneo_neobuster'; }
  create() {
    super.create();
    Object.assign(this, { destroyable: 1, destroyonhit: 0, image_xscale: 4, image_yscale: 4, hp: 12, timer: 0, playerhit: 0, flashsiner: 0 });
    this.direction = 180;
    this.speed = 3;
    global.turntimer = 300;
  }
  step() {
    if (this.timer !== 0) this.timer += 1;
    else if (this.speed < 3) this.speed += 0.25;
    if (this.timer > 60) {
      const d = instance_create(camerax(), cameray(), 'obj_fadein');
      withObj('obj_fadeout', f => instance_destroy(f));
      d.image_blend = WHITE;
      d.fadespeed = -0.01;
      if (this.playerhit) S.scr_damage_all(this);
      global.turntimer = 1;
      instance_destroy(this);
    }
  }
  collision_obj_yheart_shot(shot) {
    if (this.destroyable == 1) {
      if (shot.big == 0) { this.hp -= 1; this.speed = 3; } else { this.hp -= 3; this.speed = 0; }
      if (this.hp <= 0) {
        this.user0();
        snd_play('snd_badexplosion');
        this.speed = 0;
      } else {
        this.timer = -1;
        snd_play('snd_damage');
      }
    }
    shot.user0();
  }
  user0() {
    if (this.timer > 0) return;
    this.timer = 1;
    this.destroyable = 0;
    this.depth -= 40;
    const d = instance_create(this.x, this.y, 'obj_fadeout');
    d.image_blend = WHITE;
  }
  user5() {
    if (this.destroyable == 1) {
      this.playerhit = 1;
      this.user0();
    }
  }
  draw() {
    this.flashsiner += 1;
    this.blend_color = merge_color(BLUE, CYAN, 0.25 + Math.sin(this.flashsiner / 3) * 0.25);
    draw_self(this);
    this.image_angle += 10 + this.timer * 2;
    if (this.timer > 0) {
      draw_sprite_ext('spr_sneo_bigcircle', 0, this.x, this.y, this.image_xscale + this.timer * 2, this.image_yscale + this.timer, 0, WHITE, 1);
      draw_sprite_ext('spr_pixel_white', 0, camerax() - 20, cameray() - 20, 220, 220, 0, WHITE, clamp(this.timer / 15, 0, 1));
    }
    draw_set_alpha(0.5);
    draw_set_colour(WHITE);
    for (let i = Math.max(0, this.hp); i < 12; i++) {
      const cw = ((i - 1) % 3 === 0 ? 14 : 4) / 2, a = (Math.sin(i) + 1) * 180;
      // (as in the GML, the far points are not offset by x / y)
      draw_triangle(this.x, this.y, lengthdir_x(999, a - cw), lengthdir_y(999, a - cw), lengthdir_x(999, a + cw), lengthdir_y(999, a + cw), false);
    }
    draw_set_alpha(1);
  }
}
defineObject('obj_sneo_final_orb', SneoFinalOrb);

class SneoFinaleBullet extends BasicBulletSneoFinale {
  constructor() { super(); this.sprite_index = 'spr_sneo_crew_bullet'; }
  create() {
    super.create();
    this.flashsiner = 0;
    const s = sneo();
    if (s) this.damage = global.monsterat[s.myself] * 5;
    const bc = controller();
    if (bc) this.target = bc.target;
    this.grazepoints = 4;
  }
  step() {
    if (this.x >= room_width + 100 || this.x <= -100 || this.y >= room_height + 100 || this.y <= -100) { instance_destroy(this); return; }
    this.image_angle += 36;
    if (this.destroyable == 1) {
      this.flashsiner += 1;
      this.image_blend = merge_color(BLUE, CYAN, 0.25 + Math.sin(this.flashsiner / 3) * 0.25);
    }
  }
}
defineObject('obj_sneo_finale_bullet', SneoFinaleBullet);

// ---------------------------------------------------------------- obj_spamton_neo_enemy Other_12

// scr_damage_sneo_final_attack() (the enemy's scope): scr_damage without the defense calculation,
// with a longer invincibility (invc * 40). Only targets 0..2 reach it (from user2 below).
function scr_damage_sneo_final_attack(inst) {
  const g = global;
  if (!(g.inv < 0) || g.chemg_god_mode) return; // (chemg_god_mode: the sandbox's invincibility)
  S.scr_damage_cache?.();
  if (inst.target < 3 && g.hp[g.char[inst.target]] <= 0) {
    S.scr_randomtarget_old?.(inst);
    inst.target = inst.mytarget;
    const ci = g.charinstance?.[inst.target];
    if (ci) { ci.image_blend = WHITE; ci.darkify = 0; }
  }
  let chartarget = 3, tdamage = inst.damage;
  if (inst.target < 3) {
    chartarget = g.char[inst.target];
    if (g.charaction[inst.target] == 10) tdamage = Math.ceil(2 * tdamage / 2);
    // scr_element_damage_reduction(element, char) is not ported (1).
    if (tdamage < 1) tdamage = 1;
  }
  // Simulator option, as in scr_damage: Easy Mode halves the damage the party takes.
  if (G.settings?.easy) tdamage = Math.max(1, Math.ceil(tdamage / 2));
  if (!i_ex('obj_shake')) instance_create(0, 0, 'obj_shake');
  const ci = g.charinstance?.[inst.target];
  if (ci) { ci.hurt = 1; ci.hurttimer = 0; }
  let hpdiff = tdamage, doomtype = -1;
  withObj('obj_dmgwriter', d => { if (d.delaytimer >= 1) d.killactive = 1; });
  withObj('obj_heart', h => { h.dmgnoise = 1; });
  if (inst.target < 3) {
    if (g.hp[chartarget] <= 0) {
      doomtype = 4;
      g.hp[chartarget] -= Math.round(tdamage / 4);
      hpdiff = Math.round(tdamage / 4);
    } else {
      g.hp[chartarget] -= tdamage;
      if (g.hp[chartarget] <= 0) {
        hpdiff = Math.abs(g.hp[chartarget] - g.maxhp[chartarget] / 2);
        doomtype = 4;
        g.hp[chartarget] = Math.round(-g.maxhp[chartarget] / 2);
        S.scr_dead?.(inst.target);
      }
    }
    if (ci) {
      const dw = instance_create(ci.x, ci.y + (ci.myheight ?? 0) - 24, 'obj_dmgwriter');
      dw.damage = hpdiff;
      dw.type = doomtype;
      inst.dmgwriter = dw;
    }
  }
  g.inv = (g.invc ?? 1) * 40;
  S.scr_damage_check?.();
  let gameover = 1;
  for (let i = 0; i < 3; i++) if (g.char[i] != 0 && g.hp[g.char[i]] > 0) gameover = 0;
  if (gameover === 1) S.scr_gameover?.();
}

// Other_12: every standing hero loses 1/5 of their HP (1/10 under half, 1/20 under 15%).
SpamtonNeoEnemy.prototype.user2 = function () {
  const g = global;
  if (!(g.inv < 0)) return;
  this.remdamage = this.damage;
  const temptarget = this.target;
  for (let ti = 0; ti < 3; ti++) {
    g.inv = -1;
    const c = g.char[ti], hp = g.hp[c], max = g.maxhp[c];
    if (hp > max * 0.5) this.damage = Math.floor(hp / 5);
    else if (hp >= max * 0.15) this.damage = Math.floor(hp / 10);
    else if (hp < max * 0.15) this.damage = Math.floor(hp / 20);
    this.target = ti;
    if (hp > 0 && c != 0) scr_damage_sneo_final_attack(this);
    if (!G.instances.length) return; // game over reset the room
  }
  g.inv = (g.invc ?? 1) * 40;
  this.target = temptarget;
};

// Step_0 (end): the explosion's rumble stops 70 frames after the last BIG SHOT.
STEP_HOOKS.push(s => {
  if (s.stoprumblesfx > 0) s.stoprumblesfx -= 1;
  if (s.stoprumblesfx === 1) snd_stop('snd_rumble');
});

// ---------------------------------------------------------------- obj_yheart_shot Other_12 / Step (sucked)

YHeartShot.prototype.user2 = function () {
  const f = forme();
  if (this.sucked === 0 && f) {
    this.sucked = 1;
    this.direction = point_direction(this.x, this.y, f.x + 122, f.y + 146);
    this.gravity_direction = point_direction(this.x, this.y, f.x + 122, f.y + 146);
    this.hspeed = 0;
    this.speed = 3.5;
    this.friction = 0;
    this.gravity = 0.3;
  }
};
const shotStep = YHeartShot.prototype.step;
YHeartShot.prototype.step = function () {
  shotStep.call(this);
  if (!this.alive || this.sucked !== 1) return;
  const f = forme();
  if (!f) return;
  if (this.y < f.y + 146) this.y += 1;
  if (this.y > f.y + 146) this.y -= 1;
  this.direction = point_direction(this.x, this.y, f.x + 122, f.y + 146);
  this.gravity_direction = point_direction(this.x, this.y, f.x + 122, f.y + 146);
};
