// The scenes around the Spamton NEO fight (normal route), ported from the GML:
// - obj_ch2_sceneex2 (room_dw_mansion_b_east): Spamton NEO drops in on Kris, the talk, Susie and Ralsei
//   arriving, the coaster ride; global.tempflag[32] makes a retry play the shortened version.
// - obj_ch2_sceneex2_special: the SOUL turns yellow and shoots the [Attention Customers] heads.
// - obj_ch2_sceneex2 con 9-60: after the battle, the party rides on, then room_dw_mansion_b_east_a.
// - obj_ch2_sceneex2a: Spamton's last words and the items (ShadowCrystal, then PuppetScarf after a
//   violent win or Dealmaker after a spare).
// Plus the poses only the scene uses (partmodes 21-25, 30, 31, 33) and the overworld obj_coaster.
import {
  G, global, Instance, defineObject, defineScript, S, instance_create, instance_destroy, instancesOf,
  draw_sprite_ext, draw_set_color, draw_set_alpha, draw_set_font, draw_text, draw_rectangle, lerp, random, random_range,
  controls,
} from '../runtime/gm.js?v=20261107201439';
import { keyName } from '../screens/controls.js?v=20261107201439';
import { snd_play, snd_pitch, snd_stop, snd_init, mus_loop_ext, mus_volume, mus_stop, snd_free_all, audio_stop_all } from '../runtime/audio.js?v=20261107201439';
import { POSES, SceneEx2 } from './enemy.js?v=20261107201439';
import { tagParent, first, camerax, cameray, i_ex, snd_play_pitch, scr_afterimage, scr_dark_marker } from './common.js?v=20261107201439';
import { startBattle } from '../battle/setup.js?v=20261107201439';
import { gotoRoom } from '../screens/common.js?v=20261107201439';
import {
  loadRoom, enterRoom, c, scr_cutscene_make, scr_maincharacters_actors, c_waitcustom_end, d_ex, lerpvar, moveToPoint,
} from '../screens/cutscene.js?v=20261107201439';

const BS = String.fromCharCode(92);
const PARTS = ['spr_sneo_wingl', 'spr_sneo_arml', 'spr_sneo_legl', 'spr_sneo_legr', 'spr_sneo_body', 'spr_sneo_head', 'spr_sneo_armr', 'spr_sneo_wingr'];

// ---------------------------------------------------------------- the scene's poses (Draw_0)

// 21, 23, 24, 25: swaying, arms swinging; 23-25 grow the head (0.5, 1, 1.5) on "BIG / BIGGER".
function swayPose(s, i) {
  const ps = s.partsiner, pr = s.partrot, ir = s.idealrot, pm = s.partmode;
  ps[i] += 0.1;
  s.partx[i] = lerp(s.partx[i], 0, 0.5);
  s.party[i] = lerp(s.party[i], 0, 0.5);
  ir[i] = Math.sin(ps[i] + i / 8) * 20;
  ir[1] = Math.sin(ps[2]) * 60;
  ir[2] = Math.sin(ps[2] - 0.1) * 60;
  ir[3] = -Math.sin(ps[2] + 0.3) * 60;
  ir[6] = -Math.sin(ps[2] + 0.1) * 60;
  s.partframe[5] = 1;
  pr[i] = lerp(pr[i], ir[i], 0.5);
  pr[5] += 2;
  if (i === 5) {
    if (pm === 23) { s.partframe[5] = 2; s.headsize = lerp(s.headsize, 0.5, 0.25); }
    if (pm === 24) { s.partframe[5] = 2; s.headsize = lerp(s.headsize, 1, 0.25); }
    if (pm === 25) {
      s.partframe[5] = 2;
      s.headsize = lerp(s.headsize, 1.5, 0.25);
      pr[5] = -15;
      s.partx[i] = random(2);
      s.party[i] = random(2);
    }
  }
  return false;
}
for (const pm of [21, 23, 24, 25]) POSES[pm] = swayPose;

// 22: "WHAT ARE THESE STRINGS!?": the head trembles, then every part starts to shake.
POSES[22] = (s, i) => {
  s.partframe[5] = 0;
  s.partrot[5] = Math.sin(s.partsiner[0] / 2) * 4;
  s.partsiner[0] += 0.1;
  if (s.partsiner[0] >= 5) {
    s.partx[i] = random(2);
    s.party[i] = random(2);
  }
  return false;
};

// 30: the silhouette hanging in the dark (the preview head, no left wing); shake_head jolts the head.
POSES[30] = (s, i) => {
  s.headsize = 0;
  s.partsprite[5] = 'spr_sneo_head_preview';
  if (s.partframe[5] === 0) s.partframe[5] = 1;
  s.partsprite[0] = 'spr_nothing';
  s.partsiner[i] += 1;
  if (s.shake_head === 0) {
    s.party[i] = Math.sin(s.partsiner[i] / 15) * 4;
    s.idealrot[i] = Math.sin(s.partsiner[i] / 20) * 4;
  } else if (i === 5) {
    if (s.shake_head === 1) {
      s.partframe[5] += 1;
      snd_play('snd_swallow');
    }
    s.partrot[5] = Math.sin(s.shake_head * 2) * 8 + random(4);
    s.party[5] = random(4);
    s.partx[5] = random(4);
    s.shake_head += 1;
    if (s.shake_head >= 6) {
      s.shake_head = 0;
      s.partrot[5] = 0;
    }
  }
  return false;
};

// 31: the eyes light up (growing afterimages and a marker over the head); then 32 holds the pose.
POSES[31] = (s, i) => {
  if (i !== 5) return false;
  snd_play('snd_weaponpull_fast');
  const lastxoff = s.facing === -1 ? 110 : 0;
  const hx = s.x + s.partx[5] * s.facing + s.partxoff[5] * s.facing + lastxoff, hy = s.y + s.party[5] + s.partyoff[5];
  let n = 0, e = null;
  for (let k = 0; k < 5; k++) {
    e = instance_create(n * 8 + hx, hy, 'obj_afterimage_grow');
    Object.assign(e, { sprite_index: 'spr_sneo_head_preview', image_index: 0, image_speed: 0, image_xscale: -2 - n / 5, image_yscale: 2 + n / 5, xrate: 0, yrate: 0, image_alpha: 1 + n });
    n += 0.2;
  }
  e.image_angle = s.partrot[5] * s.facing;
  scr_dark_marker(hx, hy, 'spr_sneo_head_preview').image_xscale = -2;
  s.partmode = 32;
  return false;
};
POSES[32] = () => false;

// 33: the lights come on: his own parts again (partmode 0).
POSES[33] = (s) => {
  for (const m of instancesOf('obj_marker')) if (m.sprite_index === 'spr_sneo_head_preview') instance_destroy(m);
  s.partsprite = PARTS.slice();
  s.partframe[5] = 0;
  s.partmode = 0;
  snd_play('snd_bump');
  return false;
};

// ---------------------------------------------------------------- obj_coaster (room_dw_mansion_b_east)

