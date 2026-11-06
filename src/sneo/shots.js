// The yellow SOUL's shots and their effects: obj_yheart_shot (Create, Step, Other_10/11),
// obj_yshot_anim, obj_yheart_shot_afterimage, obj_yheart_sneo_particle, obj_supercharge_end,
// obj_afterimage_cut (scr_afterimage_cut), obj_basicbullet_sneo (+ its shot collision).
// Shootable bullets define collision_obj_yheart_shot(shot) (the runtime runs collision events).
import {
  global, Instance, defineObject, instance_create, instance_destroy, instance_exists, instancesOf,
  draw_self, d3d_set_fog, sprite_get_width, sprite_get_xoffset, sprite_get_yoffset,
  draw_sprite_part_ext, lerp, sprite_get_number,
} from './rt.js?v=20261106220732';
import { first, camerax, cameray, scr_bullet_init, lerp_ease_out } from './common.js?v=20261106220732';
import { CollideBullet } from './bullets.js?v=20261106220732';

const sneo = () => first('obj_spamton_neo_enemy');

export class YHeartShot extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_yheart_shot';
  }
  create() {
    this.f = 2;
    this.makeanim = 1;
    this.hspeed = 8 * this.f;
    this.big = 0;
    this.damage = 1;
    this.sucked = 0;
    this.trail = 0;
    this.trail_timer = 0;
    const s = sneo();
    if (s && s.upgrade > 0) {
      this.big = 1;
      this.sprite_index = 'spr_yheart_bigshot';
      this.hspeed = 9;
      this.friction = -0.4;
      this.image_alpha = 0.5;
      this.image_xscale = 0.1;
      this.image_yscale = 2;
      this.image_index = 0;
      this.damage = 4;
      s.bigshotused = 1;
    }
  }
  step() {
    const f = this.f;
    if (this.big === 1) {
      this.damage = 4;
      this.image_alpha += 0.1 * f;
      if (this.image_xscale < 1) this.image_xscale += 0.1 * f;
      if (this.image_yscale > 1) this.image_yscale -= 0.1 * f;
    }
    if (this.x >= camerax() + 700 || this.y >= cameray() + 520 || this.y <= cameray() - 40) {
      instance_destroy(this);
      return;
    }
    if (this.trail === 1) {
      this.trail_timer += 1;
      if (this.trail_timer === 2) {
        this.trail_timer = 0;
        const after = instance_create(this.x - 10, this.y, 'obj_yheart_shot_afterimage');
        after.image_speed = 0;
        after.sprite_index = 'spr_yheart_bigshot_trail';
        after.image_xscale = 0.8;
        after.image_yscale = 0.5;
        after.image_index = this.image_index;
        after.depth = this.depth;
      }
    }
  }
  // Other_10: hit something (with the hit flash).
  user0() {
    if (this.makeanim) {
      const a = instance_create(this.x, this.y, 'obj_yshot_anim');
      a.sprite_index = 'spr_yheart_shot_hit';
      if (this.big === 1) { a.image_xscale = 3; a.image_yscale = 3; }
      const h = first('obj_heart');
      if (h) a.depth = h.depth - 100;
    }
    instance_destroy(this);
  }
  // Other_11: blocked (no effect).
  user1() {
    const a = instance_create(this.x, this.y, 'obj_yshot_anim');
    a.sprite_index = 'spr_yheart_shot_hit_noeffect';
    instance_destroy(this);
  }
}
defineObject('obj_yheart_shot', YHeartShot);

class YShotAnim extends Instance {
  constructor() { super(); this.sprite_index = 'spr_yheart_shot_hit'; }
  create() { this.image_speed = 0.25 * 2; }
  step() { if (this.image_index > sprite_get_number(this.sprite_index) - 1) instance_destroy(this); }
  animationEnd() { instance_destroy(this); }
}
defineObject('obj_yshot_anim', YShotAnim);

class YShotAfterimage extends Instance {
  step() {
    this.image_alpha -= 0.1;
    if (this.image_alpha < 0) instance_destroy(this);
  }
}
defineObject('obj_yheart_shot_afterimage', YShotAfterimage);

class YHeartParticle extends Instance {
  constructor() { super(); this.sprite_index = 'spr_yheart_charge'; }
  create() {
    this.image_xscale = 1 + Math.random() * 2;
    this.image_yscale = 1 + Math.random() * 2;
    this.timer = 0;
  }
  step() {
    this.timer += 1;
    this.image_xscale = lerp(this.image_xscale, 0, this.timer / 20);
    this.image_yscale = lerp(this.image_yscale, 0, this.timer / 20);
    if (this.timer === 20) instance_destroy(this);
  }
}
defineObject('obj_yheart_sneo_particle', YHeartParticle);

