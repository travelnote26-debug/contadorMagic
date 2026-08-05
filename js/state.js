"use strict";

const MagicColors = [
  { key: "WHITE", displayName: "Blanco", composeColor: "#FFFFFFEA", cardBgColor: "#E8E4D7" },
  { key: "BLUE", displayName: "Azul", composeColor: "#0E68AB", cardBgColor: "#C1D8E9" },
  { key: "BLACK", displayName: "Negro", composeColor: "#150B00", cardBgColor: "#333333" },
  { key: "RED", displayName: "Rojo", composeColor: "#D3202A", cardBgColor: "#D46A6A" },
  { key: "GREEN", displayName: "Verde", composeColor: "#00733E", cardBgColor: "#7CB88C" }
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
    team: null
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

function setStartingPlayer(playerId) {
  state = { ...state, startingPlayerId: playerId };
  persist();
  notify();
}

function playerToJson(p) {
  const obj = { id: p.id, name: p.name, currentLife: p.currentLife, color: p.color };
  if (p.team != null) obj.team = p.team;
  return obj;
}

function serialize(st) {
  return JSON.stringify({
    initialLife: st.initialLife,
    playerCount: st.playerCount,
    teamsEnabled: st.teamsEnabled,
    teamCount: st.teamCount,
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
      players: r.players,
      initialLife: r.initialLife,
      playerCount: r.playerCount,
      teamsEnabled: r.teamsEnabled,
      teamCount: r.teamCount,
      history: Array.isArray(r.history) ? r.history : [],
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
        state = restored;
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
