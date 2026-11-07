// PHONE CALL (rr 8) and PHONE HANDS (rr 8.5).
// Phone call: obj_sneo_phonecall (created by the enemy's launchAttack), obj_sneo_bulletcontroller
// type 1 ("FootballPipis", difficulties 0/1): obj_pipis_controller (variant 2), obj_pipis_egg_bullet,
// obj_pipis_bullet_cone, obj_pipis_egg_bullet_piece, obj_pipis_destroy_fx, obj_pipis_wall,
// obj_sneo_armcannon_smoke; difficulty 3: obj_sneo_phonecall_pipis_stream, obj_sneo_phonecall_sneohead.
// Phone hands: obj_sneo_bulletcontroller type 8.5, obj_sneo_phonehand_master, obj_sneo_phonehand,
// obj_sneo_mmx_spreadshot.
// Not ported (nothing in the game creates them): obj_sneo_phoneshooter, obj_sneo_phonebullet,
// obj_sneo_phonecall_pipis, obj_sneo_phonehand_master_hurtbox; obj_pipis_controller variants 0/1/3
// and the egg types 0/1 (obj_pipis_center) are not used by these attacks either.
import {
  global, Instance, defineObject, instance_create, instance_destroy, instance_exists, instance_number, instancesOf,
  random, random_range, irandom, lerp, lengthdir_x, lengthdir_y, point_direction, point_distance, merge_color, bgr,
  draw_self, draw_sprite_ext, draw_set_alpha, draw_set_color, draw_line_width, d3d_set_fog, button1_p, button3_h,
  snd_play, snd_volume, S,
} from '../rt.js?v=20261107051915';
import {
  first, camerax, cameray, callOr, room_width, room_height, scr_bullet_init, scr_bullet_inherit, scr_ease_in,
  scr_ease_out, snd_play_pitch,
} from '../common.js?v=20261107051915';
import { BulletParent, CollideBullet } from '../bullets.js?v=20261107051915';
import { BasicBulletSneo, scr_afterimage_cut } from '../shots.js?v=20261107051915';
import { SneoBulletController } from './heads.js?v=20261107051915';

const sneo = () => first('obj_spamton_neo_enemy');
const isphase = callOr('scr_isphase', p => (p === 'bullets' ? global.mnfight === 2 : false));
const alive = i => !!i && i.alive;
const BLUE = bgr(15245824), CYAN = bgr(16776960);

function scr_orbitx(cx, cy, px, py, ang) {
  if (ang === 0) return px;
  return cx + lengthdir_x(point_distance(cx, cy, px, py), point_direction(cx, cy, px, py) + ang);
}
function scr_orbity(cx, cy, px, py, ang) {
  if (ang === 0) return py;
  return cy + lengthdir_y(point_distance(cx, cy, px, py), point_direction(cx, cy, px, py) + ang);
}
function msgset(n, s) {
  global.msg ??= [];
  global.msg[n] = s;
  global.msgno = n;
  for (let i = n + 1; i < global.msg.length; i++) global.msg[i] = '%%';
}

// ---------------------------------------------------------------- PHONE CALL