const COASTER = [
  { chr: 'spr_krisr_dark', off: [-25, 40] },
  { chr: 'spr_susie_walk_right_dw', off: [-20, 55] },
  { chr: 'spr_ralsei_walk_right', off: [-30, 45] },
];
class Coaster extends Instance {
  create() {
    Object.assign(this, {
      type: 0, init: false, character_sprite: 'spr_krisr_dark', character_offset_x: 0, character_offset_y: 0,
      coaster_offset_x: -25, coaster_offset_y: 40, siner0: 0, siner_add0: 0, siner_amplitude0: 10, sinerx: 0, sinery: 0,
      chr_index: 0,
    });
  }
  step() {
    if (!this.init) {
      this.init = true;
      const t = COASTER[this.type];
      this.character_sprite = t.chr;
      [this.coaster_offset_x, this.coaster_offset_y] = t.off;
      this.chr = t.chr;
    }
    if (this.character_sprite !== this.chr) { this.chr = this.character_sprite; this.chr_index = 0; }
    this.sinerx = this.sinery = 0;
    if (this.siner_add0 !== 0) {
      this.siner0 += this.siner_add0;
      this.sinerx = Math.sin(this.siner0) * this.siner_amplitude0;
    }
  }
  draw() {
    const x = this.x + this.sinerx, y = this.y + this.sinery;
    draw_sprite_ext('spr_sneo_car_back', 0, x + this.coaster_offset_x, y + this.coaster_offset_y, 2, 2, 0, 0xffffff, 1);
    draw_sprite_ext(this.chr, this.chr_index, x + this.character_offset_x, y + this.character_offset_y, 2, 2, 0, 0xffffff, 1);
    draw_sprite_ext('spr_sneo_car_front', 0, x + this.coaster_offset_x, y + this.coaster_offset_y, 2, 2, 0, 0xffffff, 1);
  }
}
defineObject('obj_coaster', Coaster);

const setCoasters = (sc) => [
  [sc.coaster_kris, 'x', 1721], [sc.coaster_kris, 'y', 60], [sc.coaster_susie, 'x', 1718], [sc.coaster_susie, 'y', 125],
  [sc.coaster_ralsei, 'x', 1727], [sc.coaster_ralsei, 'y', 215], [sc.coaster_kris, 'siner_add0', 0.1],
  [sc.coaster_susie, 'siner_add0', 0.08], [sc.coaster_ralsei, 'siner_add0', 0.09], [sc.coaster_kris, 'visible', true],
  [sc.coaster_kris, 'character_sprite', 'spr_krisb_defeat'], [sc.coaster_ralsei, 'visible', true],
  [sc.coaster_ralsei, 'character_sprite', 'spr_ralsei_surprised_down'], [sc.coaster_ralsei, 'character_offset_x', -10],
  [sc.coaster_susie, 'visible', true], [sc.coaster_susie, 'character_sprite', 'spr_susie_shock_r'],
].forEach(([o, k, v]) => c.var_instance(o, k, v));

// ---------------------------------------------------------------- obj_ch2_sceneex2: before the fight

