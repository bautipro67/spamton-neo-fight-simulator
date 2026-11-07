// SPAMTON NEO: obj_spamton_neo_enemy (Create, Step, End Step, Draw, Alarm_4/6, Other_10/13/14/22),
// (the Weird Route's branches are in weird.js: scr_sideb_get_phase() > 2), plus the fight's backdrop (obj_ch2_sceneex2's
// cityscape and tracks), the party's coaster cars (o_coaster_hero_sneo) and obj_sneo_hitdetector.
// Battle-system scripts come from the battle modules through S (scr_enemyblcon, scr_battletext_default,
// scr_nextact, scr_mercyadd, scr_monstersetup...).
import {
  G, global, Instance, defineObject, instance_create, instance_destroy, instance_exists, instancesOf,
  choose, random, irandom, merge_color, draw_sprite_ext, d3d_set_fog, button3_p, snd_play, snd_stop, bgr, S,
} from './rt.js?v=20261107050450';
import { first, camerax, cameray, i_ex, callOr, tagParent, snd_play_x } from './common.js?v=20261107050450';
import { scr_bulletspawner } from './dbullet.js?v=20261107050450';
import {
  objectExists, sprite_get_xoffset, sprite_get_yoffset, point_distance, lerp, draw_set_color, draw_set_alpha,
  draw_line_width, make_color_rgb, point_direction, lengthdir_x, lengthdir_y, draw_circle, random_range, clamp,
} from '../runtime/gm.js?v=20261107050450';
import { snd_init, snd_loop, snd_pitch, snd_volume, mus_loop_ext, mus_stop, snd_is_playing } from '../runtime/audio.js?v=20261107050450';

const snd_free = s => { if (s) mus_stop(s); };
const sneoInst = () => first('obj_spamton_neo_enemy');

// obj_sneo_vine_cut: a snapped wire flashes white and shakes, then its two ends pull apart (type 0).
class VineCut extends Instance {
  create() {
    Object.assign(this, {
      timer: 0, shakeamount: 10, type: 0, vineid: -1, hide: 0, x1: this.x, x2: this.x, y1: this.y, y2: this.y, x3: this.x,
      x4: this.x, y3: this.y, y4: this.y, alpha: 1, lineangle: 0, anglecutspeed: 3, bottomlinevisible: 1,
    });
  }
  draw() {
    const s = sneoInst();
    this.timer += 1;
    if (this.shakeamount > 0) this.shakeamount -= 1;
    const sh = this.shakeamount - random(this.shakeamount * 2);
    if (s) this.y1 = s.y + s.party[this.vineid] - 10 + s.partyoff[this.vineid];
    if (this.type === 0) {
      if (this.timer === 11) {
        this.x3 = this.x1;
        this.x4 = this.x2;
        this.y3 = this.y1 - 130;
        this.y4 = this.y2;
        this.y2 = this.y1 - 130;
      }
      if (this.timer > 11) {
        if (this.y4 < this.y3) this.y3 -= 4;
        if (this.y1 > this.y2) this.y2 += 4;
      }
      if (this.timer === 60) { instance_destroy(this); return; }
    }
    if (Math.abs(this.y1 - this.y2) < 16 || this.y2 > this.y1) this.bottomlinevisible = 0;
    draw_set_alpha(this.alpha);
    draw_set_color(bgr(4235519));
    if ((this.timer >= 11 && this.type === 0 && this.hide === 0) || (this.type === 1 && this.hide === 0)) draw_line_width(this.x3, this.y3, this.x4, this.y4, 2);
    if (this.bottomlinevisible === 1 && this.hide === 0) draw_line_width(this.x1 + sh, this.y1 + sh, this.x2 + sh, this.y2 + sh, 2);
    if (this.timer < 11 && this.hide === 0) {
      draw_set_color(0xffffff);
      draw_set_alpha(11 - this.timer / 10);
      draw_line_width(this.x1, this.y1, this.x2, this.y2, 2);
    }
    draw_set_alpha(1);
  }
}
defineObject('obj_sneo_vine_cut', VineCut);

// obj_sneo_vine_weak: the slash where a wire snaps.
class VineWeak extends Instance {
  constructor() { super(); this.sprite_index = 'spr_attack_cut1'; }
  create() { this.image_speed = 0.25; }
  step() { if (this.image_index > 3) instance_destroy(this); }
}
defineObject('obj_sneo_vine_weak', VineWeak);

// obj_sneo_vine_transition: a back wire slides over to replace a snapped front wire (30 frames);
// while extra_vines last, a new back wire appears to take its place.
class VineTransition extends Instance {
  create() {
    const s = sneoInst();
    Object.assign(this, { timer: 0, width: 1, vineid: s ? s.vineid : 0, hide: 0, a: 0, selected_vine: 0, y2: -400 });
    if (!s) { instance_destroy(this); return; }
    this.depth = s.depth + 5;
    let c = irandom(17);
    for (let e = 0; ; e++) {
      if (s.partvisible_back[c] === 1) break;
      c = (c + 1) % 18;
      if (e + 1 > 18) { instance_destroy(this); return; }
    }
    this.a = c;
    s.partvisible_back[c] = 0;
    this.selected_vine = c;
    this.x1 = s.x + s.partxoff_back[c] + Math.sin(s.partsiner_back[c] / 30) * 2;
    this.x2 = s.x + s.partxoff_back[c];
    this.y1 = s.y + s.partyoff_back[c];
  }
  draw() {
    const s = sneoInst();
    if (!s) { instance_destroy(this); return; }
    const v = this.vineid, a = this.a;
    this.timer += 1;
    this.width += 1 / 30;
    const x3 = s.x + s.partx[v] + s.partxoff[v] / 1.2 + v * 5 + Math.sin(s.partsiner[v] / 30) * 2;
    if (global.myfight !== 3 && global.monsterattackname?.[s.myself] === 'UnspecifiedSneoAttack') {
      this.x1 = s.x + s.partxoff_back[a] + Math.sin(s.partsiner_back[a] / 30) * 2;
    }
    this.y1 = s.y + s.partyoff_back[a];
    for (let k = 0; k < 2; k++) {
      if (this.x1 < x3 - 1) this.x1 += 1;
      if (this.x2 < x3 - 1) this.x2 += 1;
      if (this.x1 > x3 + 1) this.x1 -= 1;
      if (this.x2 > x3 + 1) this.x2 -= 1;
    }
    if (this.timer >= 31) {
      s.partvisible[v] = 1;
      s.partweakened[v] = 0;
      for (let ii = 0; ii < 18; ii++) {
        if (s.partvisible_back[ii] === 0 && s.extra_vines > 0) {
          s.extra_vines -= 1;
          s.partvisible_back[ii] = 1;
          s.vinebgcount += 1;
        }
      }
      instance_destroy(this);
    }
    if (this.hide === 1) return;
    draw_set_color(bgr(32768));
    draw_line_width(this.x1, this.y1, this.x2, this.y2, this.width);
    draw_set_alpha((31 - this.timer) / 30);
    draw_set_color(make_color_rgb(0, 51, 0));
    draw_line_width(this.x1, this.y1, this.x2, this.y2, this.width);
    draw_set_alpha(1);
  }
}
defineObject('obj_sneo_vine_transition', VineTransition);

const MonsterParent = tagParent('obj_monsterparent');

export const isphase = callOr('scr_isphase', p => {
  if (p === 'menu') return global.myfight === 0;
  if (p === 'acting') return global.myfight === 3;
  if (p === 'enemytalk' || p === 'balloon') return global.mnfight === 1;
  if (p === 'bullets' || p === 'enemyattack') return global.mnfight === 2;
  return false;
});
export const turntimer = callOr('scr_turntimer', t => { if (global.turntimer < t) global.turntimer = t; });
const moveheart = callOr('scr_moveheart', () => {
  const k = first('obj_herokris');
  return instance_create(k ? k.x + 10 : camerax() + 90, k ? k.y + 40 : cameray() + 140, 'obj_moveheart');
});
export function msgset(n, s) {
  global.msg ??= [];
  global.msg[n] = s;
  global.msgno = n;
  for (let i = n + 1; i < global.msg.length; i++) global.msg[i] = '%%';
}
export function msgnext(s) {
  global.msgno = (global.msgno ?? 0) + 1;
  global.msg[global.msgno] = s;
}
export const writerExists = () => i_ex('obj_writer');
export const killWriters = () => { for (const w of instancesOf('obj_writer')) instance_destroy(w); };
export const sneoEnemy = () => first('obj_spamton_neo_enemy');

// Hooks for the attack modules (so they never need to edit this file):
// - POSES[partmode](sneo, i): the Draw_0 pose code for body part i in that partmode (it runs
//   instead of the built-in poses, before part i is drawn; return true to skip drawing the part).
// - POSE_BEFORE[partmode](sneo) / POSE_AFTER[partmode](sneo): extra drawing before / after the parts.
// - STEP_HOOKS: functions (sneo) run at the end of every Step.
export const POSES = {}, POSE_BEFORE = {}, POSE_AFTER = {}, STEP_HOOKS = [];

// rr (the turn's attack) -> the objects it needs. An rr counts as ported once its attack module
// has registered them; the others fall back (see playedAttack) so every turn still plays something.
const RR_OBJECTS = {
  0: ['obj_sneo_guymaker'], 1: ['obj_pipis_controller'], 2: ['obj_sneo_wireheart'], 3: ['obj_pipis_controller'],
  6: ['obj_sneo_wall_controller_new'], 7: ['obj_sneo_faceattack'], 8: ['obj_sneo_phonecall'],
  8.5: ['obj_sneo_phonehand_master'], 9: ['obj_sneo_final_forme'], 5: ['obj_sneo_weird_end_pipis'],
};
export const PORTED_RR = { has: rr => !!RR_OBJECTS[rr] && RR_OBJECTS[rr].every(objectExists) };

