// The overworld side of DELTARUNE that the Spamton NEO scenes need: obj_cutscene_master and its c_*
// commands (scr_cutscene_commands), obj_actor, the movers (obj_move_actor, obj_move_to_point,
// obj_jump_to_point), the camera (obj_panner), obj_fadeout, emotes, obj_dialoguer, Kris walking in
// the room (obj_mainchara) and the rooms themselves (pre-rendered by tools/render_rooms.py).
import {
  G, global, Instance, defineObject, defineScript, S, instance_create, instance_destroy, instance_exists, instancesOf,
  draw_sprite_ext, draw_set_color, draw_rectangle, lerp, point_distance, point_direction, lengthdir_x, lengthdir_y,
  random_range, clamp, left_h, right_h, up_h, down_h, button2_h,
} from '../runtime/gm.js?v=20261107201439';
import { assets } from '../runtime/assets.js?v=20261107201439';
import {
  snd_play, snd_pitch, snd_volume, snd_init, mus_loop_ext, mus_volume, mus_stop, mus_pause, mus_resume,
} from '../runtime/audio.js?v=20261107201439';
import { scr_darkbox } from './common.js?v=20261107201439';
import { lerp_ease_in, lerp_ease_out, lerp_ease_inout, scr_shakeobj } from '../sneo/common.js?v=20261107201439';

const VERSION = new URL(import.meta.url).search;
const ROOMS_URL = new URL('../../assets/rooms/', import.meta.url).href;

// ---------------------------------------------------------------- rooms

// Each room is one picture (its tile, asset and background layers); it is registered as a sprite.
// A failed download is not remembered: it is tried again (once here, and on the next call).
const roomLoads = {};
export function loadRoom(name, tries = 2) {
  roomLoads[name] ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      assets.sprites['room:' + name] = { name: 'room:' + name, w: img.width, h: img.height, n: 1, c: 1, img, ox: 0, oy: 0, sp: 0 };
      resolve(img);
    };
    img.onerror = () => reject(new Error('failed to load room ' + name));
    img.src = ROOMS_URL + name + '.png' + VERSION;
  }).catch(e => {
    delete roomLoads[name];
    if (tries > 1) return new Promise(r => setTimeout(r, 500)).then(() => loadRoom(name, tries - 1));
    throw e;
  });
  return roomLoads[name];
}

class RoomBg extends Instance {
  create() { this.depth = 100000; this.room = ''; }
  draw() { draw_sprite_ext('room:' + this.room, 0, 0, 0, 1, 1, 0, 0xffffff, 1); }
}
defineObject('obj_sim_roombg', RoomBg);

// The room the scene plays in: its size (for the camera) and its picture behind everything.
export function enterRoom(name, w, h) {
  G.roomW = w;
  G.roomH = h;
  instance_create(0, 0, 'obj_sim_roombg').room = name;
}

// ---------------------------------------------------------------- helpers

export const scr_depth = inst => { inst.depth = 100000 - (inst.y * 10 + inst.sprite_height * 10); };

// obj_lerpvar with GameMaker's easing (scr_lerpvar_instance(target, var, a, b, time, easetype, "in"/"out"/"inout")).
export function lerpvar(target, varname, a, b, time, easetype = 0, inout = 'out') {
  const l = instance_create(0, 0, 'obj_lerpvar');
  Object.assign(l, { target, varname, pointa: a, pointb: b, maxtime: time, easetype, easeinout: inout });
  return l;
}

// scr_move_to_point_over_time (obj_move_to_point).
export function moveToPoint(target, x, y, time) {
  const m = instance_create(target.x, target.y, 'obj_move_to_point');
  Object.assign(m, { target, movex: x, movey: y, movemax: time });
  return m;
}

// ---------------------------------------------------------------- facing sprites

