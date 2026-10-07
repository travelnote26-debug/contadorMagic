import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const sandbox = {
  localStorage: {
    _store: {},
    getItem(k) { return k in this._store ? this._store[k] : null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; }
  },
  navigator: { vibrate() {} },
  document: { addEventListener() {}, getElementById() { return null; } },
  window: { addEventListener() {} },
  performance,
  console,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {}
};
vm.createContext(sandbox);

function load(name) {
  return readFileSync(join(root, name), "utf8");
}

["js/state.js", "js/layout.js", "js/mana.js", "js/effects.js"].forEach((f) => {
  vm.runInContext(load(f), sandbox, { filename: f });
});

const run = (code) => vm.runInContext(code, sandbox);

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log("  ok - " + msg);
  } else {
    failed++;
    console.error("  FAIL - " + msg);
  }
}

function assertEq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log("  ok - " + msg);
  } else {
    failed++;
    console.error("  FAIL - " + msg + "\n    expected: " + JSON.stringify(expected) + "\n    actual:   " + JSON.stringify(actual));
  }
}

console.log("== createPlayers / colors ==");
assertEq(
  run("createPlayers(4, 21).map(p => [p.id, p.name, p.currentLife, p.color])"),
  [[1, "Jugador 1", 21, "WHITE"], [2, "Jugador 2", 21, "BLUE"], [3, "Jugador 3", 21, "BLACK"], [4, "Jugador 4", 21, "RED"]],
  "4 jugadores, 21 vidas, colores ciclicos"
);

console.log("== life update / undo / history ==");
run("state = { ...createInitialState(), players: createPlayers(4, 21) };");
run("updateLife(1, -3); updateLife(1, 2);");
assertEq(run("state.players[0].currentLife"), 20, "vida 21 -> 18 -> 20");
assertEq(run("state.history.length"), 2, "historial con 2 entradas");
run("undo();");
assertEq(run("state.players[0].currentLife"), 18, "undo vuelve a 18");
assertEq(run("state.history.length"), 1, "historial reduce a 1");

console.log("== historia limitada ==");
run("state = { ...createInitialState(), players: createPlayers(2, 20) };");
for (let i = 0; i < 30; i++) run("updateLife(1, 1);");
assertEq(run("state.history.length"), 20, "historial maximo 20");

console.log("== updateConfig no recrea jugadores ==");
run("updateConfig({ playerCount: 2 });");
assertEq(run("state.players.length"), 2, "cambio de config mantiene jugadores");

console.log("== resetGame ==");
run("state = { ...state, players: createPlayers(4, 20) }; resetGame();");
assertEq(run("state.players.every(p => p.currentLife === state.initialLife)"), true, "reset vuelve a vidas iniciales");
assertEq(run("state.startingPlayerId"), null, "reset limpia jugador inicial");
assertEq(run("state.history.length"), 0, "reset limpia historial");

console.log("== serializacion ==");
run("state = { ...createInitialState(), players: createPlayers(3, 21) };");
run("updateLife(2, -5); setStartingPlayer(2);");
function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a).sort();
    const bk = Object.keys(b).sort();
    if (ak.length !== bk.length) return false;
    return ak.every((k, i) => k === bk[i] && deepEqual(a[k], b[k]));
  }
  return false;
}

const roundtrip = run("JSON.stringify(deserialize(serialize(state)))");
const original = run("serialize(state)");
assert(deepEqual(JSON.parse(roundtrip), JSON.parse(original)), "serialize -> deserialize -> serialize es identico");
assertEq(run("JSON.parse(serialize(state)).startingPlayerId"), 2, "startingPlayerId serializado");

console.log("== persistencia (localStorage) ==");
run("persist(); state = createInitialState(); load();");
assertEq(run("state.players.length"), 3, "load() restaura partida guardada");
assertEq(run("state.players[1].currentLife"), 16, "load() restaura vidas");
assertEq(run("state.startingPlayerId"), 2, "load() restaura jugador inicial");

