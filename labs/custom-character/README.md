# Custom Character lab source

Edit these files, not `public/labs/custom-character.html` (generated).

- `template.html`, `style.css`: interface and documentation.
- `original-player.js`: embedded pixels from the ten baseline-person PNGs.
- `model.js`: palette, procedural default pixels, shared project data, local saving.
- `editor.js`: draft-based pixel editor, tools, protected-original reset, Save.
- `game.js`: fixed-step simulation, collisions, tiled rendering.
- `scene.js`: placement, removal, patrol clearances, camera.
- `ui.js`: galleries, controls, startup.

`npm run build:lab` concatenates the ordered JavaScript modules into one script
and inlines CSS into a single static HTML file. No runtime imports or external
assets are required. `npm run build` also runs this step before Astro.
`npm run dev` watches lab source and rebuilds the HTML alongside Astro.
`npm run test:lab` tests drawing, gameplay, placement, and persistence.

Saved projects are versioned under `conkgames-custom-character-v2` in localStorage.
All pixel arrays contain 1024 colors (32 × 32). Colors may be null (transparent). Rendered canvases
are derived caches. Editor drafts are copied back only on Save. Collision shapes
are independent of pixel art. New obstacles reserve the spawn area and spring
patrol lanes. Restart rebuilds live enemies from their saved placements.

Original artwork is bundled as frozen `ORIGINAL_SPRITES` entries with names such as
`original.enemy.wheel` and `original.scene.floating1`. These never come from localStorage
and are never overwritten by Save. Reset copies the original into the editor draft.

The two sky colors persist independently. Legacy white-square/blank player defaults
upgrade to the original person sprites; existing custom drawings are preserved.

Player artwork renders at 2x pixel scale (64 × 64) around a centered 32 × 64 collision body. Walking uses walk 1, sideways, walk 2, sideways at 0.12 seconds/frame.
Each enemy has five 0.16-second animation frames plus a separate faint pose.
enemy1 mirrors horizontally on reversal. enemy2 stays upright and reverses
frame order on descent; exhaust particles always trail beneath its flame base.

Sideways, Walk 1, and Walk 2 share right-facing artwork mirrored for left movement.
Saved right-facing frames migrate to the shared slots.
A/D or Left/Right move; W, Up, or Space jump; S or Down face forward. Crouch is removed.

Show hitboxes (beside How to play) overlays the current collision rectangles in world space: cyan player, orange live enemies, pink spikes. It defaults off and does not alter physics. Spike collision and overlay share spikeHitbox().

World units: SIZE = 32 pixels. Player = 1 × 2 blocks, enemies = 2 × 2 blocks (32 × 32 art at 2x), blocks and spike hitboxes = 1 × 1 block. Terrain and initial placements share a zero-origin block grid; moving actors move smoothly. Green top edges on live enemy hitboxes mark stompable surfaces.
Saved projects include blockGridVersion: 1. Old placements snap to the grid; custom tall artwork migrates into the square canvas.

Player canvas update: all six poses use 32 × 32 pixels rendered at 64 × 64. The 32 × 64 hitbox stays centered (art extends 16 world pixels on either side). Default player pixels are restored exactly from commit 1ad270d, with right-facing frames mapped to Sideways, Walk 1, and Walk 2. Untouched discarded defaults revert to the Git artwork; custom tall drawings are reduced into the central 16 columns to preserve their world proportions.

Standing defaults (Front, Sideways, Walk 1, Walk 2) stretch only vertically to occupy rows 0–31. Faint is translated downward to row 31; Jump is unchanged. The original Git artwork is retained for saved-default migration.

The approved player artwork is stored in player-defaults.json. The build validates and embeds all six poses without transforming the pixels; Reset restores these approved defaults. The temporary export control has been removed.
