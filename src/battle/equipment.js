// Chapter 2 equipment and items (from scr_weaponinfo / scr_armorinfo / scr_iteminfo) and the
// player's chosen loadout, remembered in the browser. The EQUIPMENT screen edits it and
// init_battle_globals applies it to every fight and practice run.

// id -> [name, at, df, mag, who can use it (char ids: 1 Kris, 2 Susie, 3 Ralsei), ability]
// Graze effects stack per armor worn across the party (obj_grazebox Create).
export const WEAPONS = {
  1: ['Wood Blade', 0, 0, 0, [1], ''],
  3: ['Red Scarf', 0, 0, 0, [3], ''],
  4: ['EverybodyWeapon', 12, 6, 8, [1, 2, 3], ''],
  5: ['Spookysword', 2, 0, 0, [1], 'Spookiness UP'],
  6: ['Brave Ax', 2, 0, 0, [2], 'Guts Up'],
  7: ['Devilsknife', 5, 0, 4, [2], 'Buster TP DOWN'],
  8: ['Trefoil', 4, 0, 0, [1], 'Money Earned UP'],
  9: ['Ragger', 2, 0, 0, [3], ''],
  10: ['DaintyScarf', 0, 0, 2, [3], 'Fluffiness UP'],
  11: ['TwistedSwd', 16, 0, 0, [1], 'Trance'],
  14: ['BounceBlade', 2, 1, 0, [1], 'Defense'],
  15: ['CheerScarf', 1, 0, 2, [3], 'Smiley'],
  16: ['MechaSaber', 4, 0, 0, [1], 'Annoying'],
  17: ['AutoAxe', 4, 0, 0, [2], 'BadIdea'],
  18: ['FiberScarf', 2, 0, 2, [3], ''],
  19: ['Ragger2', 5, 0, -1, [3], 'Prickly'],
  21: ['PuppetScarf', 10, 0, -6, [3], ''],
};
// Unlocked with the code TOO HARD (the Codes box on the page). Anyone can use it, but only one
// party member can hold it at a time. Chapter 2 balance: about twice the best real weapon
// (TwistedSwd AT 16), like the Chapter 3 version was against Chapter 3 gear.
export const CODE_WEAPON = 99;
WEAPONS[CODE_WEAPON] = ['TooHardSword', 30, 6, 12, [1, 2, 3], 'Too hard! One holder at a time'];
const ALL = [1, 2, 3], KR = [1, 3];
export const ARMORS = {
  0: ['(none)', 0, 0, 0, ALL, ''],
  1: ['Amber Card', 0, 1, 0, ALL, ''],
  2: ['Dice Brace', 0, 2, 0, ALL, ''],
  3: ['Pink Ribbon', 0, 1, 0, KR, 'Graze area +20%'],
  4: ['White Ribbon', 0, 2, 0, KR, 'Cuteness'],
  5: ['IronShackle', 1, 2, 0, ALL, ''],
  6: ['MouseToken', 0, 0, 2, ALL, ''],
  7: ['Jevilstail', 2, 2, 2, ALL, ''],
  8: ['Silver Card', 0, 2, 0, ALL, '$ +5%'],
  9: ['TwinRibbon', 0, 3, 0, KR, 'Graze area +25%'],
  10: ['GlowWrist', 0, 2, 0, ALL, ''],
  11: ['ChainMail', 0, 3, 0, ALL, ''],
  12: ['B.ShotBowtie', 0, 2, 1, ALL, ''],
  13: ['SpikeBand', 2, 1, 0, ALL, ''],
  14: ['Silver Watch', 0, 2, 0, ALL, 'Grazing shortens turns 10% more'],
  15: ['TensionBow', 0, 2, 0, ALL, 'Graze TP +10%'],
  17: ['DarkGoldBand', 0, 0, 0, [1], ''],
  18: ['SkyMantle', 0, 1, 0, ALL, 'Elec/Holy'],
  19: ['SpikeShackle', 3, 1, 0, ALL, 'Attack'],
  20: ['FrayedBowtie', 1, 1, 1, KR, ''],
  21: ['Dealmaker', 0, 5, 5, ALL, '$ +30%'],
  22: ['RoyalPin', 0, 3, 1, ALL, ''],
};
// scr_armorinfo element resistances: id -> [element, amount] (element 6 is Spamton NEO's bullets).
export const ARMOR_ELEMENTS = { 6: [7, 0.5], 16: [6, 0.35], 18: [1, 0.5], 20: [6, 0.15], 21: [6, 0.4] };
// Items usable in battle (src/battle/spells.js, controller.js): id -> [name, effect]
export const ITEMS = {
  0: ['(empty)', ''],
  1: ['Dark Candy', 'Heals 40 HP'],
  2: ['ReviveMint', 'Heals a downed ally'],
  5: ['BrokenCake', 'Heals 20 HP'],
  6: ['Top Cake', 'Heals team 160 HP'],
  7: ['Spincake', 'Heals team 150 HP'],
  8: ['Darkburger', 'Heals 70 HP'],
  9: ['LancerCookie', 'Heals 50 HP'],
  10: ['GigaSalad', 'Heals 4 HP'],
  11: ['ClubsSandwich', 'Heals team 70 HP'],
  12: ['HeartsDonut', 'Healing varies'],
  13: ['ChocDiamond', 'Healing varies'],
  14: ['Favwich', 'Heals ALL HP'],
  15: ['RouxlsRoux', 'Heals 50 HP'],
  16: ['CD Bagel', 'Heals 80 HP'],
  22: ['DD-Burger', 'Heals 60 HP'],
  23: ['LightCandy', 'Heals 120 HP'],
  24: ['ButJuice', 'Heals 100 HP'],
  25: ['SpagettiCode', 'Heals team 30 HP'],
  26: ['JavaCookie', 'Healing varies'],
  27: ['TensionBit', 'Raises TP 32%'],
  28: ['TensionGem', 'Raises TP 50%'],
  29: ['TensionMax', 'Raises TP to max'],
  30: ['ReviveDust', 'Revives team 25%'],
  31: ['ReviveBrite', 'Revives team 100%'],
};
export const ITEM_SLOTS = 12;
// The party owns one of each of these, so only one slot may hold it.
export const UNIQUE_ARMORS = [3, 9];
export const CHAR_NAMES = { 1: 'KRIS', 2: 'SUSIE', 3: 'RALSEI' };
// Stats at the end of Chapter 2 (scr_levelup caps: 160 / 190 / 140 HP; the values Chapter 3
// starts from in scr_gamestart_chapter_override): [hp, at, df, mag]
export const BASE_STATS = { 1: [160, 14, 2, 0], 2: [190, 18, 2, 2], 3: [140, 12, 2, 11] };