class PreScene extends tagParent('obj_ch2_sceneex2') {
  create() {
    Object.assign(this, {
      drawblack: 2, drawtrack: 1, trackx: 0, tracky0: 180, tracky1: 240, tracky2: 300, trackspeed: 0, con: 1,
      customcon: 0, special_scene: 0, rudebuster: false, sneo_fly: false,
    });
    this.depth = 99000;
    this.shortened = global.tempflag[32] === 1;
    this.start_xpos = this.shortened ? this.x + 100 : this.x;
    const car = (type, depth) => {
      const k = instance_create(0, cameray() - 500, 'obj_coaster');
      Object.assign(k, { type, depth, visible: false });
      return k;
    };
    this.coaster_kris = car(0, 90000);
    this.coaster_susie = car(1, 80000);
    this.coaster_ralsei = car(2, 70000);
  }
  alarm0() { this.con += 1; }
  step() {
    const kris = first('obj_mainchara');
    if (this.con === 1 && kris && kris.x <= this.start_xpos) {
      if (!this.shortened) for (const p of [0.4, 0.6, 0.8]) snd_play_pitch('snd_swing', p);
      this.con = 2;
      global.interact = 1;
      global.facing = 3;
      const s = this.sneo = instance_create(kris.x, -300, 'obj_spamton_neo_enemy');
      Object.assign(s, { myself: 1, facing: -1, gravity: this.shortened ? 0 : 4, shadow_amount: this.shortened ? 0 : 1, partmode: 30 });
    }
    if (this.con === 2) {
      if (!this.shortened) {
        if (this.sneo.y >= kris.y - 120) {
          snd_play('snd_hurt1');
          snd_play('snd_damage');
          this.sneo.gravity = 0;
          this.sneo.vspeed = 0;
          Object.assign(kris, { fun: 1, sprite_index: 'spr_kris_dw_landed', image_index: 0, image_speed: 0 });
          kris.hspeed = 18;
          kris.friction = 0.8;
          this.con = 4;
          this.alarm[0] = 30;
        }
      } else this.con = 5;
    }
    if (this.con === 5) {
      kris.cutscene = 1;
      this.coaster_empty = [98900, 98000, 98000].map(d => {
        const m = scr_dark_marker(-100, -100, 'spr_sneo_car_empty');
        m.depth = d;
        return m;
      });
      scr_cutscene_make(this);
      scr_maincharacters_actors(this, [
        { name: 'susie', x: kris.x + 60, y: cameray() - 300, sprite: 'spr_susie_walk_down_dw' },
        { name: 'ralsei', x: kris.x + 100, y: cameray() - 300, sprite: 'spr_ralsei_walk_down' },
      ]);
      this.con = 5.1;
    }
    if (this.con === 5.1) {
      this.con = 6;
      this.alarm[0] = 30;
      this.queue();
    }
    if (this.con === 7 && this.customcon === 1 && this.special_scene === 0) {
      this.con = 8;
      global.tempflag[32] = 1;
      startBattle({ intro: true, weird: false, from: this.shortened ? null : [this.sneo.x - camerax(), this.sneo.y - cameray()] });
      return;
    }
    if (this.customcon === 1 && this.special_scene > 0) {
      if (this.special_scene === 1) {
        instance_create(0, 0, 'obj_ch2_sceneex2_special');
        this.special_scene = 2;
      }
      if (this.special_scene === 2 && !i_ex('obj_ch2_sceneex2_special')) {
        this.customcon = 0;
        this.special_scene = 0;
        c_waitcustom_end();
      }
    }
    if (this.rudebuster) {
      this.rudebuster = false;
      instance_create(camerax() - 60, 275, 'obj_rudebuster_bolt').target = this.sneo;
    }
    if (this.sneo_fly) {
      this.sneo.gravity = -2;
      if (this.sneo.y <= cameray() - 200) {
        this.sneo_fly = false;
        this.sneo.gravity = 0;
        this.sneo.x = 840;
        this.sneo.y = cameray() - 200;
      }
    }
  }
  // The commands queued at con 5.1 (Step_0).
  queue() {
    const { su, ra, kr, sneo } = this;
    const sx = sneo.x;
    c.sel(su); c.setxy(camerax() - 200, 200); c.visible(0);
    c.sel(ra); c.setxy(camerax() - 200, 200); c.visible(0);
    if (this.shortened) {
      c.sel(su); c.facing('susieunhappy'); c.setxy(300, 173); c.visible(1); c.walkdirect(680, 173, 35);
      c.sel(ra); c.facing('ralseiunhappy'); c.setxy(300, 230); c.visible(1); c.walkdirect(640, 230, 35);
      c.wait(40);
    } else {
      c.pannable(1);
      c.panspeed_wait(-3, 0, 30);
      c.wait(30);
      c.sel(kr); c.autowalk(0); c.sprite('spr_kris_dw_landed'); c.imageindex(0); c.imagespeed(0);
      for (let k = 0; k < 3; k++) { c.var_instance(sneo, 'shake_head', 1); c.wait(30); }
      c.fadeout(5);
      c.wait(30);
      c.var_instance(sneo, 'y', 115);
      c.var_instance(sneo, 'partmode', 31);
      c.wait(60);
      c.sel(kr); c.setxy(830, 216);
      c.msgside('bottom');
      const say = (...lines) => {
        c.msgsetloc(0, lines[0]);
        for (const l of lines.slice(1)) c.msgnextloc(l);
        c.talk_wait();
      };
      const sneoSays = (...lines) => { c.speaker('sneo'); say(...lines); };
      sneoSays('* HOLY [[Cungadero]] DO I FEEL GOOD .../%');
      c.var_instance(sneo, 'partmode', 33);
      c.wait(1);
      c.var_lerp_instance(sneo, 'shadow_amount', 1, 0, 30);
      c.var_instance(sneo, 'partmode', 1);
      c.fadein(5);
      c.wait(5);
      c.mus('free_all');
      c.mus2('initloop', 'spamton_neo_meeting.ogg', 0);
      c.mus2('pitch', 1.3, 0);
      sneoSays('* HERE I AM!^1! KRIS!!/%');
      c.var_instance(sneo, 'partmode', 15); c.var_instance(sneo, 'headforceframe', 2);
      sneoSays('* BIG/%');
      c.var_instance(sneo, 'partmode', 16); c.var_instance(sneo, 'headforceframe', 1);
      sneoSays('* BIG^1,/%');
      c.var_instance(sneo, 'partmode', 17); c.var_instance(sneo, 'headforceframe', 2);
      sneoSays('* [[BIGGER AND BETTER THAN EVER]]/%');
      c.sel(kr); c.autowalk(1); c.facing('l');
      c.var_instance(sneo, 'partmode', 1); c.var_instance(sneo, 'headforceframe', 1);
      sneoSays('* HA HA HA ..^1. THIS POWER IS/%');
      c.var_instance(sneo, 'headforceframe', 0);
      sneoSays('* FREEDOM./%');
      c.var_instance(sneo, 'headforceframe', -1);
      sneoSays('* I WON\'T HAVE TO BE^1 &* JUST A PUPPET^1 &* ANY MORE!!!!/', '* .../%');
      c.var_instance(sneo, 'headforceframe', 0); c.var_instance(sneo, 'facing', 1);
      sneoSays('* OR..^1. so..^1. I..^1. thought./%');
      c.var_instance(sneo, 'partmode', 22); c.var_instance(sneo, 'headforceframe', 2);
      sneoSays('* WHAT ARE THESE STRINGS!^1? &* WHY AM I NOT [BIG] ENOUGH!^1? &* It\'s still DARK..^1. SO DARK!/%');
      c.var_instance(sneo, 'partmode', 1); c.var_instance(sneo, 'facing', -1); c.var_instance(sneo, 'headforceframe', 1);
      c.var_lerp_instance(sneo, 'x', sx, sx + 200, 30, 2, 'out');
      c.soundplay_x('snd_swing', 1, 0.5);
      c.wait(10);
      c.panspeed(8, 0, 24);
      c.sel(kr); c.autowalk(0); c.imagespeed(0.25); c.walk_wait('r', 8, 25); c.imagespeed(0);
      sneoSays('* KRIS./%');
      c.var_instance(sneo, 'partmode', 21);
      c.var_lerp_instance(sneo, 'x', sx + 200, sx + 430, 30, 2, 'out');
      c.soundplay_x('snd_swing', 1, 0.5);
      c.wait(5);
      c.panspeed(10, 0, 24);
      c.autowalk(0); c.walk('r', 10, 25); c.imagespeed(0.25); c.wait(26); c.imagespeed(0);
      sneoSays('* KRIS^1. &* KRIS^1. &* KRIS./', '* THAT\'S RIGHT^1. &* YOU^1. &* I NEED YOU./%');
      c.var_instance(sneo, 'partmode', 23);
      c.var_lerp_instance(sneo, 'x', sx + 430, sx + 630, 15, 2, 'out');
      c.var_instance(sneo, 'headforceframe', 1);
      c.soundplay_x('snd_swing', 1, 0.5);
      c.wait(3);
      c.panspeed(12, 0, 14);
      c.autowalk(0); c.walk('r', 12, 15); c.imagespeed(0.25); c.wait(16); c.imagespeed(0);
      sneoSays('* TO BE BIG.^3 &* WITH ME./%');
      c.var_instance(sneo, 'partmode', 24); c.var_instance(sneo, 'headforceframe', 2);
      sneoSays('* VERY   VERY    BIG/', '* SO BIG WE\'LL STAND UP TALL AND SEE PAST THE DARK/', '* STAND UP WITH OUR HEADS IN THE CLOUDS AND LOOK INTO/%');
      c.var_instance(sneo, 'partmode', 25);
      c.var_lerp_instance(sneo, 'x', sx + 600, sx + 740, 5, 1, 'out');
      c.var_instance(sneo, 'headforceframe', 0);
      c.soundplay_x('snd_swing', 1, 0.5);
      c.wait(3);
      c.autowalk(0);
      c.var_lerp_instance(this.kr_actor, 'x', 1430, 1590, 10, 2, 'out');
      c.sprite('spr_kris_dw_landed');
      c.soundplay('snd_hurt1');
      c.imagespeed(0); c.imageindex(0);
      c.wait(30);
      c.imagespeed(0);
      sneoSays('* H E A V E N/%');
      c.panspeed(5, 0, 10);
      c.var_lerp_instance(sneo, 'x', 1380, 1300, 10, 2, 'out');
      c.wait(10);
      c.var_instance(sneo, 'headforceframe', 0); c.var_instance(sneo, 'partmode', 3);
      sneoSays('* I^3 &* JUST NEED^3 &* THAT LITTLE,/%');
      c.var_instance(sneo, 'partmode', 13); c.var_instance(sneo, 'headforceframe', 1);
      sneoSays('* [[SOUL]]^3 &* Y O U HAVE/%');
      c.var_lerp_instance(sneo, 'x', 1300, 1420, 120);
      c.var_lerp_instance(sneo, 'y', 115, 140, 120);
      c.soundplay('snd_sneo_laugh_long');
      for (let n = 0; n < 10; n++) { c.mus2('pitch', 1.3 + n / 15, 0); c.wait(12); }
      c.mus('free');
      c.soundplay_x('snd_rudebuster_swing', 0.8, 0.9);
      c.var_instance(sneo, 'headforceframe', 2);
      c.var_instance(this, 'rudebuster', true);
      c.wait(15);
      c.var_instance(sneo, 'partmode', 20);
      c.var_instance(this, 'sneo_fly', true);
      c.wait(45);
      c.sel(su); c.facing('susieunhappy'); c.setxy(1000, 173); c.visible(1); c.walkdirect(1300, 173, 20);
      c.sel(ra); c.facing('ralseiunhappy'); c.setxy(1000, 230); c.visible(1); c.walkdirect(1200, 230, 20);
      c.wait(45);
      c.speaker('susie');
      say(BS + 'E4* Kris!/%');
      c.sel(su); c.facing('susieunhappy'); c.walkdirect(1550, 173, 20);
      c.sel(ra); c.facing('ralseiunhappy'); c.walkdirect(1506, 230, 20);
      c.pan(1258, 0, 20);
      c.wait(22);
      c.speaker('susie');
      c.msgsetloc(0, BS + 'E4* The hell was that weirdo!?/');
      c.facenext('ralsei', 'Q');
      c.msgnextloc(BS + 'EQ* Kris^1, we were worried about you^1, so.../%');
      c.talk_wait();
      c.sel(su); c.emote('!', 30);
      c.sel(ra); c.emote('!', 30);
      c.shake();
      c.var_instance(this, 'drawblack', 1);
      c.soundplay_x('snd_closet_impact', 1, 0.8);
      c.wait(30);
      sneoSays('* KRIS!!^1! YOU HAVE [Friends]!?/', '* WHY DON\'T YOU TELL THEM ABOUT MY [3 for One Specil]!/',
        '* TODAY^1, THE WHOLE FAMILY CAN TAKE A LITTLE [Ride Around Town].../%');
      c.wait(5);
      const [e1, e2, e3] = this.coaster_empty;
      c.var_instance(e1, 'y', 210); c.var_instance(e2, 'y', 270); c.var_instance(e3, 'y', 330);
      for (const e of [e1, e2, e3]) c.var_lerp_instance(e, 'x', 1100, 2000, 30, 2, 'in');
      c.soundplay_x('snd_cardrive', 1, 0.8);
      c.soundplay_x('snd_cardrive', 1, 0.9);
      c.wait(10);
      c.sel(su); c.autowalk(0); c.sprite('spr_susie_shock'); c.addxy(0, -15); c.var_lerp('x', 1550, 1580, 10, 2, 'out');
      c.sel(ra); c.autowalk(0); c.sprite('spr_ralsei_surprised_down'); c.var_lerp('x', 1496, 1600, 10, 2, 'out');
      c.wait(11);
      c.pan(1640, 0, 15);
      c.sel(kr); c.sprite('spr_kris_fall_ball'); c.imagespeed(0.5); c.jump(1720, 48, 40, 40);
      c.sel(su); c.sprite('spr_susie_dw_fall_ball'); c.imagespeed(0.5); c.jump(1720, 120, 40, 40);
      c.sel(ra); c.sprite('spr_ralsei_jump_ball'); c.imagespeed(0.5); c.jump(1720, 244, 40, 40);
      c.soundplay('snd_jump');
      c.soundplay_x('snd_jump', 0.9, 0.8);
      c.wait(10);
      c.var_lerp_instance(this, 'trackspeed', 0, -15, 30, 2, 'out');
      for (const e of [e1, e2, e3]) c.var_lerp_instance(e, 'x', 2000, 1700, 30, 2, 'out');
      c.var_lerp_instance(e1, 'y', 210, 100, 30, 2, 'out');
      c.var_lerp_instance(e2, 'y', 270, 180, 30, 2, 'out');
      c.var_lerp_instance(e3, 'y', 330, 260, 30, 2, 'out');
      c.var_lerp_instance(this, 'tracky0', 180, 70, 30, 2, 'out');
      c.var_lerp_instance(this, 'tracky1', 240, 150, 30, 2, 'out');
      c.var_lerp_instance(this, 'tracky2', 300, 230, 30, 2, 'out');
      c.wait(31);
      c.mus('free');
      c.mus2('initloop', 'shinkansen.ogg', 0);
      c.mus2('pitch', 2, 0);
      for (const p of [0.5, 1.1, 1.4]) c.soundplay_x('snd_impact', 0.8, p);
      c.sel(kr); c.visible(0);
      c.sel(su); c.visible(0);
      c.sel(ra); c.visible(0);
      setCoasters(this);
      for (const e of [e1, e2, e3]) c.var_instance(e, 'visible', false);
      c.wait(12);
      c.wait(4);
      c.soundplay('snd_closet_impact');
      c.wait(30);
      c.msgside('bottom');
      c.speaker('no_name');
      say('* [Attention Customers! Clean up on Aisle 3!]/', '* SOMEONE LEFT [There] SOULS^1, [Lyeing Around......]/%');
      c.var_instance(this, 'special_scene', 1);
      c.mus('pause');
      c.waitcustom();
      c.mus('resume');
    }
    c.wait(30);
    if (!this.shortened) {
      c.speaker('sneo');
      c.msgsetloc(0, '* Kris!?!^1? WAS THAT A [BIG SHOT] JUST NOW!?/');
      c.msgnextloc('* WOW!!^1!&* I\'M SO [Proud] OF YOU^1, I COULD [Killed] YOU!/');
      c.msgnextloc('* [Heaven]^1, are you WATCHING?/');
      c.msgnextloc('* IT\'S TIME TO MAKE A VERY [Specil] DEAL.../%');
      c.talk_wait();
    } else {
      c.sel(kr); c.facing('r');
      c.sel(su); c.sprite('spr_susie_shock_r'); c.shakeobj();
      c.sel(ra); c.sprite('spr_ralsei_surprised_down'); c.shakeobj();
    }
    c.mus('free');
    c.soundplay('snd_sneo_laugh_long');
    if (!this.shortened) c.var_instance(sneo, 'partmode', 41);
    c.wait(90);
    if (this.shortened) {
      c.fadeout(5);
      c.wait(15);
      c.pan(1640, 0, 15);
      c.var_lerp_instance(this, 'trackspeed', 0, -15, 15, 2, 'out');
      c.var_lerp_instance(this, 'tracky0', 180, 70, 15, 2, 'out');
      c.var_lerp_instance(this, 'tracky1', 240, 150, 15, 2, 'out');
      c.var_lerp_instance(this, 'tracky2', 300, 230, 15, 2, 'out');
      setCoasters(this);
      c.actortokris();
      c.actortocaterpillar();
      c.wait(15);
      c.fadein(5);
    }
    c.actortokris();
    c.actortocaterpillar();
    c.waitcustom();
  }
  draw() {
    this.depth = 99000;
    draw_set_color(0);
    if (this.drawblack === 1) draw_rectangle(1630, -10, 2500, 500, false);
    if (this.drawtrack === 1) {
      this.trackx += this.trackspeed;
      const cx = camerax();
      if (this.trackx + 640 < cx) this.trackx += 640;
      if (this.trackx - 640 > cx) this.trackx -= 640;
      for (const ty of [this.tracky0, this.tracky1, this.tracky2]) {
        for (const k of [-640, 0, 640]) draw_sprite_ext('spr_sneo_track', 0, this.trackx + k, ty, 2, 2, 0, 0xffffff, this.image_alpha);
      }
      draw_set_color(0);
      draw_rectangle(0, 200, 80, 420, false);
    }
    if (this.drawblack === 2) draw_rectangle(1640, -10, 2500, 500, false);
  }
}
defineObject('obj_ch2_sceneex2_pre', PreScene);

