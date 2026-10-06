"use strict";

const TeamColors = ["#5B8C5A", "#B85C38", "#4A90A4", "#D4A843", "#8E6F9E", "#C46A6A"];

function teamColor(idx) {
  return TeamColors[Math.min(idx, TeamColors.length - 1)];
}

const boardEl = document.getElementById("board");
const settingsSheet = document.getElementById("settings-sheet");
const settingsRune = document.getElementById("settings-rune");
const dialogBackdrop = document.getElementById("dialog-backdrop");

let sections = [];
let lastKey = "";

class PlayerSection {
  constructor(player, rotation) {
    this.player = player;
    this.rotation = rotation;
    this.prevLife = player.currentLife;
    this.lifeDelta = 0;
    this.counterTimer = null;
    this.rafId = null;
    this.build();
  }

  build() {
    const color = MagicColorByKey[this.player.color];
    const textColor = isLight(color.cardBgColor) ? "#000000" : "#FFFFFF";
    this.textColor = textColor;

    const root = document.createElement("div");
    root.className = "player-section";
    root.style.setProperty("--card-bg", color.cardBgColor);
    root.style.setProperty("--text-color", textColor);
    root.style.setProperty("--team-color", "transparent");
    root.innerHTML = `
      <div class="card-frame"></div>
      <div class="frame-gradient"></div>
      <div class="pinline pinline-outer"></div>
      <div class="pinline pinline-gold"></div>
      <div class="pinline pinline-inner"></div>
      <div class="team-border"></div>
      <canvas class="effects-canvas" style="transform:rotate(${this.rotation}deg)"></canvas>
      <div class="player-content" style="transform:rotate(${this.rotation}deg)">
        <div class="slot-top">
          <span class="delta-text"></span>
          <span class="winner-badge" hidden>Inicia la partida</span>
        </div>
        <div class="life-row">
          <button class="life-btn minus" aria-label="Restar vida">&#x2212;</button>
          <span class="life-number" title="Mantener pulsado para deshacer">${this.player.currentLife}</span>
          <button class="life-btn plus" aria-label="Sumar vida">+</button>
        </div>
        <div class="mana-picker">${manaSymbolSVG(this.player.color, { size: 30 })}</div>
        <div class="cmd-pill" hidden>
          <span class="cmd-icon">&#x2694;</span><span class="cmd-val">0/21</span>
        </div>
        <div class="elim-badge" hidden>&#x2620; Fuera</div>
        <div class="team-badge" hidden></div>
      </div>
      <div class="color-overlay" hidden>
        <div class="color-circle" style="transform:rotate(${this.rotation}deg)">${this.buildColorCircle()}</div>
      </div>
      <div class="cmd-overlay" hidden>
        <div class="cmd-card" style="transform:rotate(${this.rotation}deg)">
          <div class="cmd-head">
            <span class="cmd-title">Daño de comandante</span>
            <button class="cmd-close" aria-label="Cerrar">&#x2715;</button>
          </div>
          <div class="cmd-rows"></div>
        </div>
      </div>
      <div class="highlight"></div>
    `;
    this.root = root;
    this.lifeNumberEl = root.querySelector(".life-number");
    this.deltaEl = root.querySelector(".delta-text");
    this.winnerBadgeEl = root.querySelector(".winner-badge");
    this.effectsCanvas = root.querySelector(".effects-canvas");
    this.ctx = this.effectsCanvas.getContext("2d");
    this.manaPickerEl = root.querySelector(".mana-picker");
    this.colorOverlay = root.querySelector(".color-overlay");
    this.teamBadgeEl = root.querySelector(".team-badge");
    this.highlightEl = root.querySelector(".highlight");
    this.cmdPill = root.querySelector(".cmd-pill");
    this.cmdVal = root.querySelector(".cmd-val");
    this.cmdOverlay = root.querySelector(".cmd-overlay");
    this.cmdRows = root.querySelector(".cmd-rows");
    this.elimBadge = root.querySelector(".elim-badge");

    root.querySelector(".minus").addEventListener("click", () => this.onLife(-1));
    root.querySelector(".plus").addEventListener("click", () => this.onLife(1));
    this.manaPickerEl.addEventListener("click", () => this.toggleColorPicker(true));
    this.bindLongPress();
    this.setupColorOverlay();
    this.setupCmdPanel();
  }

  onLife(delta) {
    if (rouletteActive) return;
    if (navigator.vibrate) navigator.vibrate(10);
    updateLife(this.player.id, delta);
  }