// What the party carries when they reach Spamton NEO (the gear Chapter 3 starts with:
// MechaSaber / AutoAxe / FiberScarf, Amber Card, GlowWrist) and a set of Chapter 2 shop items.
export const DEFAULT_LOADOUT = {
  gear: { 1: [16, 1, 10], 2: [17, 1, 10], 3: [18, 1, 10] },
  items: [16, 16, 8, 8, 11, 24, 25, 2, 30, 27, 0, 0],
};

const KEY = 'sneo-sim-loadout';
const clone = l => ({ gear: { 1: [...l.gear[1]], 2: [...l.gear[2]], 3: [...l.gear[3]] }, items: [...l.items] });
let loadout = null;

const usable = (table, id, c) => table[id] && table[id][4].includes(c);

const CODES_KEY = 'sneo-sim-codes';
let codes = null;
function unlockedCodes() {
  if (!codes) {
    try { codes = JSON.parse(localStorage.getItem(CODES_KEY) || '[]'); } catch (e) { codes = []; }
    if (!Array.isArray(codes)) codes = [];
  }
  return codes;
}
export const weaponUnlocked = id => id !== CODE_WEAPON || unlockedCodes().includes('TOOHARD');

// A code typed in the page's Codes box: { ok, msg } for the message under it.
export function redeemCode(text) {
  const code = String(text || '').toUpperCase().replace(/\s+/g, '');
  if (code !== 'TOOHARD') return { ok: false, msg: 'That code does nothing.' };
  if (!unlockedCodes().includes(code)) {
    codes.push(code);
    try { localStorage.setItem(CODES_KEY, JSON.stringify(codes)); } catch (e) { /* not saved */ }
  }
  return { ok: true, msg: 'TooHardSword unlocked! Equip it in EQUIPMENT on the title screen (one character at a time).' };
}