// ---------------------------------------------------------------- obj_ch2_sceneex2_special

class SpecialScene extends Instance {
  create() { this.con = 1; this.init = 0; this.row = [[], [], []]; }
  alarm4() { this.con += 1; }
  guys() { return instancesOf('obj_sneo_lilguy'); }
  goTo(guy, dx) {
    snd_play_pitch('snd_swing', 0.5);
    moveToPoint(this.heart, guy.x - dx, guy.y - 10, 10);
  }
  step() {
    const cx = camerax(), cy = cameray(), h = this.heart;
    if (this.con === 1) {
      snd_play('snd_spamton_laugh');
      snd_play_pitch('snd_spamton_laugh', 0.8);
      const make = (r, n, x0, dx, y) => {
        for (let i = 0; i < n; i++) {
          const g = instance_create(cx + x0 + dx * i, cy + y, 'obj_sneo_lilguy');
          g.mei = i;
          this.row[r][i] = g;
        }
      };
      make(0, 3, 760, 60, 100);
      make(1, 9, 840, 40, 180);
      make(2, 3, 760, 60, 280);
      for (const g of this.guys()) {
        Object.assign(g, { destroyable: 1, cutscene: 1, image_speed: 2, _cutsceneremy: g.y });
        g.hspeed = -20;
      }
      const big = this.row[1][0];
      big.image_xscale *= 2;
      big.image_yscale *= 2;
      big.x -= 40;
      big.bighead = 1;
      this.con = 2;
    }
    if (this.con === 2) {
      const lead = this.row[0][0];
      if (lead.x < cx + 570) {
        for (const g of this.guys()) {
          if (g.hspeed < -2) g.hspeed += 1;
          g.y = g._cutsceneremy + random_range(-2, 2);
        }
      }
      if (lead.x <= cx + 240) {
        for (const g of this.guys()) {
          g.speed = 0;
          g.friction = 0;
          g.image_speed = 0;
          g.image_index = 0;
          g.y = g._cutsceneremy;
        }
        snd_play('snd_noise');
        const b = this.blackall = scr_dark_marker(cx, cy, 'spr_whitepx_10');
        Object.assign(b, { image_xscale: 70, image_yscale: 70, image_blend: 0, depth: 100000 });
        for (const m of instancesOf('obj_marker')) m.visible = false; // the new black one too, as in the GML
        for (const a of instancesOf('obj_actor')) a.image_alpha = 0.5;
        for (const s of instancesOf('obj_ch2_sceneex2')) s.drawtrack = 0;
        this.con = 3;
        this.alarm[4] = 1;
      }
    }
    if (this.con === 4) {
      const heart = this.heart = instance_create(cx + 88, cy + 95, 'obj_heart');
      Object.assign(heart, { sprite_index: 'spr_dodgeheart_centered_white', image_blend: 0xff0000, depth: -10, canmove: 0 });
      S.scr_oflash(heart);
      this.con = 5;
      this.alarm[4] = 60;
    }
    if (this.con === 6) {
      this.tracknoise = snd_play('snd_spearrise');
      snd_pitch(this.tracknoise, 0.9);
      lerpvar(h, 'image_angle', 0, 90, 10, -1, 'out');
      this.con = 7;
      this.alarm[4] = 20;
    }
    if (this.con === 8) {
      snd_stop(this.tracknoise);
      this.con = 9;
      this.alarm[4] = 4;
    }
    if (this.con === 10) {
      h.image_blend = 0xffff00;
      for (let i = 0; i < 3; i++) {
        const a = instance_create(h.x, h.y, 'obj_afterimage_grow');
        Object.assign(a, { sprite_index: h.sprite_index, image_blend: h.image_blend, image_angle: h.image_angle, xrate: 0.2 * i, yrate: 0.2 * i, image_alpha: i, depth: h.depth + 1, image_speed: 0 });
      }
      Object.assign(h, { sprite_index: 'spr_yellowheart', image_blend: 0xffffff, image_angle: 0, canmove: 0 });
      h.x -= 10;
      h.y -= 10;
      S.scr_oflash(h);
      this.con = 11;
      this.alarm[4] = 60;
      snd_play_pitch('snd_great_shine', 0.8);
      snd_play_pitch('snd_great_shine', 1);
      snd_play_pitch('snd_closet_impact', 1.5);
      instance_create(0, 0, 'obj_shake');
    }
    if (this.con === 12) { this.goTo(this.row[0][0], 80); this.con = 13; this.alarm[4] = 10; }
    if (this.con === 13 || this.con === 16 || this.con === 19) scr_afterimage(h);
    if (this.con === 14 || this.con === 17 || this.con === 20) {
      snd_play('snd_impact');
      h.color = 1;
      this.con = this.con === 20 ? 22 : this.con + 1;
    }
    if (this.con === 15 && !this.row[0][2].alive) {
      this.con = 16;
      h.color = 0;
      this.goTo(this.row[2][0], 80);
      this.alarm[4] = 10;
    }
    if (this.con === 18 && !this.row[2][2].alive) {
      this.con = 19;
      h.color = 0;
      this.goTo(this.row[1][0], 110);
      this.alarm[4] = 10;
    }
    if (this.con === 22 && !i_ex('obj_sneo_lilguy')) {
      this.alarm[4] = 15;
      this.con = 29;
      h.color = 0;
    }
    if (this.con === 30) {
      for (const s of instancesOf('obj_spamton_neo_enemy')) {
        Object.assign(s, { x: cx + 400, y: cy + 80, partmode: 1, facing: 1, headforceframe: 1, gravity: 0 });
        s.speed = 0;
      }
      snd_play('snd_noise');
      instance_destroy(h);
      for (const s of instancesOf('obj_yheart_shot')) instance_destroy(s);
      instance_destroy(this.blackall);
      for (const s of instancesOf('obj_ch2_sceneex2')) s.drawtrack = 1;
      this.con = 40;
      instance_destroy(this);
    }
  }
  // Draw_0: "PRESS Z" / "HOLD Z" / "RELEASE Z" next to the SOUL after 8 seconds without shooting.
  draw() {
    if (this.init === 1) { this.init = 2; this.input_timer = 0; }
    if (this.init === 0) { this.init = 1; this.input_timer = 0; }
    const h = this.heart;
    if (!h || !h.alive || h.color !== 1) return;
    let text = 'PRESS ';
    if (this.con < 19) {
      if (!i_ex('obj_yheart_shot')) this.input_timer += 1;
      else this.input_timer = 0;
    } else {
      text = h.z_hold >= 40 ? 'RELEASE ' : 'HOLD  ';
      if (!instancesOf('obj_yheart_shot').some(s => s.big === 1)) this.input_timer += 1;
      else this.input_timer = 0;
    }
    if (this.input_timer >= 240) {
      draw_set_color(0xffffff);
      draw_set_font('fnt_main');
      draw_set_alpha(Math.sin(this.input_timer / 8) * 0.1 + 0.8);
      draw_text(h.x - 30, h.y - 20, text + keyName(controls.confirm.keys[0]));
      draw_set_alpha(1);
    }
  }
}
defineObject('obj_ch2_sceneex2_special', SpecialScene);