console.log("== presets de vida ==");
run("state = { ...createInitialState(), players: createPlayers(4, 21) };");
run("applyLifePreset(30);");
assertEq(run("state.initialLife"), 30, "preset 30 actualiza config");
assertEq(run("state.players.every(p => p.currentLife === 30)"), true, "preset 30 aplica ya las vidas");
assertEq(run("state.history.length"), 0, "preset limpia historial");
run("applyLifePreset(40);");
assertEq(run("state.players[0].currentLife"), 40, "preset 40 aplica ya las vidas");

console.log("== modo comandante ==");
run("setCommanderMode(true);");
assertEq(run("state.commanderMode"), true, "modo comandante activado");
assertEq(run("state.initialLife"), 40, "activar modo pone vidas a 40");
assertEq(run("state.players.every(p => p.currentLife === 40)"), true, "activar modo reinicia la partida");
run("setCommanderMode(false);");
assertEq(run("state.commanderMode"), false, "modo comandante desactivado");
assertEq(run("state.initialLife"), 40, "desactivar no toca las vidas");
run("setCommanderMode(true);");

console.log("== daño de comandante ==");
run("addCommanderDamage(1, 2, 5); addCommanderDamage(1, 3, 4);");
assertEq(run("state.players[0].cmdDamage[2]"), 5, "daño del rival 2");
assertEq(run("state.players[0].cmdDamage[3]"), 4, "daño del rival 3");
assertEq(run("maxCommanderDamage(state.players[0])"), 5, "peor daño de un solo rival");
run("addCommanderDamage(1, 2, 30);");
assertEq(run("state.players[0].cmdDamage[2]"), 21, "daño acotado a 21");
run("addCommanderDamage(1, 2, -100);");
assertEq(run("state.players[0].cmdDamage[2]"), 0, "daño acotado a 0");
run("addCommanderDamage(1, 3, 10); undo();");
assertEq(run("state.players[0].cmdDamage[3]"), 4, "undo revierte el ultimo daño");
run("resetGame();");
assertEq(run("Object.keys(state.players[0].cmdDamage).length"), 0, "reset limpia el daño");

console.log("== daño de comandante y vida ==");
assertEq(run("state.players[0].currentLife"), 40, "vida inicial 40");
run("addCommanderDamage(1, 2, 1);");
assertEq(run("state.players[0].currentLife"), 39, "victim pierde 1 vida al sumar daño");
assertEq(run("state.players[1].currentLife"), 40, "atacante no cambia de vida");
run("addCommanderDamage(1, 2, -1);");
assertEq(run("state.players[0].currentLife"), 40, "victim recupera vida al restar daño");
run("addCommanderDamage(1, 2, 21);");
assertEq(run("state.players[0].cmdDamage[2]"), 21, "daño llega a 21");
assertEq(run("state.players[0].currentLife"), 19, "21 de daño restan 21 vidas");
run("addCommanderDamage(1, 2, 5);");
assertEq(run("state.players[0].cmdDamage[2]"), 21, "sobre 21 no sube el daño");
assertEq(run("state.players[0].currentLife"), 19, "sobre 21 no toca la vida");
run("addCommanderDamage(1, 2, -21); undo();");
assertEq(run("state.players[0].cmdDamage[2]"), 21, "undo revierte el daño");
assertEq(run("state.players[0].currentLife"), 19, "undo revierte daño y vida en un paso");
run("addCommanderDamage(1, 2, -21);");
assertEq(run("state.players[0].currentLife"), 40, "quitar el daño devuelve las vidas");
run("addCommanderDamage(1, 2, 40); addCommanderDamage(1, 3, 19);");
assertEq(run("state.players[0].currentLife"), 0, "dos rivales bajan la vida a 0");
assertEq(run("isEliminated(state.players[0], state.poisonMode)"), true, "0 vidas -> eliminado");
run("resetGame();");
assertEq(run("state.players[0].currentLife"), 40, "reset devuelve las vidas");

