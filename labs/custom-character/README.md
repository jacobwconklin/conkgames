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
Pixel arrays contain 1024 palette colors or null (transparent). Rendered canvases
are derived caches. Editor drafts are copied back only on Save. Collision shapes
are independent of pixel art. New obstacles reserve the spawn area and spring
patrol lanes. Restart rebuilds live enemies from their saved placements.

Original artwork is bundled as frozen `ORIGINAL_SPRITES` entries with names such as
`original.enemy.wheel` and `original.scene.floating1`. These never come from localStorage
and are never overwritten by Save. Reset copies the original into the editor draft.

The two sky colors persist independently. Legacy white-square/blank player defaults
upgrade to the original person sprites; existing custom drawings are preserved.

Player artwork renders at 3x pixel scale with a 48 x 84 collision body and
feet-aligned frames. Walking uses walk 1, idle, walk 2, idle at 0.12 seconds/frame.
Each enemy has five 0.16-second animation frames plus a separate faint pose.
enemy1 mirrors horizontally on reversal. enemy2 stays upright and reverses
frame order on descent; exhaust particles always trail beneath its flame base.
