// obj_sneo_bulletcontroller (Create, Step init and type 0, Destroy) and FLYING HEADS (rr 0):
// obj_sneo_guymaker, obj_sneo_lilguy, obj_sneo_lilguy_bullet, obj_sneo_crew_dissolve.
import {
  global, defineObject, instance_create, instance_destroy, instance_exists, instancesOf,
  choose, random, merge_color, snd_play, snd_volume, bgr, S, objectExists, irandom, draw_set_color, draw_circle, draw_self, lengthdir_x, lengthdir_y,
} from '../rt.js?v=20261106144300';
import {
  first, camerax, cameray, scr_bullet_init, move_towards_point, scr_doom, snd_play_x, scr_afterimage, scr_movetowards,
} from '../common.js?v=20261106144300';
import { BulletGenParent, BulletParent, CollideBullet } from '../bullets.js?v=20261106144300';
import { BasicBulletSneo, scr_afterimage_cut } from '../shots.js?v=20261106144300';

const sneo = () => first('obj_spamton_neo_enemy');

export class SneoBulletController extends BulletGenParent {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_c_weakpoint_hit';
    this.visible = false;
  }
  create() {
    const s = sneo();
    Object.assign(this, {
      type: 1, btimer: 99, atimer: 0, timermax: 12, damage: -1, grazepoints: -1, timepoints: -1, inv: -1, grazed: -1,
      grazetimer: -1, element: 6, target: -1, side: 1, difficulty: s ? s.difficulty : 0, made: 0,
      hellmode: s ? s.hellmode : 0, init: 0, creator: 0, sneo: s, hideshooty: 1, mercyaccumulated: 0,
      krishp: global.hp[1], sushp: global.hp[2], ralhp: global.hp[3],
    });
  }
  step() {
    const s = this.sneo;
    if (s && global.mercymod[s.myself] > 99 && global.turntimer > 1) global.turntimer = 1;
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
    // type 0 here; the other types are added by their attack modules as typeN / typeN_5 methods.
    const fn = this['type' + String(this.type).replace('.', '_')];
    if (fn) fn.call(this);
  }
  // FLYING HEADS
  type0() {
    const s = this.sneo;
    {
      if (this.init === 1) {
        this.btimer = 0;
        instance_create(0, 0, 'obj_sneo_guymaker');
        this.init = 2;
        global.turntimer = 240;
        if (this.difficulty === 2) global.turntimer = 360;
        if (this.difficulty === 3) global.turntimer = 300;
      } else if (this.difficulty === 2 && s) this.armLaser(s);
      else if (this.difficulty === 3 && this.btimer === 1 && s) s.partmode = 36;
    }
  }
  // Difficulty 2 (unused in the fight): three arm-cannon laser beams (obj_sneo_biglaser firecon 1).
  armLaser(s) {
    const b = this.btimer, lasers = () => instancesOf('obj_sneo_biglaser');
    const place = l => {
      l.x = this.sneoarm_x + lengthdir_x(60, this.armangle - 90);
      l.y = this.sneoarm_y + lengthdir_y(60, this.armangle - 90);
      l.direction = this.armangle - 90;
      l.image_angle = this.armangle - 90;
    };
    if (b === 40 || b === 150 || b === 260) {
      this.sneoarm_x = s.x + s.partxoff[1];
      this.sneoarm_y = s.y + s.partyoff[1];
      this.armangle = -68 - random(32);
      this.side = this.armangle;
      const d = instance_create(0, 0, 'obj_sneo_biglaser');
      place(d);
      d.depth += 1;
      d.damage = this.damage * 2;
      d.target = this.target;
      s.aimmode = 1;
      s.armaim = this.armangle;
      s.partmode = 3;
    } else if (b === 90 || b === 200 || b === 310) {
      for (const l of lasers()) { l.firecon = 1; l.active = 1; l.image_blend = 0xffffff; }
      s.partmode = 12;
    } else if ((b >= 90 && b < 120) || (b >= 200 && b < 230) || (b >= 310 && b < 340)) {
      for (const l of lasers()) place(l);
      s.armaim = this.armangle;
    } else if (b === 130 || b === 240 || b === 350) {
      for (const l of lasers()) l.firecon = 2;
      s.partmode = 4;
    }
  }
  onDestroy() {
    const s = this.sneo;
    if (!s || !s.alive) return;
    if (this.hideshooty) s.partframe[1] = 0;
    if (s.endcon === 0) s.partmode = 1;
    if (this.type === 8.5 && (this.krishp !== global.hp[1] || this.sushp !== global.hp[2] || this.ralhp !== global.hp[3])) s.nothitduringphonehands = 0;
    if (this.mercyaccumulated > 0) {
      const m = s.myself;
      global.mercymod[m] = Math.max(0, Math.min(99, global.mercymod[m] + this.mercyaccumulated));
    }
  }
}
defineObject('obj_sneo_bulletcontroller', SneoBulletController);

