// FACE ATTACK (rr 7, "SneoFaceAttack"): obj_sneo_bulletcontroller type 12, obj_sneo_faceattack (the
// face, plus its eyes / nose / mouth: Create, Destroy, Step_0, Step_2, Collision_obj_yheart_shot,
// Other_10, Other_12, Draw), obj_sneo_faceattack_target, and what the parts fire:
// obj_werewire_bullet_lasercircle / obj_werewire_bullet_lasersquare (eyes), nose bullets and mouth
// wisps (obj_regularbullet), obj_boxing_crescent (a part breaking).
// The obj_yheart_shot Step hook (shots ring a bell and vanish at camerax() + 500..530 while the face
// is up) runs from the first face's step.
import {
  global, Instance, defineObject, instance_create, instance_destroy, instance_find, instancesOf,
  random, random_range, merge_color, point_direction, lerp, clamp, draw_self, draw_sprite_ext,
  snd_play, bgr, sprite_exists,
} from '../rt.js?v=20261114041601';
import {
  first, camerax, cameray, i_ex, eq, lt, defineShared, scr_bullet_init, scr_bullet_inherit, scr_darksize,
  scr_shakescreen, scr_remapvalue, scr_movetowards, scr_ease_in, scr_ease_out,
} from '../common.js?v=20261114041601';
import { RegularBullet } from '../bullets.js?v=20261114041601';
import { BasicBulletSneo } from '../shots.js?v=20261114041601';
import { SneoBulletController } from './heads.js?v=20261114041601';
import { STEP_HOOKS } from '../enemy.js?v=20261114041601';

const sneo = () => first('obj_spamton_neo_enemy');
const heart = () => first('obj_heart');
const box = () => first('obj_growtangle');

// obj_spamton_neo_enemy Create_0 fields the face attack uses (enemy.js does not define them).
function faceFields(s) {
  if (!s) return;
  if (s.eyeshp === undefined) { s.eyeshp = 16; s.nosehp = 16; s.mouthhp = 16; }
  if (s.facebroken === undefined) s.facebroken = 0;
}
STEP_HOOKS.push(faceFields);

// The face part's hp kept on the enemy (eyes 1, nose 2, mouth 3).
const HP_FIELD = { 1: 'eyeshp', 2: 'nosehp', 3: 'mouthhp' };

// ---------------------------------------------------------------- obj_sneo_bulletcontroller type 12
SneoBulletController.prototype.type12 = function () {
  const s = this.sneo;
  if (!s || !s.alive) return;
  faceFields(s);
  this.atimer += 1;
  if (this.atimer === 1 && s.facebroken === 2) {
    global.turntimer = 170;
    s.facebroken = 1;
  }
  if (this.atimer < 20) {
    s.x += 10;
    s.vinex = scr_ease_in(Math.min(10, this.atimer) / 10, 5) * 300;
    s.x = s.xstart + scr_ease_in(this.atimer / 20, 2) * 300;
  }
  if (this.atimer === 20) {
    const face = instance_create(camerax() + 424, cameray() + 100, 'obj_sneo_faceattack');
    face.target = this.target;
    face.damage = this.damage;
    face.special = this.hellmode;
    if (s.faceattackcount === 1) face.first_time = true;
    face.user0();
    this.facetimeincrease = 0;
    if (s.eyeshp <= 0) this.facetimeincrease += 1;
    if (s.nosehp <= 0) this.facetimeincrease += 1;
    if (s.mouthhp <= 0) this.facetimeincrease += 1;
    const fti = this.facetimeincrease;
    for (const f of instancesOf('obj_sneo_faceattack')) {
      if (f.type !== 1) {
        if (fti === 1) f.timer += 20;
        if (fti === 2 || fti === 3) f.timer += 50;
      }
      if (f.type === 1) {
        if (fti === 1) f.timer += 20;
        if (fti === 2 || fti === 3) f.timer += 20;
      }
    }
  }
  const f0 = first('obj_sneo_faceattack');
  if (global.turntimer > 80 && f0 && f0.init === 1 && s.facebroken === 0) {
    let a = 0;
    for (const f of instancesOf('obj_sneo_faceattack')) if (f.type !== 0 && f.broken === 0) a = 1;
    if (a === 0) global.turntimer = 80;
  }
  if (global.turntimer < 21 && global.turntimer > 1) {
    for (const f of instancesOf('obj_sneo_faceattack')) {
      f.image_alpha -= 0.1;
      if (lt(f.image_alpha, 0)) instance_destroy(f);
    }
    s.x -= 10;
    const st = global.turntimer - 1;
    s.vinex = scr_ease_out(Math.min(10, st) / 10, 5) * 50;
    s.x = s.xstart + scr_ease_out(st / 20, 4) * 200;
    s.y = lerp(s.y, s.___myremembery ?? s.y, st / 20);
  }
  if (eq(global.turntimer, 1)) {
    if (s.facebroken === 1) s.facebroken = 0;
    s.x = s.xstart;
  }
};

