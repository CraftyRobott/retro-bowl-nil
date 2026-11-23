// @name Retro Bowl College NIL + Transfer Admissions
// @description Converts the native Scholarship Fund into the NIL budget and expands native admissions with transfer candidates.
// @version 0.5.1
(function () {
    "use strict";
    if (window.__RBNIL_LOADED__) return;
    window.__RBNIL_LOADED__ = true;

    const M = window.RBNIL = { version: "0.5.1", game: null, caller: null, inProfileDraw: false, economyVersion: 0 };
    const POSITIONS = [1,2,3,4,5,6,7,8,9,10];
    const TRANSFER_COUNTS = [5,5,7,4,7,6,5,8,2,1];
    const log = (...a) => console.log("[RB NIL]", ...a);
    const warn = (...a) => console.warn("[RB NIL]", ...a);
    const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));

    function main() {
        try {
            const all = GetWithArray(YYASSET_REF(0x00000062));
            for (const k in all) if (Object.prototype.hasOwnProperty.call(all,k)) return all[k];
        } catch (_) {}
        return null;
    }
    function setContext(inst,other) { M.caller=other; M.game=main()||inst||M.game; return M.game; }
    function isCollege() {
        try { return !!(M.game && window.gml_Script_s_is_co_mode(M.game,M.caller)); }
        catch (_) { return false; }
    }
    function get(map,key) { try { return ds_map_find_value(map,key); } catch (_) { return undefined; } }
    function set(map,key,value) { ds_map_set(map,key,value); }
    function rating(player) {
        try { return Number(window.gml_Script_s_get_player_rating(M.game,M.caller,player))||0; }
        catch (_) { return 0; }
    }
    // Native Scholarship Fund values are displayed in thousands of dollars.
    // Store all NIL amounts in that same native unit: 1 = $1K, 1,000 = $1M.
    function nilValue(r) {
        if(r>=10)return 7000; if(r>=9)return 5000; if(r>=8)return 3500; if(r>=7)return 2200;
        if(r>=6)return 1300; if(r>=5)return 800; if(r>=4)return 500; if(r>=3)return 300;
        return 150;
    }
    function money(v) {
        const amount=Number(v)||0;
        return amount>=1000?"$"+(amount/1000).toFixed(2)+"M":"$"+Math.round(amount)+"K";
    }

    // Native conference prestige + the team's existing offense/defense ratings:
    // prestige 3 + strong team = top tier ($48-52M); other prestige-3 teams = lower P4 ($8-12M);
    // prestige 2 = upper-middle FBS ($30-44M); prestige 0-1 = lower tier ($8-12M).
    function schoolBaseBudget(game=M.game,caller=M.caller) {
        try {
            const team=window.gml_Script_s_get_team_by_id(game,caller,game.gmlmyteam_id);
            const strength=(Number(get(team,"offense"))||1)+(Number(get(team,"defense"))||1);
            const prestige=Number(window.gml_Script_s_get_prestige(game,caller,team));
            if(prestige>=3 && strength>=15) return 48+clamp((strength-15)/5,0,1)*4;
            if(prestige>=3) return 8+clamp((strength-2)/13,0,1)*4;
            if(prestige>=2) return 30+clamp((strength-2)/18,0,1)*14;
            return 8+clamp((strength-2)/18,0,1)*4;
        } catch(e) { warn("Could not determine school NIL tier; using $10M fallback",e); return 10; }
    }
    // Keep gmlrecruitment_credits_cap at 50/60: the base game uses it for 10/12 roster size.
    // The native boost field stores permanent cap increases in the same $1K unit as the wallet.
    function nativeFundCap(game=M.game,caller=M.caller) {
        return game ? Math.round(schoolBaseBudget(game,caller)*1000)+(Number(game.gmlboost_recruitment_credits_cap)||0) : 10000;
    }
    function ensureNativeCapBinding(game=M.game) {
        if(!game||typeof window.__yy_method!=="function")return;
        // GameMaker binds these scripts onto the game instance during its global init.
        // Rebind them after the mod wraps the global functions, otherwise the instance
        // keeps calling stale native implementations (including the old +30K upgrade).
        const bindings = {
            gmlrecruitment_credits_cap_total:"gml_Script_recruitment_credits_cap_total",
            gmlcan_fit_recruitment_credits:"gml_Script_can_fit_recruitment_credits",
            gmlrecruitment_credits_space:"gml_Script_recruitment_credits_space",
            gmlrecruitment_credits_add:"gml_Script_recruitment_credits_add",
            gmlrecruitment_credits_toggle_roster_size:"gml_Script_recruitment_credits_toggle_roster_size",
            gmlrecruitment_credits_button_click_boost:"gml_Script_recruitment_credits_button_click_boost",
            gmlbtn_response_boost_recruitment_credits:"gml_Script_btn_response_boost_recruitment_credits"
        };
        try {
            for(const method in bindings) {
                const script=window[bindings[method]];
                if(typeof script==="function")game[method]=window.__yy_method(game,script);
            }
        } catch(e) { warn("Could not refresh native Scholarship Fund method bindings",e); }
    }

    function priceCandidate(player) {
        const value=nilValue(rating(player));
        set(player,"rbnil_candidate",1);
        set(player,"rbnil_value",value);
        set(player,"rbnil_year",Number(M.game.gmlyear));
        // Native admissions affordability, profile display and signing deduction use rc_cost.
        set(player,"rc_cost",value);
        return value;
    }
    function refreshCandidateCosts() {
        const list=M.game&&M.game.gmldraftlist;
        if(!list)return;
        for(let i=0;i<ds_list_size(list);i++) {
            const p=ds_list_find_value(list,i);
            if(Number(get(p,"rbnil_candidate"))===1) priceCandidate(p);
        }
    }
    function addTransferCandidates() {
        const list=M.game&&M.game.gmldraftlist;
        if(!list)return;
        for(let i=0;i<ds_list_size(list);i++) priceCandidate(ds_list_find_value(list,i));
        for(let pi=0;pi<POSITIONS.length;pi++) {
            const pos=POSITIONS[pi];
            for(let n=0;n<TRANSFER_COUNTS[pi];n++) {
                const age=19+Math.floor(Math.random()*3);
                try {
                    const p=window.gml_Script_s_create_player(M.game,M.caller,pos,age,2,9);
                    if(!p||typeof p!=="number")continue;
                    window.gml_Script_s_college_correct_new_player(M.game,M.caller,p);
                    set(p,"age",age); set(p,"teamid",-1); set(p,"signed_year",-1);
                    set(p,"rbnil_class_year",age-18); priceCandidate(p); ds_list_add(list,p);
                } catch(e) { warn("Could not generate transfer candidate",{position:pos,age,error:e}); }
            }
        }
        try { M.game.gmldraftlist=window.gml_Script_s_sort_players(M.game,M.caller,list,2); }
        catch(e) { warn("Native admissions sorting failed; retaining appended order",e); }
        log("Expanded native admissions pool",ds_list_size(M.game.gmldraftlist),"players (50 freshmen + up to 50 transfers)");
    }

    function readEconomyVersion(filename) {
        try {
            if(!filename||typeof ini_open!=="function")return 0;
            ini_open(filename); const v=ini_read_real("savegame","nil_economy_version",0); ini_close();
            return Number(v)||0;
        } catch(e) { warn("Could not read NIL migration marker",e); try{ini_close();}catch(_){} return 0; }
    }
    function currentSaveName() {
        try { return window.gml_Script_s_get_savename(M.game,M.caller); } catch (_) { return null; }
    }
    function writeEconomyVersion() {
        try {
            const f=currentSaveName(); if(!f||typeof ini_open!=="function")return;
            ini_open(f); ini_write_real("savegame","nil_economy_version",2); ini_close();
        } catch(e) { warn("Could not write NIL migration marker",e); try{ini_close();}catch(_){} }
    }
    function initializeNativeFund(filename) {
        if(!isCollege())return;
        const savedVersion=Math.max(M.economyVersion,readEconomyVersion(filename||currentSaveName()));
        if(savedVersion>=2) { M.economyVersion=2; ensureNativeCapBinding(); return; }

        if(savedVersion===1) {
            // v0.4 stored dollars-in-millions as small decimals (e.g. 31.56).
            // Convert the saved wallet and permanent upgrades into native $1K units.
            M.game.gmlrecruitment_credits=Math.round((Number(M.game.gmlrecruitment_credits)||0)*1000);
            M.game.gmlboost_recruitment_credits_cap=Math.round((Number(M.game.gmlboost_recruitment_credits_cap)||0)*1000);
        } else {
            // Convert any pre-v0.4 native +30K coaching upgrades to +$3M increments.
            const oldBoost=Number(M.game.gmlboost_recruitment_credits_cap)||0;
            M.game.gmlboost_recruitment_credits_cap=Math.round(oldBoost*100);
            M.game.gmlrecruitment_credits=0;
        }

        // Refill the native Scholarship Fund once during migration; all future deductions
        // and affordability checks continue to use the game's original wallet and rc_cost.
        M.game.gmlrecruitment_credits=nativeFundCap();
        M.game.gmlrc_season_earned=0; M.game.gmlrc_season_spent=0;
        M.economyVersion=2;
        ensureNativeCapBinding();
        writeEconomyVersion();
        log("Migrated native Scholarship Fund to NIL units",money(M.game.gmlrecruitment_credits),"cap",money(nativeFundCap()));
    }
    function resetAnnualNativeFund() {
        if(!isCollege())return;
        const cap=nativeFundCap();
        M.game.gmlrecruitment_credits=cap;
        M.game.gmlrc_season_earned=0; M.game.gmlrc_season_spent=0;
        M.economyVersion=2;
        log("Annual native NIL budget refreshed",money(cap),"year",M.game.gmlyear);
    }
    function wrap(name,factory) {
        const original=window[name];
        if(typeof original!=="function"||original.__rbnilWrapped)return;
        const replacement=factory(original); replacement.__rbnilWrapped=true; window[name]=replacement;
    }

    // Native balance, affordability and deductions now share this NIL cap.
    wrap("gml_Script_recruitment_credits_cap_total",original=>function(inst,other) {
        setContext(inst,other);
        return isCollege()?nativeFundCap():original.apply(this,arguments);
    });

    // Rename the existing Scholarship Fund; only candidate profile prices use the M/YR suffix.
    wrap("gml_Script_s_str",original=>function(inst,other,key) {
        if(key==="ui_ScolarshipFund")return "NIL Budget";
        if(M.inProfileDraw&&key==="sla_Thousand")return "M/YR";
        return original.apply(this,arguments);
    });

    // Keep the native 100-Coaching-Credit upgrade, but change its permanent increment to $3M.
    wrap("gml_Script_recruitment_credits_button_click_boost",original=>function(inst,other) {
        setContext(inst,other);
        if(!isCollege())return original.apply(this,arguments);
        const next=nativeFundCap()+3000, canBuy=Number(M.game.gmlcoach_credit)>=100;
        const msg=canBuy
            ?"Increase your NIL budget cap to "+money(next)+" for 100 Coaching Credits?"
            :"You need 100 Coaching Credits to increase your NIL budget cap to "+money(next)+".";
        window.gml_Script_s_create_message(M.game,M.caller,"",msg,
            canBuy?window.gml_Script_s_str(M.game,M.caller,"ui_No"):window.gml_Script_s_str(M.game,M.caller,"ui_Continue"),
            canBuy?window.gml_Script_s_str(M.game,M.caller,"ui_Yes"):"",
            102133,canBuy?100208:"",global.gmlc_background,1);
    });
    wrap("gml_Script_btn_response_boost_recruitment_credits",original=>function(inst,other) {
        setContext(inst,other);
        if(!isCollege())return original.apply(this,arguments);
        window.gml_Script_s_msg_clear(M.game,M.caller);
        M.game.gmlboost_recruitment_credits_cap=(Number(M.game.gmlboost_recruitment_credits_cap)||0)+3000;
        M.game.gmlcoach_credit=Math.max(0,Number(M.game.gmlcoach_credit)-100);
        if(typeof room_goto==="function")room_goto(YYASSET_REF(0x03000009));
        log("Coaching Credit upgrade applied; native NIL cap is now",money(nativeFundCap()));
    });

    // Preserve the native 10/12-player roster-size toggle, removing its obsolete $50K balance test.
    wrap("gml_Script_recruitment_credits_toggle_roster_size",original=>function(inst,other) {
        setContext(inst,other);
        if(!isCollege())return original.apply(this,arguments);
        const base=Number(M.game.gmlrecruitment_credits_cap);
        if(base===50)M.game.gmlrecruitment_credits_cap=60;
        else if(base===60) {
            if(ds_list_size(M.game.gmlroster)>10) {
                window.gml_Script_s_create_message(M.game,M.caller,"",
                    window.gml_Script_s_str(M.game,M.caller,"msg_SalaryCheckRoster"),
                    window.gml_Script_s_str(M.game,M.caller,"ui_Continue"),"",102133,"",global.gmlc_background,1);
            } else M.game.gmlrecruitment_credits_cap=50;
        }
    });

    function updateFundWidget(inst) {
        if(!isCollege())return;
        const cap=nativeFundCap();
        inst.gmltitle="NIL BUDGET "+money(M.game.gmlrecruitment_credits)+" / "+money(cap);
        inst.gmlpercent=cap>0?clamp((Number(M.game.gmlrecruitment_credits)/cap)*100,0,100):0;
    }
    wrap("gml_Object_obj_salarycap_Create_0",original=>function(inst,other) {
        setContext(inst,other); const result=original.apply(this,arguments); updateFundWidget(inst); return result;
    });
    wrap("gml_Object_obj_salarycap_Draw_64",original=>function(inst,other) {
        setContext(inst,other);
        const result=original.apply(this,arguments);
        updateFundWidget(inst);
        return result;
    });
    wrap("gml_Script_draw_custom_recruitment_credits_display",original=>function(inst,other,x,y) {
        setContext(inst,other);
        if(!isCollege())return original.apply(this,arguments);
        draw_set_halign(0);
        window.gml_Script_draw_hd_text(inst,other,x,y,money(M.game.gmlrecruitment_credits)+" / "+money(nativeFundCap()));
    });

    // The native profile draws "$" + rc_cost + suffix. Convert the resulting native
    // $1K figure to a readable $M/YR label without changing affordability or deductions.
    wrap("gml_Object_obj_player_profile_Draw_64",original=>function(inst,other) {
        setContext(inst,other);
        M.inProfileDraw=!!(inst.gmlpmap&&Number(get(inst.gmlpmap,"rbnil_candidate"))===1&&isCollege());
        try { return original.apply(this,arguments); }
        finally { M.inProfileDraw=false; }
    });
    function formatCandidatePriceText(value) {
        if(!M.inProfileDraw||typeof value!=="string")return value;
        // The base game builds this as "$" + rc_cost + "K". rc_cost stays
        // in native $1K units for affordability/signing, but the label is $M.
        const match=value.match(/^\$(\d+(?:\.\d+)?)(?:K|M(?:\/YR)?)$/);
        if(!match)return value;
        const amount=Number(match[1]);
        if(!Number.isFinite(amount))return value;
        return "$"+(amount/1000).toFixed(2)+"M";
    }
    wrap("gml_Script_draw_hd_text",original=>function(inst,other,x,y,value) {
        return original.call(this,inst,other,x,y,formatCandidatePriceText(value));
    });
    wrap("gml_Script_draw_hd_text_color",original=>function(inst,other,x,y,value) {
        return original.call(this,inst,other,x,y,formatCandidatePriceText(value),...Array.prototype.slice.call(arguments,5));
    });

    // Keep the portal pool stable between picks.
    wrap("gml_Script_s_college_admissions_players_lost_per_round",()=>function(){return 0;});
    wrap("gml_Script_s_college_admissions_check_trigger",original=>function(inst,other) {
        setContext(inst,other);
        if(isCollege()) { initializeNativeFund(); refreshCandidateCosts(); }
        return original.apply(this,arguments);
    });
    wrap("gml_Script_s_create_draftlist",original=>function(inst,other) {
        setContext(inst,other); if(isCollege())initializeNativeFund();
        const result=original.apply(this,arguments);
        if(isCollege()&&Number(M.game.gmlcollege_admissions_draft_round)>0) {
            addTransferCandidates();
            try { window.gml_Script_s_savegame(M.game,M.caller); }
            catch(e) { warn("Post-generation native save failed",e); }
        }
        return result;
    });

    // Migration marker is stored in the game's own [savegame] section. The native
    // balance, cap, Coaching Credit upgrades and player costs are all saved by the game.
    wrap("gml_GlobalScript_s_recruitment_credits",original=>function(inst,other) {
        const result=original.apply(this,arguments);
        setContext(inst,other);
        if(isCollege())ensureNativeCapBinding();
        return result;
    });
    wrap("gml_Script_s_loadgame",original=>function(inst,other,filename) {
        M.caller=other; const result=original.apply(this,arguments);
        M.game=main()||inst; M.caller=other; M.economyVersion=readEconomyVersion(filename);
        if(isCollege()) { initializeNativeFund(filename); refreshCandidateCosts(); ensureNativeCapBinding(); }
        return result;
    });
    wrap("gml_Script_s_savegame",original=>function(inst,other) {
        setContext(inst,other); const result=original.apply(this,arguments);
        if(isCollege()&&M.economyVersion>=1&&!M.game.gmlfirst_load&&Number(M.game.gmlstage)!==4&&!global.gmlexhibition) {
            writeEconomyVersion();
        }
        return result;
    });

    // Annual full refresh: unspent balance does not carry over; native fund is refilled to its cap.
    wrap("gml_Script_s_start_new_season",original=>function(inst,other) {
        const result=original.apply(this,arguments); setContext(inst,other);
        if(isCollege()) { initializeNativeFund(); resetAnnualNativeFund(); }
        return result;
    });

    log("Loaded native Scholarship Fund NIL conversion v"+M.version+"; native $1K units, cap, upgrades, affordability and deductions are active");
})();