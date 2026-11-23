# Retro Bowl College NIL + Transfer Portal

An in-progress standalone mod for Retro Bowl College HTML5. It is designed to run through the existing `engine/mods/loader.js` without editing `RetroBowl.js`.

## Current implementation

- Intercepts the college admissions trigger and opens a custom transfer portal instead of the admissions draft.
- Generates a position-balanced pool of transfer players using the game's own player-generation functions.
- Includes all four college class years (FR, SO, JR, SR).
- Groups players by QB, RB, WR, TE, OL, DL, LB, DB, and K.
- Keeps one pool for the full offseason; reopening the portal does not reroll players.
- Adds a Generate More action that appends players to the existing pool.
- Signs players into the real game roster and deducts their annual NIL valuation.
- Extends the game's INI save with the portal pool and NIL budget so the pool survives save/load.
- Expires the old portal at the next season transition.

## Install

Copy `engine/mods/nil_transfer_portal.js` into the game's `engine/mods/` directory. The existing auto-discovering loader should detect it.

## Controls

- The portal opens when the game's college admissions trigger runs at the start of the season.
- Press **N** to reopen the current portal while its offseason pool is active.
- Press **Escape** or use **Close** to dismiss it.

## Development status

This is the first playable integration pass, not the finished NIL system. Program-tier budget mapping, annual player retention/renewal offers, NIL cap upgrades, roster-limit verification across game variants, and in-game visual polish remain on the roadmap. The initial budget tier is deliberately isolated in the code and currently uses the team's offense/defense ratings as a temporary proxy.

## Source integration notes

The mod uses the game's existing functions for player creation, college player correction, rating calculation, team lookup, and save-slot naming. It wraps the admissions trigger, save/load functions, and new-season function at runtime. The base game file is not modified.
