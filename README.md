# Retro Bowl College NIL + Transfer Admissions

An in-progress standalone mod for Retro Bowl College HTML5. It runs through the existing `engine/mods/loader.js` and does not modify `RetroBowl.js`.

## Current implementation (v0.4.0)

- Converts the game's existing **Scholarship Fund** into the NIL budget. There is no separate NIL balance, cap, spending ledger, or NIL save file.
- Uses the game's native `gmlrecruitment_credits` balance for NIL money, expressed in millions of dollars.
- Uses the native `recruitment_credits_cap_total` calculation for the NIL cap. The base game's separate 50/60 field is preserved because it controls the 10/12-player roster limit.
- Uses native `rc_cost` for player NIL offers. The game's own admissions affordability check, confirmation flow, signing, balance deduction, and save/load behavior remain in use.
- Changes the Scholarship Fund label and amount displays to NIL Budget / millions. Candidate profiles show the native `rc_cost` as an annual NIL offer.
- Keeps the native admissions screen, player list, paging, profiles, confirmation flow, roster insertion, and Done/Finish cleanup.
- Keeps the original 50 freshman candidates and appends up to 50 transfers across all ten native position IDs, ages 19–21 (sophomores, juniors, and seniors).
- Prevents other schools from removing candidates between admissions picks, so the list behaves like a transfer portal.
- Preserves the native Coaching Credit upgrade cost of 100 credits, but changes its permanent NIL-cap increase to **$3M per upgrade**.
- Refreshes the native NIL balance to the full current cap at the start of each new season. Unspent money does not carry over.
- Continues to use the game's native save fields for the fund balance and Coaching Credit cap upgrades. A single migration-version marker is written into the existing `[savegame]` section; no separate NIL budget section is used.

## School budget tiers

The initial tier mapping uses the game's actual conference prestige value and the team's existing offense + defense ratings:

- **Top tier:** prestige 3 and combined team rating 15–20 → $48M–$52M.
- **Lower Power Four:** prestige 3 and combined team rating below 15 → $8M–$12M.
- **Upper-middle FBS:** prestige 2 → $30M–$44M.
- **Lower tier:** prestige 0–1 → $8M–$12M.

The values interpolate within each range based on the team's combined offense/defense rating. This is an initial mapping and can be tuned after in-game testing.

## Player NIL valuation

Offers use the player's native 1–10 rating:

| Rating | Annual NIL offer |
|---:|---:|
| 10 | $7.00M |
| 9 | $5.00M |
| 8 | $3.50M |
| 7 | $2.20M |
| 6 | $1.30M |
| 5 | $0.80M |
| 4 | $0.50M |
| 3 | $0.30M |
| 1–2 | $0.15M |

## Install

Copy `engine/mods/nil_transfer_portal.js` into the game's `engine/mods/` directory. The existing auto-discovering loader should detect it. Hard-refresh the game after updating the mod.

## How it works in-game

1. Open the game's normal **Admissions** screen during the offseason.
2. Browse the expanded pool of freshmen and upper-class transfers.
3. Open a player's native profile to see the annual NIL offer.
4. Sign through the game's normal confirmation flow. The native Scholarship Fund balance is deducted by the offer amount.
5. Use the normal Done/Finish control to close admissions.

The Coaching Credit NIL-cap upgrade remains in its native front-office location.

There is no separate Transfer Portal button, HTML overlay, keyboard shortcut, or parallel NIL budget.

## Testing status

Version 0.4.0 has been syntax-checked with Node and exercised with a mocked runtime test covering tier-cap calculation, the 100-player pool, annual refresh, and the +$3M Coaching Credit upgrade. The code has also been checked against the uploaded game source for the native fund, admissions cost, profile display, save/load, and roster-cap integration points.

It has **not yet been verified in a live game session**. Please test:
- The front-office fund displays as NIL Budget in millions.
- Player profiles show the correct NIL offer.
- Signing a player deducts the offer from the native balance.
- Coaching Credits add $3M to the cap for 100 credits.
- A new season restores the fund to its full cap.
- The existing 10/12-player roster-size option still works.
- The 100-player admissions pool survives save/load.

## Source integration notes

The mod wraps the native fund-cap calculation, fund display, Coaching Credit upgrade, admissions trigger/list generation, player-profile draw, save/load, and new-season transition. It leaves the game's native `recruitment_credits_add`, admissions signing deduction, affordability check, roster insertion, and player-list persistence in place.