// obj_sneo_phonecall: the phone drops in on its cord and rings; he answers ("WHAT!?") and hands it
// over ("... IT'S FOR YOU."), then the turn's real attack starts (state 6).
class SneoPhonecall extends BulletParent {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_phone';
  }
  create() {
    Object.assign(this, {
      timer: 0, seen: 0, writeline: false, state: 0, talktimer: -15, talking: false, talkmax: 45, songtime: 0,
      secondtime: 0, skipintro: 0, resumeinterval: 1.715, isattack: 0, peeking: 0, siner: 0, init: 0, ydrop: 0,
      ringtimer: 0, damage: -1, target: -1, fadealpha: 1, textboxdistance: 20, textboxoffsetx: 0, textboxoffsety: 0,
    });
    this.sneo = sneo();
    this.visible = false;
  }
  onDestroy() {
    const s = this.sneo;
    if (!alive(s)) return;
    s.partmode = 1;
    // scr_move_to_rememberxy(8)
    if (s.moveToRemembered) s.moveToRemembered(8);
  }
  step() {
    const s = this.sneo;
    if (!alive(s)) return;
    if (this.init === 0) {
      this.y = -30;
      this.visible = true;
      this.init = 1;
    }
    if (this.state < 7) {
      global.turntimer = 430;
      if (s.difficulty === 3) global.turntimer = 100;
    }
    if (this.talking) {
      this.talktimer += 1;
      let aa = 0;
      if (s.difficulty === 3 && this.state >= 5) aa = 1;
      if (button1_p() && this.talktimer > 5 && aa === 0) this.talktimer = this.talkmax;
      if (button3_h() && this.talktimer > 1 && aa === 0) this.talktimer = this.talkmax;
      if (this.talktimer >= this.talkmax) {
        s.talktimer = s.talkmax;
        for (const w of instancesOf('obj_writer')) instance_destroy(w);
        this.talking = false;
        this.talktimer = -10;
        this.state += 1;
      }
      return;
    }
    if (this.state === 6) {
      if (isphase('bullets') || this.isattack) {
        if (!this.secondtime) {
          this.songtime = this.songtime + this.resumeinterval - this.songtime % this.resumeinterval;
          if (this.songtime > 140) this.songtime = 0;
        }
        if (this.isattack) {
          if (s.difficulty === 3) {
            instance_create(s.x + s.partx[5], s.y + s.party[5] + 60, 'obj_sneo_phonecall_pipis_stream');
          } else {
            for (const b of instancesOf('obj_sneo_bulletcontroller')) instance_destroy(b);
            const r = this.secondtime ? 30 : 70;
            const xx = scr_orbitx(0, 0, -26, r, s.partrot[1]) + s.x + s.partx[1] + s.partxoff[1];
            const yy = scr_orbity(0, 0, -26, r, s.partrot[1]) + s.y + s.party[1] + s.partyoff[1];
            global.monsterattackname ??= [];
            global.monsterattackname[s.myself] = 'FootballPipis';
            const d = instance_create(xx, yy, 'obj_sneo_bulletcontroller');
            d.type = 1;
            d.damage = global.monsterat[s.myself] * 5;
            d.target = this.target;
          }
        }
        this.state = 7;
      }
      return;
    }
    if (this.talktimer < 0) this.talktimer += 1;
    else if (this.state === 0) {
      this.ringtimer = 12;
      this.sndphone = snd_play('snd_phone');
      snd_volume(this.sndphone, 0.7, 0);
      this.talktimer = -10;
      this.state += 1;
    } else if (this.state === 1) {
      this.talktimer = -10;
      this.state += 1;
      s.partmode = 6;
      if (this.skipintro === 1) this.state = 5;
    } else if (this.state === 2) {
      msgset(0, 'WHAT!?');
      if (s.difficulty !== 3) s.partmode = 7;
      this.writeline = true;
    } else if (this.state === 3) {
      if (s.difficulty === 3) this.state = 5;
      else {
        msgset(0, 'WHAT? ARE&YOU SERIOUS!?');
        s.partmode = 7;
        this.writeline = true;
      }
    } else if (this.state === 4) this.state = 5;
    else if (this.state === 5) {
      if (isphase('bullets') && this.skipintro === 0) {
        this.textboxoffsetx = 10;
        this.textboxoffsety = 20;
        if (s.difficulty === 3) msgset(0, "IT'S FOR&ME!?");
        else {
          msgset(0, "... IT'S&FOR YOU.");
          s.partframe[1] = 3;
        }
        this.textboxdistance = 40;
        this.writeline = true;
      } else this.state = 6;
      s.partmode = 9;
      if (s.difficulty !== 3) {
        s.partrot[1] = -180;
        s.partframe[1] = 3;
      } else s.partframe[1] = 4;
    }
    if (this.writeline) {
      this.writeline = false;
      global.typer = 72;
      S.scr_enemyblcon(s, s.x - this.textboxdistance + 22 - this.textboxoffsetx, s.y + 60 + this.textboxoffsety, 10);
      this.talktimer = 0;
      this.talking = true;
    }
  }
  draw() {
    const s = this.sneo;
    if (!alive(s)) return;
    draw_set_alpha(this.fadealpha);
    draw_set_color(0xffffff);
    if (this.state === 0 || (this.state === 1 && s.partframe[1] == 0)) {
      this.siner += 1;
      draw_self(this);
      draw_line_width(this.x, this.y, s.x + s.partx[5], -20, 2);
      this.image_angle = Math.sin(this.siner / 20) * 10;
      if (this.ringtimer > 0) {
        this.image_angle += this.ringtimer % 2 === 0 ? 1 : -1;
        this.ringtimer -= 1;
        if (this.ringtimer <= 6) s.partmode = 5;
      }
      this.x = this.xstart + Math.sin(this.siner / 20) * 10;
      if (this.ydrop < 1) this.ydrop += 0.02;
      this.y = lerp(-30, this.ystart, scr_ease_out(this.ydrop, -2));
    } else {
      const xx = scr_orbitx(0, 0, 20, 50, s.partrot[1]) + s.x + s.partx[1] + s.partxoff[1];
      const yy = scr_orbity(0, 0, 20, 50, s.partrot[1]) + s.y + s.party[1] + s.partyoff[1];
      draw_line_width(xx, yy, s.x + s.partx[5], -20, 2);
    }
    draw_set_alpha(1);
  }
  // Collision_obj_yheart_shot is just "exit": shots go through the phone.
}
defineObject('obj_sneo_phonecall', SneoPhonecall);