// ---------------------------------------------------------------- Weird Route: obj_fountainkris_ch2_sideb

// room_dw_mansion_fountain: Kris rises in front of the Dark Fountain, then Spamton NEO drops in
// ("NOT!!!"). global.tempflag[34] makes a retry play the short version.
class FountainKris extends Instance {
  create() {
    snd_free_all();
    Object.assign(this, {
      sprite_index: 'spr_krisu_bright', image_speed: 0, image_xscale: 2, image_yscale: 2, siner: 0, imageanimator: 0,
      con: 0, draw_kris: true, sneo: null, sneo_fall_sfx: false, sneo_fall_timer: 0,
    });
    global.interact = 1;
    this.y += 260;
    for (const k of instancesOf('obj_mainchara')) k.visible = false;
    this.shortened = global.tempflag[34] === 1;
    instance_create(0, 0, 'obj_fadein').fadespeed = this.shortened ? -0.5 : -0.005;
    this.depth = 10;
  }
  alarm4() { this.con += 1; }
  step() {
    const kris = first('obj_mainchara');
    if (this.con === 0) {
      if (!this.shortened) {
        this.con = 1;
        this.alarm[4] = 220;
      } else {
        this.con = 9;
        this.y -= 220;
      }
    }
    if (this.con === 1) {
      this.y -= 1;
      this.image_index = this.imageanimator;
      this.imageanimator += 0.1;
    }
    if (this.con === 2) {
      this.image_index = 0;
      this.con = 3;
      this.alarm[4] = 60;
    }
    if (this.con === 4) {
      this.con = 5;
      global.typer = 42;
      global.msg[0] = '(It was as if your very SOUL was glowing...)/%';
      this.writer = instance_create(80, 80, 'obj_writer');
    }
    if (this.con === 5 && !(this.writer && this.writer.alive)) {
      this.con = 7;
      this.alarm[4] = 60;
    }
    if (this.con === 8) {
      this.con = 9;
      S.scr_speaker('sneo');
      S.msgset(0, '* NOT!!!/%');
      instance_create(0, 0, 'obj_dialoguer').side = 0;
    }
    if (this.con === 9 && !d_ex()) {
      this.con = 10;
      kris.x = this.x;
      kris.y = this.y;
      if (!this.sneo) {
        const sn = this.sneo = instance_create(255, cameray() - 300, 'obj_spamton_neo_enemy');
        Object.assign(sn, { myself: 1, facing: 1, gravity: 4, shadow_amount: 1, partmode: 30 });
      }
    }
    const sn = this.sneo;
    if (this.con === 10 && sn.y >= this.y - 140) {
      this.con = 12;
      this.alarm[4] = 60;
      snd_play('snd_hurt1');
      snd_play('snd_damage');
      sn.gravity = 0;
      sn.vspeed = 0;
      this.draw_kris = false;
      Object.assign(kris, { visible: true, fun: 1, sprite_index: 'spr_kris_dw_landed', image_index: 0, image_speed: 0 });
      kris.hspeed = -20;
      kris.friction = 0.8;
      snd_play_pitch('snd_swing', 0.5);
    }
    if (this.con === 13) {
      if (!this.shortened) {
        if (sn.gravity === 0) snd_play_pitch('snd_swing', 0.5);
        sn.gravity = -2;
        if (sn.y <= cameray() - 200) {
          this.con = 14;
          sn.gravity = 0;
          sn.x = 460;
          sn.y = cameray() - 200;
        }
      } else {
        this.con = 15;
        this.alarm[4] = 60;
        sn.partmode = 33;
        lerpvar(sn, 'x', sn.x, sn.x + 200, 15, 1, 'out');
      }
    }
    if (this.con === 14) {
      sn.gravity = 4;
      if (!this.sneo_fall_sfx && ++this.sneo_fall_timer === 15) {
        this.sneo_fall_sfx = true;
        snd_play_pitch('snd_swing', 0.5);
      }
      if (sn.y >= this.y - 140) {
        this.con = 15;
        this.alarm[4] = 60;
        snd_play('snd_impact');
        sn.gravity = 0;
        sn.vspeed = 0;
        sn.partmode = 33;
      }
    }
    if (this.con === 16) {
      this.con = 17;
      scr_cutscene_make(this);
      scr_maincharacters_actors(this, []);
      c.mus('free_all');
      c.mus2('initloop', 'spamton_neo_meeting.ogg', 0);
      c.sel(this.kr);
      c.facing('r');
      c.var_lerp_instance(sn, 'shadow_amount', 1, 0, 30);
      c.var_instance(sn, 'partmode', 1);
      c.var_instance(sn, 'headforceframe', 1);
      if (!this.shortened) {
        const top = (...lines) => {
          c.speaker('sneo');
          c.msgsetloc(0, lines[0]);
          for (const l of lines.slice(1)) c.msgnextloc(l);
          c.msgside('top');
          c.talk_wait();
        };
        top('* LET ME SAY/', '* LET ME SAY [Thanks ]/', '* THANKS TO YOUR [Total Jackass stunts] I HAVE [Becomed] NEO./',
          "* AND NOW IT'S MY [Mansion]^1! MY [City]^1! MY [World]!/%");
        c.var_instance(sn, 'partmode', 22);
        c.var_instance(sn, 'headforceframe', 2);
        top('* SO WHY ARE YOU [Stealing] THE [Fountain]!?/', '* TO [$!$!] ME OVER RIGHT AT THE [Good part]!? WHAT ARE YOU^1, A [Gameshow Host]!?/%');
        c.var_instance(sn, 'partmode', 1);
        c.var_instance(sn, 'headforceframe', 1);
        top("* AH^1, KID^1, FORGET IT. I'M AN [HonestMan]./", "* I'LL LET YOU [Pay] YOUR WAY OUT OF THIS ONE!!/%");
        c.var_instance(sn, 'partmode', 1);
        c.var_instance(sn, 'headforceframe', 2);
        top('* [Pay].../%');
        c.wait(15);
        c.var_instance(sn, 'partmode', 3);
        c.var_instance(sn, 'headforceframe', 1);
        c.wait(45);
        c.speaker('sneo');
        c.msgsetloc(0, '* WITH YOUR [Rapidly-Shrinking] LIFE!!!/%');
        c.talk_wait();
      } else {
        c.var_instance(sn, 'partmode', 3);
        c.var_instance(sn, 'headforceframe', 1);
      }
      c.wait(15);
      c.var_instance(sn, 'partmode', 41);
      c.soundplay('snd_sneo_laugh_long');
      for (let n = 0; n < 10; n++) {
        c.mus2('pitch', 1.3 + n / 15, 0);
        c.wait(12);
      }
      c.mus('free');
      c.wait(30);
      c.actortokris();
      c.terminatekillactors();
    }
    if (this.con === 17 && !i_ex('obj_cutscene_master')) {
      this.con = 19;
      global.tempflag[34] = 1;
      const f = first('obj_darkfountain');
      const fountain = f ? { siner: f.siner, bgsiner: f.bgsiner, hscroll: f.hscroll, nowcolor: f.nowcolor, colcol: f.colcol, adjust: 3, slowdown: 0 } : undefined;
      startBattle({ intro: true, weird: true, from: [sn.x, sn.y], fountain, introStart: [[kris.x, kris.y], [0, 0], [0, 0]] });
    }
  }
  // Draw_0: Kris in the fountain's light (a lit edge over a black figure, and a long shadow).
  draw() {
    if (!this.draw_kris) return;
    const f = first('obj_darkfountain');
    let blend = 0;
    if (f) blend = f.colcol;
    else {
      draw_set_color(0);
      draw_rectangle(camerax(), cameray(), camerax() + 640, cameray() + 480, false);
    }
    const spr = this.sprite_index, i = this.image_index;
    draw_sprite_ext(spr, i, this.x, this.y - 4, 2, 2, 0, blend, 1);
    draw_sprite_ext(spr, i, this.x, this.y + this.sprite_height * 4 - 8, 2, -6, 0, 0, 1);
    draw_sprite_ext(spr, i, this.x, this.y, 2, 2, 0, 0, 1);
  }
}
defineObject('obj_fountainkris_ch2_sideb', FountainKris);

