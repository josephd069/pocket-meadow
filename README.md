# Pocket Meadow

A small Three.js coin-collecting game with an original low-poly Blender asset kit. Collect twelve coins in sixty seconds. Move with WASD or arrow keys, hold Shift to dash, and use Escape to pause. Phones and tablets get an on-screen joystick.

## Run locally

```sh
npm install
npm run build
npm run dev
```

Open the printed local URL. `dist/` is the complete static game, including a pinned local copy of Three.js. No external assets, CDN, account, or server API are required by the game.

## Edit

- `dist/main.js`: Three.js world, controls, lighting, audio and interface.
- `dist/game-core.js`: collision, collection, timer, pause and reset state.
- `dist/style.css`, `dist/index.html`: responsive interface.
- `assets/source/meadow-assets.blend`: editable original Blender kit.
- `tools/create_assets.py`: reproducible Blender asset creation script, run inside Blender via MCP.
- `assets/source/asset-audit.json`: original geometry and export measurements.

The glTF export converts Blender's Z-up metres to Three.js Y-up metres. Named `Asset_*` roots are reset to the world origin before instancing; the explorer's named limb pivots remain editable and animate at runtime. Browser collision uses separate simple shapes rather than the visual meshes. Background decorations have no collision.

Edit the supplied `.blend` in place for asset changes. Run the generator in a fresh Blender process when rebuilding the entire kit, so existing Blender datablocks do not change the stable export names.

## Checks

```sh
npm test
npm run build
```

All game assets were authored for this project in Blender 5.2.2. The shared flat vertex-colour material uses no image textures. Three.js 0.180.0 is MIT licensed; its license is included in `dist/vendor/THREE-LICENSE.txt` after building. The 3dviz-pro-max low-poly catalog record and Blender/Three.js handoff guidance informed the custom scene; no finished kit or third-party model was reused.

Best lap times stay in this browser's local storage. Audio is optional and synthesized locally. Reduced-motion preferences stop decorative coin motion and collection particles. Leaving the window pauses an active round.