// talked == 0.6: ballooncon -> the next line (and the next ballooncon; none = last line).
const BALLOON = {
  1: "3X THE [Fire]POWER.&2X THE [Water]POWER.&AND BEST OF ALL,&FLYING [Heads]!/%",
  2: 'THOSE [Cathode Screens]&INTO [Cathode Screams]/%',
  3: "THEN WE'LL BE&THE ONES MAKING&THE [Calls], KRIS!/%",
  4: 'OR... DID YOU NEED&A LITTLE&[Specil Tour]?/%',
  5: 'LOOK IN MY [Eyes]&LOOK IN MY [Nose]&LOOK IN MY [Mouth]/%',
  6: "[Die Now] AND I'LL&THROW IN [50]&[Bullets] FOR FREE!/%",
  7: 'KRIS!! THINK!!&WHAT ARE MY&[Eggs] GOING TO DO!?/%',
  8: ["YOU DON'T NEED [Friends]!!/%", 9],
  9: 'I CAN MAKE MY&HANDS INTO&PHONES!!!/%',
  10: 'I WILL GIVE YOU&[3 Easy Payments&of $9.99!]/%',
  11: 'I CAN ONLY [Kill]&YOU [50-percent faster&than similar products]&OR [No Money Back!]/%',
  12: 'DO YOU WANNA BE&A [Heart] ON A [Chain]&YOUR WHOLE LIFE!?/%',
  13: 'Did you wanna&be.../%',
  15: 'GO [Ga-Ga]&AND [Die]/%',
  25: ['BUT JUST LOOK, KRIS.&LOOK AT THE [Power of&NEO] AND ASK YOURSELF.../%', 26],
  26: ["WELL, DON'T YOU?/%", 27],
  27: "DON'T YOU WANNA&BE A [Big Shot]!?/%",
};
// The defeat dialogue (endcon 2): sneo_defeat_cutscene_version 0 (HP gone) and 1 (mercy 100).
const END_HP = [null,
  ['HAHAHA... KRIS!!!&YOU THINK DEPLETING&MY [8000 Life Points]/%', { shocktimer: 9999, hurttimer2: 10, partmode: 40 }],
  ["MEANS YOU'VE WON&[A Free Meal] TO&[Winning]?!/%", { shocktimer: 9999, hurttimer2: 10 }],
  ['NO!!! NO!!! NE-O!!/%', { shocktimer: 9999, hurttimer2: 10 }],
  ['KRIS!!&YOUR [Deal] HAS FAILED!!&[NEO] NEVER LOSES!!/%', { shocktimer: 9999, hurttimer2: 10 }],
  ["THIS IS [Victory Smoke]!!&IT MEANS IT'S TIME&FOR MY [Second Form]!/%", { shockthreshold: 10, hurttimer2: 20, dontchangepose: 0, smokethreshold: 10, partmode: 40, smoke: true }],
  ['ARE YOU READY KRIS!?&FOR MY [Next Trick]!/%', {}],
  ['I WILL FILL MY [Body]&WITH [Electricaty] AND BECOME&SPAMTON [EX]!/%', {}],
  ['ARE YOU READY [Kids]!?/%', { shockthreshold: 10, hurttimer2: 10, overpower: 0.3, bg: -5, track: 20 }],
  ['[Turn Up The JUICE!]&[Turn Up The JUICE!]/%', { shockthreshold: 5, overpower: 0.5, bg: -9, smokethreshold: 1 }],
  ["[Make Sure You Don't&Get It On Your Shoese!]/%", { shockthreshold: 3, overpower: 0.7, bg: -13 }],
  ["ARE YOU GETTING&ALL THIS [Mike]!?&I'M FINALLY/%", { shockthreshold: 2, overpower: 0.9, bg: -17 }],
  ["I'M FINALLY GONNA&BE A BIG SHOT!!!/%", { shockthreshold: 1, overpower: 1.1, bg: -21 }],
  ['HERE I GO!!!!&WATCH ME FLY,&[MAMA]!!!!/%', { shocktimer: 1, overpower: 1.3, bg: -25 }],
];
const END_MERCY = [null,
  ["MY... MY [Wires]...&THEY'RE ALMOST [Gone]!?/%", { headendcon: 1, partmode: 1 }],
  ["KRIS... YOU...&YOU'RE [Gifting] ME&MY [Freedom]?!/%", {}],
  ['KRIS... AFTER EVERYTHING&I DID TO YOU...!?/%', { headendcon: 2, partmode: 1 }],
  ['AFTER ALL THE&[Unforgettable D3als]&[Free KROMER] I&GAVE YOU/%', { headendcon: 3, partmode: 1 }],
  ["YOU'RE FINALLY&REPAYING MY&[Genorisity]!?/%", {}],
  ['KRIS!!! I UNDERSTAND&NOW!! THE GREATEST&DEAL OF ALL!!!/%', { headendcon: 2, partmode: 99 }],
  ['[Friendship]!!!/%', { headendcon: 3, partmode: 36, happy: true }],
  ['KRIS!!! MY DAYS AS&A [Long-Nosed Doll]&ARE OVER!!!/%', {}],
  ['CUT THAT&[Wire] AND MAKE&ME A [Real Boy]!!/%', {}],
  ["ARE YOU WATCHING,&[Heaven]!? IT'S&TIME FOR SPAMTON'S&[Comeback Special]!/%", {}],
  ['AND THIS TIME...&I LIVE FOR MYSELF!!!/%', {}],
  ['NO... MYSELF AND&MY [Friend(s)]!!!/%', { partmode: 36 }],
  ['HERE I GO!!!!&WATCH ME FLY,&[MAMA]!!!!/%', { partmode: 36, dancealtcon: 2 }],
];

