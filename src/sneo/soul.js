// The SOUL and its helpers: obj_heart, obj_grazebox, obj_moveheart, obj_returnheart,
// obj_heartburst, scr_moveheart, scr_heartcolor. Chapter 2: the yellow SOUL (color 1) shoots
// obj_yheart_shot with the confirm button and fires a BIG SHOT when it is held and released.
import {
  G, global, Instance, defineObject, defineScript, instance_create, instance_destroy, instancesOf, place_meeting, point_distance, draw_self, draw_sprite_ext, event_user, S, snd_play, snd_stop,
  left_h, right_h, up_h, down_h, button2_h, button1_p, button1_h, button1_r, random,
} from './rt.js?v=20261106221344';
import { first, view_x, view_y, move_towards_point } from './common.js?v=20261106221344';
import { drawSoulHat } from '../hats.js?v=20261106221344';
import { snd_loop, snd_pitch, snd_volume } from '../runtime/audio.js?v=20261106221344';

const SOLID = 'obj_battlesolid';

export class Heart extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_dodgeheart';
    this.mask_index = 'spr_dodgeheartmask';
    this.depth = 1;
  }
  create() {
    global.sp = 4;
    this.wspeed = global.sp;
    this.image_speed = 0;
    this.fly = 0;
    this.darken = 1;
    this.darkamt = 0;
    this.dmgnoise = 0;
    instance_create(this.x + 10, this.y + 10, 'obj_grazebox');
    this.boundaryup = 0;
    this.canmove = 1;
    this.color = 0;
    this.chargeshot_sound = null;
    this.z_hold = 0;
    this.z_charge = 0;
    this.z_hold_f = 0;
    this.f = 2;
    this.chargeshot_delay = 0;
    this.superchargetimer = 0;
    this.chargeshotcount = 0;
    this.disableslow = 0;
    if (button2_h()) this.disableslow = 1;
  }
  step() {
    const meet = (x, y) => place_meeting(this, x, y, SOLID);
    this.wallcheck = 0;
    let press_l = 0, press_r = 0, press_d = 0, press_u = 0;
    let bkx = 0, bky = 0, bkxy = 0;
    if (left_h()) press_l = 1;
    if (right_h()) press_r = 1;
    if (up_h()) press_u = 1;
    if (down_h()) press_d = 1;
    let px = 0, py = 0;
    const wspeed = this.wspeed;
    if (this.canmove) {
      if (press_r === 1) px = wspeed;
      if (press_l === 1) px = -wspeed;
      if (press_d === 1) py = wspeed;
      if (press_u === 1) py = -wspeed;
      if (button2_h() && !(global.flag && global.flag[22])) {
        if (this.disableslow === 0) {
          px = Math.ceil(px * 0.5);
          py = Math.ceil(py * 0.5);
        }
      } else this.disableslow = 0;
    }

    // Slide along walls: try nudging perpendicular to the blocked axis, then shorten the move.
    if (meet(this.x + px, this.y)) {
      for (let g = wspeed; g > 0; g--) {
        if (press_d === 0 && !meet(this.x + px, this.y - g)) { this.y -= g; py = 0; break; }
        if (press_u === 0 && !meet(this.x + px, this.y + g)) { this.y += g; py = 0; break; }
      }
      bkx = 0;
      if (px > 0) {
        for (let i = px; i >= 0; i--) if (!meet(this.x + i, this.y)) { px = i; bkx = 1; break; }
      }
      if (px < 0) {
        for (let i = px; i <= 0; i++) if (!meet(this.x + i, this.y)) { px = i; bkx = 1; break; }
      }
      if (bkx === 0) px = 0;
    }
    if (meet(this.x, this.y + py)) {
      for (let g = wspeed; g > 0; g--) {
        if (press_r === 0 && !meet(this.x - g, this.y + py)) { this.x -= g; px = 0; break; }
        if (press_l === 0 && !meet(this.x + g, this.y + py)) { this.x += g; px = 0; break; }
      }
      if (py > 0) {
        for (let i = py; i >= 0; i--) if (!meet(this.x, this.y + i)) { py = i; bky = 1; break; }
      }
      if (py < 0) {
        for (let i = py; i <= 0; i++) if (!meet(this.x, this.y + i)) { py = i; bky = 1; break; }
      }
      if (bky === 0) py = 0;
    }
    if (meet(this.x + px, this.y + py)) {
      bkxy = 0;
      let i = px, j = py;
      while (j !== 0 || i !== 0) {
        if (!meet(this.x + i, this.y + j)) { px = i; py = j; bkxy = 1; break; }
        if (Math.abs(j) >= 1) { if (j > 0) j -= 1; if (j < 0) j += 1; } else j = 0;
        if (Math.abs(i) >= 1) { if (i > 0) i -= 1; if (i < 0) i += 1; } else i = 0;
      }
      if (bkxy === 0) { px = 0; py = 0; }
    }
    const sw = this.sprite_width, sh = this.sprite_height;
    if (this.x + px >= view_x() + 640 - sw) px = view_x() + 640 - sw - this.x;
    if (this.x + px <= 0) px = -this.x;
    if (this.y + py <= 0) py = -this.y;
    if (this.y + py >= view_y() + 320 - sh + this.boundaryup) py = view_y() + 320 - sh - this.y + this.boundaryup;
    this.x += px;
    this.y += py;
    if (this.dmgnoise === 1) {
      this.dmgnoise = 0;
      snd_stop('snd_hurt1');
      snd_play('snd_hurt1');
    }
    global.inv -= 1;
    if (global.inv > 0) this.image_speed = 0.25;
    else {
      this.image_speed = 0;
      this.image_index = 0;
    }
    global.heartx = this.x + 2 - view_x();
    global.hearty = this.y + 2 - view_y();
    // At the end of Step, as in the GML: shots spawn from the moved SOUL and wspeed applies next frame.
    if (this.color === 1) this.yellowStep();
  }
  // obj_heart Step_0, color == 1: shots, the BIG SHOT charge and Susie's Supercharge.
  yellowStep() {
    const sneo = instancesOf('obj_spamton_neo_enemy')[0];
    this.wspeed = 5;
    if (this.chargeshot_delay > 0) this.chargeshot_delay -= 1;
    if (button1_p() || (this.z_hold >= 10 && this.z_hold <= 39 && button1_r())) {
      if (instancesOf('obj_yheart_shot').length < 3 && this.chargeshot_delay === 0) {
        instance_create(this.x + 10, this.y + 10, 'obj_yheart_shot');
        snd_play('snd_heartshot_dr_b');
      }
    }
    if (this.z_hold === 20) {
      this.chargeshot_sound = snd_loop('snd_chargeshot_charge');
      snd_pitch(this.chargeshot_sound, 0.1);
      snd_volume(this.chargeshot_sound, 0, 0);
      snd_volume(this.chargeshot_sound, 0.3, 20);
    }
    if (this.z_hold >= 20 && this.z_hold < 40 && this.chargeshot_sound) snd_pitch(this.chargeshot_sound, 0.1 + (this.z_hold - 20) / 20);
    if (this.z_hold >= 40) this.image_index = 2;
    if (this.z_charge < 15) this.chargeshotcount = 0;
    if (this.z_hold >= 40 && button1_r()) {
      if (this.chargeshot_sound) snd_stop(this.chargeshot_sound);
      snd_play('snd_chargeshot_fire');
      const big = instance_create(this.x + 10, this.y + 10, 'obj_yheart_shot');
      big.big = 1;
      big.sprite_index = 'spr_yheart_bigshot';
      big.hspeed = 4 * this.f;
      big.friction = -0.2 * this.f;
      big.image_alpha = 0.5;
      big.image_xscale = 0.1;
      big.image_yscale = 2;
      this.z_hold = 0;
      this.chargeshot_delay = 5;
      this.image_index = 0;
      this.chargeshotcount += 1;
      if (this.chargeshotcount > 1 && sneo) sneo.user4?.();
      if (sneo) sneo.bigshotused = 1;
      if (sneo && sneo.bigshotcount > 0) {
        big.hspeed = 10 * this.f;
        big.trail = 1;
        sneo.bigshotcount -= 1;
        let a = random(45);
        const last = sneo.bigshotcount === 0;
        if (last) {
          instance_create(this.x, this.y, 'obj_supercharge_end');
          snd_play('snd_stardrop');
        }
        for (let k = 0; k < 8; k++) {
          const part = instance_create(this.x + 10, this.y + 10, 'obj_yheart_sneo_particle');
          part.direction = a + random(15);
          if (last) {
            part.image_xscale = 2 + random(2);
            part.image_yscale = 2 + random(2);
          }
          part.speed = last ? 16 : 8;
          part.friction = 0.8;
          a += 45;
        }
      }
    }
    if (button1_h()) {
      if (sneo && sneo.bigshotcount > 0) this.z_hold_f += 1;
      this.z_hold_f += 1;
    } else {
      this.z_hold_f = 0;
      if (this.chargeshot_sound) snd_stop(this.chargeshot_sound);
    }
    this.z_hold = this.z_hold_f * 2;
  }
  onDestroy() { if (this.chargeshot_sound) snd_stop(this.chargeshot_sound); }
  collision_obj_collidebullet(other) {
    const prev = G.other;
    G.other = this;
    event_user(other, 5);
    G.other = prev;
  }
  // Draw_0: the yellow SOUL's charge rings and the Supercharge glow.
  draw() {
    if (this.color === 1) {
      const zn = this.z_hold - 35;
      if (zn >= 0) {
        let sc = Math.abs(Math.sin(zn / 10));
        draw_sprite_ext(this.sprite_index, 0, this.x - sc * 10, this.y - sc * 10, 1 + sc, 1 + sc, this.image_angle, this.image_blend, 0.3);
        sc = Math.abs(Math.sin(zn / 14));
        draw_sprite_ext(this.sprite_index, 0, this.x - 2 - sc * 10, this.y - 2 - sc * 10, 1.2 + sc, 1.2 + sc, this.image_angle, this.image_blend, 0.3);
      }
      if (this.z_hold >= 15) {
        this.z_charge = Math.min(35, this.z_hold - 15);
        const zc = this.z_charge;
        for (let i = 0; i < 4; i++) {
          const rot = (i * 90 + zc * 5) * Math.PI / 180;
          const xx = Math.sin(rot) * (35 - zc), yy = Math.cos(rot) * (35 - zc);
          draw_sprite_ext('spr_yheart_charge', 0, this.x + 9 - xx, this.y + 10 - yy, 4 - zc * 2 / 35, 4 - zc * 2 / 35, 0, 0xffffff, zc / 5);
        }
      }
      const sneo = instancesOf('obj_spamton_neo_enemy')[0];
      if (sneo && sneo.bigshotcount > 0) {
        this.superchargetimer += 1;
        let sc = Math.abs(Math.sin(this.superchargetimer / 10));
        draw_sprite_ext(this.sprite_index, 0, this.x - sc * 10, this.y - sc * 10, 1 + sc, 1 + sc, this.image_angle, 0xffa040, 0.5);
        sc = Math.abs(Math.sin(zn / 14));
        draw_sprite_ext(this.sprite_index, 0, this.x - 2 - sc * 10, this.y - 2 - sc * 10, 1.2 + sc, 1.2 + sc, this.image_angle, 0xffa040, 0.5);
      }
    }
    draw_self(this);
    drawSoulHat(this);
  }
}
defineObject('obj_heart', Heart);

