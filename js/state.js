"use strict";

const MagicColors = [
  { key: "WHITE", displayName: "Blanco", composeColor: "#FFFFFFEA", cardBgColor: "#F0EAD6" },
  { key: "BLUE", displayName: "Azul", composeColor: "#0E68AB", cardBgColor: "#6FA3CE" },
  { key: "BLACK", displayName: "Negro", composeColor: "#150B00", cardBgColor: "#37302A" },
  { key: "RED", displayName: "Rojo", composeColor: "#D3202A", cardBgColor: "#D4604B" },
  { key: "GREEN", displayName: "Verde", composeColor: "#00733E", cardBgColor: "#5C9E63" }
];

const MagicColorByKey = Object.fromEntries(MagicColors.map((c) => [c.key, c]));

const STORAGE_KEY = "contadormagic_state";
const MAX_HISTORY = 20;

let state = createInitialState();

function createInitialState() {
  return {
    players: [],
    initialLife: 21,
    playerCount: 4,
    commanderMode: false,
    poisonMode: false,
    dayNightEnabled: false,
    isNight: true,
    history: [],
    startingPlayerId: null
  };
}

function createPlayers(playerCount, initialLife) {
  return Array.from({ length: playerCount }, (_, i) => ({
    id: i + 1,
    name: "Jugador " + (i + 1),
    currentLife: initialLife,
    color: MagicColors[i % MagicColors.length].key,
    cmdDamage: {},
    poison: 0
  }));
}

function commit() {
  persist();
  notify();
}

function modifyPlayer(playerId, transform, saveHistory = true) {
  const updated = state.players.map((p) => (p.id === playerId ? transform(p) : p));
  const history = saveHistory ? state.history.concat([state.players]) : state.history;
  state = { ...state, players: updated, history: history.slice(-MAX_HISTORY) };
  commit();
}

function updateLife(playerId, delta) {
  modifyPlayer(playerId, (p) => ({ ...p, currentLife: p.currentLife + delta }));
}

function undo() {
  if (state.history.length === 0) return;
  const previous = state.history[state.history.length - 1];
  state = { ...state, players: previous, history: state.history.slice(0, -1) };
  commit();
}

function setPlayerColor(playerId, color) {
  modifyPlayer(playerId, (p) => ({ ...p, color }), false);
}

function updateConfig({ initialLife, playerCount } = {}) {
  state = {
    ...state,
    initialLife: initialLife != null ? initialLife : state.initialLife,
    playerCount: playerCount != null ? playerCount : state.playerCount
  };
  commit();
}

function resetGame() {
  const players = createPlayers(state.playerCount, state.initialLife);
  state = { ...state, players, history: [], startingPlayerId: null };
  commit();
}

function setCommanderMode(on) {
  if (on === !!state.commanderMode) return;
  state = { ...state, commanderMode: !!on };
  if (on) {
    state.initialLife = 40;
    resetGame();
    return;
  }
  commit();
}

function applyLifePreset(value) {
  state = { ...state, initialLife: value };
  resetGame();
}

function addCommanderDamage(playerId, attackerId, delta) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;
  const current = (player.cmdDamage || {})[attackerId] || 0;
  const next = Math.max(0, Math.min(21, current + delta));
  if (next === current) return;
  modifyPlayer(playerId, (p) => {
    const cmdDamage = p.cmdDamage || {};
    return {
      ...p,
      currentLife: p.currentLife - (next - current),
      cmdDamage: { ...cmdDamage, [attackerId]: next }
    };
  });
}

function maxCommanderDamage(p) {
  const values = Object.values(p.cmdDamage || {});
  return values.length ? Math.max(...values) : 0;
}

function setPoisonMode(on) {
  if (on === !!state.poisonMode) return;
  state = { ...state, poisonMode: !!on };
  commit();
}

function addPoison(playerId, delta) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;
  const current = player.poison || 0;
  const next = Math.max(0, Math.min(10, current + delta));
  if (next === current) return;
  modifyPlayer(playerId, (p) => ({ ...p, poison: next }));
}

function isEliminated(player, poisonMode) {
  if (player.currentLife <= 0) return true;
  return !!poisonMode && (player.poison || 0) >= 10;
}

function setDayNightMode(on) {
  if (on === !!state.dayNightEnabled) return;
  state = { ...state, dayNightEnabled: !!on };
  commit();
}

