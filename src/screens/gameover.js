// Game over after the Spamton NEO fight, as Chapter 2 plays it: obj_gameover_init (the SOUL breaks
// where it fell), then DEVICE_FAILURE: the GAME OVER logo (obj_gameoverbg), AUDIO_DEFEAT, Susie or
// Ralsei cheering Kris on, and CONTINUE / GIVE UP.
import {
  G, global, Instance, defineObject, defineScript, S, instance_create, instance_destroy, instance_exists,
  withObj, button1_p, left_p, right_p, button2_h, draw_self, draw_sprite_ext, draw_set_color,
  draw_set_alpha, draw_set_font, draw_rectangle, draw_text, string_width, random, choose,
} from '../runtime/gm.js?v=20261107050450';
import { snd_play, snd_free_all, snd_init, mus_loop, mus_volume, mus_stop } from '../runtime/audio.js?v=20261107050450';
import { gotoRoom } from './common.js?v=20261107050450';

// The battle as it looked when the party fell (sprite_create_from_surface).
class Screenshot extends Instance {
  create() { this.depth = 100; this.img = null; }
  draw() {
    if (this.img) G.ctx.drawImage(this.img, G.camX, G.camY);
  }
}
defineObject('obj_sim_screenshot', Screenshot);

class GameoverInit extends Instance {
  create() {
    this.depth = -40000;
    this.sprite_index = 'spr_heart';
    this.image_speed = 0;
    this.visible = false;
    this.bg = instance_create(0, 0, 'obj_sim_screenshot');
    this.timer = 0;
    this.Z_COUNT = 0;
  }
  step() {
    this.timer += 1;
    if (this.timer == 1) snd_free_all();
    if (this.timer == 30) {
      instance_destroy(this.bg);
      this.visible = true;
      this.x = global.heartx;
      this.y = global.hearty;
    }
    if (this.timer == 50) {
      snd_play('snd_break1');
      this.sprite_index = 'spr_heartbreak';
      this.x -= 2;
    }
    if (this.timer == 90) {
      snd_play('snd_break2');
      this.visible = false;
      for (const [dx, dy] of [[-2, 0], [0, 3], [2, 6], [8, 0], [10, 3], [12, 6]]) {
        const sh = instance_create(this.x + dx, this.y + dy, 'obj_marker');
        sh.direction = random(360);
        sh.speed = 7;
        sh.gravity_direction = 270;
        sh.gravity = 0.2;
        sh.sprite_index = 'spr_heartshards';
        sh.image_speed = 0.2;
      }
      if (global.tempflag[3] >= 1) this.timer += 15;
    }
    if (this.timer == 140) instance_create(0, 0, 'obj_fadeout');
    // Pressing CONFIRM four times while the SOUL breaks retries at once (scr_tempload), as in the game.
    if (this.timer >= 80 && this.timer < 150) {
      if (button1_p()) this.Z_COUNT += 1;
      if (this.Z_COUNT >= 4) {
        G.sneoGameovers = (G.sneoGameovers || 0) + 1;
        S.startSneoFight();
        return;
      }
    }
    if (this.timer == 150) S.startFailure();
  }
  draw() { draw_self(this); }
}
defineObject('obj_gameover_init', GameoverInit);

defineScript('startGameover', (p) => {
  gotoRoom({ heartx: p.x, hearty: p.y });
  global.tempflag = global.tempflag || new Array(100).fill(0);
  const go = instance_create(0, 0, 'obj_gameover_init');
  go.bg.img = p.shot;
});

// ---------------------------------------------------------------- DEVICE_FAILURE (320x240 room)

// The GAME OVER logo: fades in over 50 frames.
class GameoverBg extends Instance {
  create() {
    this.sprite_index = 'spr_gameoverbg_neo';
    this.image_alpha = 0;
    this.depth = 20; // under DEVICE_FAILURE's fade
  }
  step() { if (this.image_alpha < 1) this.image_alpha += 0.02; }
}
defineObject('obj_gameoverbg', GameoverBg);

class DeviceChoice extends Instance {
  create() {
    this.NAME = ['CONTINUE', 'GIVE UP'];
    this.NAMEX = [80, 190];
    this.NAMEY = [180, 180];
    this.CURX = 0; // CONTINUE preselected so one press retries (the game starts with neither)
    this.IDEALX = 150;
    this.IDEALY = 180;
    this.HEARTX = 150;
    this.HEARTY = 180;
    this.ONEBUFFER = 0;
    this.FINISH = 0;
    this.fadebuffer = 10;
    global.choice = -1;
  }
  step() {
    if (this.fadebuffer > 0) this.ONEBUFFER = 1;
    if (this.fadebuffer < 0 && this.FINISH == 0) {
      if (right_p()) this.CURX = 1;
      if (left_p()) this.CURX = 0;
    }
    if (this.CURX >= 0) {
      draw_set_font('fnt_main');
      this.IDEALX = this.NAMEX[this.CURX] + (string_width(this.NAME[this.CURX]) / 2 - 10);
      this.IDEALY = this.NAMEY[this.CURX];
    } else {
      this.IDEALX = 150;
      this.IDEALY = 180;
    }
    if (Math.abs(this.HEARTX - this.IDEALX) <= 2) this.HEARTX = this.IDEALX;
    if (Math.abs(this.HEARTY - this.IDEALY) <= 2) this.HEARTY = this.IDEALY;
    this.HEARTX += (this.IDEALX - this.HEARTX) * 0.3;
    this.HEARTY += (this.IDEALY - this.HEARTY) * 0.3;
    if (this.FINISH == 0 && button1_p() && this.CURX >= 0 && this.ONEBUFFER < 0) {
      global.choice = this.CURX;
      this.FINISH = 1;
      this.ONEBUFFER = 99;
    }
    this.ONEBUFFER -= 1;
    if (this.FINISH == 0) this.fadebuffer -= 1;
    if (this.FINISH == 1) {
      global.flag[20] = 1;
      if (this.fadebuffer < 0) this.fadebuffer = 0;
      this.fadebuffer += 1;
      if (this.fadebuffer >= 10) instance_destroy(this);
    }
  }
  draw() {
    draw_set_font('fnt_main');
    const xfade = Math.min(1, (10 - this.fadebuffer) / 10);
    draw_sprite_ext('IMAGE_SOUL_BLUR', 0, this.HEARTX, this.HEARTY, 1, 1, 0, 0xffffff, 0.6 * xfade);
    draw_set_alpha(xfade);
    for (let i = 0; i <= 1; i++) {
      draw_set_color(this.CURX == i ? 0xffff00 : 0xffffff);
      draw_text(this.NAMEX[i], this.NAMEY[i], this.NAME[i]);
    }
    draw_set_alpha(1);
  }
}
defineObject('DEVICE_CHOICE', DeviceChoice);