// obj_sneo_guymaker: sends the heads in rows, pairs or columns, by difficulty.
class GuyMaker extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_bullet_crew';
    this.visible = false;
  }
  create() {
    const d = sneo()?.difficulty ?? 1;
    this.type = 4;
    if (d === 0) this.type = 1;
    if (d === 1) this.type = 2;
    if (d === 2) this.type = 3;
    if (d === 3) this.type = 4;
    if (instance_exists('obj_sneo_heartattack')) this.type = 5;
    if (d === 6) this.type = 6;
    if (d === 7) this.type = 7;
    this.timer = 0;
    this.prevrow = 0;
    this.row = 0;
    this.prevrowy = 0;
    this.spawncount = 0;
    this.firstspawn = 0;
    this.rowy = cameray() + 210;
  }
  alarm0() { instance_destroy(this); }
  guy(x, y) { return instance_create(x, y, 'obj_sneo_lilguy'); }
  step() {
    const xx = camerax(), yy = cameray(), type = this.type;
    this.timer += 1;
    const t = this.timer;
    if (t === 1) {
      if (type === 1) this.row = choose(0, 1);
      if (type === 2) {
        let aa = choose(0, 1, 2);
        if (this.prevrowy === 0) aa = choose(1, 2);
        if (this.prevrowy === 1) aa = choose(0, 2);
        if (this.prevrowy === 2) aa = choose(0, 1);
        this.rowy = yy + 210 - 46 * aa;
        this.prevrowy = aa;
        this.row = 2;
      }
      if (type === 3 || type === 4) {
        this.rowy = yy + 210 - 40 * choose(0, 1);
        this.row = choose(0, 1, 3, 6);
        if (this.prevrow === 2) this.row = choose(0, 1, 3, 6);
        if (this.prevrow === 3) this.row = choose(0, 1);
        if (this.row === 3 && this.firstspawn === 0) this.row = choose(0, 1);
        this.firstspawn = 1;
      }
      if (type === 5) {
        this.rowy = yy + 210 - 40 * choose(0, 1, 2);
        this.row = choose(0, 1, 2, 2, 3, 6);
        if (this.prevrow === 2) this.row = choose(0, 1, 3, 6);
        if (this.prevrow === 3) this.row = choose(0, 1, 2);
      }
      if (type === 6) this.row = 6;
      if (type === 7) this.row = 7;
    }
    if (t === 5 || t === 10 || t === 15 || t === 20) {
      const row = this.row;
      if (row === 0 || row === 1 || row === 2) {
        const g = this.guy(xx + 700, yy + 280);
        g.hspeed = -18;
        g.friction = -0.1;
        g.vspeed = -2;
        g.alarm[0] = 44;
        g.alarm[1] = 40;
        g.alarm[2] = 32;
        g.gravity = 0.5;
        g.gravity_direction = 0;
        g.destroyable = 1;
        g.image_blend = bgr(15245824);
        g.changedirection = 0;
        g.altspeed = 4;
        g.altfriction = -0.2;
        g.altgravity = 0;
        if (row === 1) {
          g.y -= 240;
          g.vspeed = -g.vspeed;
        }
        if (row === 2) {
          g.y -= 120;
          g.vspeed = 0;
          g.hspeed = -21;
        }
        if (row === 2 && type === 2) {
          g.hspeed = -21;
          g.gravity = 0;
          g.friction = 0.5;
          g.alarm[0] = 36;
          g.changedirection = 1;
          g.altdirection = g.direction;
        }
        if ((type === 2 || type === 3 || type === 4 || type === 5) && row === 2) g.y = this.rowy;
      }
      if (row === 3 && t !== 20) {
        for (let gi = 0; gi < 2; gi++) {
          const g = this.guy(xx + 300, yy - 40 + 400 * gi);
          g.vspeed = 18 - 36 * gi;
          g.alarm[0] = 44;
          g.alarm[1] = 40;
          g.alarm[2] = 32;
          g.gravity = 0.8 - 1.6 * gi;
          g.gravity_direction = 90;
          g.destroyable = 1;
        }
      }
      if (row === 6 && t === 5) {
        this.spawncount = 2;
        for (let a = 0; a < this.spawncount; a++) {
          let g = this.guy(xx + 410 + a * 70, yy - 20);
          g.vspeed = 15;
          g.alarm[0] = 44;
          g.alarm[1] = 30;
          g.alarm[2] = 32;
          g.gravity = 0.53;
          g.gravity_direction = 90;
          g.destroyable = 1;
          g = this.guy(xx + 445 + a * 70, yy - 20 + 400);
          g.vspeed = -15;
          g.alarm[0] = 44;
          g.alarm[1] = 40;
          g.alarm[2] = 32;
          g.gravity = -0.53;
          g.gravity_direction = 90;
          g.destroyable = 1;
        }
      }
    }
    if (type === 2 && this.timer >= 41) this.timer = 0;
    if (type === 3 && this.timer >= 69) this.timer = 0;
    if (type === 6 && this.timer >= 69) this.timer = 0;
    if (type === 4 && this.timer >= 50) this.timer = 0;
    if (type === 5 && this.timer >= 69) this.timer = 0;
    if (this.timer >= 50) this.timer = 0;
    if (this.timer === 0) this.prevrow = this.row;
  }
}
defineObject('obj_sneo_guymaker', GuyMaker);

