// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { reactive } from "vue";
import { f_on, f_send } from "../f_ws.js";
import { a_o_action, f_set_shortcut } from "../f_shortcut.js";

// Reactive settings store. Mirrors a_o_action from f_shortcut.js with Vue
// reactivity and loads/persists shortcut overrides to o_key_val under keys
// prefixed "o_shortcut__".

let s_prefix__key = "o_shortcut__";
let a_o_setting = reactive([]);

let f_sync = function () {
   a_o_setting.splice(0, a_o_setting.length);
   a_o_action.forEach(function (o_action) {
      a_o_setting.push({ s_name: o_action.s_name, s_shortcut: o_action.s_shortcut });
   });
};

let f_rebind = function (s_name, s_shortcut) {
   f_set_shortcut(s_name, s_shortcut);
   let o_entry = a_o_setting.find(function (o) {
      return o.s_name === s_name;
   });
   if (o_entry) o_entry.s_shortcut = s_shortcut;
   f_send("keyval_set", { s_key: s_prefix__key + s_name, s_val: s_shortcut });
};

let f_load = function () {
   f_send("keyval_list", { s_prefix: s_prefix__key });
};

// On module init, build the reactive array from the current action registry.
// Any actions registered after this import will need a re-sync (call f_sync).
f_sync();

f_on("keyval_list", function (o_v_data) {
   (o_v_data.a_o_key_val || []).forEach(function (o_kv) {
      if (!o_kv.s_key.startsWith(s_prefix__key)) return;
      let s_name = o_kv.s_key.slice(s_prefix__key.length);
      f_set_shortcut(s_name, o_kv.s_val);
   });
   f_sync();
});

let f_use_setting = function () {
   return { a_o_setting, f_load, f_rebind, f_sync };
};

export { f_use_setting };
