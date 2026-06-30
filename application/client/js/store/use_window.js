// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { reactive } from "vue";
import { f_on, f_send } from "../f_ws.js";

// Reactive window registry. Each window's open-state / position / size / stacking
// is persisted to the server (o_key_val, key "o_window__<s_window>") and restored.

let s_prefix__key = "o_window__";
let o_window = reactive({});
let n_z = { n: 10 };

let f_ensure = function (s_window, n_idx) {
   if (!o_window[s_window]) {
      o_window[s_window] = {
         b_open: false,
         n_pos_x: 40 + n_idx * 24,
         n_pos_y: 40 + n_idx * 24,
         n_scl_x: 380,
         n_scl_y: 260,
         n_idx__z: ++n_z.n,
      };
   }
   return o_window[s_window];
};

let f_persist = function (s_window) {
   let o = o_window[s_window];
   if (o) f_send("keyval_set", { s_key: s_prefix__key + s_window, s_val: JSON.stringify(o) });
};

let f_front = function (s_window) {
   let o = o_window[s_window];
   if (o) {
      o.n_idx__z = ++n_z.n;
      f_persist(s_window);
   }
};

let f_toggle = function (s_window) {
   let o = o_window[s_window];
   if (!o) return;
   o.b_open = !o.b_open;
   if (o.b_open) o.n_idx__z = ++n_z.n;
   f_persist(s_window);
};

f_on("keyval_list", function (o_v_data) {
   (o_v_data.a_o_key_val || []).forEach(function (o_kv) {
      if (!o_kv.s_key.startsWith(s_prefix__key)) return;
      let s_window = o_kv.s_key.slice(s_prefix__key.length);
      if (!o_window[s_window]) return;
      let o_state = JSON.parse(o_kv.s_val);
      Object.assign(o_window[s_window], o_state);
      n_z.n = Math.max(n_z.n, o_state.n_idx__z || 0);
   });
});

let f_use_window = function () {
   return { o_window, f_ensure, f_persist, f_front, f_toggle };
};

export { f_use_window };
