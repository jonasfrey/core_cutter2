// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { reactive, ref, watch } from "vue";
import { f_on, f_send } from "../f_ws.js";
import { o_project__active } from "./use_project.js";

// Reactive timeline store. o_state mirrors the server-owned timeline; n_ms__zoom is
// the visible span (persisted in o_key_val). The playhead is the single source of
// truth here — components compute positions from it reactively.

let o_state = reactive({ a_o_video: [], o_timeline: null });
let n_ms__zoom = ref(120000);
let n_seek_token = ref(0); // bumped on every explicit seek so the player can jump

let f_n_id__project = function () {
   return o_project__active.value ? o_project__active.value.n_id : null;
};

let f_load = function () {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("timeline_get", { n_o_project_n_id: n_id });
};

let f_store = function (o_v_data) {
   o_state.a_o_video = o_v_data.a_o_video;
   o_state.o_timeline = o_v_data.o_timeline;
};

let f_seek = function (n_ms) {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("timeline_seek", { n_o_project_n_id: n_id, n_ms });
};

let f_play = function (n_speed) {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("timeline_play", { n_o_project_n_id: n_id, n_speed });
};

let f_pause = function () {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("timeline_pause", { n_o_project_n_id: n_id });
};

let f_set_speed = function (n_speed) {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("timeline_set_speed", { n_o_project_n_id: n_id, n_speed });
};

let f_report_time = function (n_ms) {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("timeline_time", { n_o_project_n_id: n_id, n_ms });
};

// local playhead update for scrubbing / playback ticks (no server round-trip)
let f_set_playhead = function (n_ms) {
   if (o_state.o_timeline) o_state.o_timeline.n_ms__playhead = n_ms;
};

let f_set_zoom = function (n_ms) {
   n_ms__zoom.value = n_ms;
   f_send("keyval_set", { s_key: "o_view__zoom", s_val: String(n_ms) });
};

f_on("timeline_get", f_store);
f_on("timeline_seek", function (o_v_data) {
   f_store(o_v_data);
   n_seek_token.value++;
});
f_on("timeline_play", f_store);
f_on("timeline_pause", f_store);
f_on("timeline_set_speed", f_store);
f_on("project_video_add", f_load);
f_on("project_video_remove", f_load);
f_on("keyval_list", function (o_v_data) {
   let o_kv = (o_v_data.a_o_key_val || []).find(function (o) {
      return o.s_key === "o_view__zoom";
   });
   if (o_kv) n_ms__zoom.value = Number(o_kv.s_val);
});

watch(o_project__active, function () {
   f_load();
});

let f_use_timeline = function () {
   return {
      o_state,
      n_ms__zoom,
      n_seek_token,
      f_load,
      f_seek,
      f_play,
      f_pause,
      f_set_speed,
      f_report_time,
      f_set_playhead,
      f_set_zoom,
   };
};

export { f_use_timeline, o_state };
