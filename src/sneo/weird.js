// THE WEIRD ROUTE FIGHT (scr_sideb_get_phase() > 2; the simulator's WEIRD ROUTE mode): Kris alone
// against Spamton NEO in front of the Dark Fountain (obj_fountainkris_ch2_sideb con 17). From
// obj_spamton_neo_enemy Step_0 / Draw_0 / Other_11: no sparing, HP that never runs out, his lines,
// the end below 10% HP (his "Bluelight Specil", PipisExplosion turns, "Kris called for help... but
// nobody came", Noelle's name and the cold), and Kris's X-Slash and FriedPipis ACTs. Also
// obj_darkfountain (the backdrop), obj_dbulletcontroller type 51 (obj_sneo_weird_end_pipis and its
// bullets), obj_sneo_friedpipis, scr_act_charsprite, and Draw_0's partmode 41 (the laugh) and
// specialcon (the power-up flames).
import {
  G, global, S, Instance, defineObject, defineScript, instance_create, instance_destroy, instancesOf, withObj,
  random, irandom, irandom_range, lerp, merge_color, make_color_hsv, round, bgr, button3_p,
  draw_sprite_ext, draw_sprite_tiled_ext, draw_set_color, draw_rectangle, snd_play, snd_stop, snd_pitch,
  snd_init, mus_loop, mus_pitch, mus_volume, mus_stop,
} from './rt.js?v=20261107054818';
import { first, camerax, cameray, i_ex, scr_ease_inout, snd_play_pitch, scr_bullet_init } from './common.js?v=20261107054818';
import { SpamtonNeoEnemy, POSES, STEP_HOOKS, isphase, msgset, msgnext, writerExists, killWriters } from './enemy.js?v=20261107054818';
import { DBulletController } from './dbullet.js?v=20261107054818';
import { CollideBullet } from './bullets.js?v=20261107054818';
import { scr_afterimage_cut } from './shots.js?v=20261107054818';

const P = SpamtonNeoEnemy.prototype;
const kris = () => first('obj_herokris');

// obj_spamton_neo_enemy Create_0's Weird Route fields.
function weirdInit(s) {
  if (s._weirdInit) return;
  s._weirdInit = 1;
  Object.assign(s, {
    weirdpathendcon: 0, weirdpathendtimer: 0, savemeactcon: 0, balloonorder: 0, cantspareinit: 0,
    specialcon: 0, specialcontimer: 0, laughtimer: 0,
  });
}

// ---------------------------------------------------------------- Step_0

// The start of Step_0: no SPARE, no mercy, HP held at 1, and the end once his HP is below 10% at
// the start of a turn (he freezes for 3 seconds while the music fades).
P.weirdPreStep = function () {
  weirdInit(this);
  const m = this.myself;
  if (this.cantspareinit === 0) {
    const bc = first('obj_battlecontroller');
    if (bc) {
      bc.cantspare[0] = 1;
      this.cantspareinit = 1;
    }
  }
  global.mercymod[m] = 0;
  if (global.monster[m] !== 1) return;
  if (global.monsterhp[m] <= 1) global.monsterhp[m] = 1;
  if ((isphase('enemytalk') && global.monsterhp[m] <= global.monstermaxhp[m] * 0.1 && this.weirdpathendcon === 0)
    || (this.talked === -1 && this.weirdpathendcon === 0)) {
    this.weirdpathendtimer += 1;
    if (this.weirdpathendtimer === 1) {
      this.talked = -1;
      this.partmode = 99;
      mus_volume(global.batmusic?.[1], 0, 30);
    }
    if (this.weirdpathendtimer === 91) {
      this.talked = 0;
      this.weirdpathendcon = 1;
    }
  }
};
STEP_HOOKS.push(s => {
  if (G.weird && s.weirdpathendcon === 6) {
    s.partmode = 40;
    s.dontchangepose = 0;
  }
});