  update(player) {
    this.player = player;
    const color = MagicColorByKey[player.color];
    const textColor = isLight(color.cardBgColor) ? "#000000" : "#FFFFFF";
    if (textColor !== this.textColor) {
      this.textColor = textColor;
      this.root.style.setProperty("--text-color", textColor);
    }
    this.root.style.setProperty("--card-bg", color.cardBgColor);
    this.manaPickerEl.innerHTML = manaSymbolSVG(player.color, { size: 30 });

    const hasTeam = state.teamsEnabled && player.team != null;
    this.teamBorderEl().style.display = hasTeam ? "" : "none";
    if (hasTeam) {
      this.root.style.setProperty("--team-color", teamColor(player.team - 1));
      this.teamBadgeEl.textContent = "Eq. " + player.team;
      this.teamBadgeEl.hidden = false;
    } else {
      this.teamBadgeEl.hidden = true;
    }

    const showCmd = !!state.commanderMode;
    this.cmdPill.hidden = !showCmd;
    if (showCmd) {
      const dmg = maxCommanderDamage(player);
      this.cmdVal.textContent = dmg + "/21";
      this.cmdPill.classList.toggle("over", dmg >= 21);
      if (!this.cmdOverlay.hidden) this.renderCmdRows();
    } else if (!this.cmdOverlay.hidden) {
      this.toggleCmdPanel(false);
    }

    const eliminated = player.currentLife <= 0;
    this.root.classList.toggle("eliminated", eliminated);
    this.elimBadge.hidden = !eliminated;

    const newLife = player.currentLife;
    if (newLife !== this.prevLife) {
      const delta = newLife - this.prevLife;
      this.lifeDelta += delta;
      this.prevLife = newLife;
      this.triggerLifeEffect(delta);
    } else {
      this.lifeNumberEl.textContent = newLife;
    }
  }

  teamBorderEl() {
    return this.root.querySelector(".team-border");
  }

  triggerLifeEffect(delta) {
    const gain = delta > 0;
    this.lifeNumberEl.textContent = this.player.currentLife;

    this.lifeNumberEl.classList.remove("pulse");
    void this.lifeNumberEl.offsetWidth;
    this.lifeNumberEl.classList.add("pulse");

    this.lifeNumberEl.classList.remove("flash-gain", "flash-loss");
    void this.lifeNumberEl.offsetWidth;
    this.lifeNumberEl.classList.add(gain ? "flash-gain" : "flash-loss");

    this.playEffect(gain);

    this.deltaEl.style.color = gain ? "#66BB6A" : "#EF5350";
    this.deltaEl.textContent = (gain ? "+" : "-") + Math.abs(this.lifeDelta);
    this.deltaEl.classList.remove("delta-show");
    void this.deltaEl.offsetWidth;
    this.deltaEl.classList.add("delta-show");
    clearTimeout(this.counterTimer);
    this.counterTimer = setTimeout(() => {
      this.deltaEl.classList.remove("delta-show");
      this.lifeDelta = 0;
    }, 1300);
  }