// obj_sneo_bulletcontroller type 1 (FootballPipis): he slides off to the right, drops the PIPIS
// egg, and his arm cannon (obj_pipis_controller) lobs more from the edge; he slides back at the end.
SneoBulletController.prototype.type1 = function () {
  const s = this.sneo;
  if (!alive(s)) return;
  this.atimer += 1;
  if (this.atimer === 1) this.btimer = 0;
  if (this.atimer === 6) {
    const bul = instance_create(s.x + 4, s.y + 60, 'obj_pipis_egg_bullet');
    bul.type = 2;
    bul.drawlabel = 1;
    bul.depth = s.depth;
    bul.gravity = 0.2 + random(10) / 100;
    bul.vspeed = 0;
    bul.hspeed = -1.55;
    bul.target = this.target;
    bul.damage = this.damage;
  }
  if (this.atimer < 20) {
    s.x += 10;
    s.vinex = scr_ease_in(Math.min(10, this.atimer) / 10, 5) * 300;
    s.x = s.xstart + scr_ease_in(this.atimer / 20, 2) * 300;
  }
  if (this.atimer === 20 && this.init === 1) {
    s.x = s.xstart + 300;
    s.vinex *= -1;
    const pipis = instance_create(this.x, this.y, 'obj_pipis_controller');
    pipis.damage = this.damage;
    pipis.target = this.target;
    this.init = 2;
  }
  if (global.turntimer < 21 && global.turntimer > 1) {
    s.partmode = 1;
    for (const p of instancesOf('obj_sneo_phonecall')) p.fadealpha = 0;
    s.x -= 10;
    const slidetimer = global.turntimer - 1;
    s.vinex = scr_ease_out(Math.min(10, slidetimer) / 10, 5) * 50;
    s.x = s.xstart + scr_ease_out(slidetimer / 20, 4) * 200;
    s.y = lerp(s.y, s.___myremembery ?? s.y, slidetimer / 20);
  }
  if (global.turntimer === 1) s.x = s.xstart;
};

// obj_pipis_controller (variant 2): a peeking Spamton at the right edge whose arm cannon lobs
// pipis eggs over the box. All of it runs in Draw, as in the game.
class PipisController extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_arml_egg';
  }
  create() {
    Object.assign(this, {
      con: 0, timer: 0, con2: 0, timer2: 0, timer3: 0, variant: 2, eggcount: 20, savex: 0, firstshot: 1,
      siner: irandom(100), timervariance: 30, pipiscount: 0, speedvar: 2, movecon: 0, movetimer: 0,
      image_angle: -170, image_xscale: 2, angle_final: -170, damage: 0, target: 0, maxpipis: 10,
    });
    this.sprite_index = 'spr_sneo_arml_egg';
  }
  egg(xx, yy) {
    const bul = instance_create(xx + 5 + lengthdir_x(50, this.image_angle + 270), yy + lengthdir_y(50, this.image_angle + 270), 'obj_pipis_egg_bullet');
    bul.type = 2;
    bul.target = this.target;
    bul.damage = this.damage;
    bul.depth = this.depth - 1;
    return bul;
  }
  draw() {
    this.siner += 0.25;
    let xx = camerax() + 640 - 10;
    const yy = cameray() + 480 - 230 + Math.sin(this.siner / 6) * 21;
    let shake = 0;
    if (this.sprite_index === 'spr_sneo_arml_egg') shake = -4 + random(8);
    if (this.movecon === 0) {
      this.movetimer += 1;
      xx = lerp(camerax() + 640 + 70, camerax() + 640 - 10, this.movetimer / 10);
      if (this.movetimer === 10) {
        this.movetimer = 0;
        this.movecon = 1;
      }
    }
    if (global.turntimer < 16) this.movecon = 2;
    if (this.movecon === 2) {
      this.movetimer += 1;
      xx = lerp(camerax() + 640 - 10, camerax() + 640 + 70, this.movetimer / 10);
      if (this.movetimer === 10) instance_destroy(this);
    }
    if (this.variant === 2 && this.movecon === 1) {
      if (this.con === 0) {
        this.timer += 1;
        if (this.timer >= 1) {
          const g = first('obj_growtangle');
          if (!instance_exists('obj_pipis_wall') && g) {
            const wall = instance_create(g.x + 200, g.y + g.sprite_height / 2, 'obj_pipis_wall');
            wall.image_xscale = 2.9;
          }
          this.con = 1;
          this.timer = 0;
        }
      }
      if (this.con === 1) {
        let aa = 1;
        this.pipiscount += 1;
        const pc = this.pipiscount;
        if (pc === 3 || pc === 5 || pc === 9) aa = 0;
        if (pc === 0 || pc === 4 || pc === 8 || pc === 11) aa = 1;
        const eggs = instance_number('obj_pipis_egg_bullet');
        if (sneo()?.difficulty === 0) {
          let rand = 0.8;
          if (global.turntimer > 380) rand = 0.5;
          let rr = 0;
          if (eggs < 2 && global.turntimer < 250) rr = 1;
          if (eggs < 3 && this.pipiscount < this.maxpipis) {
            const bul = this.egg(xx, yy);
            if (aa === 1) {
              bul.gravity = 0.5 + random(10) / 100;
              bul.vspeed = -14;
              bul.hspeed = -1.55 - rr - random(rand);
            } else {
              bul.gravity = 0.063 + random(4) / 100;
              bul.vspeed = -4.25;
              bul.hspeed = -4;
              bul.directhit = 1;
            }
          }
        } else {
          let rr = 0;
          if (eggs < 2 && global.turntimer < 250) rr = 1;
          if (eggs < 3) {
            if (aa === 1) {
              for (let k = 0; k < 2; k++) {
                const bul = this.egg(xx, yy);
                bul.gravity = 0.5 + random(10) / 100;
                bul.vspeed = -14;
                bul.hspeed = -1.55 - rr - random(0.8);
              }
            } else {
              let bul = this.egg(xx, yy);
              bul.gravity = 0.063 + random(4) / 100;
              bul.vspeed = -4.25;
              bul.hspeed = -4;
              bul.directhit = 1;
              bul = this.egg(xx, yy);
              bul.gravity = 0.5 + random(10) / 100;
              bul.vspeed = -14;
              bul.hspeed = -1.4 - random(0.4);
            }
          }
        }
        this.sprite_index = 'spr_sneo_arml';
        this.angle_final = -180 + random(50);
        for (let k = 0; k < 3; k++) {
          const sm = instance_create(xx + 5 + lengthdir_x(50, this.image_angle + 270), yy + lengthdir_y(50, this.image_angle + 270), 'obj_sneo_armcannon_smoke');
          sm.depth = this.depth - 2;
        }
        this.con = 2;
      }
      const r = instance_number('obj_pipis_egg_bullet') < 1 ? 3 : 1;
      for (let k = 0; k < r; k++) {
        if (this.con !== 2) continue;
        this.timer += 1;
        const tv = this.timervariance;
        if (this.timer < 11) this.image_angle = lerp(this.image_angle, this.angle_final, this.timer / 10);
        if (this.timer < tv - 15 && this.eggcount > 0.4) this.image_xscale = lerp(1.8, 2.5, this.timer / (tv - 15));
        if (this.timer === tv - 15 && this.eggcount > 0.4 && this.pipiscount < this.maxpipis) {
          this.sprite_index = 'spr_sneo_arml_egg';
          this.image_xscale = 2;
        }
        if (this.timer >= tv) {
          this.eggcount -= 0.4;
          this.timervariance = 30 + irandom(15);
          if (this.eggcount > 0) {
            this.con = 0;
            this.timer = 0;
            continue;
          }
          instance_destroy(this);
        }
      }
    }
    draw_sprite_ext('spr_sneo_wingl', 0, xx, yy + 20, 2, 2, 20, 0xffffff, 1);
    draw_sprite_ext(this.sprite_index, 1, xx, yy + 11 + shake / 2, this.image_xscale, 2, this.image_angle + shake, 0xffffff, 1);
    draw_sprite_ext('spr_sneo_body', 0, xx, yy + 20, 2, 2, 0, 0xffffff, 1);
    draw_sprite_ext('spr_sneo_head', 1, xx + 26, yy, 2, 2, 0, 0xffffff, 1);
    if (this.pipiscount >= this.maxpipis && global.turntimer > 10 && !instance_exists('obj_pipis_egg_bullet')) global.turntimer = 10;
    if (global.turntimer < 1) instance_destroy(this);
  }
}
defineObject('obj_pipis_controller', PipisController);