// His first ten lines (balloonorder), one per turn.
const WEIRD_LINES = [
  ['I REMEMBER WHEN&YOU WERE JUST&A LOST [Little Sponge]/%', 16],
  ['I GAVE YOU&EVERYTHING I HAD!&MY LIFE&ADVICE!/%', 17],
  ['I GAVE YOU MY&[Commemorative Ring]&FOR THE PRICE OF&[My Favorite Year]!/%', 0],
  ['AND THIS IS HOW&YOU [Repay] ME!?&TREATING ME LIKE&[DLC]!?/%', 0],
  ["NO, I GET IT!&IT'S YOU AND&THAT [Hochi Mama]!/%", 18],
  ["YOU'VE BEEN&MAKING&[Hyperlink Blocked]!/%", 19],
  ['I WAS TOO [Trusting]&TOO [Honest]/%', 20],
  ['I SHOULD HAVE&KNOWN YOU WOULD&HAVE USED MY [Ring]&FOR [Evil].../%', 21],
  ['YOU THINK MAKING&[Frozen Chicken]&WITH YOUR&[Side Chick]/%', 22],
  ["WELL, YOU'RE&[$!$!] RIGHT!&BUT DON'T BLAME&ME/%", 23],
];
P.weirdTalk = function (say) {
  const [s, con] = WEIRD_LINES[this.balloonorder];
  say(s, con);
  this.balloonorder += 1;
};
// Once the end has started: what he says depends on how many times Kris called for help.
P.weirdEndTalk = function (say) {
  if (this.weirdpathendcon === 1) {
    say('MY ESTEEM CUSTOMER I&SEE YOU ARE ATTEMPTING&TO DEPLETE MY HP!/%', 28);
    this.weirdpathendcon = 2;
  } else if (this.usedact === 0) {
    say('ENJOY THE FIREWORKS,&KID!!!!/%', 0);
    this.weirdpathendcon = 2;
  } else if (this.savemeactcon === 2) {
    say("WHAT!? YOU'RE&CALLING FRIENDS!?/%", 35);
    this.weirdpathendcon = 3;
  } else if (this.savemeactcon === 3) {
    say('GO AHEAD AND&[Scream] INTO THE&[Receiver]./%', 38);
    this.weirdpathendcon = 4;
  } else if (this.savemeactcon === 4) {
    say('THERE WILL BE NO&MORE [Miracles]&NO MORE [Magic]./%', 41);
    this.weirdpathendcon = 5;
  } else if (this.savemeactcon === 5) {
    say('YOU MAKE ME [Sick]!/%', 43);
    this.weirdpathendcon = 6;
    this.shockthreshold = 10;
    this.hurttimer2 = 10;
    this.partmode = 40;
  }
};