// scr_set_facing_sprites (dark world, Chapter 2).
const FACING = {
  kris: ['spr_krisu_dark', 'spr_krisr_dark', 'spr_krisd_dark', 'spr_krisl_dark'],
  susie: ['spr_susie_walk_up_dw', 'spr_susie_walk_right_dw', 'spr_susie_walk_down_dw', 'spr_susie_walk_left_dw'], // "susiedarkeyes"
  susieunhappy: ['spr_susie_walk_up_dw', 'spr_susie_walk_right_dw_unhappy', 'spr_susie_walk_down_dw_unhappy', 'spr_susie_walk_left_dw_unhappy'],
  ralsei: ['spr_ralsei_walk_up', 'spr_ralsei_walk_right', 'spr_ralsei_walk_down', 'spr_ralsei_walk_left'],
  ralseiunhappy: ['spr_ralsei_walk_up', 'spr_ralsei_walk_right_unhappy', 'spr_ralsei_walk_down_unhappy', 'spr_ralsei_walk_left_unhappy'],
};
const NAME_OF = { susieunhappy: 'susie', ralseiunhappy: 'ralsei' };
function setFacingSprites(a, name) {
  const s = FACING[name];
  if (!s) return;
  a.name = NAME_OF[name] ?? name;
  [a.usprite, a.rsprite, a.dsprite, a.lsprite] = s;
}
function actorFacing(a, f) {
  a.facing = f;
  a.sprite_index = { d: a.dsprite, r: a.rsprite, l: a.lsprite, u: a.usprite }[f] ?? a.sprite_index;
}

// ---------------------------------------------------------------- obj_actor

class Actor extends Instance {
  create() {
    scr_depth(this);
    Object.assign(this, {
      image_speed: 0, walk: 1, auto_walk: 1, auto_facing: 1, auto_depth: 1, stopped: 0, depthbonus: 0, facing: 'd',
      name: 'susie', fake_speed: 0, fake_direction: 0, color_blend: 0xffffff, sinerx: 0, sinery: 0,
      shakex: 0, shakey: 0, shakeamt: 0, dz: 2, image_xscale: 2, image_yscale: 2,
    });
    setFacingSprites(this, 'susie');
  }
  step() {
    if (this.auto_walk === 1 && this.walk === 1) {
      let v = 0;
      if (this.fake_speed !== 0) v = this.fake_speed;
      if (this.speed !== 0) v = this.speed;
      if (v > 0) {
        const n = v / (10 * this.dz);
        this.image_speed = n <= 0.25 ? 0.25 : n >= 1 ? 0.5 : n;
        if (this.stopped === 1) { this.image_index = 1; this.stopped = 0; }
      }
      if (v === 0) { this.stopped = 1; this.image_index = 0; this.image_speed = 0; }
    }
    if (this.auto_facing === 1) {
      let vv = 0, vh = 0;
      if (this.fake_speed !== 0) { vv = lengthdir_y(this.fake_speed, this.fake_direction); vh = lengthdir_x(this.fake_speed, this.fake_direction); }
      if (this.hspeed !== 0) vh = this.hspeed;
      if (this.vspeed !== 0) vv = this.vspeed;
      if (vv > 0.05) this.sprite_index = this.dsprite;
      if (vv < -0.05) this.sprite_index = this.usprite;
      if (Math.abs(vh) > Math.abs(vv) && vh > 0.05) this.sprite_index = this.rsprite;
      if (Math.abs(vh) > Math.abs(vv) && vh < -0.05) this.sprite_index = this.lsprite;
    }
    if (this.auto_depth === 1) { scr_depth(this); this.depth += this.depthbonus; }
  }
  draw() {
    draw_sprite_ext(this.sprite_index, this.image_index, this.x + this.sinerx + this.shakex, this.y + this.sinery + this.shakey,
      this.image_xscale, this.image_yscale, this.image_angle, this.color_blend, this.image_alpha);
  }
}
defineObject('obj_actor', Actor);

// ---------------------------------------------------------------- movers

