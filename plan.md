# SHOW DON'T TELL

# ConkGames — Plan

## Concept
A game portal / arcade hub in the spirit of Addicting Games / Miniclip — fun-first, not a sterile portfolio. Visitors land on a game shelf and just start playing.

## Goals
- Surface all games Jacob has built in one place
- Feel like an arcade, not a resume
- Easy to add new games over time

## Stack (proposed)
- Plain HTML/CSS/JS or a lightweight framework (Astro, SvelteKit) — no heavy backend needed
- Static hosting AWS S3

## Site Structure
```
/               → Arcade lobby (game grid, featured game)
/games/<slug>   → Individual game page (embeds the game, shows description/controls)
/about          → Short "who made this" blurb
```

## Lobby Page
- Big hero area with a featured / newest game
- Scrollable grid of game cards (thumbnail, title, genre tag, play button)
- Filters by genre (action, puzzle, etc.) once there are enough games
- Pixel-art or retro aesthetic; bright colors, chunky fonts

## Game Card
- Thumbnail screenshot
- Title + short tagline
- Genre tag + estimated play time
- "Play Now" → routes to `/games/<slug>`

## Game Page
- Full-screen or large iframe embed of the game
- Title, description, controls cheatsheet
- "More Games" row at the bottom

## single_file_games

Self-contained games that live entirely in one HTML file. Each game gets its own folder under `single_file_games/`:

```
single_file_games/
├── phonepass/
│   └── index.html      ← conkgames.com/phonepass
└── newgame/
    └── index.html       ← conkgames.com/newgame
```

The folder name becomes the URL path. When a game is added or changed, both the folder and the `index.html` inside it are upserted to the `conkgames` S3 bucket at the matching path, so `single_file_games/phonepass/index.html` lands at `s3://conkgames/phonepass/index.html`.

## Adding a New Game (workflow)
1. Create a folder under `single_file_games/<gamename>/`
2. Add a single `index.html` file inside it (the entire game lives here)
3. Add an entry to a central `games.js` / `games.json` data file so the lobby card appears
4. Drop a thumbnail in `/public/thumbs/`
5. Push to `main` — CI/CD syncs the new folder to S3 and invalidates the CloudFront cache