// talked == 0.6 (enemy.js nextBalloon): the next part of a Weird Route line, by ballooncon.
const WEIRD_BALLOON = {
  16: 'SLEEPING AT&THE BOTTOM OF&A DUMPSTER!/%',
  17: "I TOLD YOU&[4 Left]&AND ASKED YOU&[Buy] OR [Don't Buy]!/%",
  18: "YOU'VE BEEN&[Making],&HAVEN'T YOU!/%",
  19: "AND NOW THAT&YOU HAVE YOUR&OWN SUPPLY,&YOU DON'T NEED ME!!!/%",
  20: "I'VE ALWAYS BEEN&A MAN OF THE [PIPIS].&A REAL [PIPIS]&PERSON!/%",
  21: "OH, [Right].&THAT'S WHY I SOLD&IT TO YOU/%",
  22: 'IS GONNA LET&YOU DRINK UP&THAT [Sweet, Sweet]&[Freedom Sauce]?/%',
  23: ["WHEN YOU'RE [Crying]&IN A [Broken Home]&WISHING YOU LET&YOUR OLD PAL&SPAMTON/%", 24],
  24: '[Kill You]/%',
  28: ["I'LL ADMIT YOU'VE&GOT SOME [Guts]&KID!/%", 29],
  29: ['BUT IN A [1 for 1]&BATTLE,  NEO&NEVER LOSES!!!/%', 30],
  30: ["IT'S TIME FOR A&LITTLE [Bluelight Specil]/%", 31],
  31: ["* Spamton Neo's ATTACK dropped!&* Spamton Neo's DEFENSE rose greatly!/%", 32],
  32: ["DIDN'T YOU KNOW&[Neo] IS FAMOUS FOR&ITS HIGH DEFENSE!?/%", 33],
  33: ['NOW... ENJ0Y THE&FIR3WORKS, KID!!!/%', 0],
  35: ["YOU THINK YOU&CAN BEAT ME WITH&YOUR FRIENDS' [Magic]!?/%", 36],
  36: ['GO AHEAD, [Kid]...&CALL ALL YOU WANT!/%', 37],
  37: 'NO ONE WILL&EVER PICK UP/%',
  38: ['THE [Voice] RUNS&OUT EVENTUALLY/%', 39],
  39: ['YOUR [Voice]&THEIR [Voice]/%', 40],
  40: 'UNTIL YOU REALIZE&YOU ARE ALL ALONE/%',
  41: ['YOU LOST IT WHEN&YOU TRIED TO SEE&TOO FAR..../%', 42],
  42: '... YOU LOST IT.../%',
  43: ["MUTTERING YOUR&[Lost Friends] NAMES&AT THE BOTTOM OF&A [Dumpster]!/%", 44],
  44: ["NO ONE'S GONNA&HELP YOU!!!/%", 45],
  45: 'GET THAT THROUGH&YOUR [Beautiful Head],&YOU LITTLE [Worm]!/%',
};
P.weirdBalloon = function (from) {
  const next = WEIRD_BALLOON[from];
  if (!next) return null;
  if (from === 31) {
    this.specialcon = 1;
    snd_play('snd_cardrive');
  }
  if (from === 32) {
    // The battle music (faded out) gives way to his old shop theme, sped up.
    this.partmode = 1;
    mus_stop(global.currentsong?.[1]);
    global.currentsong ??= [];
    global.currentsong[0] = snd_init('spamton_neo_meeting.ogg');
    global.currentsong[1] = mus_loop(global.currentsong[0]);
    mus_pitch(global.currentsong[1], 1.8);
  }
  if (from === 33) {
    this.savemeactcon = 1;
    this.user1();
  }
  if (from === 43) this.partmode = 40;
  if (from === 45) this.weirdpathendcon = 7;
  return next;
};

// Other_11: the end's ACT menu is one nameless ACT (calling for help).
P.user1 = function () {
  const g = global, m = this.myself;
  g.canact[m][0] = 1;
  g.actactor[m][0] = 1;
  g.actname[m][0] = '';
  g.actdesc[m][0] = '';
  g.actcost[m][0] = 0;
  for (const k of [1, 2]) {
    g.canact[m][k] = 0;
    g.actactor[m][k] = 0;
    g.actname[m][k] = '';
    g.actdesc[m][k] = '';
    g.actcost[m][k] = 0;
  }
  S.scr_spellmenu_setup();
};

// ---------------------------------------------------------------- ACTs (Step_0, global.myfight == 3)

const balloonAfter = (s, text, cond) => {
  s.talktimer += 1;
  if (!((button3_p() && s.talktimer > 15) || !writerExists())) return false;
  if (text) {
    msgset(0, text);
    s.balloon();
  }
  return true;
};

