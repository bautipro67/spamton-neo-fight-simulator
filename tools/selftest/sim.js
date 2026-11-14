// What the self test plays in the Spamton NEO simulator (see tools/selftest/runner.js for the
// helpers). Each scenario: name, settings (G.settings while it runs), start(ctx), until(ctx) (its
// end; none for the sandbox runs, which only have to run without errors), frames (the most it may
// take), and optionally status(ctx) (shown when it does not end), input(ctx, frame) (returns true
// when it played the frame itself) and menu(ctx) (the battle menu option to take instead of FIGHT)
// and sounds (fails if nothing was heard). shared() adds the scenarios every simulator has.
export const title = 'Spamton NEO Fight Simulator';

// The scene before the normal fight needs a player: walk left to meet him, then shoot the
// [Attention Customers] heads with a charged BIG SHOT.
function preSceneInput({ first, has, gm, tick, KEY }) {
  const pre = first('obj_ch2_sceneex2_pre');
  if (pre && pre.con === 1) {
    tick(1, [KEY.left]);
    return true;
  }
  const sp = first('obj_ch2_sceneex2_special');
  if (sp && sp.con >= 19 && sp.con < 30 && has(/obj_sneo_lilguy/)) {
    gm.virtualKey(KEY.z, true);
    tick(26);
    gm.virtualKey(KEY.z, false);
    tick(20);
    return true;
  }
  return false;
}

export function scenarios({ S, sandbox, has, first, shared }) {
  const ending = () => has(/^obj_sim_ending$/);
  // The Weird Route ends only after Kris calls for help (the one ACT left once his HP is low).
  const callForHelp = () => (first('obj_spamton_neo_enemy')?.savemeactcon > 0 ? 1 : 0);
  const list = [
    { name: 'story: the scene before the fight, the whole fight, the scene after it and the end', settings: { scenes: true, intro: true },
      start: () => S.startSneoFight({ weird: false }), input: preSceneInput, until: ending, end: 'the result screen', frames: 60000, sounds: true },
    { name: 'the whole fight with SCENES off', settings: { scenes: false, intro: true },
      start: () => S.startSneoFight({ weird: false }), until: ending, end: 'the result screen', frames: 50000, sounds: true },
    { name: 'Weird Route story: the Dark Fountain scene, the fight and its end', settings: { scenes: true, intro: true },
      start: () => S.startSneoFight({ weird: true }), menu: callForHelp, until: ending, end: 'the result screen', frames: 60000, sounds: true },
    { name: 'the Weird Route fight with SCENES off', settings: { scenes: false, intro: true },
      start: () => S.startSneoFight({ weird: true }), menu: callForHelp, until: ending, end: 'the result screen', frames: 50000, sounds: true },
    { name: 'practice mode, every attack in order', start: () => sandbox.startPractice({ start: 0, hp: 90 }),
      until: ctx => ctx.practiceDone(), status: ctx => ctx.practiceStatus(), end: 'the practice results', frames: 40000 },
    ...shared(),
  ];
  sandbox.ATTACKS.forEach((a, i) => list.push({
    name: `sandbox ${i}: ${a[2]}`, sandbox: true, frames: 1500,
    start: () => sandbox.startSandbox(new URLSearchParams('attack=' + i)),
  }));
  return list;
}