// obj_sneo_lilguy: a little Spamton head; it spits one obj_sneo_lilguy_bullet at the SOUL.
class LilGuy extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_crew';
  }
  create() {
    scr_bullet_init(this);
    Object.assign(this, {
      element: 6, f: 2, destroyable: 0, angle_speed: 0, yellowsiner: 0, loop: 0, loopy1: 90, loopy2: 240, falsevspeed: 0,
      bighitbox: 0, bighead: 0, angleadjust: 0, active: 1, altdir: 0, altspeed: 0, altfriction: 0, altgravity: 0,
      changedirection: 0, bulletspeed: 8, image_speed: 0, cutscene: 0, altdirection: 0,
    });
    const s = sneo();
    if (s) this.damage = global.monsterat[s.myself] * 5;
    const bc = first('obj_sneo_bulletcontroller');
    if (bc) this.target = bc.target;
    this.grazepoints = 2;
  }
  alarm0() {
    if (this.changedirection) {
      this.direction = this.altdirection;
      this.gravity = this.altgravity;
      this.friction = this.altfriction;
      this.speed = this.altspeed;
    }
  }
  alarm1() {
    const h = first('obj_heart');
    if (h) {
      const b = instance_create(this.x, this.y + 12, 'obj_sneo_lilguy_bullet');
      b.bulletspeed = this.bulletspeed;
      b.depth = this.depth - 1;
      if (this.target !== undefined) b.target = this.target;
      move_towards_point(b, h.x + 8, h.y + 8, this.bulletspeed);
    }
    this.image_index = 2;
    this.image_speed = 1;
  }
  alarm2() { this.image_index = 1; }
  animationEnd() { if (this.cutscene === 0) { this.image_speed = 0; this.image_index = 2; } }
  step() {
    if (this.cutscene === 0 && (this.x >= camerax() + 1000 || this.x <= camerax() - 200 || this.y >= cameray() + 600 || this.y <= cameray() - 200)) {
      instance_destroy(this);
      return;
    }
    this.direction += this.angle_speed;
    if (this.angleadjust === 1) this.image_angle = this.direction;
    if (this.destroyable === 1) {
      this.yellowsiner += 1;
      this.image_blend = merge_color(bgr(15245824), bgr(16776960), 0.25 + Math.sin(this.yellowsiner / 3) * 0.25);
    }
    this.y += this.falsevspeed;
  }
  collision_obj_yheart_shot(shot) {
    this.hitshot = shot;
    this.user0();
    S.scr_tensionheal(sneo()?.difficulty === 3 ? 1 : 1.3);
  }
  // Other_10: shot down (a BIG SHOT goes through).
  user0() {
    if (this.destroyable !== 1) return;
    const shot = this.hitshot;
    if (this.bighead && shot && shot.big == 0) {
      snd_play_x('snd_bell', 0.8, 0.7 + random(0.1));
      shot.x -= Math.abs(shot.hspeed);
      shot.hspeed = -8;
      shot.vspeed = choose(-8, 8, 10, -10);
      scr_doom(shot, 90);
      return;
    }
    if (shot && shot.big == 0 && shot.alive) shot.user0();
    snd_volume('snd_bomb', 0.7, 0);
    snd_play_x('snd_bomb', 0.7, 1.1 + random(0.2));
    const cut = scr_afterimage_cut(this);
    cut.flash = true;
    instance_destroy(this);
  }
}
defineObject('obj_sneo_lilguy', LilGuy);

class LilGuyBullet extends BasicBulletSneo {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_crew_bullet';
  }
  step() {
    if (this.x >= 740 || this.x <= -100 || this.y >= 580 || this.y <= -100) { instance_destroy(this); return; }
    this.image_angle += 36;
  }
}
defineObject('obj_sneo_lilguy_bullet', LilGuyBullet);