P.weirdActs = function () {
  const g = global, m = this.myself;
  if (this.acting === 1 && this.actcon === 0 && this.savemeactcon === 0) {
    this.actcon = 1;
    if (this.checkcount === 0) {
      msgset(0, "* SPAMTON NEO - YOU WON'T FIND HIGHER ATTACK AND DEFENSE ANYWHERE ELSE!!!/");
      msgnext('* THE SMOOTH TASTE OF NEO "WAKE UP AND TASTE THE \\cRPAIN\\cW"./%');
      msgnext('* [[note: pain is in red.]] ./%');
    } else msgset(0, '* Spamton Neo - He is his own worst invention./%');
    S.scr_battletext_default(this);
    this.checkcount += 1;
  }
  if (this.acting === 1 && this.actcon === 0 && this.savemeactcon > 0) {
    this.actcon = 1;
    if (this.savemeactcon < 5) {
      msgset(0, '* Kris called for help.../');
      msgnext('* ... but nobody came./%');
      S.scr_battletext_default(this);
    } else {
      msgset(0, "* You whispered Noelle's name.../%");
      S.scr_battletext_default(this);
      this.talktimer = 0;
      this.actcon = 95;
      this.alarm[4] = 1;
    }
    this.savemeactcon += 1;
  }
  const noWriter = !writerExists();
  if (this.actcon === 96 && noWriter && balloonAfter(this, '... HER?/%')) {
    this.talktimer = 0;
    this.actcon = 97;
    this.alarm[4] = 1;
  }
  if (this.actcon === 98 && noWriter && balloonAfter(this, "YOU'RE STILL TRYING&TO [Use] HER!?/%")) {
    this.actcon = 99;
    this.alarm[4] = 1;
  }
  if (this.actcon === 100 && noWriter && balloonAfter(this, 'HA HA HA HA!!!/%')) {
    snd_play('snd_sneo_laugh_long');
    this.laughtimer = 0;
    this.talktimer = 0;
    this.actcon = 101;
    this.alarm[4] = 1;
  }
  if (this.actcon === 102 && noWriter) {
    if (this.talktimer + 1 === 10) snd_stop('snd_sneo_laugh_long');
    if (balloonAfter(this, 'YOU THINK SHE CAN&[Hear] YOU NOW,&MUTTERING HER NAME!?/%')) {
      snd_stop('snd_sneo_laugh_long');
      this.partmode = 1;
      this.talktimer = 0;
      this.actcon = 103;
      this.alarm[4] = 15;
    }
  }
  if (this.actcon === 104 && noWriter && balloonAfter(this, "WHAT'S SHE GONNA&DO, MAKE ME AN&[Ice Cream]!?/%")) {
    this.talktimer = 0;
    this.actcon = 105;
    this.alarm[4] = 15;
  }
  if (this.actcon === 106 && noWriter && balloonAfter(this, null)) {
    this.partmode = 41;
    this.actcon = 107;
    this.laughtimer = 0;
    this.alarm[4] = 120;
    mus_stop(global.currentsong?.[1]);
  }
  if (this.actcon === 107 && this.alarm[4] < 62) {
    this.headforceframe = 2;
    this.partrot[5] = 30;
    this.partmode = 99;
    snd_stop('snd_sneo_laugh_long');
  }
  if (this.actcon === 108 && noWriter && balloonAfter(this, null)) {
    this.partmode = 99;
    this.headforceframe = 2;
    msgset(0, 'HEY, IS IT COLD&IN HERE OR IS IT&JUST ME?/%');
    this.balloon();
    this.talktimer = 0;
    this.actcon = 109;
    this.alarm[4] = 40;
  }
  if (this.actcon === 110 && balloonAfter(this, null)) {
    // Everything goes black; then the cold.
    this.actcon = 111;
    snd_play('snd_noise');
    killWriters();
    const black = S.scr_dark_marker(-10, -10, 'spr_pixel_white');
    black.image_xscale = 999;
    black.image_yscale = 999;
    black.image_alpha = 1;
    black.image_blend = 0;
    black.depth = -99999;
    this.alarm[4] = 60;
  }
  if (this.actcon === 112) {
    this.actcon = 113;
    snd_play('snd_icespell');
    this.alarm[4] = 12;
  }
  const hit = (dx, dy, wait) => {
    snd_stop('snd_damage');
    snd_play('snd_damage');
    const d = instance_create(this.x + dx, this.y + dy, 'obj_dmgwriter');
    d.damage = 684 + irandom(20);
    d.type = 6;
    d.depth = -999999;
    this.alarm[4] = wait;
  };
  if (this.actcon === 114) { this.actcon = 115; hit(64, 62, 3); }
  if (this.actcon === 116) { this.actcon = 117; hit(84, 90, 3); }
  if (this.actcon === 118) { this.actcon = 119; hit(66, 119, 1); }
  if (this.actcon === 120) {
    this.actcon = 121;
    this.user3();
    withObj('obj_battlecontroller', bc => { bc.skipvictory = 1; });
    global.fighting = 0;
    S.scr_wincombat();
  }
  // X-Slash: Kris cuts twice (each hit 1.25x a full-power FIGHT).
  const slash = (pitch, xscale) => {
    const k = kris();
    const krs = S.scr_act_charsprite('kris', 'spr_krisb_attack', 0.25, 1);
    if (krs && k) krs.depth = k.depth + 1;
    this.alarm[4] = 14;
    snd_pitch(snd_play('snd_scytheburst'), pitch);
    const att = instance_create(this.x + 57, this.y + 76, 'obj_basicattack');
    att.image_xscale = xscale;
    att.image_yscale = 2;
    this.caster = 0;
    Object.assign(this, { partmode: 40, shockthreshold: 15, shocktimer: 9999, hurttimer2: 10 });
    const at = global.battleat[k ? k.myself : 0];
    S.scr_damage_enemy(this, 0, round((at * 150 / 20 - global.monsterdf[m] * 3) * 1.25));
  };
  if (this.acting === 2 && this.actcon === 0) {
    msgset(0, '* Kris used X-Slash!/%');
    S.scr_battletext_default(this);
    this.acting = 0;
    this.actcon = 21;
    global.hittarget[0] = 0;
    slash(1.2, 2);
  }
  if (this.actcon === 22) {
    this.actcon = 23;
    S.scr_act_charsprite_end();
    global.hittarget[11] = 0; // (sic: the second hit's number stacks over the first)
    slash(0.8, -2);
  }
  if (this.actcon === 24) {
    S.scr_act_charsprite_end();
    this.actcon = 1;
  }
  // FriedPipis: a pipis egg heals Kris 120 HP (and gets a few likes).
  if (this.acting === 3 && this.actcon === 0) {
    const n = irandom_range(42, 5555);
    S.scr_smallface(0, 'none', 6, 'rightmid', 'bottom', '[ ' + n + ' ] Liked this!');
    msgset(0, '* RECOVERED HP with pipis!\\f0 /%');
    S.scr_battletext_default(this);
    this.acting = 0;
    this.actcon = 31;
    const k = kris();
    instance_create((k ? k.x : 80) + 105, (k ? k.y : 173) + 50, 'obj_sneo_friedpipis');
  }
  if (this.actcon === 31 && !writerExists() && !i_ex('obj_sneo_friedpipis')) this.actcon = 1;
};