export function startWeirdPreScene() {
  G.weird = true;
  gotoRoom();
  const tempflag = global.tempflag;
  S.init_battle_globals();
  global.tempflag = tempflag;
  for (const k of ['monster', 'monsterat', 'monsterdf', 'monsterhp', 'monstermaxhp', 'mercymod', 'monsterx', 'monstery', 'hittarget', 'monstertype']) global[k] ??= [0, 0, 0];
  global.fighting = 0;
  global.facing = 2;
  G.roomW = 640;
  G.roomH = 480;
  const kris = instance_create(0, 40, 'obj_mainchara');
  kris.cutscene = 1;
  instance_create(224, 0, 'obj_darkfountain').adjust = 0;
  instance_create(300, 260, 'obj_fountainkris_ch2_sideb');
}

// ---------------------------------------------------------------- Weird Route: after the fight

// obj_darkfountain_event in the dark (the fountain itself is gone): Kris's SOUL rises, light pours
// in, white, then black (the end of the chapter).
class FountainEvent extends Instance {
  create() {
    Object.assign(this, { sprite_index: 'spr_heart_centered', siner: 0, t: -10, con: 0, rs: 0, ds2: 0, ds3: 0, soundcon: 0 });
    this.depth = -100000;
    snd_play('snd_great_shine');
  }
  draw() {
    this.siner += 1.5;
    if (this.t >= 400) {
      this.rs += 0.5;
      draw_set_color(0xffffff);
      for (let i = 1; i < 12; i++) {
        draw_set_alpha(this.rs / 16 - i / 12);
        draw_rectangle(320 - i * i - this.rs * i, 0, 320 + i * i + this.rs * i, 500, false);
      }
      draw_set_alpha(1);
    }
    const sp = this.siner, x = this.x, y = this.y;
    draw_sprite_ext(this.sprite_index, 0, x, y, 1, 1, 0, 0xffffff, sp / 8);
    draw_sprite_ext(this.sprite_index, 0, x, y, sp / 4, sp / 4, 0, 0xffffff, 1.6 - sp / 16);
    draw_sprite_ext(this.sprite_index, 0, x, y, sp / 8, sp / 8, 0, 0xffffff, 1.6 - sp / 24);
    this.t += 1;
    if (this.t >= 20 && this.soundcon === 0) this.soundcon = 1; // snd_usefountain: not on the Weird Route
    if (this.t >= 70 && this.t <= 240) this.y -= 1;
    if (this.t >= 240 && this.t < 245) this.t = 300;
    if (this.t >= 390 && this.t < 395) {
      this.t = 400;
      this.siner = 3;
      if (this.soundcon === 1) {
        this.soundcon = 2;
        snd_play('snd_revival');
      }
    }
    if (this.t >= 450) {
      this.ds2 += 0.02;
      draw_set_alpha(this.ds2);
      draw_set_color(0xffffff);
      draw_rectangle(-10, -10, 999, 999, false);
      draw_set_alpha(1);
    }
    if (this.t >= 520) {
      this.ds3 += 0.01;
      draw_set_alpha(this.ds3);
      draw_set_color(0);
      draw_rectangle(-10, -10, 999, 999, false);
      draw_set_alpha(1);
    }
    if (this.t >= 650 && this.con === 0) {
      this.con = 1;
      S.startEnding('weird', { afterScene: true });
    }
  }
}
defineObject('obj_darkfountain_event', FountainEvent);

