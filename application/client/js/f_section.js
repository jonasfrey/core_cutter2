// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_on, f_send } from "./f_ws.js";
import { f_on_project__active, o_state } from "./f_state.js";
import { o_data } from "./f_timeline.js";
import { f_action_register } from "./f_shortcut.js";

// Client mirror of the server's section + marker state, plus the marker actions
// bound to ctrl+m / ctrl+d. The browser holds no authoritative state.

let o_sec = { a_o_video_section: [], a_n_ms__marker: [] };
let a_f_sub = [];
let a_f_highlight = [];

let f_notify = function () {
   a_f_sub.forEach(function (f_h) {
      f_h(o_sec);
   });
};

let f_subscribe = function (f_h) {
   a_f_sub.push(f_h);
   f_h(o_sec);
};

// hover highlight: o_range = { n_ms__start, n_ms__end } (global) or null
let f_on_highlight = function (f_h) {
   a_f_highlight.push(f_h);
};

let f_set_highlight = function (o_range) {
   a_f_highlight.forEach(function (f_h) {
      f_h(o_range);
   });
};

let f_n_id__project = function () {
   return o_state.o_project__active ? o_state.o_project__active.n_id : null;
};

let f_n_ms__playhead = function () {
   return o_data.o_timeline ? Math.round(o_data.o_timeline.n_ms__playhead) : 0;
};

let f_load = function () {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("section_list", { n_o_project_n_id: n_id });
};

let f_marker_add = function () {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("marker_add", { n_o_project_n_id: n_id, n_ms: f_n_ms__playhead() });
};

// delete the marker nearest n_ms (server picks the closest)
let f_marker_delete_at = function (n_ms) {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("marker_delete", { n_o_project_n_id: n_id, n_ms });
};

let f_marker_delete = function () {
   f_marker_delete_at(f_n_ms__playhead());
};

// delete a whole section (pair index) -> removes its two markers
let f_section_delete = function (n_idx) {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("section_delete", { n_o_project_n_id: n_id, n_idx });
};

let f_store = function (o_v_data) {
   o_sec = o_v_data;
   f_notify();
};

f_on("section_list", f_store);
f_on("marker_add", f_store);
f_on("marker_delete", f_store);
f_on("section_delete", f_store);

f_on_project__active(function () {
   f_load();
});
f_on("project_video_add", function () {
   f_load();
});
f_on("project_video_remove", function () {
   f_load();
});

f_action_register("marker_add", "ctrl+m", f_marker_add);
f_action_register("marker_delete", "ctrl+d", f_marker_delete);

export {
   f_load,
   f_marker_add,
   f_marker_delete,
   f_marker_delete_at,
   f_on_highlight,
   f_section_delete,
   f_set_highlight,
   f_subscribe,
   o_sec,
};