// c_walk: obj_move_actor walks the actor in one direction for `time` frames.
class MoveActor extends Instance {
  create() { this.timer = 0; this.time = 0; this.target = null; }
  step() {
    const t = this.target;
    if (!t || !t.alive) { instance_destroy(this); return; }
    this.timer += 1;
    if (this.timer >= this.time) {
      t.speed = 0;
      t.image_index = 0;
      t.image_speed = 0;
      instance_destroy(this);
    }
  }
}
defineObject('obj_move_actor', MoveActor);

class MoveToPoint extends Instance {
  create() { Object.assign(this, { target: null, moved: 0, movetimer: 0, movex: 0, movey: 0, movemax: 10 }); }
  step() {
    const t = this.target;
    if (!t || !t.alive) { instance_destroy(this); return; }
    if (this.moved === 0) {
      this.x = t.x;
      this.y = t.y;
      this.amt = point_distance(this.x, this.y, this.movex, this.movey) / this.movemax;
      this.dir = point_direction(this.x, this.y, this.movex, this.movey);
      this.moved = 1;
    }
    if (t instanceof Actor) { t.fake_speed = this.amt; t.fake_direction = this.dir; }
    this.movetimer += 1;
    t.x = lerp(this.x, this.movex, this.movetimer / this.movemax);
    t.y = lerp(this.y, this.movey, this.movetimer / this.movemax);
    if (this.movetimer >= this.movemax) {
      if (t instanceof Actor) t.fake_speed = 0;
      instance_destroy(this);
    }
  }
}
defineObject('obj_move_to_point', MoveToPoint);

// c_jump (scr_jump_to_point): an arc from where the actor is to (endx, endy); the actor hides while a
// marker does the jump.
class JumpToPoint extends Instance {
  create() {
    Object.assign(this, { target: null, init: 0, jumptime: 30, jumpspeed: 0, jumpy: 0, timer: 0, con: 0 });
  }
  step() {
    const t = this.target;
    if (!t || !t.alive) { instance_destroy(this); return; }
    if (this.init === 0) {
      this.init = 1;
      this.startx = this.x;
      this.starty = this.y;
      this.fakegravity = this.jumpspeed / (this.jumptime * 0.5);
      const b = S.scr_dark_marker(t.x, t.y, t.sprite_index);
      Object.assign(b, { image_index: t.image_index, image_speed: t.image_speed, image_xscale: t.image_xscale, image_yscale: t.image_yscale, depth: t.depth });
      this.body = b;
      const rem = b.depth;
      scr_depth(b);
      this.ignoredepth = rem !== b.depth ? 1 : 0;
      b.depth = rem;
      t.visible = false;
      this.con = 2;
    }
    const b = this.body;
    if (this.con === 2) {
      this.timer += 1;
      this.jumpspeed -= this.fakegravity;
      this.jumpy -= this.jumpspeed;
      this.x = lerp(this.startx, this.endx, this.timer / this.jumptime);
      this.y = lerp(this.starty, this.endy, this.timer / this.jumptime);
      t.x = this.x;
      t.y = this.y;
      b.x = this.x;
      b.y = this.y + this.jumpy;
      if (this.ignoredepth === 0) {
        this.depth = 100000 - this.y * 10 - 5000;
        b.depth = this.depth;
      }
      if (this.timer >= this.jumptime) {
        b.x = t.x = this.endx;
        b.y = t.y = this.endy;
        this.con = 3;
      }
    }
    if (this.con === 3) {
      t.visible = true;
      instance_destroy(b);
      instance_destroy(this);
    }
  }
  draw() {}
}
defineObject('obj_jump_to_point', JumpToPoint);

// ---------------------------------------------------------------- camera, fades, emotes