// scr_heartcolor("red" / "yellow")
export function scr_heartcolor(c) {
  if (c === 'red' || c === 0) for (const h of instancesOf('obj_heart')) { h.color = 0; h.sprite_index = 'spr_dodgeheart'; }
  if (c === 'yellow' || c === 1) {
    for (const h of instancesOf('obj_heart')) { h.color = 1; h.sprite_index = 'spr_yellowheart'; }
    for (const g of instancesOf('obj_grazebox')) g.sprite_index = 'spr_grazeappear_yellow';
  }
}
defineScript('scr_heartcolor', scr_heartcolor);

export class Grazebox extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_grazeappear';
    this.mask_index = 'spr_grazemask';
    this.depth = 2;
  }
  create() {
    this.grazetimer = 0;
    this.grazetpfactor = 1;
    this.grazetimefactor = 1;
    this.grazesizefactor = 1;
    this.grazecount = 0;
    // Chapter 2 armour that changes grazing: TensionBow (15) TP, Silver Watch (14) time,
    // Pink Ribbon (3) and TwinRibbon (9) a wider graze area.
    const arm = S.scr_armorcheck_equipped_party;
    this.grazetpfactor += arm(15) * 0.1;
    this.grazetimefactor += arm(14) * 0.1;
    this.grazesizefactor += arm(3) * 0.2;
    this.grazesizefactor += arm(9) * 0.25;
    if (this.grazetimefactor > 3) this.grazetimefactor = 3;
    if (this.grazetpfactor > 3) this.grazetpfactor = 3;
    if (this.grazesizefactor > 3) this.grazesizefactor = 3;
    this.image_xscale = this.grazesizefactor;
    this.image_yscale = this.grazesizefactor;
    const h = first('obj_heart');
    if (h) {
      this.x = h.x + 10;
      this.y = h.y + 10;
    }
  }
  endStep() {
    const h = first('obj_heart');
    if (h) {
      this.x = h.x + 10;
      this.y = h.y + 10;
    } else instance_destroy(this);
  }
  draw() {
    if (this.grazetimer > 0) {
      draw_sprite_ext(this.sprite_index, 0, this.x, this.y, 1, 1, 0, 0xffffff, this.grazetimer / 6);
      draw_sprite_ext(this.sprite_index, 3, this.x, this.y, 1, 1, 0, 0xffffff, this.grazetimer / 6 - 0.2);
      if (this.image_xscale > 1) {
        draw_sprite_ext(this.sprite_index, 0, this.x, this.y, this.image_xscale, this.image_yscale, 0, 0xffffff, this.grazetimer / 6);
        draw_sprite_ext(this.sprite_index, 3, this.x, this.y, this.image_xscale, this.image_yscale, 0, 0xffffff, this.grazetimer / 6 - 0.2);
      }
    }
    this.grazetimer -= 1;
  }
  // Only active bullets graze; holding a graze gives 1/30 per frame.
  collision_obj_collidebullet(b) {
    if (!(b.active > 0.5)) return;
    const tpf = this.grazetpfactor ?? 1, tf = this.grazetimefactor ?? 1;
    if (global.inv < 0) {
      if (b.grazed == 1) {
        S.scr_tensionheal(b.grazepoints / 30 * tpf);
        if (global.turntimer >= 10) global.turntimer -= b.timepoints / 30 * tf;
        for (const gb of instancesOf('obj_grazebox')) {
          if (gb.grazetimer >= 0 && gb.grazetimer < 4) gb.grazetimer = 3;
          if (gb.grazetimer < 2) gb.grazetimer = 2;
        }
      }
      if (b.grazed == 0) {
        for (const gb of instancesOf('obj_grazebox')) gb.grazecount = (gb.grazecount ?? 0) + 1;
        b.grazed = 1;
        S.scr_tensionheal(b.grazepoints * tpf);
        if (global.turntimer >= 10) global.turntimer -= b.timepoints * tf;
        for (const c of instancesOf('obj_battlecontroller')) c.grazenoise = 1;
        for (const gb of instancesOf('obj_grazebox')) gb.grazetimer = 10;
      }
    }
  }
}
defineObject('obj_grazebox', Grazebox);