// obj_pipis_wall: the green line under the box (the eggs bounce on the box floor).
class PipisWall extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_pipis_wall';
  }
  create() {
    this.image_alpha = 0;
    this.image_blend = bgr(65280);
    this.image_xscale = 1;
    this.con = 0;
    this.timer = 0;
    this.type = 0;
    this.siner = random(100);
  }
  step() {
    if (this.con === 0 && this.image_alpha < 1) this.image_alpha += 0.1;
    if (this.con === 1) {
      if (this.image_alpha > 0) this.image_alpha -= 0.1;
      else { instance_destroy(this); return; }
    }
    if (this.type === 1) {
      this.siner += 0.5;
      this.x = this.xstart + Math.sin(this.siner / 6) * 48;
    }
    if (global.turntimer < 1) instance_destroy(this);
  }
}
defineObject('obj_pipis_wall', PipisWall);

// obj_pipis_egg_bullet: shoot it three times (one BIG SHOT) to break it; if it reaches the box it
// bursts into ten little heads aimed at the SOUL.
class PipisEggBullet extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_pipis_egg';
  }
  create() {
    scr_bullet_init(this);
    Object.assign(this, {
      hp: 3, con: 0, timer: 0, type: 0, shake: 0, parent: -1, image_speed: 0, image_xscale: 2, image_yscale: 2,
      image_angle: random(360), target: 0, damage: 1, directhit: 0, element: 6, bluesiner: 0, hitstun: 0,
      hitstunenabled: 0, bouncespeed: -5 - random(3), drawlabel: 0, grazepoints: 2,
    });
    this.image_blend2 = merge_color(BLUE, CYAN, 0.25 + Math.sin(this.bluesiner / 3) * 0.25);
  }
  alarm0() {}
  collision_obj_yheart_shot(shot) {
    this.shake = 8;
    this.hp -= shot.damage;
    if (this.image_index < 3) this.image_index += 1;
    snd_play('snd_damage');
    if (shot.big == 0) shot.user0();
    if (this.hp < 1) {
      const fx = instance_create(this.x, this.y, 'obj_pipis_destroy_fx');
      fx.image_xscale = 1.5;
      fx.image_yscale = 1.5;
      for (let k = 0; k < 3; k++) {
        const p = instance_create(this.x, this.y, 'obj_pipis_egg_bullet_piece');
        p.image_xscale = 2;
        p.image_yscale = 2;
      }
      instance_destroy(this);
      S.scr_tensionheal(sneo()?.difficulty === 1 ? 2 : 3);
    } else {
      const p = instance_create(this.x, this.y, 'obj_pipis_egg_bullet_piece');
      p.image_index = this.image_index;
      if (this.x < camerax() + 500) this.hspeed /= 1.05;
    }
  }
  // Other_10: bursts (type 2: ten heads; type 3: ten cones).
  user0() {
    const fx = instance_create(this.x, this.y, 'obj_pipis_destroy_fx');
    fx.image_xscale = 1.5;
    fx.image_yscale = 1.5;
    if (this.type === 2 || this.type === 3) {
      const h = first('obj_heart');
      const dir = h ? point_direction(this.x, this.y, h.x + 10, h.y + 10) : 180;
      for (let i = 0; i < 10; i++) {
        const hed = instance_create(this.x, this.y, 'obj_pipis_bullet_cone');
        hed.direction = this.type === 2 ? dir - 25 + random(50) : dir - 20 + random(40);
        hed.speed = 15 + random(5);
        hed.depth = this.depth - 100;
        if (this.type === 2) {
          hed.sprite_index = 'spr_sneo_crew';
          hed.image_xscale = 0.5;
          hed.image_yscale = 0.5;
        }
        hed.target = this.target;
        hed.damage = this.damage;
        hed.grazed = 0;
        hed.element = 6;
      }
    }
    for (let k = 0; k < 3; k++) {
      const p = instance_create(this.x, this.y, 'obj_pipis_egg_bullet_piece');
      p.image_index = random(3);
      p.image_xscale = 2;
      p.image_yscale = 2;
      p.direction = 45 + random(90);
    }
    instance_destroy(this);
  }
  draw() {
    const g = first('obj_growtangle');
    if (this.drawlabel === 1) {
      draw_sprite_ext('spr_pipissign', global.lang === 'ja' ? 1 : 0, this.x - 4 + random_range(0, 1), this.y + this.sprite_height / 2 + 12 + random_range(0, 1), 1, 1, 0, 0xffffff, 1);
    }
    if (g) {
      const right = g.x + g.sprite_width / 2, top = g.y - g.sprite_height / 2, gh = g.sprite_height;
      if (this.type === 3) {
        if (this.x < right + 10 && this.y > top + 10) { this.user0(); snd_play('snd_bomb'); }
        if (this.y > g.y - 20 + gh) { this.user0(); snd_play('snd_bomb'); }
        this.image_angle += 10;
      } else if (this.type === 2) {
        this.image_angle += 45;
        if (this.con === 0 && this.y > g.y - 20 + gh / 2 && this.vspeed > 0) this.con = 1;
        if (this.con === 1) {
          snd_play('snd_bump');
          this.image_angle = -30 - random(30);
          this.gravity = 0.24;
          this.vspeed = this.bouncespeed;
          this.con = 2;
          this.alarm[0] = 10;
        }
        if (this.x < right + 10 && this.y > top + 10) { this.user0(); snd_play('snd_bomb'); }
        if (this.y > g.y - 20 + gh / 2 && this.vspeed > 0 && this.con === 2 && this.alarm[0] < 1) this.con = 1;
      } else {
        this.image_angle += 4;
        if (this.gravity_direction === 180 && this.x < right + 10) { this.user0(); snd_play('snd_bomb'); }
      }
    }
    let xs = 0, ys = 0;
    if (this.shake > 0) {
      this.shake -= 1;
      xs = 4 - random(8);
      ys = 4 - random(8);
    }
    draw_sprite_ext(this.sprite_index, this.image_index, this.x + xs, this.y + ys, this.image_xscale, this.image_yscale, this.image_angle, 0xffffff, this.image_alpha);
    if (this.type === 2 && g) {
      const top = g.y - g.sprite_height / 2;
      if ((this.con === 2 && this.y < top && this.x < g.x + g.sprite_width / 2 + 80) || (this.directhit === 1 && this.y < top)) this.gravity += 0.01;
    }
  }
}
defineObject('obj_pipis_egg_bullet', PipisEggBullet);