// c_panspeed (type 0: move the view by panx/pany each frame) / c_pan (type 1: lerp to x, y).
class Panner extends Instance {
  create() {
    Object.assign(this, { panx: 0, pany: 0, startx: G.camX, starty: G.camY, finalx: this.x, finaly: this.y, panmax: 1, pantimer: 0, type: 0 });
  }
  step() {
    if (this.type === 0) { G.camX += this.panx; G.camY += this.pany; }
    this.pantimer += 1;
    if (this.type === 1) {
      G.camX = lerp(this.startx, this.finalx, this.pantimer / this.panmax);
      G.camY = lerp(this.starty, this.finaly, this.pantimer / this.panmax);
    }
    if (this.pantimer >= this.panmax) instance_destroy(this);
  }
}
defineObject('obj_panner', Panner);

// obj_fadeout: a black cover that fades in (fadespeed > 0) or out (fadein).
class Fadeout extends Instance {
  create() { Object.assign(this, { image_blend: 0, fadespeed: 0.08, image_alpha: 0, fadein: 0 }); this.depth = 3; }
  draw() {
    this.image_alpha += this.fadespeed;
    draw_set_color(this.image_blend);
    const a = clamp(this.image_alpha, 0, 1);
    if (a > 0) draw_sprite_ext('spr_pixel_white', 0, G.camX - 200, G.camY - 200, 260, 220, 0, this.image_blend, a);
    if (this.fadein === 1 && this.image_alpha <= 0) instance_destroy(this);
  }
}
defineObject('obj_fadeout', Fadeout);

// obj_fadein: the screen starts black and clears at fadespeed (negative) per frame.
class Fadein extends Instance {
  create() { this.image_alpha = 1; this.fadespeed = -0.05; this.depth = -100; }
  draw() {
    this.image_alpha += this.fadespeed;
    if (this.image_alpha <= 0) { instance_destroy(this); return; }
    draw_sprite_ext('spr_pixel_white', 0, G.camX - 20, G.camY - 20, 170, 130, 0, 0, this.image_alpha);
  }
}
defineObject('obj_fadein', Fadein);

// scr_emote ("!"): a bubble over the actor's head for `time` frames.
class ExcBlcon extends Instance {
  alarm0() { instance_destroy(this); }
}
defineObject('obj_excblcon', ExcBlcon);
function emote(a, kind, time) {
  const b = instance_create(a.x, a.y - 15, 'obj_excblcon');
  b.alarm[0] = time;
  b.image_xscale = b.image_yscale = 2;
  b.sprite_index = { '!': 'spr_exc', '?': 'spr_emote_questionmark', '...': 'spr_emote_ellipsis' }[kind] ?? 'spr_exc';
  b.y = a.y - 20;
  b.depth = a.depth - 10;
  const ox = (assets.sprites[a.sprite_index]?.ox ?? 0);
  b.x = a.x - ox * a.image_xscale + a.sprite_width / 2 - b.sprite_width / 2 + 20;
  b.image_speed = 0;
  return b;
}

// ---------------------------------------------------------------- obj_dialoguer

// The dark-world text box (scr_dbox) at the bottom (side 1) or top (side 0), with its writer and face.
class Dialoguer extends Instance {
  create() {
    this.depth = -500;
    this.active = 0;
    this.side = 1;
    this.writer = null;
    this.cur_jewel = 0;
    const k = first('obj_mainchara');
    if (k && k.y > G.camY + 250) this.side = 0;
    this.alarm[0] = 1;
  }
  alarm0() {
    this.active = 1;
    const xx = Math.round(38 + G.camX), yy = Math.round(40 + G.camY);
    const w = instance_create(xx + 20, this.side === 0 ? yy - 10 : yy + 300, 'obj_writer');
    w.depth = this.depth - 1;
    w.dialoguer = 1;
    w.facer = 1;
    const face = instance_create(w.x + 16, w.y + 10, 'obj_face');
    face.depth = this.depth - 2;
    if (global.fc !== 0 && w.originalcharline === 33) w.charline = 26;
    this.writer = w;
  }
  draw() {
    if (this.active !== 1) return;
    const x = G.camX, y = G.camY;
    draw_set_color(0);
    if (this.side === 0) {
      draw_rectangle(x + 38, y + 16, x + 602, y + 154, false);
      scr_darkbox(this, x + 24, y + 2, x + 616, y + 168);
    } else {
      draw_rectangle(x + 38, y + 326, x + 602, y + 464, false);
      scr_darkbox(this, x + 24, y + 312, x + 616, y + 478);
    }
    if (!this.writer || !this.writer.alive) instance_destroy(this);
  }
}
defineObject('obj_dialoguer', Dialoguer);
export const d_ex = () => instance_exists('obj_dialoguer');
const first = name => instancesOf(name)[0] ?? null;