// obj_yheart_shot Step_0: a shot past the face's edge rings a bell and vanishes.
function shotBell() {
  const f0 = first('obj_sneo_faceattack');
  if (!f0 || f0.init !== 1) return;
  for (const shot of instancesOf('obj_yheart_shot')) {
    if (shot.alive && shot.x >= camerax() + 500 && shot.x < camerax() + 530) {
      shot.user0();
      snd_play('snd_bell');
    }
  }
}

// ---------------------------------------------------------------- obj_sneo_faceattack
// type 0 = the face (the "boss"), 1 = eyes (lasers), 2 = nose (bullets), 3 = mouth (wisps).
class FaceAttack extends BasicBulletSneo {
  constructor() {
    super();
    this.sprite_index = null;
  }
  create() {
    scr_bullet_init(this);
    Object.assign(this, {
      element: 6, type: 0, timer: 0, hp: 16, init: 0, image_speed: 0, image_index: 0, image_alpha: 0, broken: 0,
      invincibilitytimer: 0, hurtflashtimer: 0, shootflashtimer: 0, explodetimer: 0, laserinit: 0, noseinit: 0,
      eyesinit: 0, boss: 1, destroytarget: 0, intro_timer: 0, first_time: false, smashspeed: 25, growtangle_x: 0,
      heart_recoil: 0, special: 0, targ: null, shake: 0,
    });
    scr_darksize(this);
    this.blend = merge_color(bgr(32768), bgr(65280), 0.5);
    this.blue_col = merge_color(bgr(15245824), bgr(16776960), 0.25);
  }
  step() {
    this.faceStep();
    if (this === first('obj_sneo_faceattack')) shotBell();
  }
  faceStep() {
    const type = this.type;
    if (this.init === 0) {
      if (type === 0) this.sprite_index = 'spr_spamtonneo_faceAttack_face';
      if (type === 1) this.sprite_index = 'spr_spamtonneo_faceAttack_eyes';
      if (type === 2) this.sprite_index = 'spr_spamtonneo_faceAttack_nose';
      if (type === 3) this.sprite_index = 'spr_spamtonneo_faceAttack_mouth';
      if (!this.first_time) this.user2();
      if (type >= 1) {
        this.image_index = 1;
        if (this.hp <= 0) {
          this.broken = 1;
          this.image_index = 2;
        }
      }
      if (type === 0) this.depth += 10;
      this.init = 1;
      if (this.first_time) {
        this.image_alpha = 1;
        this.xstart = this.x;
        this.growtangle_x = box()?.x ?? 0;
        this.x = camerax() + 730;
      }
    }
    if (this.first_time) {
      if (this.intro_timer === 0) {
        this.x -= this.smashspeed;
        this.smashspeed += 0.5;
        if (this.x < this.xstart) {
          this.intro_timer = 15;
          if (type === 0) {
            scr_shakescreen();
            snd_play('snd_closet_impact');
          }
        }
      }
      if (this.intro_timer > 0) {
        this.intro_timer -= 1;
        if (this.intro_timer === 0) {
          this.first_time = false;
          this.x = this.xstart;
          if (type === 0) {
            this.intro_timer = -1;
            for (const g of instancesOf('obj_growtangle')) g.x = this.growtangle_x;
          }
          this.user2();
        } else {
          const push = Math.sin(Math.PI * (this.intro_timer / 15)) * 20;
          this.x = this.xstart - push;
          if (type === 0) for (const g of instancesOf('obj_growtangle')) g.x = this.growtangle_x - push;
        }
      }
      if (this.first_time) return;
    }
    if (this.broken === 1 && type !== 0 && this.destroytarget === 0) {
      if (this.targ) instance_destroy(this.targ);
      this.destroytarget = 1;
    }
    this.timer += 1;
    if (lt(this.image_alpha, 1) && global.turntimer > 21) this.image_alpha += 0.1;
    if (this.explodetimer > 0) {
      let xx = 0, yy = 0;
      if (type === 1) { xx = 58; yy = 32; }
      if (type === 2) { xx = 30; yy = 64; }
      if (type === 3) { xx = 48; yy = 102; }
      if (this.explodetimer % 2 === 0) {
        const cres = instance_create(this.x + xx - 25 + random(50), this.y + yy - 25 + random(50), 'obj_boxing_crescent');
        cres.depth = this.depth - 100;
      }
      this.explodetimer -= 1;
    }
    let brokencounter = 0;
    for (const f of instancesOf('obj_sneo_faceattack')) if (f.broken === 1) brokencounter += 1;
    const h = heart();
    // Eyes: a laser at the SOUL every 3 frames from timer 30 to 50.
    if (type === 1 && this.broken === 0) {
      if (this.timer === 30 || this.laserinit === 0) {
        this.brokenmod = brokencounter;
        this.lasex = -10 + this.x + 56;
        this.lasey = this.y + 32;
        if (h) this.laserdir = point_direction(this.lasex, this.lasey, h.x + 10, h.y + 10);
        else this.laserdir ??= 180;
        this.laserinit = 1;
      }
      if (this.timer >= 30 && this.timer % 3 === 0 && global.turntimer > 21) {
        const laser = instance_create(this.lasex, this.lasey, 'obj_werewire_bullet_lasercircle');
        scr_bullet_inherit(this, laser);
        laser.my_angle = this.laserdir;
        if (this.brokenmod === 2) laser.my_angle = this.laserdir + this.brokenmod * random_range(-8, 8);
        laser.my_speed = 7;
        laser.my_accel = 0 + this.brokenmod * 0.25;
        laser.image_yscale = 2;
        laser.my_angle_change = 0;
        laser.target = this.target;
        laser.damage = this.damage;
        laser.element = 6;
        this.shootflashtimer = 3;
      }
      if (this.timer === 50) this.timer = 0 + this.brokenmod * 5;
    }
    // Nose: three volleys of three bullets that fall back to the left.
    if (type === 2 && this.broken === 0) {
      if (this.timer >= 70 && this.noseinit === 0) {
        this.brokenmod = brokencounter;
        this.noseinit = 1;
      }
      if (this.timer >= 80 && this.timer % 5 === 0) {
        const randomvspeed = random_range(-2, 2);
        for (let i = 0; i < 3; i++) {
          const bullet = instance_create(this.x, this.y, 'obj_regularbullet');
          if (!bullet.alive) continue;
          scr_bullet_inherit(this, bullet);
          bullet.sprite_index = 'spr_spamtonneo_faceAttack_nose_bullet';
          bullet.mask_index = 'spr_spamtonneo_faceAttack_nose_bullet_mask';
          scr_darksize(bullet);
          bullet.gravity = 0.6;
          bullet.gravity_direction = 180;
          bullet.friction = 0.4;
          bullet.vspeed = -4 + i * 4.5;
          if (this.brokenmod === 2) bullet.vspeed += randomvspeed;
          bullet.hspeed = -3;
          bullet.target = this.target;
          bullet.damage = this.damage;
          bullet.element = 6;
          this.shootflashtimer = 3;
        }
      }
      if (this.timer === 90) this.timer = 26 + this.brokenmod * 10;
    }
    // Mouth: open, a wisp every 6 frames from timer 10 to 42.
    if (type === 3 && this.broken === 0) {
      if (this.timer >= 10 && this.eyesinit === 0) {
        this.eyesinit = 1;
        this.brokenmod = brokencounter;
      }
      if (this.timer >= 10) this.image_index = 3;
      if (this.timer >= 10 && this.timer % 6 === 0) {
        const bullet = instance_create(this.x + 30, this.y + 98, 'obj_regularbullet');
        if (bullet.alive) {
          bullet.sprite_index = 'spr_spamtonneo_faceAttack_wisp';
          scr_bullet_inherit(this, bullet);
          bullet.hspeed = random_range(-4, -7);
          bullet.vspeed = random_range(6, -2);
          const g = box();
          if (h && g && h.y >= g.y) bullet.vspeed += 1;
          bullet.gravity = -0.2;
          bullet.target = this.target;
          bullet.damage = this.damage;
          bullet.element = 6;
          this.shootflashtimer = 3;
        }
      }
      if (this.timer === 42) {
        this.image_index = 1;
        this.timer = -40 + this.brokenmod * 20;
      }
    }
    if ((type === 1 || type === 2) && this.broken === 1) this.image_index = 2;
    if (type === 3 && this.broken === 1) this.image_index = 4;
  }
  // Step_2: the face's intro push shoves the SOUL along with the box.
  endStep() {
    if (this.type !== 0 || (this.intro_timer === 0 && this.heart_recoil === 0)) return;
    const h = heart(), g = box();
    if (!h || !g) return;
    const half = g.sprite_width / 2;
    if (this.intro_timer === -1) {
      if (h.x <= g.x - half + 4) this.heart_recoil = 10;
      this.intro_timer = 0;
    } else if (this.intro_timer > 0) {
      if (this.heart_recoil === 0 && this.intro_timer > 7 && h.x >= g.x + half - 24)
        this.heart_recoil = scr_remapvalue(8, 15, this.intro_timer, 0, -10);
    }
    if (this.heart_recoil !== 0) {
      h.x += this.heart_recoil;
      this.heart_recoil = scr_movetowards(this.heart_recoil, 0, 1);
    }
    h.x = clamp(h.x, g.x - half + 2, g.x + half - 24);
  }
  collision_obj_yheart_shot(shot) {
    const type = this.type;
    if (type === 0 || lt(this.image_alpha, 0.9)) return;
    if (this.broken === 1) {
      snd_play('snd_bell');
      shot.user0();
      return;
    }
    if (this.invincibilitytimer > 0 && shot.big == 0) {
      instance_destroy(shot);
      return;
    }
    this.shake = 6;
    const s = sneo();
    const field = HP_FIELD[type];
    if (s) {
      faceFields(s);
      let amount = 1;
      if (shot.big != 0) amount = s.hellmode == 1 ? 2 : 4;
      s[field] -= amount;
    }
    snd_play('snd_damage');
    this.invincibilitytimer = 10;
    this.hurtflashtimer = 3;
    if (s && s[field] <= 0) {
      this.broken = 1;
      this.image_index = 2;
      snd_play('snd_rocket');
      this.explodetimer = 16;
    }
    shot.user0();
  }
  // Other_10: the first face makes the eyes, nose and mouth (hp from the enemy; -1 after a full break).
  user0() {
    if (this !== instance_find('obj_sneo_faceattack', 0)) {
      this.boss = 0;
      return;
    }
    this.boss = 1;
    const s = sneo();
    let eyeshp = 16, nosehp = 16, mouthhp = 16;
    if (s) {
      faceFields(s);
      eyeshp = s.eyeshp;
      nosehp = s.nosehp;
      mouthhp = s.mouthhp;
      if (s.facebroken === 1) eyeshp = nosehp = mouthhp = -1;
    }
    const part = (hp, type) => {
      const p = instance_create(this.x, this.y, 'obj_sneo_faceattack');
      p.hp = hp;
      p.type = type;
      p.target = this.target;
      p.damage = this.damage;
      p.first_time = this.first_time;
      return p;
    };
    this.eyes = part(eyeshp, 1);
    this.nose = part(nosehp, 2);
    this.mouth = part(mouthhp, 3);
  }
  // Other_12: the part's (invisible) target marker.
  user2() {
    let xx = 0, yy = 0;
    if (this.type === 1) { xx = 62; yy = 32; }
    if (this.type === 2) { xx = 34; yy = 64; }
    if (this.type === 3) { xx = 52; yy = 102; }
    if (this.type !== 0) {
      this.targ = instance_create(this.x + xx, this.y + yy, 'obj_sneo_faceattack_target');
      this.targ.depth = this.depth - 999;
    }
  }
  draw() {
    if (this.init !== 1) return;
    const type = this.type, s = sneo();
    const hp = type >= 1 && s ? s[HP_FIELD[type]] : undefined;
    if (type >= 1 && hp > 0) this.image_blend = merge_color(bgr(8388736), this.blue_col, hp / 16);
    if ((type === 1 || type === 2) && (hp < 1 || this.image_index === 2)) this.image_blend = 0xffffff;
    if (type === 3 && (hp < 1 || this.image_index === 4)) this.image_blend = 0xffffff;
    if (this.shootflashtimer > 0) {
      this.image_blend = bgr(65535);
      this.shootflashtimer -= 1;
    }
    if (this.hurtflashtimer > 0) {
      this.image_blend = bgr(255);
      this.hurtflashtimer -= 1;
    }
    let hidesprite = 0;
    if (this.invincibilitytimer > 0) {
      if ([10, 9, 6, 5, 3, 2].includes(this.invincibilitytimer)) hidesprite = 1;
      this.invincibilitytimer -= 1;
      this.image_blend = bgr(255);
    }
    if (hidesprite === 0) draw_self(this);
    draw_sprite_ext('spr_battlebg_0', 0, this.x - 3, this.y + 70, 2.4, 2, 0, this.blend, 1);
  }
  onDestroy() {
    const s = sneo();
    if (this.boss === 1 && s && s.eyeshp <= 0 && s.nosehp <= 0 && s.mouthhp <= 0) {
      s.eyeshp = 16;
      s.nosehp = 16;
      s.mouthhp = 16;
      s.facebroken = 2;
    }
    for (const t of instancesOf('obj_sneo_faceattack_target')) instance_destroy(t);
  }
}
defineObject('obj_sneo_faceattack', FaceAttack);

