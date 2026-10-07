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
    teamsEnabled: false,
    teamCount: 2,
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
    team: null,
    cmdDamage: {},
    poison: 0
  }));
}

function distributeTeams(st) {
  if (!st.teamsEnabled || st.players.length < 2) {
    return { ...st, players: st.players.map((p) => ({ ...p, team: null })) };
  }
  return {
    ...st,
    players: st.players.map((p, index) => ({ ...p, team: (index % st.teamCount) + 1 }))
  };
}

function modifyPlayer(playerId, transform, saveHistory = true) {
  const updated = state.players.map((p) => (p.id === playerId ? transform(p) : p));
  const history = saveHistory ? state.history.concat([state.players]) : state.history;
  state = { ...state, players: updated, history: history.slice(-MAX_HISTORY) };
  persist();
  notify();
}

function startGame() {
  const players = createPlayers(state.playerCount, state.initialLife);
  state = distributeTeams({ ...state, players, history: [], startingPlayerId: null });
  persist();
  notify();
}

function updateLife(playerId, delta) {
  modifyPlayer(playerId, (p) => ({ ...p, currentLife: p.currentLife + delta }));
}

function setLife(playerId, value) {
  modifyPlayer(playerId, (p) => ({ ...p, currentLife: value }));
}

function undo() {
  if (state.history.length === 0) return;
  const previous = state.history[state.history.length - 1];
  state = { ...state, players: previous, history: state.history.slice(0, -1) };
  persist();
  notify();
}

function setPlayerColor(playerId, color) {
  modifyPlayer(playerId, (p) => ({ ...p, color }), false);
}

function setPlayerTeam(playerId, team) {
  modifyPlayer(playerId, (p) => ({ ...p, team }), false);
}

function updateConfig({ initialLife, playerCount, teamsEnabled, teamCount } = {}) {
  const next = {
    ...state,
    initialLife: initialLife != null ? initialLife : state.initialLife,
    playerCount: playerCount != null ? playerCount : state.playerCount,
    teamsEnabled: teamsEnabled != null ? teamsEnabled : state.teamsEnabled,
    teamCount: teamCount != null ? teamCount : state.teamCount
  };
  state = distributeTeams(next);
  persist();
  notify();
}

function resetGame() {
  const players = createPlayers(state.playerCount, state.initialLife);
  state = distributeTeams({ ...state, players, history: [], startingPlayerId: null });
  persist();
  notify();
}

function setCommanderMode(on) {
  if (on === !!state.commanderMode) return;
  state = { ...state, commanderMode: !!on };
  if (on) {
    state.initialLife = 40;
    resetGame();
    return;
  }
  persist();
  notify();
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
  persist();
  notify();
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
  persist();
  notify();
}

function toggleDayNight() {
  if (!state.dayNightEnabled) return;
  state = { ...state, isNight: !state.isNight };
  persist();
  notify();
}

function setStartingPlayer(playerId) {
  state = { ...state, startingPlayerId: playerId };
  persist();
  notify();
}

function playerToJson(p) {
  const obj = { id: p.id, name: p.name, currentLife: p.currentLife, color: p.color };
  if (p.team != null) obj.team = p.team;
  obj.cmdDamage = { ...(p.cmdDamage || {}) };
  obj.poison = p.poison || 0;
  return obj;
}

function serialize(st) {
  return JSON.stringify({
    initialLife: st.initialLife,
    playerCount: st.playerCount,
    teamsEnabled: st.teamsEnabled,
    teamCount: st.teamCount,
    commanderMode: !!st.commanderMode,
    poisonMode: !!st.poisonMode,
    dayNightEnabled: !!st.dayNightEnabled,
    isNight: st.isNight !== false,
    startingPlayerId: st.startingPlayerId != null ? st.startingPlayerId : null,
    players: st.players.map(playerToJson),
    history: st.history.slice(-MAX_HISTORY).map((list) => list.map(playerToJson))
  });
}

function deserialize(json) {
  try {
    const r = JSON.parse(json);
    if (!r || !Array.isArray(r.players)) return null;
    return {
      players: r.players.map((p) => ({ cmdDamage: {}, poison: 0, ...p })),
      initialLife: r.initialLife,
      playerCount: r.playerCount,
      teamsEnabled: r.teamsEnabled,
      teamCount: r.teamCount,
      commanderMode: !!r.commanderMode,
      poisonMode: !!r.poisonMode,
      dayNightEnabled: !!r.dayNightEnabled,
      isNight: r.isNight !== false,
      history: (Array.isArray(r.history) ? r.history : []).map((list) =>
        list.map((p) => ({ cmdDamage: {}, poison: 0, ...p }))
      ),
      startingPlayerId: r.startingPlayerId != null ? r.startingPlayerId : null
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
        state = { ...restored, teamsEnabled: false };
        return;
      }
    }
  } catch (e) {}
  state = createInitialState();
  startGame();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state));
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
