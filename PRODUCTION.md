# Pocket Meadow

A small browser coin hunt: guide a backpack-wearing explorer through a sunny floating meadow, collect twelve coins in sixty seconds, and replay to improve the finishing time.

Desktop keyboard and touch controls share the same collision-aware controller. A fixed isometric camera keeps movement predictable. Tree trunks, rocks and the cottage obstruct movement; the meadow edge contains the player. Collection, timer, pause, completion and reset are driven by one game state.

Blender owns the original low-poly explorer, coins, trees, stones, cottage, crates and flowers. Three.js owns placement, controls, collision, coin animation, lighting and the interface. Sources remain editable in `assets/source/meadow-assets.blend`; delivery uses a small GLB kit, metre scale, Y-up after glTF export, named asset roots and floor-level pivots.

Budget: fewer than 10,000 unique source triangles, no image textures, at most two shared materials, an asset download under 500 KB, and a single shadow-casting sun. The explorer is approximately one metre tall. Gameplay assets use flat vertex colours and readable silhouettes. No purchased or generated third-party models.

The build uses 3dviz-pro-max guidance for object structure, Blender/Three.js handoff, lighting ownership, and real-frame review. Retrieved catalog records and actual validation results will be recorded after use. Arjun's Blender director, low-poly, optimization and export workflows guide the original asset kit.
