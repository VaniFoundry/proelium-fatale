/**
 * Proelium Fatale — Foundry VTT v13 Module
 *
 * Plays the actual Proelium Fatale video (from Limbus Company) fullscreen
 * for all connected players, then fades out.
 *
 * Drop your video file at:
 *   modules/proelium-fatale/assets/proelium-fatale.webm  (or .mp4)
 */

const MODULE_ID    = "proelium-fatale";
const SOCKET_EVENT = `module.${MODULE_ID}`;

// Path to the video — place your file here.
// Supported: .webm (recommended), .mp4, .ogg
const DEFAULT_VIDEO = `modules/${MODULE_ID}/assets/proelium-fatale.mp4`;

// Fade duration in milliseconds
const FADE_MS = 500;

// ============================================================
// OVERLAY HELPERS
// ============================================================

function buildOverlay({ isGM }) {
  // Remove any stale overlay first
  document.getElementById("pf-overlay")?.remove();

  document.body.insertAdjacentHTML("beforeend", `
    <div id="pf-overlay">
      <video id="pf-video" src="${DEFAULT_VIDEO}" autoplay playsinline></video>
      ${isGM ? `<button id="pf-close-btn" title="Stop (GM only)">✕</button>` : ""}
    </div>
  `);

  const overlay = document.getElementById("pf-overlay");
  const video   = document.getElementById("pf-video");

  // Trigger CSS fade-in on the next paint cycle
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.classList.add("pf-visible");
  }));

  if (isGM) {
    document.getElementById("pf-close-btn")?.addEventListener("click", () => {
      ProeliumFatale.stop({ broadcast: true });
    });
  }

  return video;
}

function fadeOutOverlay() {
  return new Promise(resolve => {
    const overlay = document.getElementById("pf-overlay");
    if (!overlay) { resolve(); return; }

    overlay.classList.remove("pf-visible");
    overlay.classList.add("pf-hidden");

    setTimeout(() => { overlay.remove(); resolve(); }, FADE_MS);
  });
}

// ============================================================
// CORE CLASS
// ============================================================

class ProeliumFatale {

  /**
   * Trigger the transition. Only the GM can call this.
   *
   * @param {object}  [opts]
   * @param {boolean} [opts.playForAll=true]   Broadcast to all players.
   * @param {boolean} [opts.changeScene=false] Switch scene after video ends.
   * @param {string}  [opts.sceneName=""]      Exact name of the target scene.
   */
  static async play({ playForAll = true, changeScene = false, sceneName = "" } = {}) {
    if (!game.user.isGM) return;

    if (playForAll) {
      game.socket.emit(SOCKET_EVENT, { action: "play" });
    }

    await ProeliumFatale._playLocal({ isGM: true, changeScene, sceneName });
  }

  /**
   * Stop and remove the overlay (with a fade).
   * @param {object}  [opts]
   * @param {boolean} [opts.broadcast=false] Also stop on all player clients.
   */
  static async stop({ broadcast = false } = {}) {
    if (broadcast && game.user.isGM) {
      game.socket.emit(SOCKET_EVENT, { action: "stop" });
    }
    await fadeOutOverlay();
  }

  /** @private — runs locally on each client */
  static async _playLocal({ isGM, changeScene, sceneName }) {
    const video = buildOverlay({ isGM });

    // Wait for the video to finish (or fail)
    await new Promise(resolve => {
      video.addEventListener("ended", resolve, { once: true });
      video.addEventListener("error", () => {
        console.error(`${MODULE_ID} | Could not load video at: ${DEFAULT_VIDEO}`);
        ui.notifications?.error(`Proelium Fatale: video not found. See console for path.`);
        resolve();
      }, { once: true });
    });

    // Scene switch happens on the GM client only, hidden behind the overlay
    if (changeScene && sceneName && game.user.isGM) {
      const scene = game.scenes.find(s => s.name === sceneName);
      if (scene) {
        scene.activate();
        // Give the scene a moment to load before the overlay lifts
        await new Promise(r => setTimeout(r, 400));
      } else {
        ui.notifications.warn(`Proelium Fatale | Scene "${sceneName}" not found.`);
      }
    }

    await fadeOutOverlay();
  }
}

// ============================================================
// MODULE SETTINGS  (visible in Configure Settings → Module)
// ============================================================

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "changeScene", {
    name: "Change scene after video",
    hint: "Automatically switch to the configured scene when the video ends.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, "sceneName", {
    name: "Target scene name",
    hint: "Exact name of the scene to activate. Only used when 'Change scene' is enabled.",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, "playForAll", {
    name: "Play for all players",
    hint: "Send the video to every connected client when triggered.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
});

// ============================================================
// READY + SOCKET LISTENER
// ============================================================

Hooks.once("ready", () => {
  const mod = game.modules.get(MODULE_ID);

  /**
   * Public API for macros.
   *
   * Simplest use (reads settings automatically):
   *   game.modules.get("proelium-fatale").api.play();
   *
   * With inline overrides:
   *   game.modules.get("proelium-fatale").api.play({
   *     changeScene: true,
   *     sceneName: "Boss Arena",
   *   });
   */
  mod.api = {
    play: (opts = {}) => {
      const changeScene = opts.changeScene ?? game.settings.get(MODULE_ID, "changeScene");
      const sceneName   = opts.sceneName   ?? game.settings.get(MODULE_ID, "sceneName");
      const playForAll  = opts.playForAll  ?? game.settings.get(MODULE_ID, "playForAll");
      return ProeliumFatale.play({ changeScene, sceneName, playForAll });
    },
    stop: (opts) => ProeliumFatale.stop(opts),
  };

  // Players receive socket events from the GM and play locally
  game.socket.on(SOCKET_EVENT, async ({ action }) => {
    if (action === "play") {
      // Players just play — scene changes are handled by the GM only
      await ProeliumFatale._playLocal({ isGM: false, changeScene: false, sceneName: "" });
    } else if (action === "stop") {
      await fadeOutOverlay();
    }
  });

  console.log(`${MODULE_ID} | Ready.`);
  console.log(`${MODULE_ID} | Place your video at: ${DEFAULT_VIDEO}`);
  console.log(`${MODULE_ID} | Macro: game.modules.get("${MODULE_ID}").api.play()`);
});

// ============================================================
// GM TOOLBAR BUTTON  (film reel icon in basic controls)
// ============================================================

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;

  // In v13, controls is a plain object keyed by group name, not an array.
  // We add our button to the "basic" group (the top-level canvas tools).
  const basic = controls.basic;
  if (!basic?.tools) return;

  basic.tools["proelium-fatale"] = {
    name:    "proelium-fatale",
    title:   "Proelium Fatale — Play Transition",
    icon:    "fas fa-film",
    button:  true,
    onClick: () => {
      game.modules.get(MODULE_ID).api.play();
    },
    visible: game.user.isGM,
  };
});
