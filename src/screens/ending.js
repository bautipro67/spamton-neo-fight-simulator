// After the fight: a short closing text in the dark-world text box, then TRY AGAIN / TITLE.
// After a normal-route win the scenes (src/sneo/scenes.js) come first and this screen only offers the menu.
import {
  G, global, Instance, defineObject, defineScript, S, instance_create, instance_exists, draw_sprite_ext,
  draw_set_color, draw_set_font, draw_set_alpha, draw_rectangle,
} from '../runtime/gm.js?v=20261107140756';
import { snd_init, mus_loop_ext, mus_volume, mus_stop } from '../runtime/audio.js?v=20261107140756';
import { gotoRoom, scr_darkbox, fadeOut, centerText } from './common.js?v=20261107140756';

const BS = String.fromCharCode(92);
const LINES = {
  // HP or mercy: Spamton NEO flew off and the battle was won.
  win: {
    msg: ['* Spamton NEO flew away into the night sky./', '* The battle was won./%'],
    title: 'YOU WERE A BIG SHOT!',
    color: 0xffff00,
    knight: 'spr_sneo_example',
  },
  // The Weird Route fight: the cold came down on him in the dark.
  weird: {
    msg: ['* Spamton NEO was defeated./%'],
    title: 'WEIRD ROUTE CLEARED',
    color: 0x80ffff,
    knight: null,
  },
  // GIVE UP on the game over screen.
  lose: {
    msg: ['* THEN THE WORLD^5 WAS COVERED^5 IN DARKNESS./%'],
    title: 'SPAMTON NEO WON...',
    color: 0xffffff,
    knight: 'spr_sneo_example',
  },
};

class Ending extends Instance {
  create() {
    this.depth = 2;
    this.kind = 'win';
    this.con = 0;
    this.t = 0;
    this.writer = null;
    this.cur_jewel = 0;
    this.titlealpha = 0;
    this.music = snd_init('AUDIO_DRONE.ogg');
    mus_loop_ext(this.music, 0, 0.5);
    mus_volume(this.music, 1, 60);
  }
  say(lines) {
    global.fc = 0;
    global.typer = 6;
    global.msg = new Array(100).fill('%%');
    lines.forEach((s, i) => { global.msg[i] = s; });
    this.writer = instance_create(58, 340, 'obj_writer');
    this.writer.dialoguer = 1;
    this.face = instance_create(54, 344, 'obj_face');
    this.face.depth = 1;
  }
  step() {
    const d = LINES[this.kind];
    this.t += 1;
    if (this.con == 0 && this.t >= 45) {
      this.con = 1;
      if (!this.afterScene) this.say(d.msg);
    }
    if (this.con == 1 && !instance_exists(this.writer)) {
      this.con = 3;
      this.t = 0;
      global.fc = 0;
      const menu = instance_create(236, 360, 'obj_sim_heartmenu');
      menu.setup(['TRY AGAIN', 'TITLE'], (i) => {
        mus_volume(this.music, 0, 20);
        fadeOut(20, () => {
          mus_stop(this.music);
          if (i == 0) S.startSneoFight();
          else S.startTitle();
        });
      }, 'fnt_mainbig', 32);
    }
  }
  draw() {
    const d = LINES[this.kind];
    const a = this.con >= 3 ? 1 : Math.min(1, this.t / 30);
    const bob = Math.cos(this.t / 8) * 8;
    if (d.knight) draw_sprite_ext(d.knight, 0, 230, 70 + bob, 2, 2, 0, 0xffffff, a);
    if (this.con >= 1 && this.con <= 2) {
      draw_set_color(0);
      draw_rectangle(38, 326, 602, 464, false);
      scr_darkbox(this, 24, 312, 616, 478);
    }
    if (this.con >= 3) {
      this.titlealpha = Math.min(1, this.titlealpha + 0.05);
      draw_set_alpha(this.titlealpha);
      draw_set_font('fnt_mainbig');
      draw_set_color(d.color);
      centerText(320, 300, d.title);
      draw_set_alpha(1);
    }
  }
}
defineObject('obj_sim_ending', Ending);

// startEnding(kind, { afterScene }): after the scene in room_dw_mansion_b_east_a the closing text is
// left out (the scene has said it all).
defineScript('startEnding', (kind, opts = {}) => {
  // The Weird Route's own ending (src/sneo/scenes.js) comes first, unless the scenes are off.
  if (kind == 'weird' && !opts.afterScene && G.settings?.scenes !== false && 'startWeirdPostScene' in S) return S.startWeirdPostScene();
  gotoRoom();
  global.fighting = 0;
  const e = instance_create(0, 0, 'obj_sim_ending');
  e.kind = LINES[kind] ? kind : 'win';
  if (opts.afterScene) e.t = 44;
  e.afterScene = !!opts.afterScene;
});