console.log("== contador de veneno ==");
run("setPoisonMode(true);");
assertEq(run("state.poisonMode"), true, "modo veneno activado");
assertEq(run("state.initialLife"), 40, "activar veneno no toca las vidas");
assertEq(run("state.players.every(p => p.poison === 0)"), true, "veneno empieza a 0");
run("addPoison(2, 3);");
assertEq(run("state.players[1].poison"), 3, "veneno +3");
run("addPoison(2, 20);");
assertEq(run("state.players[1].poison"), 10, "veneno acotado a 10");
run("addPoison(2, -100);");
assertEq(run("state.players[1].poison"), 0, "veneno acotado a 0");
const poisonHistBefore = run("state.history.length");
run("addPoison(2, -1);");
assertEq(run("state.history.length"), poisonHistBefore, "un cambio nulo no ensucia el historial");
run("addPoison(2, 4); undo();");
assertEq(run("state.players[1].poison"), 0, "undo revierte el veneno");
run("setPoisonMode(false);");
assertEq(run("state.poisonMode"), false, "modo veneno desactivado");
run("setPoisonMode(true);");

console.log("== eliminado ==");
assertEq(run("isEliminated({ currentLife: 0, poison: 0 }, false)"), true, "0 vidas -> eliminado");
assertEq(run("isEliminated({ currentLife: 10, poison: 10 }, true)"), true, "10 venenos -> eliminado");
assertEq(run("isEliminated({ currentLife: 10, poison: 10 }, false)"), false, "10 venenos sin modo -> no eliminado");
assertEq(run("isEliminated({ currentLife: 10, poison: 9 }, true)"), false, "9 venenos -> no eliminado");
run("resetGame();");
assertEq(run("state.players[0].poison"), 0, "reset limpia el veneno");

console.log("== día y noche ==");
assertEq(run("state.dayNightEnabled"), false, "desactivado por defecto");
assertEq(run("state.isNight"), true, "por defecto es noche");
run("setDayNightMode(true);");
assertEq(run("state.dayNightEnabled"), true, "modo día/noche activado");
assertEq(run("state.isNight"), true, "sigue en noche al activar");
assertEq(run("state.initialLife"), 40, "activar día/noche no toca las vidas");
run("toggleDayNight();");
assertEq(run("state.isNight"), false, "toggle pasa a día");
run("toggleDayNight();");
assertEq(run("state.isNight"), true, "toggle vuelve a noche");
run("setDayNightMode(false); toggleDayNight();");
assertEq(run("state.isNight"), true, "toggle ignorado con el modo desactivado");
run("setDayNightMode(true);");

console.log("== serializacion modo comandante ==");
run("addCommanderDamage(2, 1, 7); addPoison(3, 6);");
assert(
  deepEqual(JSON.parse(run("JSON.stringify(deserialize(serialize(state)))")), JSON.parse(run("serialize(state)"))),
  "roundtrip con cmdDamage identico"
);
assertEq(run("JSON.parse(serialize(state)).commanderMode"), true, "commanderMode serializado");
assertEq(run("JSON.parse(serialize(state)).poisonMode"), true, "poisonMode serializado");
assertEq(run("JSON.parse(serialize(state)).dayNightEnabled"), true, "dayNightEnabled serializado");
assertEq(run("JSON.parse(serialize(state)).players[2].poison"), 6, "veneno serializado");
run("state = deserialize(serialize(state));");
assertEq(run("maxCommanderDamage(state.players[1])"), 7, "daño sobrevive al roundtrip");
assertEq(run("state.players[2].poison"), 6, "veneno sobrevive al roundtrip");
assertEq(run("state.dayNightEnabled"), true, "día/noche activo sobrevive al roundtrip");
assertEq(run("state.isNight"), true, "isNight sobrevive al roundtrip");