// Where the SOUL leaves from / returns to: Kris + (10, 40). Kris stands at (80, 100).
function krisPoint() {
  const k = first('obj_herokris');
  return k ? [k.x + 10, k.y + 40] : [view_x() + 90, view_y() + 140];
}

export class MoveHeart extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_dodgeheart';
  }
  create() {
    this.burst = 0;
    this.shift = 1;
    this.image_alpha = 0;
    this.flytime = 8;
    const hm = first('obj_heartmarker'), gt = first('obj_growtangle');
    if (hm) {
      this.distx = hm.x;
      this.disty = hm.y;
    } else if (!gt) {
      this.distx = view_x() + 310;
      this.disty = view_y() + 160;
    } else {
      // Chapter 3: the SOUL flies to the centre of the box.
      this.distx = gt.x - 10;
      this.disty = gt.y - 10;
    }
    this.dist = point_distance(this.x, this.y, this.distx, this.disty);
    move_towards_point(this, this.distx, this.disty, this.dist / this.flytime);
    this.alarm[0] = this.flytime;
    this.image_speed = 0;
    instance_create(this.x, this.y, 'obj_heartburst');
  }
  step() {
    this.image_alpha += 0.334;
  }
  alarm0() {
    this.x = this.distx;
    this.y = this.disty;
    if (!first('obj_heart')) instance_create(this.x, this.y, 'obj_heart');
    instance_destroy(this);
  }
  draw() {
    draw_self(this);
    drawSoulHat(this);
  }
}
defineObject('obj_moveheart', MoveHeart);