// ---------------------------------------------------------------- Draw_0

// specialcon: blue flames rise around him while his parts settle (after "DEFENSE rose greatly").
P.specialFlames = function () {
  const f = this.f ?? 2;
  this.specialcontimer += 1;
  for (let i = 0; i < 8; i++) {
    this.partrot[i] = lerp(this.partrot[i], 0, 0.07 * f);
    this.partx[i] = lerp(this.partx[i], 0, 0.05 * f);
    this.party[i] = lerp(this.party[i], 0, 0.03 * f);
  }
  const t = this.specialcontimer;
  const flameframe = (t / 4) % 2;
  let flamealpha = Math.min(0.9, t / 15);
  if (t >= 15) flamealpha = Math.max(0, 1 - t / 60);
  if (t >= 60) {
    this.specialcontimer = 12;
    this.specialcon = 0;
    this.image_index = 0;
  }
  const tt = this.specialcontimer;
  draw_sprite_ext('spr_bhero', 10 + flameframe, this.x + 75, this.y + 177, -2, 2.8 + Math.abs(Math.sin(tt / 4) / 2), 0, bgr(16711680), flamealpha);
  draw_sprite_ext('spr_bhero', 11 - flameframe, this.x + 75, this.y + 177, -2, 2.8, 0, bgr(8421376), flamealpha / 1.4);
};