// obj_pipis_bullet_cone: the little heads from a burst egg (shots go through them).
class PipisBulletCone extends CollideBullet {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_crew';
  }
  create() {
    scr_bullet_init(this);
    Object.assign(this, {
      element: 6, timer: 0, con: 0, type: 0, target: 0, damage: 1, hp: 0.5, image_xscale: 0.4, image_yscale: 0.4,
      length: 0, place: 0, parent: -1, grazepoints: 1,
    });
  }
  step() { if (this.hp === 0) this.user1(); }
  user1() {
    snd_play_pitch('snd_bomb', 1.1 + random(0.2));
    scr_afterimage_cut(this);
    instance_destroy(this);
  }
}
defineObject('obj_pipis_bullet_cone', PipisBulletCone);

class PipisEggPiece extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_pipis_egg_piece';
  }
  create() {
    this.timer = 0;
    this.con = 0;
    this.grav = 0;
    this.image_angle = random(360);
    this.direction = random(360);
    this.speed = 3 + random(7);
    this.image_alpha = 2.9;
    const h = first('obj_heart');
    if (h) this.depth = h.depth - 100;
    else instance_destroy(this);
  }
  step() {
    this.image_alpha -= 0.1;
    this.grav += 0.3;
    this.y += this.grav;
    if (this.y > cameray() + 480 + 10 || global.turntimer < 1) instance_destroy(this);
  }
}
defineObject('obj_pipis_egg_bullet_piece', PipisEggPiece);