console.log("== partida antigua (sin modo comandante) ==");
const legacyJson = JSON.stringify({
  initialLife: 21,
  playerCount: 2,
  teamsEnabled: false,
  teamCount: 2,
  players: [{ id: 1, name: "Jugador 1", currentLife: 21, color: "WHITE" }],
  history: [],
  startingPlayerId: null
});
const legacyState = run(`deserialize(${JSON.stringify(legacyJson)})`);
assertEq(legacyState.commanderMode, false, "JSON antiguo -> commanderMode false");
assertEq(JSON.stringify(legacyState.players[0].cmdDamage), "{}", "JSON antiguo -> cmdDamage vacio");
assertEq(legacyState.poisonMode, false, "JSON antiguo -> poisonMode false");
assertEq(legacyState.players[0].poison, 0, "JSON antiguo -> poison 0");
assertEq(legacyState.dayNightEnabled, false, "JSON antiguo -> dayNightEnabled false");
assertEq(legacyState.isNight, true, "JSON antiguo -> isNight true");

console.log("== layout rotations ==");
function refRotation(rowIdx, colIdx, totalRows, totalCols, n) {
  if (totalRows <= 1) return 0;
  if (totalRows === 2 && totalCols === 2) {
    if (n === 3 && rowIdx === 0) return 180;
    return colIdx === 0 ? 90 : -90;
  }
  if (totalRows === 3 && totalCols === 2) {
    if (n === 5 && rowIdx === 0) return 180;
    return colIdx === 0 ? 90 : -90;
  }
  if (rowIdx === totalRows - 1) return 0;
  if (rowIdx === 0) return 180;
  return colIdx === 0 ? 90 : -90;
}
for (let n = 2; n <= 6; n++) {
  const players = Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
  const layout = run(`computeLayout(${JSON.stringify(players)}).map(row => row.map(c => [c.player.id, c.rotation]))`);
  const expected = [];
  const totalRows = n <= 2 ? n : Math.ceil(n / 2);
  const cols = n <= 2 ? 1 : 2;
  const grid = Array.from({ length: totalRows }, () => Array(cols).fill(null));
  let idx = 0;
  for (let row = totalRows - 1; row >= 0; row--) {
    for (let col = 0; col < cols; col++) {
      if (idx < n) { grid[row][col] = players[idx].id; idx++; }
    }
  }
  for (let r = 0; r < totalRows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] != null) row.push([grid[r][c], refRotation(r, c, totalRows, cols, n)]);
    }
    expected.push(row);
  }
  assertEq(layout, expected, `layout n=${n} con rotaciones`);
}

console.log("== mana symbols ==");
assert(run("manaSymbolSVG('WHITE').includes('<svg')"), "WHITE genera svg");
assert(run("manaSymbolSVG('BLUE', { selected: true }).includes('#D4AF37')"), "BLUE seleccionado tiene anillo dorado");
assert(run("manaSymbolSVG('GREEN').includes('stroke-opacity=\"0.5\"')"), "GREEN tiene tallo");
assertEq(run("isLight('#E8E4D7')"), true, "fondo blanco es claro");
assertEq(run("isLight('#0E68AB')"), false, "azul es oscuro");

console.log("== card bg colors ==");
assertEq(
  run("MagicColors.map(c => c.cardBgColor)"),
  ["#F0EAD6", "#6FA3CE", "#37302A", "#D4604B", "#5C9E63"],
  "tonos de marco MTG"
);
const textFor = (key) => run(`isLight(MagicColorByKey['${key}'].cardBgColor) ? "#000000" : "#FFFFFF"`);
assertEq(textFor("WHITE"), "#000000", "fondo blanco -> texto negro");
assertEq(textFor("BLUE"), "#000000", "fondo azul -> texto negro");
assertEq(textFor("BLACK"), "#FFFFFF", "fondo negro -> texto blanco");
assertEq(textFor("RED"), "#000000", "fondo rojo -> texto negro");
assertEq(textFor("GREEN"), "#000000", "fondo verde -> texto negro");

console.log("== effects ==");
assertEq(run("effectAlpha(0)"), 0, "alpha inicial 0");
assertEq(run("effectAlpha(0.3)"), 1, "alpha medio 1");
assertEq(run("effectAlpha(1)"), 0, "alpha final 0");

console.log("");
console.log(`Resultado: ${passed} ok, ${failed} fallos`);
process.exit(failed > 0 ? 1 : 0);