// partmode 41: the long laugh, the head jerking through its frames.
POSES[41] = (s, i) => {
  if (i === 0) s.laughtimer += 1;
  if (i === 5) {
    const t = s.laughtimer, pf = s.partframe, pr = s.partrot;
    if (t === 1) snd_play('snd_sneo_laugh_long');
    if (t >= 1 && t < 30) { s.headsize = random(0.25); pf[i] = 0; pr[i] = 30 + random(10); }
    if (t >= 30 && t < 48) { pf[i] = 1; s.headsize = random(0.25); pr[i] = -40 + random(10); }
    if (t >= 48 && t < 60) { pf[i] = 2; s.headsize = random(0.25); pr[i] = 30; }
    if (t >= 60) { pf[i] = 3; s.headsize = random(0.25); pr[i] = -70 + random(10); }
    if (t >= 80) s.headsize = 0;
    if (pf[i] >= 3) pf[i] = 0;
  }
  // Every part shakes while he laughs.
  const f = s.f ?? 2;
  s.partsiner[i] += (1 + i / 5) * f;
  s.partx[i] = Math.sin(s.partsiner[i] / 2 * f);
  s.party[i] = Math.cos(s.partsiner[i] / 2 * f);
  if (global.flag?.[8] === 1) s.shockthreshold = Math.max(5, Math.min(100, s.shockthreshold));
};

// ---------------------------------------------------------------- obj_darkfountain

// scr_make_color_hsv: the hue wraps around 256.
const hsv = (h, s, v) => make_color_hsv(h < 0 ? 256 - (-h % 256) : h % 256, s, v);

// The Dark Fountain behind the fight, as obj_fountainkris_ch2_sideb leaves it (adjust 3: the colours
// slowly cycle, the stream slowed down). Its room-wide fountainbg marker is the first rectangle.
class DarkFountain extends Instance {
  create() {
    Object.assign(this, {
      siner: 100, bgsiner: 0, colcol: 0, hscroll: 0, eyebody: 1, adjust: 3, slowdown: 1, nowcolor: bgr(65280),
    });
    this.depth = 2000000;
  }
  draw() {
    const W = 640, sw = 200, left = W / 2 - sw / 2;
    this.siner += 1;
    this.hscroll += 1;
    if (this.hscroll > 240) this.hscroll -= 240;
    if (this.adjust === 0) {
      // Before the fight (room_dw_mansion_fountain): the colors cycle.
      const s = this.siner;
      this.colcol = hsv(s / 4, 160 + Math.sin(s / 32) * 60, 255);
      this.nowcolor = hsv(s / 4, 255, Math.sin(s / 16) * 40 + 60);
    }
    if (this.adjust === 3) {
      // From the fight on: slower, and the colors drift.
      if (this.slowdown < 1) this.slowdown += 0.01;
      this.siner -= this.slowdown * 0.5;
      this.bgsiner -= this.slowdown / 24;
      this.hscroll -= this.slowdown * 0.8;
      const s = this.siner;
      this.colcol = merge_color(this.nowcolor, hsv(s / 16, 160 + Math.sin(s / 128) * 60, 255), this.slowdown);
      this.nowcolor = merge_color(this.nowcolor, hsv(s / 16, 255, Math.sin(s / 64) * 40 + 60), this.slowdown);
    }
    this.bgsiner += 0.0625;
    if (this.bgsiner > 7) this.bgsiner -= 7;
    const s = this.siner;
    const cx = camerax(), cy = cameray(), c = this.colcol, b = this.bgsiner * 280 / 7;
    // fountainbg (a full-screen marker at depth 2000000 that change_fountain_color tints).
    draw_set_color(this.nowcolor);
    draw_rectangle(cx, cy, cx + W, cy + 480, false);
    draw_sprite_tiled_ext('bg_fountain1', 0, cx - s, cy - s, 2, 2, c, 0.7 * this.eyebody);
    draw_sprite_tiled_ext('bg_fountain1', 0, cx - 240 + this.hscroll, cy + s, 2, 2, c, 0.3 * this.eyebody);
    draw_set_color(0);
    draw_rectangle(cx, cy, cx + left, cy + 280, false);
    draw_rectangle(cx + left + sw, cy, cx + 999, cy + 280, false);
    const wob = Math.sin(s / 16) * 12;
    for (const [dx, a] of [[0, 1], [wob, 0.5], [-wob, 0.5]]) {
      draw_sprite_ext('spr_fountainedge', 0, cx + left + dx, cy - b, 2, 2, 0, c, a);
      draw_sprite_ext('spr_fountainedge', 0, cx + left + dx, cy + 280 - b, 2, 2, 0, c, a);
    }
    draw_sprite_ext('spr_fountainbottom', 0, cx + left, cy - 8 + Math.sin(s / 16) * 8, 2, 2, 0, c, 0.3);
    draw_sprite_ext('spr_fountainbottom', 0, cx + left, cy - 4 + Math.sin(s / 16) * 4, 2, 2, 0, c, 0.5);
    draw_sprite_ext('spr_fountainbottom', 0, cx + left, cy, 2, 2, 0, c, 1);
    draw_set_color(this.nowcolor);
    draw_rectangle(cx, cy + 280, cx + W, cy + 480, false);
    // room_dw_mansion_fountain's TILES layer (depth 1000000, in front of the fountain): black outside
    // the column x 200-440, so only the fountain's middle shows, in the fight too.
    draw_set_color(0);
    draw_rectangle(cx - 40, cy - 40, cx + 199, cy + 520, false);
    draw_rectangle(cx + 440, cy - 40, cx + 680, cy + 520, false);
    draw_set_color(0xffffff);
  }
}
defineObject('obj_darkfountain', DarkFountain);

