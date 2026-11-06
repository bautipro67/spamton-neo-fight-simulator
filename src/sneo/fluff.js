// obj_sneo_tiny_ralsei: Ralsei's FluffyGuard ACT. Up to 4 fluff balls orbit the SOUL during the
// bullet phases and soak up bullets: 30 HP each, 10 frames of invulnerability after a hit (they
// blink), and holding X (button2) slows the orbit. They fade out when their HP runs out.
// (obj_fluffyguard is an older version of this object that nothing creates.)
import {
  Instance, defineObject, instance_destroy, merge_color, lengthdir_x, lengthdir_y, button2_h, random,
  snd_play, snd_is_playing, event_user, isA,
} from './rt.js?v=20261106142557';

// A bullet that matches several collision events of the fluff ball only gets the most specific
// one: the GML's specific events (obj_basicbullet_sneo, the wire heart...) only hurt the ball and
// never destroy the attack, so the generic ones skip bullets that have their own event.
const OWN_EVENT = ['obj_sneo_rotatingwall_bomb', 'obj_sneo_wallbullet_new', 'obj_basicbullet_sneo', 'obj_sneo_lilguy',
  'obj_sneo_heartattack', 'obj_pipis_egg_bullet', 'obj_sneo_biglaser', 'obj_sneo_bigshot', 'obj_regularbullet'];
const OWN_EVENT_SNEO = ['obj_spamtonshot', 'obj_sneo_heatattack_bullet', 'obj_sneo_lilguy_bullet', 'obj_sneo_wireheart',
  'obj_sneo_mmx_spreadshot'];
import { first, snd_play_pitch } from './common.js?v=20261106142557';
import { scr_afterimage_cut } from './shots.js?v=20261106142557';

const RED = 0xff0000, WHITE = 0xffffff;

