// @name Retro Bowl College NIL + Transfer Admissions
// @description Uses the native college admissions screen as an expanded transfer portal with annual NIL offers.
// @version 0.3.0
(function () {
    "use strict";
    if (window.__RBNIL_LOADED__) return;
    window.__RBNIL_LOADED__ = true;

    const M = window.RBNIL = {
        version: "0.3.0",
        game: null,
        caller: null,
        year: -1,
        generated: false,
        budget: 0,
        cap: 0,
        spent: 0,
        signing: false
    };

    const POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const TRANSFER_COUNTS = [5, 5, 7, 4, 7, 6, 5, 8, 2, 1]; // 50 additional players
    const log = (...args) => console.log("[RB NIL]", ...args);
    const warn = (...args) => console.warn("[RB NIL]", ...args);

    function main() {
        try {
            const all = GetWithArray(YYASSET_REF(0x00000062));
            for (const key in all) {
                if (Object.prototype.hasOwnProperty.call(all, key)) return all[key];
            }
        } catch (_) {}
        return null;
    }

    function setContext(inst, other) {
        M.caller = other;
        M.game = main() || inst || M.game;
        return M.game;
    }

    function isCollege() {
        try {
            return !!(M.game && window.gml_Script_s_is_co_mode(M.game, M.caller));
        } catch (_) {
            return false;
        }
    }

    function get(map, key) {
        try { return ds_map_find_value(map, key); } catch (_) { return undefined; }
    }

    function set(map, key, value) {
        ds_map_set(map, key, value);
    }

    function rating(player) {
        try {
            return Number(window.gml_Script_s_get_player_rating(M.game, M.caller, player)) || 0;
        } catch (_) {
            return 0;
        }
    }

    function nilValue(playerRating) {
        if (playerRating >= 10) return 7000000;
        if (playerRating >= 9) return 5000000;
        if (playerRating >= 8) return 3500000;
        if (playerRating >= 7) return 2200000;
        if (playerRating >= 6) return 1300000;
        if (playerRating >= 5) return 800000;
        if (playerRating >= 4) return 500000;
        if (playerRating >= 3) return 300000;
        return 150000;
    }

    function money(value) {
        return "$" + (Number(value || 0) / 1000000).toFixed(2) + "M";
    }

    // This preserves the current mod's provisional program-strength budget tiers.
    // They are deliberately isolated until we map the game's school tiers reliably.
    function schoolBudget() {
        let team;
        try {
            team = window.gml_Script_s_get_team_by_id(M.game, M.caller, M.game.gmlmyteam_id);
        } catch (_) {}
        const offense = Number(get(team, "offense")) || 1;
        const defense = Number(get(team, "defense")) || 1;
        const overall = offense + defense;
        if (overall >= 17) return 50000000;
        if (overall >= 14) return 37000000;
        if (overall >= 11) return 30000000;
        return 10000000;
    }

    function resetAnnualBudget() {
        M.cap = Math.max(Number(M.cap) || 0, schoolBudget());
        M.budget = M.cap;
        M.spent = 0;
        M.year = Number(M.game.gmlyear);
        log("Annual NIL budget reset", money(M.budget), "year", M.year);
    }

    function priceCandidate(player) {
        const value = nilValue(rating(player));
        set(player, "rbnil_candidate", 1);
        set(player, "rbnil_value", value);
        set(player, "rbnil_year", Number(M.game.gmlyear));
        // Native admissions charges recruitment credits. NIL dollars replace that charge.
        set(player, "rc_cost", 0);
        return value;
    }

    function addTransferCandidates() {
        const list = M.game && M.game.gmldraftlist;
        if (!list) return;

        // Native freshmen remain in the list, but receive an NIL valuation too.
        for (let i = 0; i < ds_list_size(list); i++) {
            const player = ds_list_find_value(list, i);
            priceCandidate(player);
        }

        // Append 50 upper-class players to the original 50-player admissions pool.
        for (let positionIndex = 0; positionIndex < POSITIONS.length; positionIndex++) {
            const position = POSITIONS[positionIndex];
            for (let n = 0; n < TRANSFER_COUNTS[positionIndex]; n++) {
                const age = 19 + Math.floor(Math.random() * 3); // SO / JR / SR
                try {
                    const player = window.gml_Script_s_create_player(M.game, M.caller, position, age, 2, 9);
                    if (!player || typeof player !== "number") continue;
                    window.gml_Script_s_college_correct_new_player(M.game, M.caller, player);
                    set(player, "age", age);
                    set(player, "teamid", -1);
                    set(player, "signed_year", -1);
                    set(player, "rbnil_class_year", age - 18);
                    priceCandidate(player);
                    ds_list_add(list, player);
                } catch (error) {
                    warn("Could not generate transfer candidate", { position, age, error });
                }
            }
        }

        try {
            M.game.gmldraftlist = window.gml_Script_s_sort_players(M.game, M.caller, list, 2);
        } catch (error) {
            warn("Native admissions sorting failed; retaining appended order", error);
        }

        M.generated = true;
        M.year = Number(M.game.gmlyear);
        log("Expanded native admissions pool", ds_list_size(M.game.gmldraftlist), "players (50 freshmen + up to 50 transfers)");
    }

    function saveExtension() {
        try {
            if (!M.game || typeof ini_open !== "function" || typeof window.gml_Script_s_get_savename !== "function") return;
            const filename = window.gml_Script_s_get_savename(M.game, M.caller);
            if (!filename) return;
            ini_open(filename);
            ini_write_real("rbnil", "version", 1);
            ini_write_real("rbnil", "year", M.year);
            ini_write_real("rbnil", "generated", M.generated ? 1 : 0);
            ini_write_real("rbnil", "budget", M.budget);
            ini_write_real("rbnil", "cap", M.cap);
            ini_write_real("rbnil", "spent", M.spent);
            ini_close();
        } catch (error) {
            warn("Could not save NIL extension", error);
            try { ini_close(); } catch (_) {}
        }
    }

    function loadExtension(filename) {
        try {
            if (!filename || typeof ini_open !== "function") return;
            ini_open(filename);
            const version = ini_read_real("rbnil", "version", 0);
            if (!version) {
                ini_close();
                M.year = -1;
                M.generated = false;
                M.budget = 0;
                M.cap = 0;
                M.spent = 0;
                return;
            }
            M.year = ini_read_real("rbnil", "year", -1);
            M.generated = ini_read_real("rbnil", "generated", 0) === 1;
            M.budget = ini_read_real("rbnil", "budget", 0);
            M.cap = ini_read_real("rbnil", "cap", 0);
            M.spent = ini_read_real("rbnil", "spent", 0);
            ini_close();
            log("Restored NIL state", money(M.budget), "remaining; cap", money(M.cap));
        } catch (error) {
            warn("Could not load NIL extension", error);
            try { ini_close(); } catch (_) {}
        }
    }

    function wrap(name, factory) {
        const original = window[name];
        if (typeof original !== "function" || original.__rbnilWrapped) return;
        const replacement = factory(original);
        replacement.__rbnilWrapped = true;
        window[name] = replacement;
    }

    // The actual native admissions trigger and room are preserved.
    wrap("gml_Script_s_college_admissions_check_trigger", original => function (inst, other) {
        setContext(inst, other);
        if (isCollege() && Number(M.game.gmlweek) === 1 && Number(M.game.gmlcollege_admissions_draft_round) === 1) {
            if (!M.cap || M.year !== Number(M.game.gmlyear)) resetAnnualBudget();
        }
        return original.apply(this, arguments);
    });

    // Expand the real game list immediately after the game creates its 50 freshmen.
    wrap("gml_Script_s_create_draftlist", original => function (inst, other) {
        setContext(inst, other);
        const result = original.apply(this, arguments);
        if (isCollege() && Number(M.game.gmlcollege_admissions_draft_round) > 0) {
            if (!M.cap || M.year !== Number(M.game.gmlyear)) resetAnnualBudget();
            addTransferCandidates();
            // The stock generator saves before our appended players exist; save again now.
            try { window.gml_Script_s_savegame(M.game, M.caller); } catch (error) { warn("Post-generation save failed", error); }
        }
        return result;
    });

    // Other schools do not remove candidates between picks: this is a transfer portal,
    // not a three-round competition draft.
    wrap("gml_Script_s_college_admissions_players_lost_per_round", () => function () {
        return 0;
    });

    // Enforce NIL affordability before the stock confirmation handler adds the player
    // to the roster. The native signing, roster, news, achievements and navigation run
    // unchanged when the offer is affordable.
    wrap("gml_Script_btn_response_pick_player_yes", original => function (inst, other) {
        setContext(inst, other);
        if (!isCollege() || M.signing) return original.apply(this, arguments);
        const player = M.game.gmlplayer_profile;
        if (!player || Number(get(player, "rbnil_candidate")) !== 1) return original.apply(this, arguments);

        const value = Number(get(player, "rbnil_value")) || nilValue(rating(player));
        if (value > M.budget) {
            alert("This NIL offer costs " + money(value) + ", but only " + money(M.budget) + " remains in your annual budget.");
            return;
        }

        const wasOnRoster = ds_list_find_index(M.game.gmlroster, player) >= 0;
        M.signing = true;
        let result;
        try {
            result = original.apply(this, arguments);
        } finally {
            M.signing = false;
        }
        const isOnRoster = ds_list_find_index(M.game.gmlroster, player) >= 0;
        if (!wasOnRoster && isOnRoster) {
            M.budget -= value;
            M.spent += value;
            set(player, "rbnil_deal", value);
            set(player, "rbnil_deal_year", Number(M.game.gmlyear));
            set(player, "rbnil_candidate", 0);
            saveExtension();
            log("Signed", get(player, "fname"), get(player, "lname"), "for", money(value), "remaining", money(M.budget));
        }
        return result;
    });

    // The native player profile has an intentionally blank secondary value label
    // (instance 100448). Reuse it to show the annual NIL offer without a custom UI.
    wrap("gml_Object_obj_player_profile_Draw_64", original => function (inst, other) {
        setContext(inst, other);
        const result = original.apply(this, arguments);
        try {
            const player = inst.gmlpmap;
            if (player && Number(get(player, "rbnil_candidate")) === 1 && isCollege()) {
                const label = yyInst(inst, other, 100448);
                label.gmltext = "NIL OFFER: " + money(get(player, "rbnil_value")) + "/YR  |  AVAILABLE: " + money(M.budget);
                label.visible = true;
                label.gmltcolour = global.gmlc_primary;
            }
        } catch (_) {}
        return result;
    });

    wrap("gml_Script_s_savegame", original => function (inst, other) {
        setContext(inst, other);
        const result = original.apply(this, arguments);
        saveExtension();
        return result;
    });

    wrap("gml_Script_s_loadgame", original => function (inst, other, filename) {
        M.caller = other;
        const result = original.apply(this, arguments);
        M.game = main() || inst;
        loadExtension(filename);
        return result;
    });

    wrap("gml_Script_s_start_new_season", original => function (inst, other) {
        const result = original.apply(this, arguments);
        setContext(inst, other);
        if (isCollege()) {
            M.generated = false;
            resetAnnualBudget();
            saveExtension();
        }
        return result;
    });

    log("Loaded native admissions NIL mod v" + M.version + "; native admissions room and player-selection flow retained");
})();