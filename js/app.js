"use strict";

const hasServiceWorker = "serviceWorker" in navigator;

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) await navigator.wakeLock.request("screen");
  } catch (e) {}
}

function checkSwUpdate() {
  if (!hasServiceWorker) return;
  navigator.serviceWorker
    .getRegistration()
    .then((reg) => {
      if (reg) return reg.update();
    })
    .catch(() => {});
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  requestWakeLock();
  checkSwUpdate();
});

if (hasServiceWorker) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(() => {});
    setInterval(checkSwUpdate, 30 * 60 * 1000);
    let hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

load();
wireSettings();
subscribe(() => {
  renderBoard();
  syncSettingsUI();
});
renderBoard();
syncSettingsUI();
requestWakeLock();

(function(){
  const setVh = () => {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', h + 'px');
    document.documentElement.style.setProperty('--dvh', window.innerHeight + 'px');
  };
  setVh();
  window.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', setVh);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setVh);
    window.visualViewport.addEventListener('scroll', setVh);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(setVh, 100);
  });
})();