class CrewDissolve extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_crew_dissolve';
  }
  create() {
    this.image_blend = 0;
    this.speed = 2;
  }
  step() {
    if (this.image_index >= 7) { instance_destroy(this); return; }
    const d = scr_afterimage(this);
    d.image_index = this.image_index + 8;
    d.direction = this.direction;
    d.speed = 4;
  }
}
defineObject('obj_sneo_crew_dissolve', CrewDissolve);

// obj_spamtonshot: the arm-cannon shot of his dance (partmode 36, Flying Heads II). Its Step sets
// dontexplode = 1 before the burst check, so it never bursts: it flies at the SOUL, pulsing.
class SpamtonShot extends BasicBulletSneo {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_bullet1';
  }
  create() {
    const ha = first('obj_sneo_heartattack');
    if (ha && ha.heart_health < 1) { instance_destroy(this); return; }
    super.create();
    this.con = 0;
    this.siner = 0;
    this.fluffyguarddestroysthis = 0;
    const h = first('obj_heart');
    const tx = h ? h.x : camerax() + 320, ty = h ? h.y : cameray() + 120;
    move_towards_point(this, tx, ty, 5);
    this.angle_speed = 0;
    this.grazepoints = 4;
    const bc = first('obj_sneo_bulletcontroller');
    if (bc) this.target = bc.target;
  }
  step() {
    const s = sneo();
    if (s) this.damage = global.monsterat[s.myself] * 5;
    if (global.turntimer < 1) { instance_destroy(this); return; }
    const h = first('obj_heart');
    if (h) this.depth = this.y > cameray() + 280 ? h.depth + 100 : h.depth + 2;
    this.siner += 2;
    this.image_xscale = this.image_yscale = 0.5 + Math.sin(this.siner / 4) * 0.2;
    if (this.x >= 740 || this.x <= -100 || this.y >= 580 || this.y <= -100) instance_destroy(this);
  }
}
defineObject('obj_spamtonshot', SpamtonShot);

// obj_sneo_biglaser: the glow charging at the end of his arm cannon (the dance, _type 1, and the
// heart attack's aimed shots). firecon 1 / 2 (the laser beam itself) only appear in the unused
// Flying Heads difficulty 2. Its friendly hitbox and telegraph objects draw nothing and are left out.
class SneoBiglaser extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_laser';
  }
  create() {
    scr_bullet_init(this);
    Object.assign(this, {
      element: 6, destroyonhit: 0, active: 0, image_yscale: 0.05, image_xscale: 0, mask_index: 'spr_nothing', firecon: 0,
      effecttimer: 0, siner: 0, orbsize: 0, grazepoints: 10, grazed: 1, _type: 0,
    });
    const s = sneo();
    if (s) this.damage = global.monsterat[s.myself] * 5;
    const bc = first('obj_sneo_bulletcontroller');
    if (bc) this.target = bc.target;
  }
  draw() {
    if (this.firecon === 0) {
      this.image_yscale = 0.001;
      this.image_xscale = 2;
      if (this.effecttimer <= 42 && this.effecttimer % 6 === 0 && objectExists('obj_rouxls_power_up_orb')) {
        const n = this._type === 1 ? 3 : 6, arc = 360 / n;
        for (let i = 0; i < n; i++) {
          const d = instance_create(this.x, this.y, 'obj_rouxls_power_up_orb');
          d.direction = irandom(arc) + i * arc;
          d.lifetime = 16;
          d.depth = this.depth + 1;
          d.image_blend = this.image_blend;
          d.parenttarget = this;
          d._type = this._type;
        }
      }
      if (this.effecttimer > 50) this.orbsize -= 4;
      else this.orbsize += 1;
      draw_set_color(0xffffff);
      draw_circle(this.x, this.y, Math.max(2, this.orbsize / 2 + Math.sin(this.siner / 2) * 2), false);
      this.effecttimer += 1;
      this.siner += 1;
    } else if (this.firecon === 1) {
      this.active = 1;
      this.mask_index = 'spr_sneo_laser';
      if (this.image_yscale < 0.5) this.image_yscale = scr_movetowards(this.image_yscale, 0.5, 0.1);
      else this.image_yscale -= 0.05;
      draw_set_color(0xffffff);
      draw_circle(this.x, this.y, this.image_yscale * 100, false);
      draw_self(this);
    } else if (this.firecon === 2) {
      draw_set_color(0xffffff);
      this.active = 0;
      this.mask_index = 'spr_nothing';
      if (this.image_yscale <= 0.01) this.image_yscale -= 0.0025;
      else this.image_yscale = scr_movetowards(this.image_yscale, 0.01, 0.1);
      if (this.image_yscale <= 0) { instance_destroy(this); return; }
      draw_circle(this.x, this.y, this.image_yscale * 100, false);
      draw_self(this);
    }
  }
}
defineObject('obj_sneo_biglaser', SneoBiglaser);
export { instancesOf, snd_play };