  playEffect(gain) {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    const canvas = this.effectsCanvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = this.ctx;
    const start = performance.now();
    const dur = 350;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      ctx.clearRect(0, 0, w, h);
      if (gain) drawPotionEffect(ctx, w, h, p);
      else drawPotionEffect(ctx, w, h, p, POTION_RED);
      if (p < 1) this.rafId = requestAnimationFrame(step);
      else ctx.clearRect(0, 0, w, h);
    };
    this.rafId = requestAnimationFrame(step);
  }

  bindLongPress() {
    const el = this.lifeNumberEl;
    let timer = null;
    const cancel = () => clearTimeout(timer);
    el.addEventListener("pointerdown", () => {
      if (rouletteActive) return;
      timer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(30);
        undo();
      }, 500);
    });
    el.addEventListener("pointerup", cancel);
    el.addEventListener("pointerleave", cancel);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  buildColorCircle() {
    const radius = 70;
    const iconSize = 44;
    return MagicColors.map((c, i) => {
      const angle = ((360 / MagicColors.length) * i - 90) * (Math.PI / 180);
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      return (
        `<div class="mana-circle-slot" style="transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px)">` +
        manaSymbolSVG(c.key, { size: iconSize, selected: c.key === this.player.color }) +
        `</div>`
      );
    }).join("");
  }

  setupColorOverlay() {
    this.colorOverlay.addEventListener("click", (e) => {
      const slot = e.target.closest(".mana-circle-slot");
      if (!slot) return;
      const idx = Array.from(this.colorOverlay.querySelectorAll(".mana-circle-slot")).indexOf(slot);
      if (idx >= 0) {
        const colorKey = MagicColors[idx].key;
        if (colorKey !== this.player.color) setPlayerColor(this.player.id, colorKey);
      }
      this.toggleColorPicker(false);
    });
  }

  toggleColorPicker(open) {
    this.colorOverlay.hidden = !open;
    this.root.querySelectorAll(".life-btn").forEach((b) => b.classList.toggle("disabled", open));
  }

  setupCmdPanel() {
    this.cmdPill.addEventListener("click", () => this.toggleCmdPanel(true));
    this.cmdOverlay.addEventListener("click", (e) => {
      const step = e.target.closest(".cmd-step");
      if (step) {
        if (navigator.vibrate) navigator.vibrate(10);
        addCommanderDamage(this.player.id, Number(step.dataset.attacker), Number(step.dataset.delta));
        return;
      }
      if (e.target.closest(".cmd-close") || e.target === this.cmdOverlay) this.toggleCmdPanel(false);
    });
  }

  toggleCmdPanel(open) {
    if (open) this.renderCmdRows();
    this.cmdOverlay.hidden = !open;
    this.root.querySelectorAll(".life-btn").forEach((b) => b.classList.toggle("disabled", open));
  }

  renderCmdRows() {
    const me = this.player;
    this.cmdRows.innerHTML = state.players
      .filter((p) => p.id !== me.id)
      .map((p) => {
        const dmg = (me.cmdDamage && me.cmdDamage[p.id]) || 0;
        return (
          `<div class="cmd-line">` +
          `<span class="cmd-name">${p.name}</span>` +
          `<button class="cmd-step" data-attacker="${p.id}" data-delta="-1" aria-label="Restar daño">&#x2212;</button>` +
          `<span class="cmd-num${dmg >= 21 ? " over" : ""}">${dmg}</span>` +
          `<button class="cmd-step" data-attacker="${p.id}" data-delta="1" aria-label="Sumar daño">+</button>` +
          `</div>`
        );
      })
      .join("");
  }
}

function rebuildSections(layout) {
  boardEl.innerHTML = "";
  sections = [];
  layout.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "board-row";
    row.forEach(({ player, rotation }) => {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      const section = new PlayerSection(player, rotation);
      sections.push(section);
      cell.appendChild(section.root);
      rowEl.appendChild(cell);
    });
    boardEl.appendChild(rowEl);
  });
  lastKey = state.players.map((p) => p.id).join(",");
  resizeSections();
}

function updateSections() {
  const byId = new Map(state.players.map((p) => [p.id, p]));
  sections.forEach((s) => {
    const p = byId.get(s.player.id);
    if (p) s.update(p);
  });
  resizeSections();
}

function resizeSections() {
  sections.forEach((s) => {
    const w = s.root.clientWidth;
    let fs;
    if (w < 130) fs = 56;
    else if (w < 180) fs = 72;
    else if (w < 240) fs = 96;
    else if (w < 320) fs = 124;
    else fs = 150;
    s.lifeNumberEl.style.fontSize = fs + "px";
  });
}

function renderBoard() {
  const key = state.players.map((p) => p.id).join(",");
  if (key !== lastKey) rebuildSections(computeLayout(state.players));
  else updateSections();
}

let rouletteActive = false;
let rouletteRaf = null;

function fastOutSlowIn(t) {
  const c1x = 0.4, c1y = 0, c2x = 0.2, c2y = 1;
  const bx = (u) => {
    const v = 1 - u;
    return 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u;
  };
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < t) lo = mid;
    else hi = mid;
  }
  const u = (lo + hi) / 2;
  const v = 1 - u;
  return 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u;
}

function highlightPlayer(id) {
  sections.forEach((s) => {
    s.highlightEl.style.opacity = s.player.id === id ? 1 : 0;
  });
}

function showWinner(id) {
  sections.forEach((s) => {
    s.winnerBadgeEl.hidden = s.player.id !== id;
    s.deltaEl.classList.remove("delta-show");
  });
}

function clearHighlights() {
  sections.forEach((s) => {
    s.winnerBadgeEl.hidden = true;
    s.highlightEl.style.opacity = 0;
  });
}