export class SpamtonNeoEnemy extends MonsterParent {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_example';
  }
  create() {
    // scr_enemy_object_init
    Object.assign(this, {
      becomeflash: 0, flash: 0, turnt: 0, turns: 0, talktimer: 0, state: 0, siner: 0, fsiner: 0, talked: 0, attacked: 0,
      hurt: 0, hurttimer: 0, hurtshake: 0, shakex: 0, acttimer: 0, con: 0, dodgetimer: 0, fatal: 0,
      candodge: 0, mytarget: 0, damage: -1, grazepoints: -1, timepoints: -1, inv: -1, target: -1, grazed: -1, grazetimer: -1,
      element: 'none', acting: 0, actcon: 0, actingsus: 0, actingral: 0, actingnoe: 0, actconsus: 0, actconral: 0, actconnoe: 0,
      talkmax: 90, mercymod: 0, maxmercy: 100, recruitable: 1, recruitcount: 1, hurtspriteoffx: 0, hurtspriteoffy: 0,
    });
    this.depth = 90 - (this.y - cameray()) / 50;
    // Create_0
    Object.assign(this, {
      upgrade: 0, bigshot: 1, bigshotused: 0, bigshotcount: 0, weakentimer: 0, weakenshakeamount: 0,
      vinebgcount: 18, snapallcount: 0, endcon: 0, endtimer: 0, usedact: 0, difficulty: 0, turn: 0, phaseturn: 0, phase: 1,
      haveusedfinalattack: 0, nothitduringphonehands: 1, singleshotmercy: 0, prevmercy: 0, faceattackcount: 0,
      sneo_defeat_cutscene_version: 0, targetbgspeed: 0, didwejustdie: 0, lastwirecon: 0,
      headendcon: 0, finalattackconversationcon: 0, funnycheat: 0, hellmode: 0, f: 2, shocker: 0, dead: 0,
      checkcount: 0, shocker_threshold: 10, shocktimer: 0, shockthreshold: 10, hurttimer2: 0, aimmode: 0, armaim: -80,
      partmode: 1, phoneevent: 0, ballooncon: 0, balloonend: 1, talkedcon: 0, statustextorder: 0, statustextalt: 0,
      statustextalt2: 0, statustextupdate: 0, correct_answer: -1, facing: 1, rr: 0, rtimer: 0, vinex: 0,
      violentendflash: 0, attackdebug: -1, difficultydebug: -1, headsize: 1, shotanimtimer: 0, lerper: 0,
      head_recoil_amount: 0, dance_timer: 0, shootydanceinit: 0, chargesfxtimer: 0, chargepitch: 0.1, smoketimer: 0,
      smokethreshold: 1, dontchangepose: 0, heartattackoffsetx: 0, siner: 0,
    });
    this.idealrot = new Array(8).fill(0);
    this.image_speed = 1 / 6;
    this.idlesprite = this.hurtsprite = this.sparedsprite = 'spr_sneo_example';
    this.custom_draw = 1;
    this.image_xscale = 2;
    this.image_yscale = 2;
    this.blend = merge_color(0xffffff, 0, 0.15);
    this.hitdetector = instance_create(this.x, this.y, 'obj_sneo_hitdetector');
    this.partsprite = ['spr_sneo_wingl', 'spr_sneo_arml', 'spr_sneo_legl', 'spr_sneo_legr', 'spr_sneo_body', 'spr_sneo_head', 'spr_sneo_armr', 'spr_sneo_wingr'];
    for (const k of ['partframe', 'partsiner', 'partrot', 'partx', 'party', 'partweakened']) this[k] = new Array(8).fill(0);
    this.partblend = new Array(8).fill(0xffffff);
    this.partvisible = new Array(8).fill(1);
    this.partxoff = this.partsprite.map(s => sprite_get_xoffset(s) * 2);
    this.partyoff = this.partsprite.map(s => sprite_get_yoffset(s) * 2);
    this.partsiner_back = new Array(18).fill(0);
    this.partxoff_back = Array.from({ length: 18 }, (_, ii) => sprite_get_xoffset(this.partsprite[0]) * (1.8 + ii / 9));
    this.partyoff_back = new Array(18).fill(sprite_get_yoffset(this.partsprite[0]) * 2);
    this.partvisible_back = new Array(18).fill(1);
    Object.assign(this, {
      extra_vines: 26, lastwiretimer: 0, funnycheattimer: 0, funnycheattimer2: 0, funnycheattimer3: 0, headexpand: 0,
      headforceframe: -1, fakegrav: 0, falltimer: 0, fallshake: 0, vineid: 0, shadow_amount: 0, shake_head: 0,
    });
    this.armlength = point_distance(this.partxoff[1], this.partyoff[1], 36, 146);
    for (const b of instancesOf('obj_battleback')) instance_destroy(b);
    if (!G.weird && !i_ex('obj_ch2_sceneex2')) instance_create(0, 0, 'obj_ch2_sceneex2');
    global.tempflag ??= [];
  }
  cleanUp() { global.invc = 1; }
  alarm4() { this.actcon += 1; }
  alarm6() {
    if (this.endcon > 0) {
      if (this.balloonend === 1) this.endcon = 4;
      else { this.endcon = 2; this.talktimer = 0; }
    } else if (this.balloonend === 1) this.talked = 1;
    else { this.talked = 0.6; this.talktimer = 0; }
  }
  // Other_22
  user12() {
    global.monsterx[this.myself] = this.x + this.sprite_width / 3;
    global.monstery[this.myself] = this.y + this.sprite_height / 2;
    S.scr_monstersetup(this);
  }
  // Other_10: this turn's attack (rr) and difficulty, in fight order.
  user0() {
    const m = this.myself, mp = global.mercymod[m], hp = global.monsterhp[m], max = global.monstermaxhp[m];
    if ((mp > 25 && this.phase === 1) || (hp < max * 0.75 && this.phase === 1)) this.phase = 2;
    if ((mp > 50 && this.phase === 2) || (hp < max * 0.5 && this.phase === 2)) this.phase = 3;
    if ((mp > 70 && this.phase === 3) || (hp < max * 0.3 && this.phase === 3)) { this.phaseturn = 0; this.phase = 4; }
    this.turn += 1;
    this.phaseturn += 1;
    const set = (rr, d) => { this.rr = rr; this.difficulty = d; };
    const t = this.phaseturn;
    if (t === 1) set(0, 1);
    if (t === 2) set(6, 0);
    if (t === 3) set(2, 0);
    if (t === 4) set(8, 0);
    if (t === 5) set(8.5, this.hellmode === 1 ? 2 : 0);
    if (t === 6) set(7, 0);
    if (t === 7) set(2, 2);
    if (t === 8) set(0, 3);
    if (t === 9) set(7, 0);
    if (t === 10) set(8.5, (this.nothitduringphonehands === 1 || this.hellmode === 1) ? 1 : 2);
    if (t === 11) set(8, 1);
    if (t === 12) { set(6, 1); this.phaseturn = 7; }
    if (this.phase === 4) {
      if (t === 1) set(2, 1);
      if (t === 2) set(8, 3);
      if (t === 3) { set(9, 0); this.haveusedfinalattack = 1; }
      if (t === 4) set(2, 1);
      if (t === 5) set(7, 0);
      if (t === 6) { set(9, 0); this.phaseturn = 3; }
    }
    if ((hp < max * 0.1 && this.haveusedfinalattack === 0) || (mp > 90 && this.haveusedfinalattack === 0)) {
      set(9, 0);
      this.haveusedfinalattack = 1;
      this.phaseturn = 3;
    }
    if (this.weirdpathendcon > 0) this.rr = 5;
  }
  // The attack that actually plays: an rr whose objects are not ported yet falls back to Flying
  // Heads, harder from phase 3 on (his line still follows the real rr).
  playedAttack() {
    if (PORTED_RR.has(this.rr)) return [this.rr, this.difficulty];
    return [0, this.phase >= 3 ? 3 : 1];
  }
  // Other_13: defeat bookkeeping.
  user3() {
    const f = global.flag, m = this.myself;
    if (!f) return;
    global.monstergold[3] += global.monstergold[m];
    global.monsterexp[3] += global.monsterexp[m];
    if (f[51 + m] === 0) f[51 + m] = global.monsterhp[m] <= 0 ? 1 : 2;
    if (f[51 + m] === 1) f[40] += 1;
    if (f[51 + m] === 2) f[41] += 1;
  }
  // Other_14: BIG SHOTs fired back to back (the charge cheat) make him stronger; less so after
  // game overs (tempflag[37]).
  user4() {
    this.funnycheat += 1;
    if (this.funnycheat <= 5) return;
    const m = this.myself, tf = global.tempflag?.[37] ?? 0;
    const cap = tf < 2 ? [26, 0.5, 1] : tf < 4 ? [22, 0.25, 1] : tf < 6 ? [18, 0.1, 0] : tf < 10 ? [15, 0.04, 0] : null;
    if (!cap) return;
    // Adds while below the cap (so it can end just past it, as in the GML), else sets the cap.
    global.monsterat[m] = global.monsterat[m] < cap[0] ? global.monsterat[m] + cap[1] : cap[0];
    if (cap[2]) this.hellmode = 1;
  }
  balloon() {
    global.typer = 72;
    S.scr_enemyblcon(this, this.x - 10, global.monstery[this.myself], 10);
  }
  step() {
    const m = this.myself;
    if (this.bigshot === 1) global.sp = 5;
    if (global.fighting !== 1 || this.endcon >= 11) return;
    if (G.weird) this.weirdPreStep();
    if (global.monster[m] === 1 && this.endcon === 0) {
      if (!G.weird && isphase('enemytalk') && this.talked === 0 && global.monsterhp[m] <= 0) {
        this.talked = -1;
        this.endcon = 1;
      }
      if (isphase('enemytalk') && this.talked === 0) this.startTalk();
      if (this.talked === 0.6) this.nextBalloon();
      if (this.talked === 1 && isphase('enemytalk')) {
        this.talktimer += 1;
        if ((button3_p() && this.talktimer > 15) || !writerExists()) {
          killWriters();
          this.talkedcon = 1;
        }
        if (this.talkedcon === 1) this.startBullets();
      }
      if (isphase('bullets') && this.attacked === 0) {
        this.rtimer += 1;
        if (this.rtimer === 15) this.launchAttack();
        else turntimer(120);
      }
      if (i_ex('obj_returnheart') && this.statustextupdate === 0) this.statusText();
    }
    if (global.monster[m] === 1 && global.myfight === 3) this.stepActs();
    if (this.endcon >= 1) this.stepEnd();
    for (const h of STEP_HOOKS) h(this);
  }
  // Step_0, enemytalk: the attack is chosen first, then his line for it.
  startTalk() {
    const m = this.myself;
    S.scr_randomtarget(this);
    if (!instance_exists('obj_darkener')) instance_create(0, 0, 'obj_darkener');
    if (this.turn > 14 && (this.weirdpathendcon ?? 0) === 0 && global.monsterdf[m] > -10) global.monsterdf[m] -= 3;
    this.ballooncon = 0;
    this.balloonend = 1;
    this.talkedcon = 0;
    this.statustextupdate = 0;
    this.attacked = 0;
    global.typer = 72;
    this.rr = -1;
    this.user0();
    if (this.attackdebug >= 0) this.rr = this.attackdebug;
    if (this.difficultydebug >= 0) this.difficulty = this.difficultydebug;
    const final = this.haveusedfinalattack, rr = this.rr, d = this.difficulty;
    const say = (s, con) => { msgset(0, s); this.ballooncon = con; this.balloonend = con === 0 ? 1 : 0; };
    const weirdside = S.scr_sideb_get_phase() > 2 ? 1 : 0;
    if (weirdside && this.weirdpathendcon > 0) this.weirdEndTalk(say);
    else if (weirdside && this.balloonorder < 10 && !final) this.weirdTalk(say);
    else if (rr === 0 && d === 1 && !final && !weirdside) say("KRIS! ISN'T THIS&[Body] JUST [Heaven]LY!?/%", 1);
    else if (rr === 6 && d === 0 && !final && !weirdside) say("WE'LL TURN THOSE&[Schmoes] AND [Daves]&INTO [Rosen Graves]/%", 2);
    else if (rr === 8 && d === 0 && !final && !weirdside) say('ALL YOU GOTTA&DO IS [Big]./%', 3);
    else if (rr === 2 && d === 0 && !final && !weirdside) say("KRIS, DON'T YOU&WANNA BE [Part]&OF MY BEAUTIFUL [Heart]?!/%", 4);
    else if (rr === 8.5 && d === 0 && !final && !weirdside) say("IT'S CALLING, KRIS...&MY [Heart]...&MY [Hands].../%", 0);
    else if (rr === 7 && this.faceattackcount === 0 && !final && !weirdside) say('KRIS!&CAN YOU REALLY&LOOK IN MY [Eyes]&AND SAY NO!?/%', 5);
    else if (rr === 0 && d === 3 && !final && !weirdside) say("KRIS, I'LL EVEN&GIVE YOU A&[Free Value]/%", 6);
    else if (rr === 2 && d === 2 && !final && !weirdside) say("I CAN'T STAND IT!!!&I THINK I'M GONNA&HAVE A [HeartAttack]!/%", 0);
    else if (rr === 8 && d === 1 && !final && !weirdside) say("DON'T YOU&WANNA HELP YOUR&OLD PAL SPAMTON?/%", 7);
    else if (rr === 8.5 && d === 2 && !final && !weirdside) say('[Friends]!? KRIS!?&WHAT ARE YOU&TALKING ABOUT!?/%', 8);
    else if (rr === 7 && this.faceattackcount === 1 && !final && !weirdside) say('KRIS. IF YOU GIVE&ME THAT [Soul] I&WILL GIVE YOU&EVERYTHING I HAVE./%', 10);
    else if (rr === 6 && d === 1 && !final && !weirdside) say("BUT KRIS, IF YOU&REFUSE. THAT'S YOUR&CHOICE. I CAN'T&FORCE YOU./%", 11);
    else if (rr === 2 && d === 1 && !final && !weirdside) say('KRIS!!! TAKE THE&DEAL!!! TAKE IT!!!/%', 12);
    else if (rr === 8 && d === 3 && !final && !weirdside) say('OR...&DID YOU WANT&TO BE.../%', 13);
    else if (rr === 9 && this.finalattackconversationcon === 0 && !weirdside) {
      say("KRIS...&I WON'T FORCE YOU.&I CAN'T.&I CAN'T FORCE YOU./%", 25);
      this.finalattackconversationcon = 1;
    } else {
      const rrr = choose(0, 1, 2, 3);
      if (rrr === 0) {
        if (this.statustextalt2 === 0) say('CAN A [Little&Sponge] DO THIS?/%', 15);
        if (this.statustextalt2 === 1) say('[BreaKing] and&[CracKing]/%', 0);
        this.statustextalt2 = (this.statustextalt2 + 1) % 2;
      }
      if (rrr === 1) {
        say(this.statustextalt === 0 ? '[The Smooth&Taste Of] NEO/%' : 'THE [@$@!] TASTE&OF SPAMTON/%', 0);
        this.statustextalt = (this.statustextalt + 1) % 2;
      }
      if (rrr === 2) say("DON'T YOU&WANNA BE A&BIG SHOT?/%", 0);
      if (rrr === 3) say('[Clown]!? NO!!!&I FEEL SICK!!!/%', 0);
    }
    this.usedact = 0;
    this.balloon();
    this.correct_answer = -1;
    this.talked = this.ballooncon === 0 ? 1 : 0.6;
    this.talktimer = 0;
  }
  // talked == 0.6: the next balloon of a multi-part line.
  nextBalloon() {
    this.talktimer += 1;
    if (!((button3_p() && this.talktimer > 15) || !writerExists())) return;
    killWriters();
    const from = this.ballooncon;
    const next = BALLOON[from] ?? this.weirdBalloon?.(from);
    if (next) {
      const [s, con] = Array.isArray(next) ? next : [next, 0];
      msgset(0, s);
      this.ballooncon = con;
      this.balloonend = con === 0 ? 1 : 0;
    } else {
      this.ballooncon = 0;
      this.balloonend = 1;
    }
    this.talked = 0.7;
    this.talktimer = 0;
    if (this.ballooncon === 32) S.scr_battletext_default(this);
    else this.balloon();
    this.alarm[6] = 1;
  }
  // talkedcon == 1: the balloon is done; the box (sized per attack) and the SOUL come in.
  startBullets() {
    if (this.partmode === 40) { this.partmode = 1; this.shockthreshold = 0; this.hurttimer2 = 0; }
    this.rtimer = 0;
    S.scr_blconskip(this, -1);
    if (!isphase('bullets')) return;
    const [rr, d] = this.playedAttack();
    if (!instance_exists('obj_growtangle')) {
      const g = instance_create(camerax() + 245, cameray() + 170, 'obj_growtangle');
      if (rr === 0) {
        g.x += 54;
        g.maxxscale = 3.2;
        g.maxyscale = 1.5;
        // shootydanceinit is never reset: every dance sways around where the first one started.
        this.chargesfxtimer = 0;
        this.dance_timer = 0;
        this.armaim = -80;
        if (d === 3) this.rememberAndMove(this.x + 50, this.y, 8);
      }
      if (rr === 7) { g.x += 15; g.maxxscale = 2; g.maxyscale = 2; this.rememberxy(); }
      else if (rr === 8) this.rememberAndMove(this.x, cameray() + 20, 8);
      else if (rr === 8.5) { g.x += 64; g.y += 8; g.maxxscale = 3.2; g.maxyscale = 1.5; }
      else if (rr === 6) { g.x += 58; g.maxxscale = 10 / 3; g.maxyscale = 2.3; this.rememberAndMove(this.x + 200, this.y, 16); }
      else if (rr === 9) { g.y += 10; g.maxyscale = 1.9; g.maxxscale = 2.5; }
      if (rr === 5) this.rememberAndMove(this.x + 200, this.y, 8);
    }
    if (!instance_exists('obj_moveheart') && !instance_exists('obj_heart')) moveheart();
  }
  // scr_rememberxy: where scr_move_to_rememberxy brings him back (the bullet controller's Destroy,
  // the phone call's Destroy, the columns' last frames).
  rememberxy() {
    this.___myrememberx = this.x;
    this.___myremembery = this.y;
  }
  // scr_rememberxy + scr_move_to_point_over_time; the snapped wires he would leave behind are hidden.
  rememberAndMove(x, y, frames) {
    this.rememberxy();
    this.moveOverTime(x, y, frames);
    for (const v of instancesOf('obj_sneo_vine_cut')) v.hide = 1;
    for (const v of instancesOf('obj_sneo_vine_transition')) v.hide = 1;
  }
  moveToRemembered(frames) {
    if (this.___myrememberx !== undefined) this.moveOverTime(this.___myrememberx, this.___myremembery, frames);
  }
  // scr_move_to_point_over_time (obj_move_to_point): a straight line, `frames` steps long.
  moveOverTime(x, y, frames) {
    this.moveFrom = [this.x, this.y];
    this.moveTo = [x, y];
    this.moveTime = frames;
    this.moveT = 0;
  }
  // rtimer == 15: the attack's controller, the yellow SOUL, the turn length and the status text.
  launchAttack() {
    const m = this.myself;
    const [rr, d] = this.playedAttack();
    global.monsterattackname ??= [];
    const spawn = (name, type) => {
      global.monsterattackname[m] = name;
      const dc = scr_bulletspawner(this, this.x, this.y, 'obj_sneo_bulletcontroller');
      dc.type = type;
      dc.difficulty = d;
      return dc;
    };
    if (rr === 0) spawn('FlyingHeads', 0);
    else if (rr === 2) spawn('HeartAttackNeo', 1.5).special = this.hellmode;
    else if (rr === 6) spawn('RECREWColumns', 6);
    else if (rr === 7) spawn('SneoFaceAttack', 12).special = this.hellmode;
    else if (rr === 8) {
      global.monsterattackname[m] = 'Phonecall';
      const dc = instance_create(this.x - 10, this.y + 20, 'obj_sneo_phonecall');
      dc.isattack = 1;
      dc.target = this.mytarget;
      if (d === 3) this.phoneevent = 2;
      else { if (this.phoneevent >= 1) dc.skipintro = 1; this.phoneevent += 1; }
    } else if (rr === 8.5) spawn('Phonehands', 8.5);
    else if (rr === 9) spawn('NeoFinale', 9).target = 3;
    else if (rr === 5) {
      global.monsterattackname[m] = 'PipisExplosion';
      const dc = scr_bulletspawner(this, this.x, this.y, 'obj_dbulletcontroller');
      dc.type = 51;
      dc.damage = 3;
      dc.btimer = 35 - random(30);
    } else spawn('UnspecifiedSneoAttack', rr);
    if (this.rr === 7) this.faceattackcount += 1;
    S.scr_heartcolor('yellow');
    for (const h of instancesOf('obj_heart')) h.wspeed = global.sp;
    turntimer(260);
    if (rr === 1) turntimer(300);
    if (rr === 2) turntimer(750 + this.hellmode * 450);
    if (rr === 2 && d === 1) turntimer(850 + this.hellmode * 450);
    if (rr === 6) turntimer(330);
    if (rr === 7) turntimer(300);
    this.turns += 1;
    global.typer = 6;
    global.fc = 0;
    global.battlemsg ??= [];
    global.battlemsg[0] = ['* The stage lights are shattered.', '* It pulls the strings and makes them ring.',
      '* The air crackles with freedom.', '* Smells like rotten glass.'][choose(0, 1, 2, 3)];
    this.attacked = 1;
  }
  // The SOUL went back: the menu text for the next turn.
  statusText() {
    const m = this.myself;
    this.statustextupdate = 1;
    if (this.weirdpathendcon > 0) {
      if (global.monsterhp[m] < global.monstermaxhp[m] * 0.06) {
        global.battlemsg[0] = '* Spamton NEO recovered HP with Pipis!';
        global.monsterhp[m] = global.monstermaxhp[m] * 0.06;
      } else global.battlemsg[0] = "* Spamton NEO's DEFENSE is towering.";
    } else if (global.monsterhp[m] < global.monstermaxhp[m] * 0.1 && this.haveusedfinalattack === 0) global.battlemsg[0] = '* Spamton looks to the heavens.';
    else if (this.bigshot === 1 && this.bigshotused === 0 && global.monsterhp[m] > global.monstermaxhp[m] * 0.7) {
      global.battlemsg[0] = `* Hold and release ${G.confirmKeyName ? G.confirmKeyName() : 'Z'} to fire a BIG SHOT!`;
    } else if (this.bigshot === 1 && this.bigshotused === 1) {
      const T = {
        0: '* Spamton turns to the audience and laughs.', 1: '* Spamton appeals to the audience with a festive jig!',
        2: '* Spamton begs to the audience, Spamton prays to the audience.', 3: '* There is no audience.',
        6: '* Spamton begs the audience to stop taking the furniture out of his room.',
        9: '* Spamton feels the sweet breeze as he takes a ride around town.',
      };
      if (T[this.statustextorder]) global.battlemsg[0] = T[this.statustextorder];
      this.statustextorder += 1;
    }
  }
  // Snap mercy (+2, +4 when the others are down, +7 for SnapAll), capped at 100.
  snapMercy(set, failText, okText) {
    const m = this.myself;
    if (global.mercymod[m] + set > 100) set = 100 - global.mercymod[m];
    S.scr_mercyadd(m, set);
    if (set === 0) {
      for (const d of instancesOf('obj_dmgwriter')) if (d.type === 5) instance_destroy(d);
      msgset(0, failText);
    } else if (Array.isArray(okText)) { msgset(0, okText[0]); msgnext(okText[1]); }
    else msgset(0, okText);
  }
  // ACTs: Check, Snap, SnapAll; Susie: Snap, Supercharge; Ralsei: Snap, FluffyGuard.
  stepActs() {
    if (G.weird) this.weirdActs();
    else this.normalActs();
    if ((this.actcon === 1 && !writerExists()) || this.actconsus === 20 || this.actconral === 20) {
      this.usedact = 1;
      if (global.mercymod[this.myself] > 99 && this.endcon === 0) {
        this.endcon = 1;
        this.actcon = 0;
      } else if (this.endcon === 0) S.scr_nextact(this);
    }
  }
  normalActs() {
    if (this.acting === 1 && this.actcon === 0) {
      this.actcon = 1;
      if (this.checkcount === 0) {
        msgset(0, "* SPAMTON NEO - YOU WON'T FIND HIGHER ATTACK AND DEFENSE ANYWHERE ELSE!!!/");
        msgnext('* THE SMOOTH TASTE OF NEO "WAKE UP AND TASTE THE \\cRPAIN\\cW"./%');
        msgnext('* [[note: pain is in red.]] ./%');
      } else msgset(0, '* Spamton Neo - He is his own worst invention./%');
      S.scr_battletext_default(this);
      this.checkcount += 1;
    }
    if ((this.acting === 2 && this.actcon === 0) || (this.acting === 3 && this.actcon === 0)) {
      if (global.hp[2] <= 0 && global.hp[3] <= 0 && this.acting === 2) {
        this.snapMercy(4, '* You tried to snap a wire... but it failed!/%', ['* You snapped desperately!/', '* Broke 2 wires!/%']);
      } else if (this.acting === 3) {
        this.snapallcount = (this.snapallcount + 1) % 2;
        this.snapMercy(7, '* Everyone tried to snap wires... but it failed!/%', '* Everyone snapped wires!/%');
      } else this.snapMercy(2, '* You tried to snap a wire... but it failed!/%', '* You snapped a wire!/%');
      S.scr_battletext_default(this);
      if (this.acting === 2) this.alarm[4] = 30;
      else this.actcon = 1;
      this.acting = 0;
    }
    if (this.actingsus === 1 && this.actconsus === 1) {
      if (global.hp[1] <= 0 && global.hp[3] <= 0) this.snapMercy(4, '* Susie tried to snap a wire... but it failed!/%', ['* Susie snapped desperately!/', '* Broke 2 wires!/%']);
      else this.snapMercy(2, '* Susie tried to snap a wire... but it failed!/%', '* Susie snapped a wire!/%');
      S.scr_battletext_default(this);
      this.actconsus = 0;
      this.actingsus = 0;
      this.alarm[4] = 30;
    }
    if (this.actingsus === 2 && this.actconsus === 1) {
      this.actingsus = 0;
      this.actconsus = 0;
      this.actcon = 1;
      this.bigshotcount = 20;
      msgset(0, '* You Super Charged! Can charge bullets faster! Lasts 20 shots./%');
      S.scr_battletext_default(this);
    }
    if (this.actingral === 1 && this.actconral === 1) {
      if (global.hp[1] <= 0 && global.hp[2] <= 0) this.snapMercy(4, '* Ralsei tried to snap a wire... but it failed!/%', ['* Ralsei snapped desperately!/', '* Broke 2 wires!/%']);
      else this.snapMercy(2, '* Ralsei tried to snap a wire... but it failed!/%', '* Ralsei snapped a wire!/%');
      S.scr_battletext_default(this);
      this.actconral = 0;
      this.actingral = 0;
      this.actcon = 1;
    }
    if (this.actingral === 2 && this.actconral === 1) {
      this.actconral = 0;
      this.actingral = 0;
      this.actcon = 1;
      const fluffs = () => instancesOf('obj_sneo_tiny_ralsei');
      if (fluffs().length < 4) {
        msgset(0, this.simultotal == 1 ? "* The power Ralsei's fluffy warmth surrounds you!./%" : '* Ralsei defended you!/%');
        S.scr_battletext_default(this);
        fluffs().forEach((f, k) => { f.place = k * 90; });
        for (let r = 0; r < 2; r++) {
          instance_create(this.x, this.y, 'obj_sneo_tiny_ralsei');
          const all = fluffs(), n = all.length;
          // 4 balls: 90 degrees apart; 3: 0/180/360; 2: 0/270 (as in the GML).
          const step = n === 4 ? 90 : n === 3 ? 180 : n === 2 ? 270 : 0;
          if (step) all.forEach((f, k) => { f.place = k * step; });
        }
      } else {
        msgset(0, "* Too many fluff balls!&* Can't make any more!/%");
        S.scr_battletext_default(this);
        this.fluffHeal();
      }
    }
  }
  // The "Too many fluff balls" heal: +10 HP (not capped at max HP) to whoever of Susie, Ralsei and
  // Noelle (hp[2..4]) has the least, compared in the GML's order.
  fluffHeal() {
    const hp = global.hp;
    let a = 2;
    if (hp[3] < hp[2]) a = 3;
    if (hp[3] < hp[4]) a = 3;
    if (hp[4] < hp[2]) a = 4;
    if (hp[4] < hp[3]) a = 4;
    hp[a] += 10;
    snd_play('snd_boost');
  }
  // endcon 1..4: the defeat cutscenes (HP gone: version 0; mercy 100: version 1), then the win.
  stepEnd() {
    const m = this.myself;
    if (this.endcon === 1) {
      this.endtimer += 1;
      if (this.endtimer === 1) {
        global.batmusic?.[1]?.setVolume?.(0, 1);
        this.user3();
        global.mnfight = -1;
        global.myfight = -1;
        for (const o of instancesOf(['obj_growtangle', 'obj_heart', 'obj_sneo_bulletcontroller', 'obj_battlemsg'])) instance_destroy(o);
      }
      if (this.endtimer > 0 && this.endtimer < 91) {
        for (const b of instancesOf('obj_ch2_sceneex2')) {
          b.trackspeed = lerp(-15, 0, this.endtimer / 90);
          b.cityscape_speed_max = lerp(5, 0, this.endtimer / 90);
        }
      }
      if (this.endtimer === 91) {
        this.didwejustdie = 1;
        if (global.mercymod[m] > 99) this.sneo_defeat_cutscene_version = 1;
        msgset(0, 'WAIT!!&[$!?!] THE PRESSES!/%');
        this.partmode = 99;
        this.balloon();
        this.endtimer = 0;
        this.endcon = 2;
        this.talktimer = 0;
        this.ballooncon = 1;
        this.balloonend = 0;
      }
      return;
    }
    const mercy = this.sneo_defeat_cutscene_version === 1;
    if (this.endcon === 2) {
      // Mercy ending: "[Friendship]" waits for the shop background to flash in (obj_ch2_sceneex2).
      const bg = first('obj_ch2_sceneex2');
      let aa = mercy && bg && bg.shop_spamton_bg_con > 0 && bg.shop_spamton_bg_con < 3 ? 1 : 0;
      this.talktimer += 1;
      if (mercy && aa === 0 && ((button3_p() && this.talktimer > 15) || !writerExists())) {
        if (this.ballooncon === 7 && bg && bg.shop_spamton_bg_con < 3) {
          bg.shop_spamton_bg_con = 1;
          aa = 1;
        }
      }
      if (aa === 0 && ((button3_p() && this.talktimer > 15) || !writerExists())) {
        killWriters();
        const e = (mercy ? END_MERCY : END_HP)[this.ballooncon];
        if (e) {
          const [s, o] = e;
          msgset(0, s);
          this.ballooncon = this.ballooncon >= 13 ? 0 : this.ballooncon + 1;
          this.balloonend = this.ballooncon === 0 ? 1 : 0;
          for (const k of ['shocktimer', 'hurttimer2', 'partmode', 'shockthreshold', 'headendcon', 'dontchangepose', 'smokethreshold', 'dancealtcon']) if (o[k] !== undefined) this[k] = o[k];
          if (o.smoke) {
            snd_play('snd_damage');
            for (let k = 0; k < 6; k++) this.smoke(random_range(2, 10), random_range(-1, -8));
          }
          if (o.bg !== undefined) this.targetbgspeed = o.bg;
          if (o.track !== undefined) for (const b of instancesOf('obj_ch2_sceneex2')) b.trackspeed = o.track;
          if (o.overpower !== undefined) {
            if (!this.overpower) {
              snd_play('snd_sneo_overpower'); // the GML plays it once and also loops it
              this.overpower = snd_loop('snd_sneo_overpower');
            }
            snd_pitch('snd_sneo_overpower', o.overpower);
          }
          if (o.happy) {
            global.currentsong ??= [];
            global.currentsong[0] = snd_init('spamton_happy.ogg');
            global.currentsong[1] = mus_loop_ext(global.currentsong[0], 1, 1);
          }
        }
        this.endcon = 3;
        this.balloon();
        for (const w of instancesOf('obj_writer')) {
          if (this.ballooncon >= 8) w.shake = 2;
          if (this.ballooncon === 0 || (mercy && this.ballooncon === 13)) { w.shake = 3; w.rate = 3; }
        }
        this.alarm[6] = 1;
      }
    }
    if (this.endcon === 2 && mercy && this.ballooncon === 13) {
      this.siner += 2;
      for (let i = 0; i < 8; i++) this.partsiner[i] += 0.6;
    }
    for (const b of instancesOf('obj_ch2_sceneex2')) {
      if (this.endcon < 2 || this.endcon > 3) break;
      b.trackspeed = lerp(b.trackspeed, this.targetbgspeed * 6, 0.1);
      b.cityscape_speed_max = lerp(b.cityscape_speed_max, this.targetbgspeed, 0.1);
    }
    if (this.endcon === 4) {
      this.talktimer += 1;
      if ((button3_p() && this.talktimer > 15) || !writerExists()) {
        this.endtimer += 1;
        if (!mercy) {
          if (this.endtimer <= 90) snd_pitch('snd_sneo_overpower', lerp(1.3, 2, this.endtimer / 90));
          if (this.endtimer === 120) { this.violentendflash = 1; this.endtimer = 140; }
          if (this.endtimer === 151) {
            snd_stop('snd_sneo_overpower');
            for (const a of instancesOf('obj_afterimage_grow')) instance_destroy(a);
            snd_play('snd_explosion');
            this.white = this.flashRect(0xffffff, 0);
          }
          if (this.endtimer > 150 && this.endtimer < 162) this.white.image_alpha = lerp(0, 1, (this.endtimer - 150) / 11);
          if (this.endtimer === 300) this.black = this.flashRect(0, -1);
          if (this.endtimer > 300 && this.endtimer < 331) this.black.image_alpha = lerp(0, 1, (this.endtimer - 300) / 30);
          if (this.endtimer === 331) this.finish();
        } else {
          if (this.endtimer === 1) {
            snd_free(global.currentsong?.[0]);
            snd_play('snd_noise');
            snd_play('snd_damage');
            const bg = first('obj_ch2_sceneex2');
            this.dim = this.flashRect(0, bg ? bg.depth - 1 : 0);
            this.dim.image_alpha = 0.5;
            // The last wire snaps.
            const p = this.partx, q = this.party, po = this.partxoff, qo = this.partyoff;
            const vine = instance_create(this.x, this.y, 'obj_sneo_vine_cut');
            vine.x1 = this.x + p[4] + po[4] / 1.2 + 20 + Math.sin(this.partsiner[4] / 25) * 1.8;
            vine.x2 = this.x + p[4] + po[4] / 1.5 + 32;
            vine.y1 = this.y + q[4] - 10 + qo[4];
            vine.y2 = -400;
            vine.depth = this.depth + 1;
            vine.vineid = 4;
            instance_create(this.x + p[4] + po[4] / 1.2 + 16, this.y - 35, 'obj_sneo_vine_weak').depth = this.depth - 5;
            this.lastwirecon = 3;
            this.partmode = 99;
            for (const b of instancesOf('obj_ch2_sceneex2')) { b.cityscape_speed_max = 0; b.cityscape_speed = 0; b.trackspeed = 0; }
          }
          if (this.endtimer === 91) {
            this.depth = -99999;
            this.black = this.flashRect(0, 0);
            this.black.image_alpha = 1;
            this.partmode = 43;
          }
          if (this.endtimer === 330) {
            this.black2 = this.flashRect(0, -999999);
            this.black2.image_alpha = 1;
          }
          if (this.endtimer === 450) this.finish();
        }
      }
      if (this.ballooncon === 0 && this.endtimer === 0) {
        this.siner += 3;
        for (let i = 0; i < 8; i++) this.partsiner[i] += 0.9;
      }
    }
  }
  flashRect(col, depth) {
    const r = instance_create(-10, -10, 'obj_sneo_flashrect');
    r.image_blend = col;
    r.image_alpha = 0;
    r.depth = depth;
    return r;
  }
  // endcon == 10 in the game (obj_ch2_sceneex2 takes over): the battle is won.
  finish() {
    for (let c = 1; c <= 3; c++) if (global.hp[c] < 1) global.hp[c] = 1;
    this.endcon = 11;
    if (this.overpower) snd_stop(this.overpower);
    snd_free(global.currentsong?.[0]);
    for (const c of instancesOf('obj_battlecontroller')) c.skipvictory = 1;
    G.sneoEnding = this.sneo_defeat_cutscene_version === 1 ? 'mercy' : 'hp';
    S.scr_wincombat();
  }
  // Draw_0's per-part pose code: partmodes 0-20, 36 (the shooting dance) and 40 (shock).
  // Partmodes with no code here (99, 43...) leave the parts where they are, as in the GML.
  builtinPose(i) {
    const f = this.f, pm = this.partmode, px = this.partx, py = this.party, ps = this.partsiner;
    const pr = this.partrot, pf = this.partframe;
    if (pm < 20) {
      if (pm === 0) {
        ps[i] = 0;
        pf[i] = 0;
        const [r, x, y] = i === 5 ? [30, -10, 10] : [0, 0, 0];
        pr[i] = lerp(pr[i], r, 0.25 * f);
        px[i] = lerp(px[i], x, 0.25 * f);
        py[i] = lerp(py[i], y, 0.25 * f);
        if (i === 5 && this.dead === 1) pf[i] = 3;
        if (i !== 5) for (const a of [pr, px, py]) if (Math.abs(a[i]) < 1) a[i] = 0;
      }
      if (pm === 1 || pm === 3 || pm >= 5) {
        if (pm === 1 && this.aimmode !== 0) this.aimmode = 0;
        if ((pm === 3 || (pm >= 9 && pm <= 13)) && i === 1) {
          const h = first('obj_heart');
          if (this.aimmode === 2 && h && pm === 3) this.armaim = point_direction(this.x + this.partxoff[i], this.y + this.partyoff[i], h.x + 8, h.y + 8) + 90;
          else if (this.aimmode !== 1) this.armaim = -80;
          if (pm < 10) pr[i] = lerp(pr[i], this.armaim, 0.25 * f);
          if (pm < 9) pf[i] = pm === 3 ? 1 : 3;
          if (pm === 12) pf[i] = 1;
          if (pm >= 10) pr[i] = pr[i] === this.armaim ? this.armaim + 2 : this.armaim;
        } else if (pm >= 6 && pm < 11 && i === 1) {
          pr[i] = lerp(pr[i], -160, 0.25 * f);
          if (pf[i] !== 2 && pr[i] <= -90) pf[i] = 2;
        } else {
          if (i === 1 && (pm === 5 || pm === 1)) pf[i] = 0;
          ps[i] += (1 + i / 5) * f;
          pr[i] = Math.sin(ps[i] / 30) * 15;
        }
        if (i === 5) {
          px[i] = lerp(px[i], 0, 0.25 * f);
          py[i] = lerp(py[i], 0, 0.25 * f);
          pr[i] -= 10 * f;
          if (this.headendcon === 1) { pr[i] = -37 + Math.sin(ps[4] / 16); pf[i] = 1; }
          else if (this.headendcon === 2) pr[i] = 15 + Math.sin(ps[4] / 16);
          else if (pm === 5 || pm === 8 || pm === 9) { pr[i] /= 2; pr[i] += 10 * f; pf[i] = 1; }
          else if (pm === 6 || pm === 7) { pr[i] /= 2; if (pm > 6 || pr[1] <= -120) pf[i] = 0; }
          else if (pm === 11) pf[i] += 0.2 * f;
          else if (pm === 12) pf[i] += 0.3 * f;
          else pf[i] += 0.05 * f;
          if (pf[i] >= 3) pf[i] = 0;
          if (pf[i] >= 2) pr[i] += 20 * f;
        }
      }
      if (pm === 2) {
        ps[i] += (1 + i / 5) * f;
        px[i] = Math.sin(ps[i] / 2 * f);
        py[i] = Math.cos(ps[i] / 2 * f);
        if (this.shocker < 0) {
          pr[i] = 60 - random(120);
          if (i === 5) { pf[i] += 1 * f; if (pf[i] >= 3) pf[i] = 0; }
        }
      }
      if (pm === 4) {
        const ideal = [-43, -180, -20, -10, -31, -60, -61, -56];
        if (this.shotanimtimer === 0.125 * f && i === 1 && instance_exists('obj_sneo_heartattack')) this.aimmode = 0;
        this.shotanimtimer += 0.125 * f;
        if (this.shotanimtimer < 13) {
          pf[5] = 2;
          pr[i] = lerp(pr[i], ideal[i], 0.3 * f);
          this.lerper = 0;
        }
        if (this.shotanimtimer >= 13) {
          pf[5] = 1;
          this.lerper += 0.015 * f;
          pr[i] = lerp(pr[i], i !== 1 ? Math.sin(ps[i] / 30) * 15 : this.armaim, this.lerper);
        }
        if (this.shotanimtimer >= 24) { this.shotanimtimer = 0; this.partmode = 3; }
      }
      if (pm === 6) this.shotanimtimer = 0;
      if (pm === 7) {
        pr[5] += Math.sin(this.shotanimtimer / 5) * 15;
        this.shotanimtimer += 0.2 * f;
        if (this.shotanimtimer > 60) this.partmode = 6;
      }
      if (i === 5) {
        if (pm >= 15 && pm <= 17) {
          pf[5] = 2;
          this.headsize = lerp(this.headsize, [0.5, 1, 1.5][pm - 15], 0.25);
          if (pm === 17) pr[5] += random(20);
        } else this.headsize = lerp(this.headsize, 0, 0.25);
      }
      return false;
    }
    if (pm === 36) return this.dancePose(i);
    if (pm === 43) { if (i === 0) this.fallPose(); return false; }
    if (pm === 40) return this.shockPose(i);
    return false;
  }
  // partmode 36: the dance (Flying Heads II and the mercy ending); in the fight he fires
  // obj_spamtonshot at the SOUL from his arm cannon.
  dancePose(i) {
    const pr = this.partrot, ps = this.partsiner, ideal = this.idealrot;
    const fastshot = 1;
    if (this.shootydanceinit === 0) {
      this.shootydanceinit = 1;
      this.shootydancex = this.x;
      this.shootydancey = this.y;
    }
    if (this.endcon > 0) {
      if (this.dancealtcon === 1 || this.dancealtcon === 2) this.siner += 0.23;
      this.x = this.xstart + Math.sin(this.siner / 20) * 10;
      this.y = this.ystart + Math.sin(this.siner / 6) * 20;
    } else {
      this.x = this.shootydancex + Math.sin(this.siner / 20) * 10;
      this.y = this.shootydancey + Math.sin(this.siner / 6) * 20;
    }
    this.armendx = this.x + this.partx[1] + this.partxoff[1] + lengthdir_x(this.armlength, pr[1] - 93);
    this.armendy = this.y + this.party[1] + this.partyoff[1] + lengthdir_y(this.armlength, pr[1] - 93);
    if (this.dance_timer === 0) {
      const h = first('obj_heart');
      if (h) this.armangle = point_direction(this.partxoff[1], this.partyoff[1], h.x, h.y);
      ideal[5] = -15;
    }
    if (i !== 1 || this.endcon > 0) {
      ps[i] += 0.1;
      this.partx[i] = lerp(this.partx[i], 0, 0.5);
      this.party[i] = lerp(this.party[i], 0, 0.5);
      ideal[i] = Math.sin(ps[i] + i / 8) * 20;
      ideal[1] = Math.sin(ps[2]) * 60;
      ideal[2] = Math.sin(ps[2] - 0.1) * 60;
      ideal[3] = -Math.sin(ps[2] + 0.3) * 60;
      ideal[6] = -Math.sin(ps[2] + 0.1) * 60;
      pr[5] = -15 - Math.abs(Math.sin(this.head_recoil_amount / 60)) * 150;
      this.partframe[5] = 2;
      this.head_recoil_amount = lerp(this.head_recoil_amount, 0, 0.03);
      pr[i] = lerp(pr[i], ideal[i], 0.5);
    }
    if (i === 0 && this.endcon === 0) {
      this.siner += 1.3;
      this.dance_timer += 1;
      const t = this.dance_timer;
      if (t === 17 - fastshot * 10 || t === 52 - fastshot * 10) {
        // obj_sneo_biglaser _type 1: the charge glow at the end of his arm cannon.
        if (objectExists('obj_sneo_biglaser')) {
          const d = instance_create(this.x, this.y, 'obj_sneo_biglaser');
          d.depth += 1;
          d._type = 1;
        }
        if (this.chargeshot_sound) snd_stop(this.chargeshot_sound);
        this.chargeshot_sound = snd_loop('snd_chargeshot_charge');
        this.chargesfxtimer = 1;
      }
      const fire = dir => {
        for (const l of instancesOf('obj_sneo_biglaser')) instance_destroy(l);
        const shot = instance_create(this.armendx, this.armendy, 'obj_spamtonshot');
        shot.target = this.mytarget;
        shot.damage = this.damage;
        this.armaim += dir;
        this.head_recoil_amount = -170;
        if (this.chargeshot_sound) snd_stop(this.chargeshot_sound);
        snd_play_x('snd_chargeshot_fire', 0.6, 0.5);
      };
      if (t === 42 - fastshot * 10) fire(360);
      if (t === 84 - fastshot * 20) fire(-360);
      if (t === 85 - fastshot * 20) this.dance_timer = 3;
      if (this.chargesfxtimer === 1) {
        this.chargepitch = 0.1;
        snd_pitch(this.chargeshot_sound, this.chargepitch);
        snd_volume(this.chargeshot_sound, 0, 0);
        snd_volume(this.chargeshot_sound, 0.8, 20);
      }
      if (this.chargesfxtimer > 0 && this.chargesfxtimer <= 30) {
        this.chargesfxtimer += 1;
        this.chargepitch += 0.03;
        snd_pitch(this.chargeshot_sound, this.chargepitch);
      }
    }
    if (i === 1 && this.endcon === 0) {
      const lasers = instancesOf('obj_sneo_biglaser');
      const shakebuster = lasers.length ? -4 + random(8) : 0;
      pr[i] = lerp(pr[i], this.armaim, 0.12) + shakebuster;
      this.partframe[i] = 1;
      for (const l of lasers) { l.x = this.armendx; l.y = this.armendy; }
    }
    return false;
  }
  // Draw_0 after each part's pose: the hurt shake, the freeze when his HP runs out, the ending
  // heads (headendcon), and the BIG SHOT penalty's red, honking, swelling head (funnycheat > 5).
  postPose(i) {
    const m = this.myself;
    // shadow_amount darkens every part (1 = the silhouette he arrives as); while an obj_dbulletcontroller
    // attack runs the head shows frame 3, a little darker.
    if (this.shadow_amount >= 0) this.partblend[i] = merge_color(0xffffff, 0, this.shadow_amount);
    if (i_ex('obj_dbulletcontroller')) {
      this.partframe[5] = 3;
      this.partblend[5] = this.blend;
    } else if (this.partblend[5] === this.blend) this.partblend[5] = 0xffffff;
    let shakevar = 0;
    if (i === 0) {
      if (this.hurttimer2 > 0) {
        this.hurttimer2 -= 1;
        if (this.hurttimer2 === 1 && this.endcon === 0) { this.shockthreshold = 10; this.partmode = 1; }
      }
      if (this.didwejustdie === 0 && i_ex('obj_battlecontroller') && global.monsterhp[m] <= 0) {
        this.partmode = 99;
        this.dontchangepose = 1;
      }
    }
    if (this.hurttimer2 > 0) shakevar = random(this.hurttimer2) / 2 - this.hurttimer2 / 4;
    if (this.headendcon === 1) {
      this.partrot[5] = -37 + Math.sin(this.partsiner[4] / 16);
      this.partframe[5] = 1;
      this.partsprite[5] = 'spr_sneo_head';
    }
    if (this.headendcon === 2) {
      this.partrot[5] = 15 + Math.sin(this.partsiner[4] / 16);
      this.partsprite[5] = 'spr_sneo_head_sad';
    }
    if (this.headendcon === 3) this.partsprite[5] = 'spr_sneo_head';
    if (i === 5 && i_ex('obj_pipis_destroy_fx')) this.partrot[5] -= random(60);
    if (i === 5 && this.headforceframe !== -1) this.partframe[5] = this.headforceframe;
    if (this.funnycheat > 5) {
      if (this.funnycheattimer < 28) {
        this.funnycheattimer += 0.125;
        this.partblend[5] = merge_color(0xffffff, 0xff0000, this.funnycheattimer / 30);
        if (this.funnycheattimer === 24) {
          snd_play('snd_carhonk');
          this.funnycheattimer3 += 1;
        }
      }
      if (this.funnycheattimer3 > 0 && this.funnycheattimer3 < 33 && i === 5) {
        const t3 = (this.funnycheattimer3 += 1);
        if (t3 > 0 && t3 < 6) this.headexpand = lerp(this.headexpand, 2, t3 / 6);
        if (t3 >= 8 && t3 < 16) this.headexpand = lerp(this.headexpand, 0, (t3 - 8) / 8);
        if (t3 >= 16 && t3 < 22) this.headexpand = lerp(this.headexpand, 2, (t3 - 16) / 6);
        if (t3 >= 24 && t3 < 32) this.headexpand = lerp(this.headexpand, 0, (t3 - 24) / 8);
        if ((t3 >= 4 && t3 <= 10) || (t3 >= 20 && t3 <= 26)) shakevar = -12 + random(24);
      }
      this.funnycheattimer2 += 1;
      if (this.funnycheattimer2 >= 10 && this.image_alpha > 0.6) {
        this.smoke(random_range(2, 8), random_range(-1, -2));
        this.funnycheattimer2 = 0;
      }
    }
    return shakevar;
  }
  // A puff of obj_afterimage_grow cake smoke from his chest, shown from the next frame.
  smoke(hspeed, vspeed) {
    const smokey = instance_create(this.x + 50, this.y + 80, 'obj_afterimage_grow');
    smokey.visible = false;
    smokey.showNextFrame = 1;
    smokey.depth = this.depth + 10;
    smokey.image_alpha = 2.5;
    smokey.sprite_index = 'spr_cakesmoke';
    smokey.hspeed = hspeed;
    smokey.gravity = -0.5;
    smokey.friction = 0.2;
    smokey.vspeed = vspeed;
    return smokey;
  }
  // partmode 43 (the Friendship ending): he drops into the dark and lands with a shake.
  fallPose() {
    const pr = this.partrot, px = this.partx, py = this.party;
    let fallen = 0;
    this.falltimer += 1;
    if (this.y < cameray() + 200) {
      this.fallshake = 10;
      this.fakegrav = clamp(this.fakegrav + (0.5 + this.fakegrav / 10), 0, 16.5);
      this.y += this.fakegrav;
    } else fallen = 1;
    this.partframe[5] = 7;
    const g = this.fakegrav;
    const set = (k, r, x, y) => { pr[k] = r; if (x !== null) px[k] = x; py[k] = y; };
    set(1, -g * 6, g * 2, g * 1.5);
    set(6, -g * 6, g * 0.6, g * 2);
    set(2, -g * 6, -g * 1.6, -g * 0.65);
    set(3, -g * 6, -g * 2.5, -g * 0.15);
    set(4, -g * 6.25, g * 2, g / 1.5);
    set(5, -g * 8, g * 1.8, g * 2);
    set(0, -g * 4, null, g * 3);
    set(7, -g * 4, null, g * 3);
    if (fallen !== 0) {
      if (this.fallshake === 10) snd_play('snd_closet_impact');
      for (let ii = 0; ii < 7; ii++) {
        py[ii] += random_range(-this.fallshake, this.fallshake);
        px[ii] += random_range(-this.fallshake, this.fallshake);
      }
      if (this.fallshake > 0) this.fallshake -= 1;
    }
  }
  // partmode 40: shocked (hit by FIGHT, the HP ending): parts jitter, smoke and flash.
  shockPose(i) {
    const f = this.f, pr = this.partrot, ps = this.partsiner;
    if (i === 0 && this.dontchangepose === 0) this.shocktimer += 1;
    ps[i] += (1 + i / 5) * f;
    this.partx[i] = Math.sin(ps[i] / 2 * f);
    this.party[i] = Math.cos(ps[i] / 2 * f);
    if (((this.shockthreshold <= 5 && this.hurttimer2 === 0) || this.smokethreshold > 1) && i === 0) {
      this.smoketimer += 1;
      if (this.smoketimer >= this.smokethreshold) {
        this.smoke(random_range(2, 8), random_range(-1, -2));
        this.smoketimer = 0;
      }
    }
    if (this.shockthreshold <= 8 && this.hurttimer2 === 0 && !(global.flag?.[8] === 1)) {
      this.fsiner = ps[i] / 8;
      this.flash = 1;
      this.becomeflash = 1;
    }
    if (global.flag?.[8] === 1) this.shockthreshold = Math.max(5, Math.min(100, this.shockthreshold));
    if (this.shocktimer >= this.shockthreshold) {
      pr[i] = 60 - random(120);
      if (i === 4) pr[i] = 40 - random(80);
      if (i === 5) { this.partframe[i] += 1 * f; if (this.partframe[i] >= 3) this.partframe[i] = 0; }
      if (i === 7) this.shocktimer = 0;
    }
    return false;
  }
  // Step_2: every 2% of mercy cuts one of his wires; ten single shots add 1% mercy.
  endStep() {
    if (this.moveTime) {
      this.moveT += 1;
      const t = Math.min(1, this.moveT / this.moveTime);
      this.x = lerp(this.moveFrom[0], this.moveTo[0], t);
      this.y = lerp(this.moveFrom[1], this.moveTo[1], t);
      if (t >= 1) this.moveTime = 0;
    }
    const m = this.myself;
    if (this.singleshotmercy > 9) {
      S.scr_mercyadd(m, 1);
      this.singleshotmercy = 0;
    }
    // Outside the bullet controller's attacks the head is put back every frame: no sway of its own
    // (Draw_0 then holds it at about -9 degrees instead of swinging), no offset, its sprite's origin.
    if (!i_ex('obj_sneo_bulletcontroller')) {
      if (this.idealx) this.idealx[5] = 0;
      this.idealrot[5] = 0;
      this.partsiner[5] = 0;
      this.partrot[5] = 0;
      this.partx[5] = 0;
      this.party[5] = 0;
      this.partxoff[5] = sprite_get_xoffset(this.partsprite[5]) * 2;
      this.partyoff[5] = sprite_get_yoffset(this.partsprite[5]) * 2;
    }
    if (global.fighting === 1 && this.prevmercy !== global.mercymod[m]) {
      // Every 2% of mercy snaps one front wire (obj_sneo_vine_cut); a back wire then slides over to
      // replace it (obj_sneo_vine_transition) while any are left.
      const gained = global.mercymod[m] - this.prevmercy;
      for (let k = 0; k < gained; k++) {
        this.prevmercy += 1;
        if (this.prevmercy % 2 !== 0) continue;
        let c = irandom(5);
        for (let tries = 0; tries < 6; tries++, c = (c + 1) % 6) {
          if (this.partvisible[c] !== 1) continue;
          this.partvisible[c] = 0;
          const vine = instance_create(this.x, this.y, 'obj_sneo_vine_cut');
          vine.x1 = this.x + this.partx[c] + this.partxoff[c] / 1.2 + c * 5 + Math.sin(this.partsiner[c] / 30) * 2;
          vine.x2 = this.x + this.partx[c] + this.partxoff[c] / 1.5 + c * 8;
          vine.y1 = this.y + this.party[c] - 10 + this.partyoff[c];
          vine.y2 = -400;
          vine.depth = this.depth + 1;
          vine.vineid = c;
          const vfx = instance_create(this.x + this.partx[c] + this.partxoff[c] / 1.2 + c * 5, this.y - 20, 'obj_sneo_vine_weak');
          vfx.depth = this.depth - 5;
          if (!snd_is_playing('snd_damage')) snd_play('snd_damage');
          this.vinebgcount -= 1;
          break;
        }
      }
      if (this.vinebgcount > -2) {
        for (let i = 0; i < 6; i++) {
          if (this.partvisible[i] !== 0) continue;
          this.vineid = i;
          instance_create(this.x, this.y, 'obj_sneo_vine_transition');
        }
      }
      this.weakentimer = 1;
      this.weakenshakeamount = 10;
    }
    if (global.fighting === 1) this.prevmercy = global.mercymod[m];
  }
  draw() {
    const f = this.f, m = this.myself;
    if (this.image_alpha < 1 && !i_ex('obj_sneo_phonecall')) this.image_alpha += 0.1;
    if (this.state === 0) this.fsiner += 1;
    // Wires (Draw_0): 18 thin ones behind him (hidden above 89% mercy), the last wire, one per part.
    // A cut front wire is replaced by a back one (obj_sneo_vine_cut / obj_sneo_vine_transition).
    const mercy = global.mercymod?.[m] ?? 0;
    const hidebgvines = mercy > 89 ? 1 : 0;
    const vef = this.violentendflash;
    const wa = first('obj_sneo_bulletcontroller')?.type === 8.5 ? this.image_alpha : 1;
    const wire = (x1, y1, x2, y2, w, col) => {
      draw_set_color(col);
      draw_set_alpha(wa);
      draw_line_width(x1, y1, x2, y2, w);
      if (vef > 0) {
        draw_set_color(0xffffff);
        draw_set_alpha(vef / 10);
        draw_line_width(x1, y1, x2, y2, w);
      }
      draw_set_alpha(1);
    };
    const dark = make_color_rgb(0, 51, 0), green = bgr(32768);
    let bgvinecount = 0;
    for (let ii = 0; ii < 18; ii++) {
      if (this.partvisible_back[ii] === 1) bgvinecount += 1;
      if (hidebgvines) continue;
      if (this.partmode !== 34) this.heartattackoffsetx = 0;
      this.partsiner_back[ii] += 0.5;
      if (this.partvisible_back[ii] !== 1) continue;
      const x0 = this.x + this.partxoff_back[ii] + (this.heartattackoffsetx || 0);
      wire(x0 + Math.sin(this.partsiner_back[ii] / 30) * 2, this.y + this.partyoff_back[ii], x0, -400, 1, dark);
    }
    if (this.weakentimer > 0) {
      this.weakentimer += 1;
      if (this.weakenshakeamount > 0) this.weakenshakeamount -= 0.5;
    }
    const px = this.partx, py = this.party, pxo = this.partxoff, pyo = this.partyoff, ps = this.partsiner;
    const lx1 = this.x + px[4] + pxo[4] / 1.2 + 20 + Math.sin(ps[4] / 25) * 1.8, ly1 = this.y + py[4] - 10 + pyo[4];
    const lx2 = this.x + px[4] + pxo[4] / 1.5 + 32;
    if (this.lastwirecon === 0 || this.lastwirecon === 1) wire(lx1, ly1, lx2, -400, 1, dark);
    if (this.endcon === 1 && this.lastwirecon === 0) this.lastwirecon = 1;
    if (this.lastwirecon === 1) {
      this.lastwiretimer += 1;
      if (this.lastwiretimer === 30) this.lastwirecon = 2;
    }
    if (this.lastwirecon === 1 || this.lastwirecon === 2) {
      draw_set_alpha(this.lastwiretimer / 30);
      draw_set_color(green);
      draw_line_width(lx1, ly1, lx2, -400, 1 + this.lastwiretimer / 30);
      draw_set_alpha(1);
    }
    for (let i = 0; i < 6; i++) {
      if (this.partvisible[i] !== 1) continue;
      wire(this.x + px[i] + pxo[i] / 1.2 + i * 5 + Math.sin(ps[i] / 30) * 2, this.y + py[i] - 10 + pyo[i], this.x + px[i] + pxo[i] / 1.5 + i * 8, -400, 2, green);
    }
    if (i_ex('obj_battlecontroller') && mercy > 89 && bgvinecount > 0 && !i_ex('obj_sneo_vine_transition') && !i_ex('obj_sneo_vine_cut')) {
      for (let i = 0; i < 6; i++) {
        if (this.partvisible[i] !== 0) continue;
        this.vineid = i;
        instance_create(this.x, this.y, 'obj_sneo_vine_transition');
      }
    }
    draw_set_alpha(1);
    this.shocker -= 1 * f;
    // Body parts: Draw_0's poses (attack modules add theirs through POSES / POSE_BEFORE / POSE_AFTER).
    if (this.partmode === 10) this.partmode = 9;
    if (this.partmode !== 34) this.heartattackoffsetx = 0;
    if (this.specialcon === 1) this.specialFlames();
    POSE_BEFORE[this.partmode]?.(this);
    for (let i = 0; i < 8; i++) {
      const hook = POSES[this.partmode];
      if (hook ? hook(this, i) === true : this.builtinPose(i) === true) continue;
      let shakevar = this.postPose(i);
      if (this.state === 3) shakevar += this.shakex;
      const spr = this.partsprite[i];
      const fr = Math.floor(this.partframe[i]);
      const lastxoff = this.facing === -1 ? 110 : 0;
      const dx = this.x + px[i] * this.facing + pxo[i] * this.facing + lastxoff + shakevar, dy = this.y + py[i] + pyo[i] - shakevar;
      const sc = 2 + (i === 5 ? this.headsize : 0), expand = i === 5 ? this.headexpand : 0;
      draw_sprite_ext(spr, fr, dx, dy, sc * this.facing + expand, sc + expand, this.partrot[i] * this.facing, this.partblend[i], this.image_alpha);
      const flashA = this.flash === 1 ? -Math.cos(this.fsiner / 5) * 0.4 + 0.6 : this.violentendflash > 0 ? this.violentendflash / 10 : 0;
      if (flashA > 0) {
        d3d_set_fog(true, 0xffffff);
        draw_sprite_ext(spr, fr, dx, dy, 2 * this.facing, 2, this.partrot[i] * this.facing, 0xffffff, flashA);
        d3d_set_fog(false);
      }
    }
    if (this.shocker < 0) {
      this.shocker = this.shocker_threshold;
      if (this.shocker_threshold > 2) this.shocker_threshold -= 0.25 * f;
    }
    if (this.partmode === 13) {
      this.partframe[1] = 1;
      const ax = this.x + px[1] + pxo[1] + lengthdir_x(this.armlength, this.partrot[1] - 93) + 15;
      const ay = this.y + py[1] + pyo[1] + lengthdir_y(this.armlength, this.partrot[1] - 93);
      this.partframe[5] = (ps[5] / 6) % 3;
      draw_set_color(0xffffff);
      draw_circle(ax + 120, ay + 6, 13 + Math.sin(this.partrot[0] / 2) * 12, false);
    }
    POSE_AFTER[this.partmode]?.(this);
    const hd = this.hitdetector;
    if (hd && hd.alive) {
      hd.x = this.x + px[5] + pxo[5];
      hd.y = this.y + py[5] + pyo[5];
      hd.image_angle = this.partrot[5];
    }
    if (this.violentendflash > 0) this.violentendflash += 1;
    if (this.becomeflash === 0) this.flash = 0;
    this.becomeflash = 0;
    // The hurt shake (state 3) after a FIGHT hit.
    if (this.state === 3) {
      this.hurttimer -= 1;
      if (this.hurttimer < 0) { this.state = 0; this.shakex = 0; }
      else if (++this.hurtshake > 1) {
        if (this.shakex > 0) this.shakex -= 1;
        if (this.shakex < 0) this.shakex += 1;
        this.shakex = -this.shakex;
        this.hurtshake = 0;
      }
    }
  }
}
defineObject('obj_spamton_neo_enemy', SpamtonNeoEnemy);

