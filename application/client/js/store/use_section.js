// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { computed, reactive, ref, watch } from "vue";
import { f_on, f_send } from "../f_ws.js";
import { o_project__active } from "./use_project.js";
import { o_state as o_timeline_state } from "./use_timeline.js";
import { f_action_register } from "../f_shortcut.js";

// Reactive section/marker store. Markers are persistent points; sections are
// derived from marker pairs (recomputed server-side). Also binds ctrl+m / ctrl+d.

let o_sec = reactive({ a_o_video_section: [], a_n_ms__marker: [] });
let o_highlight = ref(null);

// logical sections = consecutive marker pairs (global ms)
let a_o_pair = computed(function () {
   let a_o = [];
   let a_n_ms = o_sec.a_n_ms__marker;
   for (let n_i = 0; n_i + 1 < a_n_ms.length; n_i += 2) {
      a_o.push({ n_idx: n_i / 2, n_ms__start: a_n_ms[n_i], n_ms__end: a_n_ms[n_i + 1] });
   }
   return a_o;
});

let f_n_id__project = function () {
   return o_project__active.value ? o_project__active.value.n_id : null;
};

let f_n_ms__playhead = function () {
   return o_timeline_state.o_timeline ? Math.round(o_timeline_state.o_timeline.n_ms__playhead) : 0;
};

let f_load = function () {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("section_list", { n_o_project_n_id: n_id });
};

let f_marker_add = function () {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("marker_add", { n_o_project_n_id: n_id, n_ms: f_n_ms__playhead() });
};

let f_marker_delete_at = function (n_ms) {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("marker_delete", { n_o_project_n_id: n_id, n_ms });
};

let f_marker_delete = function () {
   f_marker_delete_at(f_n_ms__playhead());
};

let f_section_delete = function (n_idx) {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("section_delete", { n_o_project_n_id: n_id, n_idx });
};

let f_set_highlight = function (o_range) {
   o_highlight.value = o_range;
};

let f_store = function (o_v_data) {
   o_sec.a_o_video_section = o_v_data.a_o_video_section;
   o_sec.a_n_ms__marker = o_v_data.a_n_ms__marker;
};

f_on("section_list", f_store);
f_on("marker_add", f_store);
f_on("marker_delete", f_store);
f_on("section_delete", f_store);
f_on("project_video_add", f_load);
f_on("project_video_remove", f_load);

watch(o_project__active, function () {
   f_load();
});

f_action_register("marker_add", "ctrl+m", f_marker_add);
f_action_register("marker_delete", "ctrl+d", f_marker_delete);

let f_use_section = function () {
   return {
      o_sec,
      a_o_pair,
      o_highlight,
      f_load,
      f_marker_add,
      f_marker_delete,
      f_marker_delete_at,
      f_section_delete,
      f_set_highlight,
   };
};

export { f_use_section, o_highlight };
