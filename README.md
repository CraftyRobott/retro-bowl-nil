# Retro Bowl College NIL + Transfer Portal

An in-progress standalone mod for Retro Bowl College HTML5. It is designed to run through the existing `engine/mods/loader.js` without editing `RetroBowl.js`.

## Current implementation

- Intercepts the college admissions trigger and prepares the offseason portal pool instead of opening the stock admissions draft.
- Adds a native Retro Bowl-style NIL balance readout and Transfer Portal button to the college Athletics Office, using the game's own text and button objects.
- Restyles the portal panel to better match the game's dark menu, bright accent, and compact card styling. The player-list panel is still an HTML overlay in this version; its controls have not yet been fully ported to the game's native draw system.
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

- Open **Front Office / Athletics Office** and select the native **Transfer Portal** button.
- The NIL balance shown in the office is the current remaining annual budget.
- Press **N** to reopen the current portal while its offseason pool is active (debug/recovery shortcut).
- Press **Escape** or use **Close** to dismiss it.

## Development status

This is the first playable integration pass, not the finished NIL system. Program-tier budget mapping, annual player retention/renewal offers, NIL cap upgrades, roster-limit verification across game variants, and full native rendering of the portal player list and offer controls remain on the roadmap. The initial budget tier is deliberately isolated in the code and currently uses the team's offense/defense ratings as a temporary proxy.

## Source integration notes

The mod uses the game's existing functions for player creation, college player correction, rating calculation, team lookup, and save-slot naming. It wraps the admissions trigger, save/load functions, and new-season function at runtime. The base game file is not modified.