class SuperchargeEnd extends Instance {
  constructor() { super(); this.sprite_index = 'spr_supercharge_end'; }
  create() {
    this.image_speed = 0.5;
    this.timer = 0;
    this.image_xscale = 1.5;
    this.image_yscale = 1.5;
  }
  // Its Draw event never calls draw_self, so the sprite is not drawn: it only times itself out.
  draw() {
    this.timer += 1;
    if (this.timer === 16 || this.timer >= 96) instance_destroy(this);
  }
}
defineObject('obj_supercharge_end', SuperchargeEnd);

// scr_afterimage_cut(): a white flash of the bullet, then its four quarters fly apart.
class AfterimageCut extends Instance {
  create() {
    this.faderate = 0.1;
    this.siner = 0;
    this.image_speed = 0;
    this.flash = false;
  }
  user0() {
    this.width = sprite_get_width(this.sprite_index);
    this.height = sprite_get_width(this.sprite_index);
    this.xo = sprite_get_xoffset(this.sprite_index);
    this.yo = sprite_get_yoffset(this.sprite_index);
  }
  draw() {
    if (this.flash) {
      d3d_set_fog(true, 0xffffff);
      draw_self(this);
      d3d_set_fog(false);
      this.flash = false;
      return;
    }
    this.siner += 1;
    const hw = this.width / 2, hh = this.height / 2;
    const m = lerp_ease_out(0, this.sprite_height / 2, (this.siner + 2) / 10, 1);
    this.image_alpha -= this.faderate;
    const xs = this.image_xscale, ys = this.image_yscale, xo = this.xo * xs / 2, yo = this.yo * ys / 2;
    const s = this.sprite_index, i = this.image_index, c = this.image_blend, a = this.image_alpha;
    draw_sprite_part_ext(s, i, 0, 0, hw, hh, this.x - m - xo, this.y - m - yo, xs, ys, c, a);
    draw_sprite_part_ext(s, i, hw, 0, hw, hh, this.x + m - xo, this.y - m - yo, xs, ys, c, a);
    draw_sprite_part_ext(s, i, 0, hh, hw, hh, this.x - m - xo, this.y + m - yo, xs, ys, c, a);
    draw_sprite_part_ext(s, i, hw, hh, hw, hh, this.x + m - xo, this.y + m - yo, xs, ys, c, a);
    if (this.image_alpha < 0) instance_destroy(this);
  }
}
defineObject('obj_afterimage_cut', AfterimageCut);
export function scr_afterimage_cut(self) {
  const a = instance_create(self.x, self.y, 'obj_afterimage_cut');
  a.sprite_index = self.sprite_index;
  a.image_index = self.image_index;
  a.image_blend = self.image_blend;
  a.image_speed = 0;
  a.depth = self.depth;
  a.image_xscale = self.image_xscale;
  a.image_yscale = self.image_yscale;
  a.image_angle = self.image_angle;
  a.user0();
  return a;
}

// obj_basicbullet_sneo: the parent of most of his bullets (damage = his AT * 5).
export class BasicBulletSneo extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_bullet0';
  }
  create() {
    scr_bullet_init(this);
    this.element = 6;
    this.fluffyguarddestroysthis = 1;
    this.f = 2;
    this.destroyable = 0;
    this.angle_speed = 0;
    this.destroypoints = 1;
    const s = sneo();
    if (s) this.damage = global.monsterat[s.myself] * 5;
    this.grazepoints = 3;
  }
  step() {
    if (this.x >= 740 || this.x <= -100 || this.y >= 580 || this.y <= -100) { instance_destroy(this); return; }
    this.direction += this.angle_speed;
    this.image_angle = this.direction;
  }
  collision_obj_yheart_shot(shot) {
    if (this.destroyable == 1) {
      if (shot.big == 0) shot.user0();
      const anim = instance_create(this.x, this.y, 'obj_yshot_anim');
      anim.image_xscale = this.image_xscale;
      anim.image_yscale = this.image_yscale;
      anim.sprite_index = 'spr_yheart_shot_hit3';
      instance_destroy(this);
    } else if (this.destroyable == -1) shot.user0();
  }
}
defineObject('obj_basicbullet_sneo', BasicBulletSneo);