// ---------------------------------------------------------------- PipisExplosion (rr 5)

// obj_dbulletcontroller type 51: three pipis eggs fade in, then burst into Spamton heads.
const baseDStep = DBulletController.prototype.step;
DBulletController.prototype.step = function () {
  baseDStep.call(this);
  if (this.type !== 51) return;
  const cx = camerax(), cy = cameray();
  if (this.btimer >= 1 && this.made === 0) {
    this.made = 1;
    for (const [x, y] of [[530, 100], [448, 168], [510, 250]]) {
      const pip = instance_create(cx + x, cy + y, 'obj_sneo_weird_end_pipis');
      pip.damage = this.damage;
      pip.target = this.target;
    }
  }
  if (this.btimer >= 45 && this.btimer < 46) {
    snd_play('snd_explosion_8bit');
    for (const p of instancesOf('obj_sneo_weird_end_pipis')) p.user0();
  }
  if (this.btimer >= 100 && this.btimer < 110) {
    this.btimer = 120;
    const s = first('obj_spamton_neo_enemy');
    if (s) s.moveToRemembered(4);
    global.turntimer = 1;
  }
};

class WeirdEndPipis extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_pipis_egg';
  }
  create() {
    Object.assign(this, { image_speed: 0, image_xscale: 2, image_yscale: 2, image_alpha: 0, damage: 2, target: 1, grazepoints: 1, timepoints: 1 });
  }
  step() { this.image_alpha += 0.08; }
  // Other_10: eighteen heads in two rings.
  user0() {
    if (!this.alive) return;
    let initangle = random(80), initspeed = 4;
    const bulcount = 9;
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < bulcount; i++) {
        const b = instance_create(this.x, this.y, 'obj_sneo_weird_end_pipis_bullet');
        b.sprite_index = 'spr_spamtonhead';
        b.image_index = [0, 1, 2, 3][irandom(3)];
        b.image_speed = 0.25;
        b.direction = initangle + random(20);
        b.speed = 2 + initspeed;
        b.depth = this.depth - 1;
        b.target = this.target;
        initangle += 360 / bulcount;
      }
      initspeed += 4;
      initangle = random(50);
    }
    instance_destroy(this);
  }
  collision_obj_yheart_shot(shot) {
    this.user0();
    snd_play('snd_damage');
    if (shot.big == 0) shot.user0();
    const fx = instance_create(this.x, this.y, 'obj_pipis_destroy_fx');
    fx.image_xscale = 1.5;
    fx.image_yscale = 1.5;
    instance_destroy(this);
  }
}
defineObject('obj_sneo_weird_end_pipis', WeirdEndPipis);