// ---------------------------------------------------------------- obj_mainchara

// Kris in the room: walks with the arrows (runs while the cancel button is held), and the camera
// follows (obj_mainchara Step / End Step, dark world). `fun` hands Kris over to a cutscene.
const KRIS = ['spr_krisd_dark', 'spr_krisr_dark', 'spr_krisu_dark', 'spr_krisl_dark'];
class MainChara extends Instance {
  create() {
    Object.assign(this, {
      image_xscale: 2, image_yscale: 2, image_speed: 0, fun: 0, cutscene: 0, runtimer: 0, walktimer: 0, walkbuffer: 0,
      bwspeed: 4, bounds: [0, 0, 99999, 99999],
    });
    global.facing ??= 0;
    this.sprite_index = KRIS[global.facing];
  }
  step() {
    if (this.fun !== 0) return;
    const nowx = this.x, nowy = this.y;
    let px = 0, py = 0, runmove = 0;
    if (global.interact === 0) {
      const run = button2_h() ? 1 : 0;
      let wspeed = this.bwspeed;
      if (run) wspeed = this.bwspeed + (this.runtimer > 60 ? 5 : this.runtimer > 10 ? 4 : 2);
      if (right_h()) px = wspeed;
      if (left_h()) px = -wspeed;
      if (down_h()) py = wspeed;
      if (up_h()) py = -wspeed;
      if (left_h() && !right_h()) global.facing = 3;
      else if (right_h() && !left_h()) global.facing = 1;
      else if (up_h() && !down_h() && px === 0) global.facing = 2;
      else if (down_h() && !up_h() && px === 0) global.facing = 0;
      const [x1, y1, x2, y2] = this.bounds;
      this.x = clamp(this.x + px, x1, x2);
      this.y = clamp(this.y + py, y1, y2);
      if (run && (this.x !== nowx || this.y !== nowy)) { runmove = 1; this.runtimer += 1; } else this.runtimer = 0;
    }
    if (this.x !== nowx || this.y !== nowy) this.walkbuffer = 6;
    if (this.walkbuffer > 3) {
      this.walktimer += 1.5 + (runmove ? 1.5 : 0);
      if (this.walktimer >= 40) this.walktimer -= 40;
      this.image_index = Math.floor(this.walktimer / 10);
    }
    if (this.walkbuffer <= 0) {
      this.walktimer = Math.floor(this.walktimer / 10) * 10 + 9.5;
      this.image_index = 0;
    }
    this.walkbuffer -= 0.75;
    this.sprite_index = KRIS[global.facing];
    scr_depth(this);
  }
  endStep() {
    if (this.cutscene === 0 && !instance_exists('obj_shake')) {
      G.camX = clamp(this.x - (320 - 19), 0, (G.roomW ?? 640) - 640);
      G.camY = 0;
    }
  }
}
defineObject('obj_mainchara', MainChara);

// ---------------------------------------------------------------- obj_cutscene_master

