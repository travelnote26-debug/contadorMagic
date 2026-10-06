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
  run("createPlayers(4, 21).map(p => [p.id, p.name, p.currentLife, p.color, p.team])"),
  [[1, "Jugador 1", 21, "WHITE", null], [2, "Jugador 2", 21, "BLUE", null], [3, "Jugador 3", 21, "BLACK", null], [4, "Jugador 4", 21, "RED", null]],
  "4 jugadores, 21 vidas, colores ciclicos"
);

console.log("== life update / undo / history ==");
run("state = distributeTeams({ ...createInitialState(), players: createPlayers(4, 21) });");
run("updateLife(1, -3); updateLife(1, 2);");
assertEq(run("state.players[0].currentLife"), 20, "vida 21 -> 18 -> 20");
assertEq(run("state.history.length"), 2, "historial con 2 entradas");
run("undo();");
assertEq(run("state.players[0].currentLife"), 18, "undo vuelve a 18");
assertEq(run("state.history.length"), 1, "historial reduce a 1");

console.log("== historia limitada ==");
run("state = distributeTeams({ ...createInitialState(), players: createPlayers(2, 20) });");
for (let i = 0; i < 30; i++) run("updateLife(1, 1);");
assertEq(run("state.history.length"), 20, "historial maximo 20");

console.log("== updateConfig no recrea jugadores ==");
run("updateConfig({ playerCount: 2 });");
assertEq(run("state.players.length"), 2, "cambio de config mantiene jugadores");

console.log("== equipos ==");
run("state = createInitialState(); state = { ...state, players: createPlayers(4, 20) };");
run("updateConfig({ teamsEnabled: true, teamCount: 2 });");
assertEq(run("state.players.map(p => p.team)"), [1, 2, 1, 2], "equipos alternados con 2 equipos");
run("updateConfig({ teamsEnabled: false });");
assertEq(run("state.players.map(p => p.team)"), [null, null, null, null], "sin equipos team=null");

console.log("== resetGame ==");
run("updateConfig({ teamsEnabled: true }); resetGame();");
assertEq(run("state.players.every(p => p.currentLife === state.initialLife)"), true, "reset vuelve a vidas iniciales");
assertEq(run("state.startingPlayerId"), null, "reset limpia jugador inicial");
assertEq(run("state.history.length"), 0, "reset limpia historial");

console.log("== serializacion ==");
run("state = distributeTeams({ ...createInitialState(), players: createPlayers(3, 21), teamsEnabled: true, teamCount: 3 });");
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