class PipisDestroyFx extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_boxing_crescent';
  }
  create() { this.image_speed = 0.25; }
  step() { if (global.turntimer < 1) instance_destroy(this); }
  animationEnd() { instance_destroy(this); }
}
defineObject('obj_pipis_destroy_fx', PipisDestroyFx);

class ArmcannonSmoke extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_boxing_smoke';
  }
  create() {
    this.image_xscale = 1;
    this.image_yscale = 1;
    this.speed = 4;
    this.friction = 0.2;
    this.direction = 70 + random(80);
    this.image_speed = 0;
    this.image_angle = 70 + random(80);
    this.timer = 0;
  }
  step() {
    this.image_alpha -= 0.05;
    if (this.image_alpha < 0 || global.turntimer < 1) instance_destroy(this);
  }
}
defineObject('obj_sneo_armcannon_smoke', ArmcannonSmoke);

// Difficulty 3 ("IT'S FOR ME!?"): a stream of little heads bursting from his head (harmless).
class PhonecallPipisStream extends CollideBullet {
  create() { this.timer = 0; }
  step() {
    const part = instance_create(this.x - 4 + random(8), this.y - 4 + random(8), 'obj_sneo_phonecall_sneohead');
    part.direction = -5 + random(38);
    part.speed = 7 + random(13);
    part.image_angle = this.direction - 180;
  }
}
defineObject('obj_sneo_phonecall_pipis_stream', PhonecallPipisStream);

class PhonecallSneohead extends Instance {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_crew';
  }
  create() {
    this.image_xscale = 0.5;
    this.image_yscale = -0.5;
    this.timer = 0;
    this.con = 0;
    this.homingfactor = 0;
    this.maxhomingfactor = 2;
  }
  step() {
    if (global.turntimer < 3) { instance_destroy(this); return; }
    this.image_angle = this.direction - 180;
    this.timer += 1;
    if (this.timer >= 4 + irandom(1)) {
      instance_destroy(this);
      const fx = instance_create(this.x, this.y, 'obj_pipis_destroy_fx');
      fx.image_xscale = 2;
      fx.image_yscale = 2;
      fx.image_speed = 1;
      snd_play('snd_rocket_sneo');
      snd_volume('snd_rocket_sneo', 0.1, 0);
      const s = sneo();
      if (s) {
        s.partx[5] = random(8);
        s.party[5] = random(8);
      }
    }
  }
}
defineObject('obj_sneo_phonecall_sneohead', PhonecallSneohead);

// ---------------------------------------------------------------- PHONE HANDS

// obj_sneo_bulletcontroller type 8.5: he fades out; the phone-hands head comes in at btimer 115
// (btimer starts at 99). His wires fade with him (enemy.js draws them at his image_alpha).
SneoBulletController.prototype.type8_5 = function () {
  const s = this.sneo;
  if (this.init === 1) {
    this.init = 2;
    this.made = 60;
  }
  if (this.btimer >= 1) {
    if (alive(s) && global.turntimer > 11 && s.image_alpha > -0.2) s.image_alpha -= 0.2;
    if (this.btimer === 115) {
      const g = first('obj_growtangle');
      if (g) {
        const d = instance_create(g.x + 40 + g.sprite_width / 2, g.y, 'obj_sneo_phonehand_master');
        d.target = this.target;
      }
    }
  }
};