// obj_fountainkris_ch2_sideb con 21-23: 90 frames of black after the cold (obj_endbattle has
// already used 35 of them), then obj_darkfountain_event where Kris stood.
class WeirdAfter extends Instance {
  create() { this.alarm[0] = 55; this.visible = false; }
  alarm0() { instance_create(319, 339, 'obj_darkfountain_event'); }
}
defineObject('obj_sim_weird_after', WeirdAfter);
export function startWeirdPostScene() {
  gotoRoom();
  instance_create(0, 0, 'obj_sim_weird_after');
}

// ---------------------------------------------------------------- starting the fight

// BEGIN > NORMAL ROUTE (and every retry): the scene before the fight, or the fight right away when
// the SCENES option is off. global.tempflag[32] is set once the fight has started.
export async function startPreScene() {
  try {
    await loadRoom('room_dw_mansion_b_east');
  } catch (e) {
    console.warn(e); // without the room, straight to the fight
    return startBattle({ intro: G.settings?.intro !== false, weird: false });
  }
  G.weird = false;
  gotoRoom();
  const tempflag = global.tempflag; // scr_gamestart clears it; the retry count lives there
  S.init_battle_globals();
  global.tempflag = tempflag;
  // The enemy arrays outlive a battle in the game; the scene's heads read Spamton's attack from them.
  for (const k of ['monster', 'monsterat', 'monsterdf', 'monsterhp', 'monstermaxhp', 'mercymod', 'monsterx', 'monstery', 'hittarget', 'monstertype']) global[k] ??= [0, 0, 0];
  global.monsterat[1] = 13; // Spamton NEO's AT (scr_monstersetup), which the heads' damage comes from
  global.fighting = 0;
  global.interact = 0;
  global.facing = 0;
  enterRoom('room_dw_mansion_b_east', 2720, 960);
  const kris = instance_create(1140, 216, 'obj_mainchara');
  kris.bounds = [80, 150, 1640 - 38, 324];
  instance_create(640, 200, 'obj_ch2_sceneex2_pre');
  kris.endStep();
}
defineScript('startSneoFight', (opts = {}) => {
  if (opts.weird !== undefined) G.weird = !!opts.weird;
  if (G.weird && G.settings?.scenes !== false) return startWeirdPreScene();
  if (!G.weird && G.settings?.scenes !== false) return startPreScene();
  return startBattle({ intro: G.settings?.intro !== false, weird: G.weird });
});

// ---------------------------------------------------------------- after the fight (obj_ch2_sceneex2 con 9-60)

