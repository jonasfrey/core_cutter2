// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_send } from "./f_ws.js";

// Movable + resizable windows whose open-state / position / size / stacking are
// persisted to the server (o_key_val, key "o_window__<s_window>") so a reload
// restores exactly what was on screen. The browser holds no authoritative state.

let s_prefix__key = "o_window__";

let o_def_by_window = {}; // s_window -> { s_title, f_init }
let o_entry_by_window = {}; // s_window -> { el_window, el_body, b_inited }
let o_pending_by_window = {}; // s_window -> o_state (geometry restored before open)
let n_z = 10;

let f_s_key = function (s_window) {
   return s_prefix__key + s_window;
};

let f_persist = function (s_window) {
   let o_entry = o_entry_by_window[s_window];
   if (!o_entry) return;
   let el = o_entry.el_window;
   let o_state = {
      b_open: el.style.display !== "none",
      n_pos_x: el.offsetLeft,
      n_pos_y: el.offsetTop,
      n_scl_x: el.offsetWidth,
      n_scl_y: el.offsetHeight,
      n_idx__z: Number(el.style.zIndex) || 0,
   };
   f_send("keyval_set", { s_key: f_s_key(s_window), s_val: JSON.stringify(o_state) });
};

let f_front = function (s_window) {
   let o_entry = o_entry_by_window[s_window];
   if (!o_entry) return;
   o_entry.el_window.style.zIndex = ++n_z;
};

let f_drag = function (s_window, el_window, el_handle, b_resize) {
   let f_on_down = function (o_evt__down) {
      o_evt__down.preventDefault();
      f_front(s_window);
      let n_x__start = o_evt__down.clientX;
      let n_y__start = o_evt__down.clientY;
      let n_left__start = el_window.offsetLeft;
      let n_top__start = el_window.offsetTop;
      let n_scl_x__start = el_window.offsetWidth;
      let n_scl_y__start = el_window.offsetHeight;
      let f_on_move = function (o_evt__move) {
         let n_dx = o_evt__move.clientX - n_x__start;
         let n_dy = o_evt__move.clientY - n_y__start;
         if (b_resize) {
            el_window.style.width = Math.max(160, n_scl_x__start + n_dx) + "px";
            el_window.style.height = Math.max(100, n_scl_y__start + n_dy) + "px";
         } else {
            el_window.style.left = (n_left__start + n_dx) + "px";
            el_window.style.top = (n_top__start + n_dy) + "px";
         }
      };
      let f_on_up = function () {
         globalThis.removeEventListener("mousemove", f_on_move);
         globalThis.removeEventListener("mouseup", f_on_up);
         f_persist(s_window);
      };
      globalThis.addEventListener("mousemove", f_on_move);
      globalThis.addEventListener("mouseup", f_on_up);
   };
   el_handle.addEventListener("mousedown", f_on_down);
};

let f_o_entry__create = function (s_window) {
   let o_def = o_def_by_window[s_window];
   let o_state = o_pending_by_window[s_window] || {};

   let el_window = document.createElement("div");
   el_window.className = "el_window";
   let n_count = Object.keys(o_entry_by_window).length;
   el_window.style.left = (o_state.n_pos_x !== undefined ? o_state.n_pos_x : 40 + n_count * 24) +
      "px";
   el_window.style.top = (o_state.n_pos_y !== undefined ? o_state.n_pos_y : 40 + n_count * 24) +
      "px";
   if (o_state.n_scl_x) el_window.style.width = o_state.n_scl_x + "px";
   if (o_state.n_scl_y) el_window.style.height = o_state.n_scl_y + "px";
   n_z = Math.max(n_z, o_state.n_idx__z || 0) + 1;
   el_window.style.zIndex = n_z;

   let el_titlebar = document.createElement("div");
   el_titlebar.className = "el_titlebar";
   let el_title = document.createElement("span");
   el_title.textContent = o_def.s_title;
   let el_close = document.createElement("button");
   el_close.textContent = "x";
   el_close.className = "el_close";
   el_close.addEventListener("click", function () {
      f_close(s_window);
   });
   el_titlebar.appendChild(el_title);
   el_titlebar.appendChild(el_close);

   let el_body = document.createElement("div");
   el_body.className = "el_body";

   let el_resize = document.createElement("div");
   el_resize.className = "el_resize";

   el_window.appendChild(el_titlebar);
   el_window.appendChild(el_body);
   el_window.appendChild(el_resize);
   el_window.addEventListener("mousedown", function () {
      f_front(s_window);
   });
   document.getElementById("el_desktop").appendChild(el_window);

   f_drag(s_window, el_window, el_titlebar, false);
   f_drag(s_window, el_window, el_resize, true);

   let o_entry = { el_window, el_body, b_inited: false };
   o_entry_by_window[s_window] = o_entry;
   return o_entry;
};

let f_window_register = function (s_window, s_title, f_init) {
   o_def_by_window[s_window] = { s_title, f_init };
};

let f_open = function (s_window) {
   let o_entry = o_entry_by_window[s_window] || f_o_entry__create(s_window);
   o_entry.el_window.style.display = "flex";
   f_front(s_window);
   if (!o_entry.b_inited) {
      o_entry.b_inited = true;
      o_def_by_window[s_window].f_init(o_entry.el_body);
   }
   f_persist(s_window);
};

let f_close = function (s_window) {
   let o_entry = o_entry_by_window[s_window];
   if (!o_entry) return;
   o_entry.el_window.style.display = "none";
   f_persist(s_window);
};

let f_toggle = function (s_window) {
   let o_entry = o_entry_by_window[s_window];
   if (o_entry && o_entry.el_window.style.display !== "none") {
      f_close(s_window);
   } else {
      f_open(s_window);
   }
};

let f_restore = function (a_o_key_val) {
   a_o_key_val.forEach(function (o_kv) {
      let s_window = o_kv.s_key.slice(s_prefix__key.length);
      if (!o_def_by_window[s_window]) return;
      let o_state = JSON.parse(o_kv.s_val);
      o_pending_by_window[s_window] = o_state;
      if (o_state.b_open) f_open(s_window);
   });
};

export { f_close, f_open, f_restore, f_toggle, f_window_register };