// obj_sneo_hitdetector: follows his head. Its Collision_obj_yheart_shot begins with "exit", so
// shooting Spamton himself does nothing in the real game either.
class HitDetector extends Instance {
  constructor() { super(); this.sprite_index = 'spr_sneo_head_sad'; }
  create() {
    this.image_speed = 0;
    this.image_xscale = 2;
    this.image_yscale = 2;
    this.visible = false;
    this.active = true;
  }
}
defineObject('obj_sneo_hitdetector', HitDetector);

// scr_dark_marker(spr_pixel_white) stretched over the screen: the end flashes.
class FlashRect extends Instance {
  draw() { draw_sprite_ext('spr_pixel_white', 0, camerax() - 10, cameray() - 10, 700, 520, 0, this.image_blend, this.image_alpha); }
}
defineObject('obj_sneo_flashrect', FlashRect);

// obj_ch2_sceneex2 (the part of its Draw seen during the fight): the cityscape scrolling past
// above the coaster tracks.
const CITY = [['bg_dw_mansion_basement_cityscape_background', 1], ['bg_dw_mansion_basement_cityscape_midground', 1.1], ['bg_dw_mansion_basement_cityscape_foreground', 1.2]];
export class SceneEx2 extends Instance {
  create() {
    this.depth = 99000;
    this.trackx = 0;
    // Create puts them at 180/240/300; the cutscene before the fight lerps them up to 70/150/230.
    this.tracky = [70, 150, 230];
    this.trackspeed = -15;
    this.cityscape_speed = 0;
    this.cityscape_speed_max = 5;
    this.cityscape_alpha = 0;
    this.shop_spamton_bg_con = 0; // the mercy ending's flash to Spamton's shop background
    this.shop_spamton_bg_timer = 0;
    this.image_alpha = 1;
    for (let i = 0; i < 3; i++) {
      const c = instance_create(0, -100, 'o_coaster_hero_sneo');
      c.HeroID = i;
      const b = instance_create(0, -100, 'o_coaster_hero_back_sneo');
      b.parentid = c;
    }
  }
  draw() {
    const cx = camerax(), cy = cameray();
    draw_sprite_ext('spr_pixel_white', 0, cx - 10, cy - 10, 700, 520, 0, 0, 1);
    if (this.cityscape_alpha < 1) this.cityscape_alpha = lerp(this.cityscape_alpha, 1, 0.2);
    this.cityscape_speed -= this.cityscape_speed_max;
    for (const [spr, k] of CITY) {
      const w = 396;
      let ox = (this.cityscape_speed * k) % w;
      if (ox > 0) ox -= w;
      for (let x = ox; x < 640; x += w) draw_sprite_ext(spr, 0, cx + x, cy, 2, 2, 0, 0xffffff, this.cityscape_alpha);
    }
    if (this.shop_spamton_bg_con > 1) {
      let ox = this.cityscape_speed % 396;
      if (ox > 0) ox -= 396;
      for (let x = ox; x < 640; x += 396) draw_sprite_ext('spr_shop_spamton_bg_battle', 0, cx + x, cy, 1.6708, 1.195, 0, 0xffffff, this.cityscape_alpha);
    }
    if (this.shop_spamton_bg_con === 1 && !i_ex('obj_writer') && !i_ex('obj_battleblcon')) {
      this.shop_spamton_bg_timer += 1;
      if (this.shop_spamton_bg_timer === 1) snd_play('snd_petrify');
      if (this.shop_spamton_bg_timer === 23) this.shop_spamton_bg_con = 2;
    }
    if (this.shop_spamton_bg_con === 2) {
      this.shop_spamton_bg_timer -= 1;
      if (this.shop_spamton_bg_timer === 0) {
        this.shop_spamton_bg_con = 3;
        for (const e of instancesOf('obj_spamton_neo_enemy')) e.targetbgspeed = 5;
      }
    }
    if (this.shop_spamton_bg_con > 0 && this.shop_spamton_bg_con < 3) {
      draw_sprite_ext('spr_pixel_white', 0, cx, cy - 2, 640, 98, 0, 0xffffff, this.shop_spamton_bg_timer / 20);
    }
    this.trackx += this.trackspeed;
    if (this.trackx + 640 < cx) this.trackx += 640;
    if (this.trackx - 640 > cx) this.trackx -= 640;
    for (const ty of this.tracky) for (const k of [-640, 0, 640]) draw_sprite_ext('spr_sneo_track', 0, this.trackx + k, ty, 2, 2, 0, 0xffffff, this.image_alpha);
  }
}
defineObject('obj_ch2_sceneex2', SceneEx2);