// obj_sneo_phonehand_master: his head between two phone hands. Shots push it back; it pushes the
// SOUL left and fires spread shots (difficulty 2: plain shots while the hands strafe).
class PhonehandMaster extends BasicBulletSneo {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_head_sad';
  }
  create() {
    super.create();
    this.destroyonhit = 0;
    this.image_speed = 0;
    this.image_xscale = 2;
    this.image_yscale = 2;
    this.siner = 0;
    this.element = 6;
    this.xdist = 70;
    const bc = first('obj_sneo_bulletcontroller');
    const hand = (dy, orientation) => {
      const p = instance_create(this.x - this.xdist, this.y + dy, 'obj_sneo_phonehand');
      p.orientation = orientation;
      p.boss = this;
      p.target = bc ? bc.target : this.target;
      return p;
    };
    this.phonehand_top = hand(-70, 'top');
    this.phonehand_bottom = hand(60, 'bottom');
    this.movedx = 0;
    this.hp = 200;
    this.difficulty = sneo()?.difficulty ?? 0;
    this.btimer = 0;
    this.init = 0;
    this.visibiliytimer = 0;
    this.image_alpha = 0;
    this.bluesiner = 0;
    this.image_blend = merge_color(BLUE, CYAN, 0.25 + Math.sin(this.bluesiner / 3) * 0.25);
  }
  alarm0() { this.sprite_index = 'spr_sneo_head'; }
  step() {
    this.siner += 1;
    this.bluesiner += 1;
    this.image_blend = merge_color(BLUE, CYAN, 0.25 + Math.sin(this.bluesiner / 3) * 0.25);
    if (this.x >= camerax() + 480) this.x = camerax() + 480;
    if (this.grazed == 1) {
      this.grazetimer += 1;
      if (this.grazetimer >= 3) {
        this.grazetimer = 0;
        this.grazed = 0;
      }
    }
    const h = first('obj_heart'), m = first('obj_sneo_phonehand_master');
    if (h && m && h.x > m.x - 36) h.x = m.x - 36;
    const d = this.difficulty;
    if (this.init === 0) {
      if (d === 2) for (const p of instancesOf('obj_sneo_phonehand')) p.alt = 1;
      this.phonehand_top.target = this.target;
      this.phonehand_bottom.target = this.target;
      this.init = 1;
    }
    if (d === 0) this.y = this.ystart + Math.sin(this.siner / 8) * 40;
    if (d === 1 || d === 2) this.y = this.ystart + Math.sin(this.siner / 10) * 60;
    if (alive(this.phonehand_top)) {
      if (d < 2) this.x = lerp(this.x, this.phonehand_top.x + this.xdist, 0.2);
      else this.x -= 1;
    }
    if (d === 0 || d === 1 || d === 2) {
      this.btimer += 1;
      let threshold = 20;
      if (d === 1) threshold = 15;
      if (d === 2) threshold = 30;
      if (this.btimer >= threshold && this.image_alpha >= 1) {
        this.btimer = 0;
        const shot = instance_create(this.x, this.y, d < 2 ? 'obj_sneo_mmx_spreadshot' : 'obj_basicbullet_sneo');
        shot.speed = 12;
        shot.image_xscale = 3;
        shot.image_yscale = 3;
        if (d < 2) shot.friction = 1;
        else shot.speed = 10;
        shot.alarm[0] = 25;
        shot.direction = 180 + random_range(-5, 5);
        shot.depth = this.depth - 1;
        shot.target = this.target;
        this.sprite_index = 'spr_sneo_head_open';
        this.alarm[0] = 10;
      }
    }
  }
  collision_obj_yheart_shot(shot) {
    this.hp -= 1;
    if (this.x <= camerax() + 480) {
      this.friction = 0.5;
      this.hspeed += shot.big == 1 ? 8 : 4;
      const rembig = shot.big;
      for (const p of instancesOf('obj_sneo_phonehand')) {
        p.friction = 0.5;
        p.hspeed += 2;
        if (rembig) p.hspeed += 4;
      }
    }
    snd_play('snd_damage');
    if (this.x >= camerax() + 480) this.x = camerax() + 480;
    shot.user0();
  }
  draw() {
    this.visibiliytimer += 1;
    if (this.visibiliytimer < 2) return;
    if (this.image_alpha < 1) this.image_alpha += 0.1;
    draw_set_alpha(this.image_alpha);
    draw_self(this);
    draw_set_alpha(1);
  }
}
defineObject('obj_sneo_phonehand_master', PhonehandMaster);