class CutsceneMaster extends Instance {
  create() {
    Object.assign(this, {
      cmd: [], current: 0, waiting: 0, wait_timer: 0, wait_amount: 0, wait_dialogue: 0, wait_custom: 0,
      actor_id: [], actor_name: [], actor_selected_id: null, msgside: -1, mydialoguer: null, master_object: null,
      terminate: 0, kill_actors: 0, breakme: 0, mysound: null,
    });
    this.visible = false;
  }
  step() {
    if (this.waiting === 0) {
      let i = this.current;
      for (; i < this.cmd.length; i++) {
        const c = this.cmd[i];
        c.actor = this.actor_selected_id;
        this.run(c);
        if (this.breakme) { this.breakme = 0; break; }
      }
      this.current = i + 1;
    }
    if (this.waiting === 1) {
      if (this.wait_amount > 0) {
        this.wait_timer += 1;
        if (this.wait_timer >= this.wait_amount) { this.wait_amount = 0; this.wait_timer = 0; this.waiting = 0; }
      }
      if (this.wait_dialogue === 1 && !(this.mydialoguer && this.mydialoguer.alive)) { this.wait_dialogue = 0; this.waiting = 0; }
    }
    if (this.terminate === 1) {
      if (this.kill_actors === 1) for (const a of this.actor_id) if (a) instance_destroy(a);
      instance_destroy(this);
    }
  }
  run(c) {
    const [a1, a2, a3, a4, a5, a6] = c.args;
    const actor = c.actor;
    switch (c.name) {
      case 'walk': {
        const m = instance_create(0, 0, 'obj_move_actor');
        m.target = actor;
        m.time = a3;
        actor.speed = a2;
        actor.direction = { l: 180, d: 270, r: 0, u: 90 }[a1] ?? 0;
        break;
      }
      case 'walkdirect': {
        const m = instance_create(0, 0, 'obj_move_to_point');
        Object.assign(m, { target: actor, movex: a1 === 0 ? actor.x : a1, movey: a2 === 0 ? actor.y : a2, movemax: a3 });
        break;
      }
      case 'msgset': S.msgset(a1, a2); break;
      case 'msgnext': S.msgnext(a1); break;
      case 'talk':
        this.mydialoguer = instance_create(0, 0, 'obj_dialoguer');
        if (this.msgside >= 0) this.mydialoguer.side = this.msgside;
        break;
      case 'msgfacenext': S.scr_anyface_next(a1, a2); break;
      case 'msgside':
        if (a1 === 'any') this.msgside = -1;
        if (a1 === 'top') this.msgside = 0;
        if (a1 === 'bottom') this.msgside = 1;
        break;
      case 'emote': emote(actor, a1, a2); break;
      case 'speaker': S.scr_speaker(a1); break;
      case 'var': {
        const target = a1 === 0 ? actor : a1;
        if (!target) break;
        if (a5 === 0) target[a2] = a3;
        else if (a6 === 0) lerpvar(target, a2, a3, a4, a5);
        else {
          const m = /^(-?)(\d+)(.*)$/.exec(String(a6));
          lerpvar(target, a2, a3, a4, a5, m ? Number(m[1] + m[2]) : 0, m ? m[3] : 'out');
        }
        break;
      }
      case 'autowalk': actor.auto_facing = actor.auto_walk = a1; break;
      case 'facing':
        if ('ldru'.includes(a1) && a1.length === 1) actorFacing(actor, a1);
        else setFacingSprites(actor, a1);
        break;
      case 'sprite': actor.sprite_index = a1; break;
      case 'visible': actor.visible = !!a1; break;
      case 'imagespeed': actor.image_speed = a1; break;
      case 'imageindex': actor.image_index = a1; break;
      case 'soundplay': {
        const v = snd_play(a1);
        if (a2 !== 0) { snd_volume(v, a2, 0); snd_pitch(v, a3); }
        break;
      }
      case 'mus': this.music(a1, a2, a3); break;
      case 'fadeout':
        if (a1 > 0) {
          const f = instance_create(G.camX - 200, G.camY - 200, 'obj_fadeout');
          f.fadespeed = 1 / a1;
        } else if (a1 < 0) {
          for (const f of instancesOf('obj_fadeout')) { f.image_alpha = 1; f.fadespeed = 1 / a1; f.fadein = 1; }
        }
        break;
      case 'panspeed': Object.assign(instance_create(0, 0, 'obj_panner'), { panx: a1, pany: a2, panmax: a3 }); break;
      case 'pan': {
        const p = instance_create(a1, a2, 'obj_panner');
        Object.assign(p, { finalx: a1, finaly: a2, panmax: a3, type: 1 });
        break;
      }
      case 'pannable': for (const k of instancesOf('obj_mainchara')) k.cutscene = a1; break;
      case 'shake': instance_create(0, 0, 'obj_shake'); break;
      case 'shakeobj': scr_shakeobj(actor); break;
      case 'jump': {
        const j = instance_create(actor.x, actor.y, 'obj_jump_to_point');
        Object.assign(j, { target: actor, endx: a1, endy: a2, jumpspeed: a3, jumptime: a4 });
        break;
      }
      case 'addxy': actor.x += a1; actor.y += a2; break;
      case 'setxy': actor.x = a1; actor.y = a2; break;
      case 'actortokris': {
        const k = first('obj_mainchara'), kr = this.actor_id[this.actor_name.indexOf('kris')];
        if (k && kr && kr.alive) {
          k.x = kr.x;
          k.y = kr.y;
          k.visible = true;
          kr.visible = false;
          global.facing = { d: 0, r: 1, u: 2, l: 3 }[kr.facing] ?? global.facing;
        }
        break;
      }
      case 'actortocaterpillar': break; // the followers stay where their actors are
      case 'select': this.actor_selected_id = this.actor_id[a1]; break;
      case 'waitcustom':
        if (this.master_object) this.master_object.customcon = 1;
        this.wait_custom = 1;
        this.waiting = 1;
        this.breakme = 1;
        break;
      case 'waitdialoguer': this.waiting = 1; this.wait_dialogue = 1; this.breakme = 1; break;
      case 'wait': this.wait_amount = a1; this.wait_timer = 0; this.waiting = 1; this.breakme = 1; break;
      case 'terminate': this.terminate = 1; this.breakme = 1; break;
      case 'terminatekillactors': this.kill_actors = 1; this.terminate = 1; this.breakme = 1; break;
      case 'script': a1(...(a2 ?? [])); break; // the simulator's own hook (no GML command)
      default: console.warn('cutscene command not ported:', c.name);
    }
  }
  // c_mus / c_mus2: global.currentsong[0] is the stream, [1] the playing voice.
  music(kind, a, b) {
    const cs = global.currentsong ??= [null, null];
    if (kind === 'free_all' || kind === 'free') { mus_stop(cs[0]); mus_stop(cs[1]); }
    if (kind === 'stop') mus_stop(cs[1]);
    if (kind === 'pause') mus_pause(cs[1]);
    if (kind === 'resume') mus_resume(cs[1]);
    if (kind === 'init') cs[0] = snd_init(a);
    if (kind === 'initloop' || kind === 'initplay') {
      cs[0] = snd_init(a);
      cs[1] = mus_loop_ext(cs[0], 1, 1);
    }
    if (kind === 'volume') mus_volume(cs[1], a, b);
    if (kind === 'pitch') snd_pitch(cs[1], a);
  }
}
defineObject('obj_cutscene_master', CutsceneMaster);