// The battle's obj_ch2_sceneex2 hands the won fight back to the scene: the battle ends, the party
// rides on in the cars for a moment, then room_dw_mansion_b_east_a.
SceneEx2.prototype.step = function () {
  if (G.weird || G.settings?.scenes === false || i_ex('obj_sandboxcontroller') || i_ex('obj_practicecontroller')) return;
  this.con ??= 9;
  this.alarm0 ??= function () { this.con += 1; };
  if (this.con === 9) {
    const bc = first('obj_battlecontroller');
    if (bc && bc.intro === 2) {
      this.con = 10;
      G.sneoAfterFight = true;
      this.alarm[0] = 5;
      loadRoom('room_dw_mansion_b_east_a').catch(() => {}); // fetched early; startPostScene waits for it
    }
  }
  if (this.con === 11) {
    this.con = 12;
    this.alarm[0] = 10;
    for (const b of instancesOf('obj_bulletparent')) instance_destroy(b);
    for (const o of instancesOf('obj_battlecontroller')) instance_destroy(o, false);
    mus_stop(global.batmusic?.[0]);
    mus_stop(global.batmusic?.[1]);
    const song = snd_init('shinkansen.ogg');
    this.song = mus_loop_ext(song, 0, 2);
    mus_volume(this.song, 1, 20);
  }
  if (this.con === 13) {
    this.con = 49;
    this.alarm[0] = 30;
    const at = [[81, 60, 'spr_krisr_dark'], [78, 125, 'spr_susie_walk_right_dw_unhappy'], [87, 215, 'spr_ralsei_walk_right_unhappy']];
    at.forEach(([x, y, spr], type) => {
      const k = instance_create(x, y, 'obj_coaster');
      Object.assign(k, { type, depth: [90000, 80000, 70000][type], siner_add0: [0.1, 0.08, 0.09][type] });
      k.step();
      k.character_sprite = spr;
      if (type === 2) k.character_offset_x = -10;
    });
    for (const o of instancesOf(['obj_heroparent', 'o_coaster_hero_sneo', 'o_coaster_hero_back_sneo'])) instance_destroy(o, false);
    // obj_endbattle walked the party back to their seats; the cars carry them from here.
    for (const e of instancesOf('obj_endbattle')) {
      for (const m of e.c ?? []) instance_destroy(m);
      instance_destroy(e, false);
    }
  }
  if (this.con === 50 && !d_ex()) {
    this.con = 59;
    this.alarm[0] = 30;
  }
  if (this.con === 60) {
    this.con = -1;
    startPostScene();
  }
};

// ---------------------------------------------------------------- obj_ch2_sceneex2a

class AfterScene extends Instance {
  create() {
    this.con = 1;
    this.depth = 0;
    this.visible = false;
    const w = this.whiteall = scr_dark_marker(-10, -10, 'spr_pixel_white');
    Object.assign(w, { image_xscale: 999, image_yscale: 999, depth: 0, image_blend: 0 });
    const sp = this.sparkle = scr_dark_marker(-100, -100, 'spr_shine');
    sp.image_speed = 0.25;
    sp.image_alpha = 0;
    this.flag571 = global.flag[571];
    audio_stop_all();
    snd_free_all();
    global.currentsong = [snd_init('spamton_neo_after.ogg'), null];
    global.currentsong[1] = mus_loop_ext(global.currentsong[0], 1, 1);
  }
  alarm0() { this.con += 1; }
  step() {
    if (this.con === 1) {
      global.interact = 1;
      global.facing = 0;
      const sneo = scr_dark_marker(288, -170, 'spr_spamton_defeat_vines');
      sneo.depth = 100000 - (sneo.y * 10 + sneo.sprite_height * 10);
      scr_cutscene_make(this);
      scr_maincharacters_actors(this, [
        { name: 'susie', x: 360, y: cameray() - 300 },
        { name: 'ralsei', x: 400, y: cameray() - 300 },
      ]);
      c.sel(this.kr); c.setxy(304, 221); c.facing('u');
      c.sel(this.ra); c.setxy(215, 310); c.facing('u');
      c.sel(this.su); c.setxy(374, 303); c.facing('u');
      this.con = 49;
      this.alarm[0] = 30;
      const sp = this.sparkle;
      c.var_lerp_instance(this.whiteall, 'image_alpha', 1, 0, 30);
      c.wait(30);
      c.speaker('spamton');
      c.msgsetloc(0, '* It seems after all I couldn\'t be anything more than a simple puppet./');
      c.msgnextloc('* But you three..^1. You\'re strong./');
      c.msgnextloc('* With a power like that.../');
      c.msgnextloc('* Maybe you three can break your own strings./');
      c.msgnextloc('* Let me become your strength./%');
      c.talk_wait();
      c.var_lerp_instance(sneo, 'image_alpha', 1, 0, 60);
      c.wait(30);
      c.var_instance(sp, 'x', 315);
      c.var_instance(sp, 'y', 150);
      c.var_lerp_instance(sp, 'image_alpha', 0, 1, 30);
      c.wait(30);
      c.var_lerp_instance(sp, 'x', 315, 315, 45);
      c.var_lerp_instance(sp, 'y', 150, 260, 45);
      c.wait(45);
      c.var_lerp_instance(sp, 'image_alpha', 1, 0, 15);
      c.wait(45);
      c.soundplay('snd_item');
      c.speaker('no_name');
      c.msgsetloc(0, '* (You got ShadowCrystal.)/%');
      c.talk_wait();
      c.wait(5);
      c.soundplay('snd_item');
      c.speaker('no_name');
      c.msgsetloc(0, this.flag571 === 1 ? '* (You got PuppetScarf.)/%' : '* (You got Dealmaker.)/%');
      c.talk_wait();
      c.mus2('volume', 0, 30);
      c.wait(30);
    }
    if (this.con === 50 && !d_ex()) {
      this.con = 60;
      c.actortokris();
      c.actortocaterpillar();
      c.terminatekillactors();
    }
    if (this.con === 60 && !i_ex('obj_cutscene_master')) {
      this.con = -1;
      global.interact = 0;
      this.alarm[1] = 30;
    }
  }
  alarm1() { S.startEnding('win', { afterScene: true }); }
}
defineObject('obj_ch2_sceneex2a', AfterScene);

export async function startPostScene() {
  try {
    await loadRoom('room_dw_mansion_b_east_a');
  } catch (e) {
    console.warn(e); // without the room, straight to the end screen
    G.sneoAfterFight = false;
    return S.startEnding('win');
  }
  const tempflag = global.tempflag;
  const flag571 = global.flag?.[571]; // the fight's result: 1 = won with violence, 2 = spared
  gotoRoom();
  global.tempflag = tempflag;
  global.flag[571] = flag571;
  global.facing = 0;
  enterRoom('room_dw_mansion_b_east_a', 640, 480);
  const kris = instance_create(300, 223, 'obj_mainchara');
  kris.bounds = [200, 150, 440 - 38, 324];
  instance_create(0, 40, 'obj_ch2_sceneex2a');
  G.sneoAfterFight = false;
}
defineScript('startPostScene', startPostScene);
defineScript('startWeirdPostScene', startWeirdPostScene);
