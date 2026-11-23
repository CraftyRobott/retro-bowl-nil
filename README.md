# Retro Bowl College NIL + Transfer Admissions

An in-progress standalone mod for Retro Bowl College HTML5. It runs through the existing `engine/mods/loader.js` and does not modify `RetroBowl.js`.

## Current implementation

- Reuses the game's native college admissions trigger, admissions room, player list, paging, player profiles, confirmation flow, roster insertion, and admissions cleanup.
- Keeps the game's original 50 freshman candidates and appends up to 50 additional transfer candidates.
- Generates the additional candidates across all ten native position IDs, with ages 19–21 (sophomores, juniors, and seniors).
- Prices both freshman and transfer candidates using the mod's annual NIL valuation scale.
- Displays the candidate's NIL offer and remaining team budget in the native player-profile detail screen.
- Charges the NIL budget only after the native confirmation handler successfully adds the candidate to the roster.
- Sets admissions recruitment-credit cost to zero for NIL candidates, keeping recruiting credits separate from NIL dollars.
- Prevents other schools from removing candidates between admissions picks, so the list behaves like a transfer portal rather than a competitive draft.
- Preserves the native admissions Done/Finish flow.
- Saves NIL budget, cap, spending, and year in the save's `rbnil` INI section. The candidate list itself is saved by the game's native draft-list save code.
- Refreshes the annual NIL budget at the next season transition. Unspent budget does not carry over.

## Install

Copy `engine/mods/nil_transfer_portal.js` into the game's `engine/mods/` directory. The existing auto-discovering loader should detect it.

## How it works in-game

1. Enter the offseason and open the game's normal **Admissions** screen.
2. Browse the expanded native player list. It should contain freshmen plus upper-class transfers.
3. Select a player to open the normal player profile. The profile's secondary value line displays the annual NIL offer and remaining budget.
4. Confirm the selection through the game's normal confirmation prompt. The native roster/signing flow runs, and the NIL amount is deducted.
5. Use the game's normal Done/Finish control to close admissions.

There is no separate Transfer Portal button, HTML overlay, or keyboard shortcut in this version.

## Current budget model

The budget tiers are still provisional and use the team's offense/defense ratings as a program-strength proxy:

- Top programs: $50M
- Upper-middle programs: $37M
- Lower programs: $10M

The cap never decreases below a previously established value. Exact school-tier mapping, coaching-credit NIL cap upgrades, annual retention/renewal offers, and roster-limit behavior still need further work.

## Testing status

Version 0.3.0 has been syntax-checked and its source integration points have been checked against the uploaded game decompilation. It has **not yet been verified in a live game session**. In particular, confirm that the admissions list reaches 100 candidates, upper-class ages display correctly, NIL values appear in the player profile, signing deducts the budget once, and the save/load cycle preserves the expanded list and budget.

## Source integration notes

The mod wraps the native admissions trigger and player-list generator, the admissions attrition function, the player confirmation handler, the native player-profile draw event, save/load, and new-season transition. All game player creation and roster insertion continue to use the game's own functions.