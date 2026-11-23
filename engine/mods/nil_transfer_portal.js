// @name Retro Bowl College NIL + Transfer Portal
// @description Persistent transfer portal and annual NIL budget for Retro Bowl College.
// @version 0.1.0
(function () {
    "use strict";
    if (window.__RBNIL_LOADED__) return;
    window.__RBNIL_LOADED__ = true;

    const M = window.RBNIL = {
        version: "0.1.0", active: false, pool: [], year: -1, generated: false,
        budget: 0, cap: 0, spent: 0, position: "ALL", game: null, caller: null, overlay: null
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
        if (r >= 5) return 7000000;
        if (r >= 4.5) return 5000000;
        if (r >= 4) return 3500000;
        if (r >= 3.5) return 2200000;
        if (r >= 3) return 1300000;
        if (r >= 2.5) return 800000;
        if (r >= 2) return 500000;
        if (r >= 1.5) return 300000;
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
        M.year = Number(M.game.gmlyear);
    }
    function makePlayer(id, age) {
        const p = window.gml_Script_s_create_player(M.game, M.caller, id, age, 1, 4);
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
        if (roster().length >= 12) return alert("Your roster is full. Make room before signing a transfer.");
        mapSet(p, "teamid", Number(M.game.gmlmyteam_id));
        mapSet(p, "signed_year", Number(M.game.gmlyear));
        mapSet(p, "contract", 8);
        mapSet(p, "nil_year", Number(M.game.gmlyear));
        mapSet(p, "nil_portal", 0);
        ds_list_add(M.game.gmlroster, p);
        M.spent += value;
        M.budget -= value;
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
            "#rbnil-overlay{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;color:#f4f4f4}",
            "#rbnil-panel{width:min(1100px,96vw);height:min(720px,94vh);background:#171a1c;border:3px solid #ddd;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 50px #000}",
            "#rbnil-head{background:#252b2f;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #090a0b}",
            "#rbnil-title{font-size:24px;font-weight:900;letter-spacing:1px}#rbnil-sub{font-size:11px;color:#aeb8bd;margin-top:3px}",
            "#rbnil-close{background:#a72d2d;color:white;border:0;padding:8px 13px;font-weight:bold;cursor:pointer}",
            "#rbnil-summary{display:flex;gap:22px;flex-wrap:wrap;padding:10px 18px;background:#101315;font-size:13px;border-bottom:1px solid #3a4145}#rbnil-summary b,.rbnil-value{color:#f5d76e}",
            "#rbnil-tabs{display:flex;gap:4px;padding:9px 12px 0;background:#1d2225;flex-wrap:wrap}.rbnil-tab{background:#343c41;color:#eee;border:0;padding:8px 12px;font-weight:bold;cursor:pointer}.rbnil-tab.active{background:#e2c65b;color:#151515}",
            "#rbnil-tools{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#202629}#rbnil-tools button{background:#3b454b;color:white;border:1px solid #758087;padding:7px 10px;cursor:pointer}",
            "#rbnil-list{padding:12px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:10px;align-content:start}",
            ".rbnil-player{background:#262d31;border:1px solid #59646a;padding:11px;min-height:105px}.rbnil-row{display:flex;justify-content:space-between;align-items:center;gap:8px}.rbnil-name{font-weight:800;font-size:15px}.rbnil-rating{color:#f5d76e;font-weight:bold}.rbnil-meta{color:#aab5ba;font-size:12px;margin:6px 0}.rbnil-stats{display:flex;gap:8px;flex-wrap:wrap;color:#d1d8dc;font-size:11px;margin-bottom:10px}.rbnil-sign{background:#e2c65b;border:0;padding:7px 10px;font-weight:900;cursor:pointer}",
            "#rbnil-empty{grid-column:1/-1;text-align:center;padding:45px;color:#b8c0c4}#rbnil-foot{padding:8px 14px;background:#101315;color:#9ca8ad;font-size:11px}",
            "@media(max-width:650px){#rbnil-summary{gap:8px;font-size:11px}.rbnil-tab{padding:7px 9px}#rbnil-title{font-size:18px}}"
        ].join("\\n");
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
            el("div", { class: "rbnil-rating", text: rating(p).toFixed(1) + "★" }, row);
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
    wrap("gml_Script_s_college_admissions_check_trigger", original => function (inst, other) {
        M.caller = other;
        M.game = inst || main();
        if (college() && Number(M.game.gmlweek) === 1 && Number(M.game.gmlcollege_admissions_draft_round) > 0) {
            if (!M.cap || M.year !== Number(M.game.gmlyear)) resetBudget();
            if (!M.generated || M.year !== Number(M.game.gmlyear)) generateInitial();
            open();
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
    log("Loaded NIL / Transfer Portal mod v" + M.version);
})();