// o_coaster_hero_sneo (the car's front, over the hero) and o_coaster_hero_back_sneo (behind).
const CAR_Y = [101, 182, 260], CAR_DX = [-15, -5, -10], HERO_OBJ = ['obj_herokris', 'obj_herosusie', 'obj_heroralsei'];
class CoasterHero extends Instance {
  constructor() { super(); this.sprite_index = 'spr_sneo_car_front'; }
  create() {
    this.image_speed = 0;
    this.image_xscale = 2;
    this.image_yscale = 2;
  }
  endStep() {
    // The car is drawn whether or not its hero is: Rude Buster and the spells hide the hero
    // while their own animation stands in for them.
    const h = first(HERO_OBJ[this.HeroID]);
    if (!h) {
      // The encounter intro (lerpstate 0): the car pulls out of the coaster into its battle spot
      // while its hero jumps there, so it rides along under obj_encounterbasic's marker.
      const m = first('obj_encounterbasic')?.c?.[this.HeroID];
      this.visible = !!m && m.alive;
      if (!this.visible) return;
      this.x = m.x + CAR_DX[this.HeroID];
      this.y = m.y + CAR_Y[this.HeroID] - global.heromakey[this.HeroID];
      this.depth = m.depth - 1;
      return;
    }
    this.visible = true;
    this.x = h.x + CAR_DX[this.HeroID];
    this.y = CAR_Y[this.HeroID];
    this.depth = [80, 75, 70][this.HeroID];
    h.depth = this.depth + 1;
  }
}
defineObject('o_coaster_hero_sneo', CoasterHero);
class CoasterBack extends Instance {
  constructor() { super(); this.sprite_index = 'spr_sneo_car_back'; }
  create() {
    this.image_speed = 0;
    this.image_xscale = 2;
    this.image_yscale = 2;
  }
  endStep() {
    const p = this.parentid;
    if (!p || !p.alive) return;
    this.x = p.x + 1; // o_coaster_hero_sneo Draw: back.x = x + 1
    this.y = p.y;
    this.visible = p.visible;
    this.depth = p.depth + 2;
  }
}
defineObject('o_coaster_hero_back_sneo', CoasterBack);