function startRoulette() {
  if (rouletteActive || state.players.length === 0) return;
  closeSettings();
  rouletteActive = true;
  settingsRune.classList.add("hidden");
  const n = state.players.length;
  const winnerIndex = Math.floor(Math.random() * n);
  const totalSteps = n * 5 + winnerIndex;
  const duration = 3000;
  const t0 = performance.now();
  const loop = (now) => {
    const t = Math.min((now - t0) / duration, 1);
    const eased = fastOutSlowIn(t);
    const idx = Math.floor(totalSteps * eased) % n;
    highlightPlayer(state.players[idx].id);
    if (t < 1) {
      rouletteRaf = requestAnimationFrame(loop);
    } else {
      const winner = state.players[winnerIndex];
      highlightPlayer(winner.id);
      showWinner(winner.id);
      setTimeout(() => {
        rouletteActive = false;
        settingsRune.classList.remove("hidden");
        clearHighlights();
        setStartingPlayer(winner.id);
      }, 5000);
    }
  };
  rouletteRaf = requestAnimationFrame(loop);
}

function openSettings() {
  if (rouletteActive) return;
  settingsSheet.hidden = false;
}

function closeSettings() {
  settingsSheet.hidden = true;
}

function syncSettingsUI() {
  const playersMinus = document.getElementById("players-minus");
  const playersPlus = document.getElementById("players-plus");
  const playersLabel = document.getElementById("players-label");
  const lifeMinus = document.getElementById("life-minus");
  const lifePlus = document.getElementById("life-plus");
  const lifeLabel = document.getElementById("life-label");
  const teamsSwitch = document.getElementById("teams-switch");
  const teamsWrap = document.getElementById("teams-count-wrap");
  const teamsMinus = document.getElementById("teams-minus");
  const teamsPlus = document.getElementById("teams-plus");
  const teamsLabel = document.getElementById("teams-label");

  playersMinus.disabled = state.playerCount <= 2;
  playersPlus.disabled = state.playerCount >= 6;
  playersLabel.textContent = state.playerCount + " jugadores";

  lifeMinus.disabled = state.initialLife <= 1;
  lifePlus.disabled = state.initialLife >= 99;
  lifeLabel.textContent = state.initialLife + " vidas";

  teamsSwitch.classList.toggle("on", state.teamsEnabled);
  teamsWrap.hidden = !state.teamsEnabled;
  teamsMinus.disabled = state.teamCount <= 2;
  teamsPlus.disabled = state.teamCount >= 6;
  teamsLabel.textContent = state.teamCount + " equipos";

  const commanderSwitch = document.getElementById("commander-switch");
  commanderSwitch.classList.toggle("on", !!state.commanderMode);
  commanderSwitch.setAttribute("aria-checked", String(!!state.commanderMode));

  document.querySelectorAll(".preset-btn").forEach((b) => {
    b.classList.toggle("on", Number(b.dataset.life) === state.initialLife);
  });
}

function wireSettings() {
  settingsRune.addEventListener("click", openSettings);

  document.getElementById("sheet-close").addEventListener("click", closeSettings);

  document.getElementById("btn-reset").addEventListener("click", () => {
    dialogBackdrop.hidden = false;
  });
  document.getElementById("dialog-cancel").addEventListener("click", () => {
    dialogBackdrop.hidden = true;
  });
  document.getElementById("dialog-confirm").addEventListener("click", () => {
    dialogBackdrop.hidden = true;
    closeSettings();
    resetGame();
  });

  document.getElementById("players-minus").addEventListener("click", () => {
    updateConfig({ playerCount: Math.max(2, state.playerCount - 1) });
  });
  document.getElementById("players-plus").addEventListener("click", () => {
    updateConfig({ playerCount: Math.min(6, state.playerCount + 1) });
  });

  document.getElementById("life-minus").addEventListener("click", () => {
    applyLifePreset(Math.max(1, state.initialLife - 1));
  });
  document.getElementById("life-plus").addEventListener("click", () => {
    applyLifePreset(Math.min(99, state.initialLife + 1));
  });
  document.querySelectorAll(".preset-btn").forEach((b) => {
    b.addEventListener("click", () => applyLifePreset(Number(b.dataset.life)));
  });

  document.getElementById("roulette-btn").addEventListener("click", startRoulette);

  document.getElementById("teams-switch").addEventListener("click", () => {
    updateConfig({ teamsEnabled: !state.teamsEnabled });
  });
  document.getElementById("teams-minus").addEventListener("click", () => {
    updateConfig({ teamCount: Math.max(2, state.teamCount - 1) });
  });
  document.getElementById("teams-plus").addEventListener("click", () => {
    updateConfig({ teamCount: Math.min(6, state.teamCount + 1) });
  });

  document.getElementById("commander-switch").addEventListener("click", () => {
    setCommanderMode(!state.commanderMode);
  });
}

window.addEventListener("resize", () => {
  if (sections.length) resizeSections();
});
