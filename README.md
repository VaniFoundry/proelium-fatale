# Proelium Fatale
A Foundry VTT module "thought" for **[Stars of the City](https://github.com/tsu-b-asa/sotc)**.
It plays the **Proelium Fatale video** from Limbus Company (or any other video, you need to find your own) fullscreen for all players, then fades out. Optionally switches to a new scene while the overlay is up.

## Features

- **Fullscreen Video Overlay**: Plays a video file fullscreen for all connected clients simultaneously
- **Scene Transition**: Optionally switches to a target scene silently while the video is playing — players see the new scene when it fades out
- **Multiple Trigger Options**: Fire it from a toolbar button, a script macro, or inline with a scene change
- **Macro API**: Full control over playback from macros, including early stop and per-call setting overrides

## How It Works

The GM triggers playback via the toolbar button or a macro. The video plays fullscreen across all connected clients with a fade-out at the end. If scene transition is enabled, the switch happens silently under the overlay — players land directly in the new scene when the video ends.

### Setup

Place your video file at:
```
Data/modules/proelium-fatale/assets/proelium-fatale.webm
```
`.mp4` and `.ogg` also work. Rename your file to match, or edit `DEFAULT_VIDEO` in `scripts/main.mjs` if you prefer to keep your original filename.

> Note: `.webm` (VP8/VP9) gives the best browser compatibility and smallest file size; `.mp4` (H.264) works fine in Foundry's Electron desktop client. The video letterboxes correctly at any resolution.

> Note 2: This should be changed to just read the first `webm` or `mp4` in the folder and call it a day, sorry for the inconvenience. 

### Triggering

**Toolbar button** — an icon will appears in the Token controls toolbar (GM only). Click it.

**Script macro** (recommended for if you want to make some cool macros):
```js
game.modules.get("proelium-fatale").api.play();
```

**With scene change**:
```js
game.modules.get("proelium-fatale").api.play({
  changeScene: true,
  sceneName: "Bongy Realm",  // must match exactly with your scene name
});
```

**Stop early**:
```js
game.modules.get("proelium-fatale").api.stop({ broadcast: true });
```

### Settings

Found in **Configure Settings → Proelium Fatale**. All settings can also be overridden per-call in the macro.

| Setting | Default | Description |
|---|---|---|
| Play for all players | ✅ | Broadcasts to every connected client |
| Change scene after video | ❌ | Switch scene when video ends |
| Target scene name | *(blank)* | Exact name of the scene to activate |

## Installation

1. Place the `proelium-fatale/` folder inside your Foundry `Data/modules/` directory
2. Enable the module in Foundry's module management screen
3. Drop your video file into `assets/` as described above

## Compatibility

| Foundry Version | Status |
|---|---|
| v13 | ✅ Verified |