function toggleDayNight() {
  if (!state.dayNightEnabled) return;
  state = { ...state, isNight: !state.isNight };
  commit();
}

function setStartingPlayer(playerId) {
  state = { ...state, startingPlayerId: playerId };
  commit();
}

function normalizePlayer(p) {
  return {
    id: p.id,
    name: p.name,
    currentLife: p.currentLife,
    color: p.color,
    cmdDamage: { ...(p.cmdDamage || {}) },
    poison: p.poison || 0
  };
}

function serialize(st) {
  return JSON.stringify({
    initialLife: st.initialLife,
    playerCount: st.playerCount,
    commanderMode: !!st.commanderMode,
    poisonMode: !!st.poisonMode,
    dayNightEnabled: !!st.dayNightEnabled,
    isNight: st.isNight !== false,
    startingPlayerId: st.startingPlayerId != null ? st.startingPlayerId : null,
    players: st.players.map(normalizePlayer),
    history: st.history.slice(-MAX_HISTORY).map((list) => list.map(normalizePlayer))
  });
}

function deserialize(json) {
  try {
    const r = JSON.parse(json);
    if (!r || !Array.isArray(r.players)) return null;
    return {
      players: r.players.map(normalizePlayer),
      initialLife: r.initialLife,
      playerCount: r.playerCount,
      commanderMode: !!r.commanderMode,
      poisonMode: !!r.poisonMode,
      dayNightEnabled: !!r.dayNightEnabled,
      isNight: r.isNight !== false,
      startingPlayerId: r.startingPlayerId != null ? r.startingPlayerId : null,
      history: (Array.isArray(r.history) ? r.history : []).map((list) => list.map(normalizePlayer))
    };
  } catch (e) {
    return null;
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const restored = deserialize(raw);
      if (restored && restored.players.length > 0) {
        state = restored;
        return;
      }
    }
  } catch (e) {}
  state = createInitialState();
  resetGame();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state));
  } catch (e) {}
}

const HISTORY_KEY = "contadormagic_history";
const MAX_MATCHES = 1;

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function persistHistory(matches) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(matches));
  } catch (e) {}
}

function currentMatch(now) {
  const stamp = now != null ? now : Date.now();
  return {
    id: stamp,
    savedAt: new Date(stamp).toISOString(),
    playerCount: state.players.length,
    initialLife: state.initialLife,
    commanderMode: !!state.commanderMode,
    poisonMode: !!state.poisonMode,
    dayNightEnabled: !!state.dayNightEnabled,
    isNight: state.isNight !== false,
    startingPlayerId: state.startingPlayerId != null ? state.startingPlayerId : null,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      currentLife: p.currentLife,
      poison: p.poison || 0,
      cmdDamage: { ...(p.cmdDamage || {}) }
    }))
  };
}

function loadMatch(match) {
  if (!match || !Array.isArray(match.players) || match.players.length === 0) return false;
  const players = match.players.map(normalizePlayer);
  state = {
    ...state,
    players,
    initialLife: match.initialLife != null ? match.initialLife : state.initialLife,
    playerCount: match.playerCount != null ? match.playerCount : players.length,
    commanderMode: !!match.commanderMode,
    poisonMode: !!match.poisonMode,
    dayNightEnabled: !!match.dayNightEnabled,
    isNight: match.isNight !== false,
    startingPlayerId: match.startingPlayerId != null ? match.startingPlayerId : null,
    history: []
  };
  commit();
  return true;
}

function matchInProgress() {
  if (!Array.isArray(state.players) || state.players.length === 0) return false;
  const fresh = createPlayers(state.playerCount, state.initialLife);
  return state.players.some((p, i) => {
    const base = fresh[i];
    if (!base) return false;
    if (p.currentLife !== base.currentLife) return true;
    if ((p.poison || 0) !== 0) return true;
    if (Object.keys(p.cmdDamage || {}).length > 0) return true;
    if (p.name !== base.name) return true;
    return false;
  });
}

function recordCurrentMatch(now) {
  if (!matchInProgress()) return false;
  const matches = loadHistory();
  matches.unshift(currentMatch(now));
  persistHistory(matches.slice(0, MAX_MATCHES));
  return true;
}

function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (e) {}
}

const listeners = new Set();
function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => fn(state));
}