class TinyRalsei extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_fluffy_guard_new';
  }
  create() {
    Object.assign(this, {
      timer: 0, con: 0, hpmax: 30, hp: 30, active: 1, destroytimer: 0, frametype: 0, myspeed: 6, length: 27,
      place: 0, xhold: 0,
    });
    this.image_index = 0; // GML sets 12: the sprite has 1 frame, so it draws frame 0
    this.image_speed = 0;
  }
  // Step_2
  endStep() {
    this.image_blend = merge_color(RED, WHITE, this.hp / this.hpmax);
    if (this.hp < 1) {
      if (this.active == 1) snd_play('snd_dtrans_flip');
      this.active = 0;
      this.image_alpha -= 0.05;
      if (this.image_alpha < 0.01) instance_destroy(this);
      return;
    }
    const h = first('obj_heart');
    if (h) {
      this.depth = h.depth - 1;
      if (button2_h() && this.xhold < 9) this.xhold += 1;
      else if (this.xhold > 0) this.xhold -= 1;
      this.myspeed = 8 - Math.min(this.xhold, 8);
      this.x = h.x + 10 + lengthdir_x(this.length, this.place);
      this.y = h.y + 10 + lengthdir_y(this.length, this.place);
      this.place += this.myspeed;
      const a = this.alarm[0];
      this.visible = !(a === 9 || a === 8 || a === 5 || a === 4 || a === 1 || a === 0);
    } else this.visible = false;
  }
  // The shared "took a hit" tail of most collision events.
  hurt(amount) {
    this.hp -= amount;
    this.alarm[0] = 10;
    snd_play('snd_hurt1');
  }
  // Collision events, in GameMaker's order (by the other object's index). A bullet that has
  // both a parent and its own event runs both; one destroyed by the first is skipped after.
  collision_obj_sneo_rotatingwall_bomb(o) { this.wallHit(o, 10); }
  collision_obj_sneo_wallbullet_new(o) { this.wallHit(o, 3); }
  wallHit(o, amount) {
    if (this.active == 0) return;
    scr_afterimage_cut(o);
    instance_destroy(o);
    if (this.alarm[0] > 0) return;
    if (o.active == 0) return;
    this.hurt(amount);
  }
  collision_obj_collidebullet(o) {
    if (this.active == 0 || OWN_EVENT.some(n => isA(o, n))) return;
    instance_destroy(o);
    if (this.alarm[0] > 0) return;
    const spr = o.sprite_index;
    if (spr === 'spr_spamtonneo_faceAttack_nose_bullet' || spr === 'spr_spamtonneo_faceAttack_wisp' || spr === 'spr_bullet_laser_square') this.hp -= 4;
    else this.hp -= 10;
    this.alarm[0] = 10;
    snd_play('snd_hurt1');
  }
  collision_obj_regularbullet(o) {
    if (this.active == 0) return;
    instance_destroy(o);
    if (this.alarm[0] > 0) return;
    const spr = o.sprite_index;
    this.hurt(spr === 'spr_spamtonneo_faceAttack_nose_bullet' || spr === 'spr_spamtonneo_faceAttack_wisp' || spr === 'spr_bullet_laser_square' ? 3 : 10);
  }
  collision_obj_basicbullet_sneo(o) {
    if (this.active == 0 || this.alarm[0] > 0 || OWN_EVENT_SNEO.some(n => isA(o, n))) return;
    this.hurt(10);
  }
  collision_obj_spamtonshot() {
    if (this.active == 0 || this.alarm[0] > 0) return;
    this.hurt(10);
  }
  collision_obj_sneo_lilguy(o) {
    if (this.active == 0) return;
    snd_play_pitch('snd_bomb', 1.1 + random(0.2));
    scr_afterimage_cut(o);
    instance_destroy(o);
    if (this.alarm[0] > 0) return;
    snd_play('snd_damage');
    this.hurt(10);
  }
  collision_obj_sneo_heartattack(o) {
    if (this.active == 0) return;
    this.frameHit(() => { o.heart_health -= 4; });
  }
  // Heart attack / wire heart: hits land every other frame and ignore the invulnerability.
  frameHit(hitOther) {
    if (this.frametype === 0) {
      this.frametype = 1;
      hitOther();
    } else if (this.frametype === 1) {
      this.frametype = 0;
      this.hp -= 10;
      this.alarm[0] = 10;
      if (!snd_is_playing('snd_hurt1')) snd_play('snd_hurt1');
    }
  }
  collision_obj_sneo_heatattack_bullet(o) {
    if (this.active == 0) return;
    scr_afterimage_cut(o);
    instance_destroy(o);
    if (this.alarm[0] > 0) return;
    this.hurt(10);
  }
  collision_obj_sneo_lilguy_bullet(o) {
    if (this.active == 0) return;
    instance_destroy(o);
    if (this.alarm[0] > 0) return;
    this.hurt(10);
  }
  collision_obj_pipis_egg_bullet(o) {
    if (this.active == 0) return;
    snd_play_pitch('snd_bomb', 1.1 + random(0.2));
    instance_destroy(o);
    event_user(o, 0);
    if (this.alarm[0] > 0) return;
    this.hurt(10);
  }
  collision_obj_sneo_biglaser(o) {
    if (this.active == 0 || this.alarm[0] > 0 || !o.active) return;
    this.hurt(10);
  }
  collision_obj_sneo_bigshot(o) {
    if (this.active == 0 || this.alarm[0] > 0 || !o.active) return;
    snd_play('snd_hurt1');
    this.hp = 0;
  }
  collision_obj_sneo_wireheart(o) {
    if (this.active == 0) return;
    this.frameHit(() => { o.hp -= 4; });
  }
  collision_obj_sneo_mmx_spreadshot(o) {
    if (this.active == 0) return;
    instance_destroy(o);
    if (this.alarm[0] > 0) return;
    if (o.active == 0) return;
    this.hurt(10);
  }
}
defineObject('obj_sneo_tiny_ralsei', TinyRalsei);