// scr_cutscene_make + the c_* commands (they queue on the newest cutscene master).
let master = null;
export function scr_cutscene_make(owner) {
  master = instance_create(0, 0, 'obj_cutscene_master');
  master.master_object = owner;
  return master;
}
const cmd = (name, ...args) => { if (master && master.alive) master.cmd.push({ name, args, actor: null }); };

// scr_maincharacters_actors: an actor for Kris (from obj_mainchara) and for each follower given.
export function scr_maincharacters_actors(owner, followers) {
  const k = first('obj_mainchara');
  const add = (n, name, x, y, spr, depth) => {
    const a = instance_create(x, y, 'obj_actor');
    master.actor_id[n] = a;
    master.actor_name[n] = name;
    setFacingSprites(a, name);
    a.sprite_index = spr ?? a.dsprite;
    if (depth !== undefined) a.depth = depth;
    return a;
  };
  owner.kr = 0;
  owner.kr_actor = add(0, 'kris', k.x, k.y, k.sprite_index, k.depth);
  k.visible = false;
  for (const [i, f] of followers.entries()) {
    const n = i + 1;
    owner[f.name === 'susie' ? 'su' : 'ra'] = n;
    owner[f.name === 'susie' ? 'su_actor' : 'ra_actor'] = add(n, f.name, f.x, f.y, f.sprite);
  }
}