// DEVICE_FAILURE Step_0, Chapter 2: Susie (typer 61) or Ralsei (typer 60) speaks.
const VOICES = [
  [61, ['  Come on^1,&  that all you got!?/', '  Kris^1,&  get up...!/%']],
  [60, ['  This is not&  your fate...!/', "  Please^1,&  don't give up!/%"]],
];

class DeviceFailure extends Instance {
  create() {
    this.depth = 10;
    this.EVENT = 0;
    this.FADEFACTOR = 0;
    this.WHITEFADE = 0;
    this.FADEUP = 0;
    this.text_timer = 30;
    global.flag[20] = 0;
    global.flag[6] = 1;
    global.typer = 667;
    this.music = null;
    instance_create(0, 20, 'obj_gameoverbg');
    // Game overs this session: obj_spamton_neo_enemy reads them as global.tempflag[37].
    G.sneoGameovers = (G.sneoGameovers || 0) + 1;
  }
  alarm4() { this.EVENT += 1; }
  writer(x, y, lines, typer) {
    global.typer = typer;
    global.fc = 0;
    global.msg = new Array(100).fill('%%');
    lines.forEach((l, i) => { global.msg[i] = l; });
    return instance_create(x, y, 'obj_writer');
  }
  step() {
    if (this.EVENT == 1) {
      if (this.text_timer > 0) this.text_timer -= 1;
      else {
        this.EVENT = 3;
        this.alarm[4] = 30;
        this.music = snd_init('AUDIO_DEFEAT.ogg');
        mus_loop(this.music);
        // Nobody speaks when Kris fights alone (the Weird Route).
        if (global.char?.[1] || global.char?.[2]) {
          const [typer, lines] = VOICES[choose(0, 1)];
          this.writer(50, 150, lines, typer);
        }
      }
    }
    if (this.EVENT == 0) this.EVENT = 1;
    if (this.EVENT == 4 && !instance_exists('obj_writer')) {
      instance_create(100, 120, 'DEVICE_CHOICE');
      this.EVENT = 5;
    }
    if (this.EVENT == 5) {
      if (global.choice == 0) { withObj('obj_writer', w => instance_destroy(w)); this.EVENT = 6; }
      if (global.choice == 1) { withObj('obj_writer', w => instance_destroy(w)); this.EVENT = 26; }
    }
    if (this.EVENT == 6) {
      mus_stop(this.music);
      this.EVENT = 7;
      this.alarm[4] = 30;
    }
    if (this.EVENT == 8) {
      this.WHITEFADE = 1;
      this.FADEUP = 0.01;
      this.EVENT = 9;
      this.alarm[4] = 120;
      if (global.tempflag[3] >= 1) {
        this.FADEUP = 0.03;
        this.alarm[4] = 45;
      } else snd_play('snd_dtrans_lw');
      global.tempflag[3] += 1;
    }
    if (this.EVENT == 10) {
      this.EVENT = 11;
      S.startSneoFight();
      return;
    }
    // GIVE UP: the music fades and the closing screen says "THEN THE WORLD WAS COVERED IN DARKNESS."
    if (this.EVENT == 26) {
      mus_volume(this.music, 0, 30);
      this.FADEUP = 1 / 30;
      this.EVENT = 27;
      this.t = 0;
    }
    if (this.EVENT == 27 && ++this.t >= 35) {
      mus_stop(this.music);
      this.EVENT = 28;
      S.startEnding('lose');
      return;
    }
    // X speeds the text up (as in the game's DEVICE_FAILURE).
    if (this.EVENT <= 4 && button2_h()) {
      withObj('obj_writer', w => {
        if (w.pos < w.length - 3) w.pos += 2;
        if (w.specfade <= 0.9) w.specfade -= 0.1;
        if (w.rate <= 1) w.rate = 1;
      });
    }
  }
  draw() {
    draw_set_alpha(Math.min(1, this.FADEFACTOR));
    draw_set_color(this.WHITEFADE == 0 ? 0 : 0xffffff);
    draw_rectangle(-10, -10, 999, 999, false);
    draw_set_alpha(1);
    if (this.FADEUP > 0 && this.FADEFACTOR < 1) this.FADEFACTOR += this.FADEUP;
  }
}
defineObject('DEVICE_FAILURE', DeviceFailure);

defineScript('startFailure', () => {
  gotoRoom();
  G.viewScale = 2;
  global.tempflag = global.tempflag || new Array(100).fill(0);
  instance_create(0, 0, 'DEVICE_FAILURE');
});