// obj_sneo_faceattack_target: an invisible marker on each part.
class FaceAttackTarget extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_boxing_crescent';
    this.visible = false;
  }
  create() {
    this.image_speed = 0;
    this.image_xscale = 0.4;
    this.image_yscale = 0.4;
    this.image_blend = bgr(255);
  }
}
defineObject('obj_sneo_faceattack_target', FaceAttackTarget);

// obj_boxing_crescent: a small burst (a part breaking).
class BoxingCrescent extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_boxing_crescent';
  }
  create() {
    this.image_speed = 0.5;
    this.image_xscale = 2;
    this.image_yscale = 2;
    this.timer = 0;
  }
  step() {
    if (this.image_index >= 3) instance_destroy(this);
  }
}
defineShared('obj_boxing_crescent', BoxingCrescent);

// The SNEO laser sprites (spr_bullet_laser_square_sneo / spr_bullet_laser_front_sneo); a build
// without them falls back to spr_bullet_laser_square.
const laserSprite = name => (sprite_exists(name) ? name : 'spr_bullet_laser_square');

// obj_werewire_bullet_lasercircle: the eye's muzzle; it fires one obj_werewire_bullet_lasersquare.
class LaserCircle extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_bullet_laser_circle';
  }
  create() {
    scr_bullet_init(this);
    Object.assign(this, {
      grazepoints: 3, destroyonhit: 0, image_xscale: 0, image_yscale: 0, timer: 0, tri: 1, tri_angle: 20, my_angle: 180,
      my_speed: 4, my_accel: 0, my_length: 1, my_angle_change: 0, part_count: 0, siner: 0, m: 2, parent: -1,
    });
  }
  step() {
    const m = this.m;
    if (this.parent !== -1 && this.parent && this.parent.alive) {
      this.x = this.parent.x - 32;
      this.y = this.parent.y;
    }
    this.siner += 0.5;
    this.timer += 1;
    if (this.timer <= 6 / m) {
      this.image_xscale += 0.4 * m;
      this.image_yscale += 0.4 * m;
    }
    if (this.timer > 6 / m && this.timer <= this.my_length + 3) {
      const laser = instance_create(this.x, this.y, 'obj_werewire_bullet_lasersquare');
      scr_bullet_inherit(this, laser);
      this.image_xscale -= Math.sin(this.siner * 1.3 * m) * 0.2;
      this.image_yscale -= Math.sin(this.siner * 1.3 * m) * 0.2;
      laser.image_angle = this.my_angle;
      laser.speed = this.my_speed;
      laser.direction = this.my_angle;
      laser.friction = -this.my_accel;
      laser.image_yscale = 1;
      laser.my_angle_change = this.my_angle_change;
      laser.sprite_index = i_ex('obj_spamton_neo_enemy') ? laserSprite('spr_bullet_laser_square_sneo') : 'spr_bullet_laser_square';
      const front = i_ex('obj_spamton_neo_enemy') ? laserSprite('spr_bullet_laser_front_sneo') : laserSprite('spr_bullet_laser_front');
      if (this.timer === 3) laser.sprite_index = front;
      if (this.timer === this.my_length + 3) {
        laser.sprite_index = front;
        laser.image_index = 1;
      }
    } else {
      this.image_xscale -= 0.1 * m;
      this.image_yscale -= 0.1 * m;
      if (this.image_xscale <= 0 && this.image_yscale <= 0) instance_destroy(this);
    }
  }
}
defineShared('obj_werewire_bullet_lasercircle', LaserCircle);

class LaserSquare extends RegularBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_bullet_laser_square';
  }
  create() {
    scr_bullet_init(this);
    Object.assign(this, {
      destroyonhit: 0, grazepoints: 2, init_con: 0, init_timer: 0, circle_size: 1, image_xscale: 2, image_yscale: 3,
      image_speed: 0, my_angle_change: 0, m: 2, stretch: 1,
    });
  }
  step() {
    if (this.stretch === 1) this.image_xscale = 2 + this.speed / (10 * this.m);
    if (this.x <= -100) { instance_destroy(this); return; }
    this.direction += this.my_angle_change;
    this.image_angle = this.direction;
  }
}
defineShared('obj_werewire_bullet_lasersquare', LaserSquare);