export const c = {
  sel: n => cmd('select', n),
  setxy: (x, y) => cmd('setxy', x, y),
  addxy: (x, y) => cmd('addxy', x, y),
  visible: v => cmd('visible', v),
  facing: f => cmd('facing', f),
  sprite: s => cmd('sprite', s),
  imageindex: i => cmd('imageindex', i),
  imagespeed: s => cmd('imagespeed', s),
  autowalk: v => cmd('autowalk', v),
  walk: (d, sp, t) => cmd('walk', d, sp, t),
  walk_wait: (d, sp, t) => { cmd('walk', d, sp, t); cmd('wait', t); },
  walkdirect: (x, y, t) => cmd('walkdirect', x, y, t),
  jump: (x, y, sp, t) => cmd('jump', x, y, sp, t),
  wait: t => cmd('wait', t),
  waitcustom: () => cmd('waitcustom'),
  var_instance: (inst, v, val) => cmd('var', inst, v, val, 0, 0, 0),
  var_lerp_instance: (inst, v, a, b, t, ease, inout) => cmd('var', inst, v, a, b, t, ease === undefined ? 0 : String(ease) + (inout ?? '')),
  var_lerp: (v, a, b, t, ease, inout) => cmd('var', 0, v, a, b, t, ease === undefined ? 0 : String(ease) + (inout ?? '')),
  soundplay: s => cmd('soundplay', s, 0, 0),
  soundplay_x: (s, vol, pitch) => cmd('soundplay', s, vol, pitch),
  mus: k => cmd('mus', k),
  mus2: (k, a, b) => cmd('mus', k, a, b),
  fadeout: t => cmd('fadeout', t),
  fadein: t => cmd('fadeout', -t),
  pannable: v => cmd('pannable', v),
  panspeed: (x, y, t) => cmd('panspeed', x, y, t),
  panspeed_wait: (x, y, t) => { cmd('panspeed', x, y, t); cmd('wait', t); },
  pan: (x, y, t) => cmd('pan', x, y, t),
  shake: () => cmd('shake'),
  shakeobj: () => cmd('shakeobj'),
  emote: (k = '!', t = 30) => cmd('emote', k, t),
  speaker: s => cmd('speaker', s),
  msgside: s => cmd('msgside', s),
  msgsetloc: (n, s) => cmd('msgset', n, s),
  msgnextloc: s => cmd('msgnext', s),
  facenext: (who, e) => cmd('msgfacenext', who, e),
  talk_wait: () => { cmd('talk'); cmd('waitdialoguer'); },
  actortokris: () => cmd('actortokris'),
  actortocaterpillar: () => cmd('actortocaterpillar'),
  terminatekillactors: () => cmd('terminatekillactors'),
  script: (fn, ...args) => cmd('script', fn, args),
};

// c_waitcustom_end: lets the commands after a c_waitcustom run.
export function c_waitcustom_end() {
  for (const m of instancesOf('obj_cutscene_master')) { m.wait_custom = 0; m.waiting = 0; }
}

defineScript('scr_cutscene_make', scr_cutscene_make);
void random_range;