export class ReturnHeart extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_dodgeheart';
  }
  create() {
    this.burst = 0;
    this.shift = 1;
    this.image_alpha = 1;
    this.flytime = 8;
    [this.distx, this.disty] = krisPoint();
    this.dist = point_distance(this.x, this.y, this.distx, this.disty);
    move_towards_point(this, this.distx, this.disty, this.dist / this.flytime);
    this.alarm[0] = this.flytime;
    this.image_speed = 0;
  }
  alarm0() {
    this.x = this.distx;
    this.y = this.disty;
    instance_create(this.x, this.y, 'obj_heartburst');
    instance_destroy(this);
  }
}
defineObject('obj_returnheart', ReturnHeart);

export class HeartBurst extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_heartoutline';
  }
  create() {
    this.burst = 0;
  }
  draw() {
    this.burst += 1;
    const b = this.burst, x = this.xstart + 9, y = this.ystart + 9;
    draw_sprite_ext('spr_heartoutline2', 0, x, y, 0.25 + b, 0.25 + b / 2, 0, 0xffffff, 0.8 - b / 6);
    draw_sprite_ext('spr_heartoutline', 0, x, y, 0.25 + b / 1.5, 0.25 + b / 3, 0, 0xffffff, 1 - b / 6);
    draw_sprite_ext('spr_heartoutline', 0, x, y, 0.2 + b / 2.5, 0.2 + b / 5, 0, 0xffffff, 1.2 - b / 6);
    if (this.burst > 10) instance_destroy(this);
  }
}
defineObject('obj_heartburst', HeartBurst);

export function scr_moveheart() {
  const [x, y] = krisPoint();
  return instance_create(x, y, 'obj_moveheart');
}
defineScript('scr_moveheart', scr_moveheart);

