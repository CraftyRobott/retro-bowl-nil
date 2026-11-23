// @name Retro Bowl College NIL + Transfer Portal
// @description Persistent transfer portal and annual NIL budget for Retro Bowl College.
// @version 0.2.1
(function () {
    "use strict";
    if (window.__RBNIL_LOADED__) return;
    window.__RBNIL_LOADED__ = true;

    const M = window.RBNIL = {
        version: "0.2.1", active: false, pool: [], year: -1, generated: false,
        budget: 0, cap: 0, spent: 0, position: "ALL", game: null, caller: null, overlay: null,
        officeLabel: null, officeButton: null
    };
    const POS = [
        { key: "QB", ids: [1], count: 10 }, { key: "RB", ids: [2], count: 10 },
        { key: "WR", ids: [3], count: 14 }, { key: "TE", ids: [4], count: 7 },
        { key: "OL", ids: [5], count: 14 }, { key: "DL", ids: [6], count: 12 },
        { key: "LB", ids: [7], count: 10 }, { key: "DB", ids: [8, 9], count: 14 },
        { key: "K", ids: [10], count: 4 }
    ];
    const log = (...a) => console.log("[RB NIL]", ...a);
    const el = (tag, attrs, parent) => {
        const n = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([k, v]) => {
            if (k === "text") n.textContent = v;
            else if (k === "html") n.innerHTML = v;
            else if (k === "style") Object.assign(n.style, v);
            else if (k.startsWith("on")) n.addEventListener(k.slice(2).toLowerCase(), v);
            else n.setAttribute(k, v);
        });
        if (parent) parent.appendChild(n);
        return n;
    };
    function main() {
        try {
            const a = GetWithArray(YYASSET_REF(0x00000062));
            for (const k in a) if (Object.prototype.hasOwnProperty.call(a, k)) return a[k];
        } catch (_) {}
        return null;
    }
    function ready() {
        M.game = main();
        return !!(M.game && typeof window.gml_Script_s_create_player === "function");
    }
    function college() {
        return ready() && !!window.gml_Script_s_is_co_mode(M.game, M.caller);
    }
    function mapGet(p, k) { try { return ds_map_find_value(p, k); } catch (_) { return undefined; } }
    function mapSet(p, k, v) { ds_map_set(p, k, v); }
    function pos(id) {
        const p = POS.find(x => x.ids.includes(Number(id)));
        return p ? p.key : "?";
    }
    function rating(p) {
        try { return Number(window.gml_Script_s_get_player_rating(M.game, M.caller, p)) || 0; }
        catch (_) { return 0; }
    }
    function nilValue(r) {
        if (r >= 10) return 7000000;
        if (r >= 9) return 5000000;
        if (r >= 8) return 3500000;
        if (r >= 7) return 2200000;
        if (r >= 6) return 1300000;
        if (r >= 5) return 800000;
        if (r >= 4) return 500000;
        if (r >= 3) return 300000;
        return 150000;
    }
    const cash = n => "$" + (Number(n) / 1000000).toFixed(2) + "M";
    function budgetForSchool() {
        let t = null;
        try { t = window.gml_Script_s_get_team_by_id(M.game, M.caller, M.game.gmlmyteam_id); } catch (_) {}
        const o = Number(mapGet(t, "offense")) || 1;
        const d = Number(mapGet(t, "defense")) || 1;
        const overall = o + d;
        // Temporary program-size proxy; isolated for replacement with exact team-tier mapping.
        if (overall >= 17) return 50000000;
        if (overall >= 14) return 37000000;
        if (overall >= 11) return 30000000;
        return 10000000;
    }
    function resetBudget() {
        M.cap = Math.max(Number(M.cap) || 0, budgetForSchool());
        M.budget = M.cap;
        M.spent = 0;
        updateOfficeDisplay();
        M.year = Number(M.game.gmlyear);
    }
    function updateOfficeDisplay() {
        try {
            if (M.officeLabel && instance_exists(M.officeLabel)) {
                M.officeLabel.gmltext = "NIL AVAILABLE: " + cash(M.budget);
            }
        } catch (_) {}
    }
    function addFrontOfficeUI(inst, other) {
        try {
            M.caller = other;
            M.game = main() || inst;
            if (!college()) return;
            if (M.officeButton && instance_exists(M.officeButton)) {
                updateOfficeDisplay();
                return;
            }

            // The college Front Office room is 480x270. These coordinates
            // place the NIL panel in the open right-hand column above staff cards.
            const label = instance_create_layer(360, 67, "Instances", YYASSET_REF(0x0000004b));
            label.gmltext = "NIL AVAILABLE: " + cash(M.budget);
            label.gmldraw_box = false;
            label.gmlhalign = 1;
            label.gmlvalign = 1;
            label.gmlfont = global.gmlfnt_small_flex;
            label.gmltcolour = global.gmlc_primary;
            label.gmlshadow = true;
            M.officeLabel = label;

            const button = instance_create_layer(360, 91, "Instances", YYASSET_REF(0x00000014));
            button.gmltext = "TRANSFER PORTAL";
            button.gmlbtn_image = YYASSET_REF(0x01000069);
            button.sprite_index = YYASSET_REF(0x01000069);
            button.image_xscale = 1.9393;
            button.gmlactive = true;
            button.gmlonClickAction = kgml_Script_btn_click_Boost_Salary_Cap;
            button.gmlrbnil_portal_button = true;
            M.officeButton = button;
            log("Athletics Office NIL controls added", { label: label.id, button: button.id });
        } catch (e) {
            console.warn("[RB NIL] Athletics Office integration failed", e);
        }
    }
    function makePlayer(id, age) {
        const p = window.gml_Script_s_create_player(M.game, M.caller, id, age, 2, 9);
        if (!p || typeof p !== "number") return null;
        try { window.gml_Script_s_college_correct_new_player(M.game, M.caller, p); } catch (_) {}
        mapSet(p, "age", age);
        mapSet(p, "teamid", -1);
        mapSet(p, "signed_year", -1);
        mapSet(p, "contract", 8);
        mapSet(p, "nil_value", nilValue(rating(p)));
        mapSet(p, "nil_year", Number(M.game.gmlyear));
        mapSet(p, "nil_portal", 1);
        return p;
    }
    function saveExtension() {
        try {
            if (!ready() || typeof ini_open !== "function") return;
            const file = window.gml_Script_s_get_savename(M.game, M.caller);
            if (!file) return;
            ini_open(file);
            ini_write_real("rbnil", "version", 1);
            ini_write_real("rbnil", "year", M.year);
            ini_write_real("rbnil", "generated", M.generated ? 1 : 0);
            ini_write_real("rbnil", "budget", M.budget);
            ini_write_real("rbnil", "cap", M.cap);
            ini_write_real("rbnil", "spent", M.spent);
            ini_write_real("rbnil", "count", M.pool.length);
            M.pool.forEach((p, i) => ini_write_string("rbnil", "player_" + i, ds_map_write(p)));
            ini_close();
        } catch (e) { console.warn("[RB NIL] Save extension failed", e); }
    }
    function generateInitial() {
        if (M.generated && M.year === Number(M.game.gmlyear)) return;
        M.pool = [];
        M.generated = true;
        M.year = Number(M.game.gmlyear);
        POS.forEach(p => {
            for (let i = 0; i < p.count; i++) {
                const id = p.ids[Math.floor(Math.random() * p.ids.length)];
                const player = makePlayer(id, 18 + Math.floor(Math.random() * 4));
                if (player) M.pool.push(player);
            }
        });
        log("Created", M.pool.length, "players for offseason", M.year);
        saveExtension();
    }
    function generateMore(key) {
        const list = key === "ALL" ? POS : POS.filter(p => p.key === key);
        list.forEach(p => {
            const n = key === "ALL" ? 2 : Math.max(3, Math.ceil(p.count / 2));
            for (let i = 0; i < n; i++) {
                const id = p.ids[Math.floor(Math.random() * p.ids.length)];
                const player = makePlayer(id, 18 + Math.floor(Math.random() * 4));
                if (player) M.pool.push(player);
            }
        });
        saveExtension();
        render();
    }
    function roster() {
        const out = [];
        try { for (let i = 0; i < ds_list_size(M.game.gmlroster); i++) out.push(ds_list_find_value(M.game.gmlroster, i)); } catch (_) {}
        return out;
    }
    function sign(i) {
        const p = M.pool[i];
        if (!p) return;
        const value = Number(mapGet(p, "nil_value")) || 0;
        if (value > M.budget) return alert("Not enough NIL budget for this annual deal.");
        const rosterCap = Number(window.gml_Script_s_get_roster_cap(M.game, M.caller)) || 10;
        if (roster().length >= rosterCap) return alert("Your roster is full. Make room before signing a transfer.");
        mapSet(p, "teamid", Number(M.game.gmlmyteam_id));
        mapSet(p, "signed_year", Number(M.game.gmlyear));
        mapSet(p, "contract", 8);
        mapSet(p, "nil_year", Number(M.game.gmlyear));
        mapSet(p, "nil_portal", 0);
        ds_list_add(M.game.gmlroster, p);
        M.spent += value;
        M.budget -= value;
        updateOfficeDisplay();
        M.pool.splice(i, 1);
        saveExtension();
        render();
    }
    function classYear(p) {
        return ["FR", "SO", "JR", "SR"][Math.max(0, Math.min(3, (Number(mapGet(p, "age")) || 18) - 18))];
    }
    function styles() {
        if (document.getElementById("rbnil-css")) return;
        const css = [
            "#rbnil-overlay{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.86);display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;color:#fff}",
            "#rbnil-panel{width:min(960px,96vw);height:min(650px,94vh);background:#202020;border:4px solid #f4f0df;outline:3px solid #111;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 0 #080808}",
            "#rbnil-head{background:#303030;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #111}",
            "#rbnil-title{font-size:22px;font-weight:900;letter-spacing:1px;text-transform:uppercase}#rbnil-sub{font-size:10px;color:#c5c5c5;margin-top:3px;letter-spacing:.5px}",
            "#rbnil-close{background:#9b3030;color:white;border:2px solid #111;padding:7px 12px;font-weight:bold;cursor:pointer;text-transform:uppercase}",
            "#rbnil-summary{display:flex;gap:18px;flex-wrap:wrap;padding:9px 14px;background:#171717;font-size:12px;border-bottom:2px solid #080808;text-transform:uppercase}#rbnil-summary b,.rbnil-value{color:#f4d35e}",
            "#rbnil-tabs{display:flex;gap:3px;padding:8px 10px 0;background:#292929;flex-wrap:wrap}.rbnil-tab{background:#484848;color:#fff;border:2px solid #111;padding:7px 10px;font-weight:bold;cursor:pointer}.rbnil-tab.active{background:#e3c64e;color:#171717;box-shadow:inset 0 -3px 0 #9e852d}",
            "#rbnil-tools{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:#242424;border-top:2px solid #111}#rbnil-tools button{background:#555;color:white;border:2px solid #111;padding:6px 9px;cursor:pointer;font-weight:bold}",
            "#rbnil-list{padding:10px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(225px,1fr));gap:8px;align-content:start}",
            ".rbnil-player{background:#303030;border:2px solid #111;padding:9px;min-height:100px;box-shadow:inset 0 0 0 1px #666}.rbnil-row{display:flex;justify-content:space-between;align-items:center;gap:8px}.rbnil-name{font-weight:800;font-size:14px}.rbnil-rating{color:#f4d35e;font-weight:bold}.rbnil-meta{color:#c1c1c1;font-size:11px;margin:5px 0}.rbnil-stats{display:flex;gap:8px;flex-wrap:wrap;color:#e0e0e0;font-size:10px;margin-bottom:8px}.rbnil-sign{background:#e3c64e;color:#171717;border:2px solid #111;padding:6px 9px;font-weight:900;cursor:pointer;text-transform:uppercase}",
            "#rbnil-empty{grid-column:1/-1;text-align:center;padding:45px;color:#c5c5c5}#rbnil-foot{padding:7px 12px;background:#171717;color:#aaa;font-size:10px;border-top:2px solid #080808}",
            "@media(max-width:650px){#rbnil-summary{gap:7px;font-size:10px}.rbnil-tab{padding:6px 8px}#rbnil-title{font-size:17px}}"
        ].join("\n");
        el("style", { id: "rbnil-css", text: css }, document.head);
    }
    function close() {
        if (M.overlay) M.overlay.remove();
        M.overlay = null;
        M.active = false;
    }
    function render() {
        if (!M.active) return;
        if (M.overlay) M.overlay.remove();
        styles();
        const ov = el("div", { id: "rbnil-overlay" }, document.body);
        M.overlay = ov;
        const panel = el("div", { id: "rbnil-panel" }, ov);
        const head = el("div", { id: "rbnil-head" }, panel);
        const brand = el("div", {}, head);
        el("div", { id: "rbnil-title", text: "TRANSFER PORTAL" }, brand);
        el("div", { id: "rbnil-sub", text: "COLLEGE FOOTBALL · NIL MARKETPLACE" }, brand);
        el("button", { id: "rbnil-close", text: "CLOSE  X", onclick: close }, head);
        const sum = el("div", { id: "rbnil-summary" }, panel);
        el("span", { html: "AVAILABLE: <b>" + M.pool.length + " PLAYERS</b>" }, sum);
        el("span", { html: "NIL REMAINING: <b>" + cash(M.budget) + "</b>" }, sum);
        el("span", { html: "ANNUAL SPEND: <b>" + cash(M.spent) + "</b>" }, sum);
        el("span", { html: "CAP: <b>" + cash(M.cap) + "</b>" }, sum);
        const tabs = el("div", { id: "rbnil-tabs" }, panel);
        [{ key: "ALL" }].concat(POS).forEach(p => {
            el("button", { class: "rbnil-tab" + (M.position === p.key ? " active" : ""), text: p.key, onclick: () => { M.position = p.key; render(); } }, tabs);
        });
        const tools = el("div", { id: "rbnil-tools" }, panel);
        el("span", { text: "AVAILABLE TRANSFERS · ANNUAL NIL VALUES" }, tools);
        el("button", { text: "+ GENERATE MORE", onclick: () => generateMore(M.position) }, tools);
        const list = el("div", { id: "rbnil-list" }, panel);
        const shown = M.pool.filter(p => M.position === "ALL" || pos(mapGet(p, "position")) === M.position);
        shown.sort((a, b) => rating(b) - rating(a));
        if (!shown.length) el("div", { id: "rbnil-empty", text: "No players at this position. Generate more to expand the pool." }, list);
        shown.forEach(p => {
            const card = el("div", { class: "rbnil-player" }, list);
            const row = el("div", { class: "rbnil-row" }, card);
            el("div", { class: "rbnil-name", text: String(mapGet(p, "fname") || "") + " " + String(mapGet(p, "lname") || "") }, row);
            el("div", { class: "rbnil-rating", text: rating(p).toFixed(1) + "/10" }, row);
            el("div", { class: "rbnil-meta", text: pos(mapGet(p, "position")) + " · " + classYear(p) }, card);
            const stats = el("div", { class: "rbnil-stats" }, card);
            ["speed", "strength", "skill", "stamina"].forEach(k => el("span", { text: k.slice(0, 3).toUpperCase() + " " + (mapGet(p, k) || 0) }, stats));
            const foot = el("div", { class: "rbnil-row" }, card);
            el("strong", { class: "rbnil-value", text: cash(mapGet(p, "nil_value")) + "/yr" }, foot);
            el("button", { class: "rbnil-sign", text: "OFFER NIL", onclick: () => sign(M.pool.indexOf(p)) }, foot);
        });
        el("div", { id: "rbnil-foot", text: "The portal pool remains fixed for this offseason. Generate More appends players; signing removes them. Press N to reopen while active." }, panel);
    }
    function open() {
        if (!ready() || !college()) return false;
        if (!M.generated || M.year !== Number(M.game.gmlyear)) {
            if (!M.cap) resetBudget();
            generateInitial();
        }
        M.active = true;
        M.position = "ALL";
        render();
        return true;
    }
    function loadExtension(file) {
        try {
            if (!file || typeof ini_open !== "function") return;
            ini_open(file);
            if (!ini_read_real("rbnil", "version", 0)) { ini_close(); return; }
            M.year = ini_read_real("rbnil", "year", -1);
            M.generated = ini_read_real("rbnil", "generated", 0) === 1;
            M.budget = ini_read_real("rbnil", "budget", 0);
            M.cap = ini_read_real("rbnil", "cap", 0);
            M.spent = ini_read_real("rbnil", "spent", 0);
            const count = Math.max(0, Math.min(250, ini_read_real("rbnil", "count", 0)));
            M.pool = [];
            for (let i = 0; i < count; i++) {
                const data = ini_read_string("rbnil", "player_" + i, "");
                if (!data) continue;
                const p = ds_map_create();
                ds_map_read(p, data);
                M.pool.push(p);
            }
            ini_close();
            log("Restored", M.pool.length, "portal players from save");
        } catch (e) { console.warn("[RB NIL] Load extension failed", e); }
    }
    function wrap(name, factory) {
        const original = window[name];
        if (typeof original !== "function" || original.__rbnilWrapped) return;
        const next = factory(original);
        next.__rbnilWrapped = true;
        window[name] = next;
    }
    function scheduleFrontOfficeUI(inst, other) {
        // The helper script runs partway through obj_frontoffice's Create event.
        // Defer creation until the whole event has finished adding stock staff
        // and salary-cap controls, otherwise those controls can cover the NIL UI.
        window.setTimeout(() => {
            addFrontOfficeUI(inst, other);
            if (M.officeLabel) M.officeLabel.depth = -100000;
            if (M.officeButton) M.officeButton.depth = -100000;
        }, 0);
    }
    wrap("gml_Object_obj_frontoffice_Create_0", original => function (inst, other) {
        const result = original.apply(this, arguments);
        scheduleFrontOfficeUI(inst, other);
        return result;
    });
    // This script is called partway through obj_frontoffice_Create. Defer the
    // UI creation so it happens after the stock Create event finishes.
    wrap("gml_Script_s_check_intro_rm_frontoffice", original => function (inst, other) {
        const result = original.apply(this, arguments);
        scheduleFrontOfficeUI(inst, other);
        return result;
    });
    // obj_button executes actions through script_execute, so route only our
    // marked NIL button through the portal and leave the stock salary-cap
    // button behavior untouched.
    wrap("gml_Script_btn_click_Boost_Salary_Cap", original => function (inst, other) {
        if (inst && inst.gmlrbnil_portal_button) {
            M.caller = other;
            M.game = main() || inst;
            open();
            return;
        }
        return original.apply(this, arguments);
    });
    wrap("gml_Script_s_college_admissions_check_trigger", original => function (inst, other) {
        M.caller = other;
        M.game = inst || main();
        if (college() && Number(M.game.gmlweek) === 1 && Number(M.game.gmlcollege_admissions_draft_round) > 0) {
            if (!M.cap || M.year !== Number(M.game.gmlyear)) resetBudget();
            if (!M.generated || M.year !== Number(M.game.gmlyear)) generateInitial();
            // Consume the stock admissions trigger. The portal is now opened
            // from the native Athletics Office button instead of a browser popup.
            M.game.gmlcollege_admissions_draft_round = 0;
            updateOfficeDisplay();
            return true;
        }
        return original.apply(this, arguments);
    });
    wrap("gml_Script_s_savegame", original => function (inst, other) {
        M.caller = other;
        M.game = main() || inst;
        const result = original.apply(this, arguments);
        saveExtension();
        return result;
    });
    wrap("gml_Script_s_loadgame", original => function (inst, other, file) {
        M.caller = other;
        const result = original.apply(this, arguments);
        M.game = main() || inst;
        loadExtension(file);
        return result;
    });
    wrap("gml_Script_s_start_new_season", original => function (inst, other) {
        close();
        const result = original.apply(this, arguments);
        M.caller = other;
        M.game = main() || inst;
        if (college()) {
            M.pool.forEach(p => { try { ds_map_destroy(p); } catch (_) {} });
            M.pool = [];
            M.generated = false;
            resetBudget();
            saveExtension();
        }
        return result;
    });
    document.addEventListener("keydown", event => {
        if (event.key && event.key.toLowerCase() === "n" && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const t = event.target;
            if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
            if (M.active) close();
            else if (M.generated && M.year === Number((main() || {}).gmlyear)) open();
        }
        if (event.key === "Escape" && M.active) close();
    });
    log("Loaded NIL / Transfer Portal mod v" + M.version + " (Athletics Office hook: s_check_intro_rm_frontoffice)");
})();