export function getLoadout() {
  if (!loadout) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* storage unavailable */ }
    loadout = clone(DEFAULT_LOADOUT);
    if (saved?.gear) {
      for (const c of [1, 2, 3]) {
        const [w, a1, a2] = saved.gear[c] || [];
        if (usable(WEAPONS, w, c) && weaponUnlocked(w)) loadout.gear[c][0] = w;
        if (usable(ARMORS, a1, c)) loadout.gear[c][1] = a1;
        if (usable(ARMORS, a2, c)) loadout.gear[c][2] = a2;
      }
    }
    // Older saves could repeat a one-of-a-kind armor: keep the first, empty the others.
    const worn = new Set();
    for (const c of [1, 2, 3]) {
      for (const slot of [1, 2]) {
        const id = loadout.gear[c][slot];
        if (!UNIQUE_ARMORS.includes(id)) continue;
        if (worn.has(id)) loadout.gear[c][slot] = 0;
        worn.add(id);
      }
    }
    let holder = false;
    for (const c of [1, 2, 3]) {
      if (loadout.gear[c][0] !== CODE_WEAPON) continue;
      if (holder) loadout.gear[c][0] = DEFAULT_LOADOUT.gear[c][0];
      holder = true;
    }
    if (Array.isArray(saved?.items)) {
      loadout.items = Array.from({ length: ITEM_SLOTS }, (_, i) => (ITEMS[saved.items[i]] ? saved.items[i] : 0));
    }
  }
  return loadout;
}

export function saveLoadout() {
  try { localStorage.setItem(KEY, JSON.stringify(loadout)); } catch (e) { /* not saved */ }
}

export function resetLoadout() {
  loadout = clone(DEFAULT_LOADOUT);
  saveLoadout();
}

// Options for a slot: the weapons or armors that character can use, or the items.
export const weaponChoices = c => Object.keys(WEAPONS).map(Number).filter(id => usable(WEAPONS, id, c) && weaponUnlocked(id)
  && !(id === CODE_WEAPON && [1, 2, 3].some(o => o !== c && getLoadout().gear[o][0] === id)));
export function armorChoices(c, slot) {
  const lo = getLoadout();
  const elsewhere = id => [1, 2, 3].some(o => [1, 2].some(s => (o !== c || s !== slot) && lo.gear[o][s] === id));
  return Object.keys(ARMORS).map(Number).filter(id => usable(ARMORS, id, c) && !(UNIQUE_ARMORS.includes(id) && elsewhere(id)));
}
export const itemChoices = () => Object.keys(ITEMS).map(Number);

// Total stats of a character with the current loadout: [hp, at, df, mag]
export function charStats(c) {
  const [hp, at, df, mag] = BASE_STATS[c];
  const [w, a1, a2] = getLoadout().gear[c];
  const parts = [WEAPONS[w], ARMORS[a1], ARMORS[a2]];
  return [hp, at + parts.reduce((s, p) => s + p[1], 0), df + parts.reduce((s, p) => s + p[2], 0), mag + parts.reduce((s, p) => s + p[3], 0)];
}