// obj_sneo_phonehand: crawls left on its arm (difficulties 0/1) or strafes along the box edge
// firing sound waves at the SOUL (difficulty 2, alt = 1).
class Phonehand extends BasicBulletSneo {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_phonehand';
  }
  create() {
    super.create();
    Object.assign(this, {
      destroyonhit: 0, siner: 0, crawlsiner: 0, jointx: 999, jointy: 999, remjointy: 999, boss: null, element: 6,
      amplitude: 4, period: 5, orientation: 'top', init: 0, difficulty: 0, btimer: 0, moving: 0, wasmoving: 0, alt: 0,
      visibiliytimer: 0, image_alpha: 0,
    });
  }
  step() {
    const boss = alive(this.boss) ? this.boss : null;
    if (this.init === 0 && boss) {
      if (this.orientation === 'top') {
        this.jointx = boss.x - 10;
        this.jointy = this.y - 30;
      }
      if (this.orientation === 'bottom') {
        this.image_yscale = -1;
        this.jointx = boss.x - 10;
        this.jointy = this.y + 30;
      }
      this.remjointy = this.jointy;
      this.init = 1;
    }
    if (this.btimer === 13) {
      if (this.image_yscale > 0) this.image_yscale = 2;
      if (this.image_yscale < 0) this.image_yscale = -2;
    }
    if (this.image_yscale > 1) this.image_yscale -= 0.2;
    if (this.image_yscale < -1) this.image_yscale += 0.2;
    this.movingcheck = 0;
    if (this.alt === 0) {
      this.crawlsiner += 1;
      const a = this.crawlsiner / this.period, amp = this.amplitude;
      if (this.orientation === 'top' && Math.sin(a) < 0) {
        this.wasmoving = 1;
        this.movingcheck = 1;
        this.y += Math.cos(a) * amp * 2;
        this.x += Math.sin(a) * amp;
      }
      if (this.orientation === 'bottom' && Math.cos(a + Math.PI / 2) < 0) {
        this.wasmoving = 1;
        this.movingcheck = 1;
        this.y += Math.sin(a + Math.PI / 2) * amp * 2;
        this.x += Math.cos(a + Math.PI / 2) * amp;
      }
      if (boss) {
        this.jointx = (this.x + boss.x) / 2;
        this.jointy = (this.remjointy + this.y) / 2;
      }
    }
    if (this.alt === 1 && boss) {
      this.crawlsiner += this.orientation === 'top' ? 1 : -1;
      const xx = camerax() + 200, endx = boss.x - 20;
      this.x = xx + (endx - xx) / 2 + Math.sin(this.crawlsiner / 12) * ((endx - xx) / 2);
      this.btimer += 1;
      const threshold = this.orientation === 'top' ? 28 : 18;
      if (this.btimer >= threshold) {
        const shot = instance_create(this.x, this.y, 'obj_basicbullet_sneo');
        if (this.orientation === 'top') shot.direction = 270 + random_range(-2, 2);
        if (this.orientation === 'bottom') shot.direction = 90 + random_range(-2, 2);
        shot.speed = 3;
        shot.sprite_index = 'spr_sneo_soundbullet';
        shot.image_angle = shot.direction;
        shot.grazepoints = 3;
        shot.target = this.target;
        this.btimer = this.orientation === 'top' ? 10 : 0;
      }
      this.jointx = (this.x + boss.x) / 2;
      this.jointy = (this.remjointy + this.y) / 2;
    }
    // difficulty 99 (debug) is not ported.
  }
  draw() {
    this.visibiliytimer += 1;
    if (this.visibiliytimer < 2) return;
    if (this.image_alpha < 1) this.image_alpha += 0.1;
    draw_set_alpha(this.image_alpha);
    draw_set_color(bgr(32768));
    draw_line_width(this.x, this.y, this.jointx, this.jointy, 4);
    const boss = this.boss;
    if (alive(boss)) {
      draw_line_width(this.jointx, this.jointy, boss.x, boss.y, 4);
      for (let i = 0; i < 4; i++) {
        draw_sprite_ext('spr_sneo_bullet0', 0, lerp(this.x, this.jointx, i / 4), lerp(this.y, this.jointy, i / 4), 2, 2, 0, bgr(32768), 1);
        draw_sprite_ext('spr_sneo_bullet0', 0, lerp(this.jointx, boss.x, i / 4), lerp(this.jointy, boss.y, i / 4), 2, 2, 0, bgr(32768), 1);
      }
    }
    draw_self(this);
    draw_set_alpha(1);
  }
}
defineObject('obj_sneo_phonehand', Phonehand);

// obj_sneo_mmx_spreadshot: flies out, slows, flashes twice and splits into three sound waves.
class MmxSpreadshot extends BasicBulletSneo {
  constructor() {
    super();
    this.sprite_index = 'spr_sneo_bullet0';
  }
  create() {
    super.create();
    Object.assign(this, { element: 6, flashtimer: 0, grazed: 0, grazepoints: 2, timepoints: 1, target: -1, grazetimer: 0, dont: 1, inv: 120 });
  }
  step() {
    if (this.x >= room_width + 100 || this.x <= -100 || this.y >= room_height + 100 || this.y <= -100) { instance_destroy(this); return; }
    this.direction += this.angle_speed;
    this.image_angle = this.direction;
    if (this.alarm[0] === 8 || this.alarm[0] === 16) this.flashtimer = 5;
  }
  alarm0() {
    const m = first('obj_sneo_phonehand_master');
    for (let i = 0; i < 3; i++) {
      const shot = instance_create(this.x, this.y, 'obj_regularbullet');
      if (shot.alive) {
        shot.direction = 120 + i * 60;
        shot.speed = 2;
        shot.friction = -0.6;
        shot.sprite_index = 'spr_sneo_soundbullet';
        shot.image_angle = shot.direction;
        shot.depth = (m ? m.depth : this.depth) - 1;
        shot.grazepoints = 7;
        shot.element = 6;
      }
      scr_bullet_inherit(this, shot);
    }
    instance_destroy(this);
  }
  draw() {
    draw_self(this);
    if (this.flashtimer > 0) this.flashtimer -= 1;
    d3d_set_fog(true, bgr(65535));
    draw_sprite_ext(this.sprite_index, this.image_index, this.x - 2, this.y - 2, this.image_xscale, this.image_yscale, 0, bgr(65535), this.flashtimer / 5);
    d3d_set_fog(false);
  }
}
defineObject('obj_sneo_mmx_spreadshot', MmxSpreadshot);