class WeirdEndPipisBullet extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_crew';
  }
  create() {
    scr_bullet_init(this);
    Object.assign(this, { element: 6, timer: 0, con: 0, target: 1, damage: 16 });
    this.image_blend = merge_color(bgr(15245824), bgr(16776960), 0.25 + Math.sin(1 / 3) * 0.25);
  }
  step() {}
  collision_obj_yheart_shot(shot) {
    if (shot.big == 0) shot.user0();
    this.user1();
  }
  user1() {
    snd_play_pitch('snd_bomb', 1.1 + random(0.2));
    scr_afterimage_cut(this);
    instance_destroy(this);
  }
}
defineObject('obj_sneo_weird_end_pipis_bullet', WeirdEndPipisBullet);

// ---------------------------------------------------------------- FriedPipis

class FriedPipis extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_pipis_egg';
  }
  create() {
    Object.assign(this, { timer: 0, con: 0, image_xscale: 0, image_yscale: 0, image_speed: 0 });
  }
  step() {
    const t = (this.timer += 1);
    this.image_speed = 0;
    if (t === 1) snd_play('snd_spell_cure_slight_smaller');
    if (t > 0 && t < 21) {
      this.image_xscale = lerp(0, 2, t / 20);
      this.image_yscale = lerp(0, 2, t / 20);
      this.image_angle = lerp(0, 720, scr_ease_inout(t / 20, 2));
    }
    const k = kris();
    if (t > 25 && t < 36 && k) this.x = lerp(this.x, k.x + 35, (t - 25) / 10);
    if (t > 35) {
      this.image_xscale += 0.4;
      this.image_yscale += 0.4;
      this.image_alpha -= 0.1;
    }
    if (t === 45) {
      this.star = 0;
      S.scr_healitemspell(this, 120);
      instance_destroy(this);
    }
  }
}
defineObject('obj_sneo_friedpipis', FriedPipis);

// ---------------------------------------------------------------- scr_act_charsprite

// scr_act_charsprite(name, sprite, speed, mode): the hero hides and a flashing pose takes its place
// (with two afterimages); scr_act_charsprite_end() puts the heroes back.
const ACTCHAR = { kris: ['obj_herokris', 1], susie: ['obj_herosusie', 2], ralsei: ['obj_heroralsei', 3], noelle: ['obj_heronoelle', 4] };
const charactsprite = [];
defineScript('scr_act_charsprite', (name, spr, spd, mode) => {
  const [obj, num] = ACTCHAR[name] ?? ACTCHAR.kris;
  let ret = charactsprite[num] ?? null;
  const h = first(obj);
  if (h) {
    h.image_alpha = 0;
    h.state = 0;
    global.faceaction[h.myself] = 0;
    const mk = S.scr_dark_marker(h.x, h.y, spr);
    charactsprite[num] = mk;
    mk.depth = 20 - cameray() / 40;
    S.scr_oflash(mk);
    if (spd > 0) mk.image_speed = spd;
    const a = S.scr_afterimage(mk);
    a.hspeed = 2.5;
    a.depth = mk.depth + 1;
    const b = S.scr_afterimage(mk);
    b.image_alpha = 0.6;
    b.hspeed = 5;
    b.depth = mk.depth + 2;
    ret = mk;
  }
  return ret;
});
defineScript('scr_act_charsprite_end', () => {
  for (let i = 0; i < 10; i++) if (charactsprite[i]) instance_destroy(charactsprite[i]);
  withObj('obj_heroparent', h => {
    if (h.image_alpha == 0) {
      h.image_alpha = 1;
      h.acttimer = 0;
      h.state = 0;
      global.faceaction[h.myself] = 0;
    }
  });
});
