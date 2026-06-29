// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_on, f_send } from "./f_ws.js";
import { f_on_project__active, o_state } from "./f_state.js";

// Client-side mirror of the server-owned timeline. Holds the last known
// a_o_video + o_timeline and notifies subscribers. Two channels:
//  - a_f_sub: full structural changes (seek/play/pause/get, reload of videos)
//  - a_f_tick: lightweight playhead movement during realtime playback (local)

let o_data = { a_o_video: [], o_timeline: null };
let a_f_sub = [];
let a_f_tick = [];
let a_f_zoom = [];
let n_ms__zoom = 120000; // visible span of the timeline (default 2 min)

let f_notify = function (s_reason) {
   a_f_sub.forEach(function (f_h) {
      f_h(o_data, s_reason);
   });
};

let f_subscribe = function (f_h) {
   a_f_sub.push(f_h);
   if (o_data.o_timeline) f_h(o_data, "init");
};

let f_on_tick = function (f_h) {
   a_f_tick.push(f_h);
};

let f_tick = function (n_ms) {
   if (o_data.o_timeline) o_data.o_timeline.n_ms__playhead = n_ms;
   a_f_tick.forEach(function (f_h) {
      f_h(n_ms);
   });
};

let f_on_zoom = function (f_h) {
   a_f_zoom.push(f_h);
   f_h(n_ms__zoom);
};

let f_set_zoom = function (n_ms) {
   n_ms__zoom = n_ms;
   a_f_zoom.forEach(function (f_h) {
      f_h(n_ms);
   });
   f_send("keyval_set", { s_key: "o_view__zoom", s_val: String(n_ms) });
};

let f_n_ms__zoom = function () {
   return n_ms__zoom;
};

let f_n_id__project = function () {
   return o_state.o_project__active ? o_state.o_project__active.n_id : null;
};

let f_load = function () {
   let n_id = f_n_id__project();
   if (n_id !== null) f_send("timeline_get", { n_o_project_n_id: n_id });
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

// Realtime playback report to the server (throttled by the caller, no reply).
let f_report_time = function (n_ms) {
   let n_id = f_n_id__project();
   if (n_id === null) return;
   f_send("timeline_time", { n_o_project_n_id: n_id, n_ms });
};

let f_store = function (o_v_data, s_reason) {
   o_data = o_v_data;
   f_notify(s_reason);
};

f_on("timeline_get", function (o_v_data) {
   f_store(o_v_data, "get");
});
f_on("timeline_seek", function (o_v_data) {
   f_store(o_v_data, "seek");
});
f_on("timeline_play", function (o_v_data) {
   f_store(o_v_data, "play");
});
f_on("timeline_pause", function (o_v_data) {
   f_store(o_v_data, "pause");
});
f_on("timeline_set_speed", function (o_v_data) {
   f_store(o_v_data, "speed");
});

// restore persisted zoom (from o_key_val) on startup
f_on("keyval_list", function (o_v_data) {
   let o_kv = (o_v_data.a_o_key_val || []).find(function (o) {
      return o.s_key === "o_view__zoom";
   });
   if (o_kv) f_set_zoom(Number(o_kv.s_val));
});

// the video set changed -> refetch the full timeline
f_on("project_video_add", function () {
   f_load();
});
f_on("project_video_remove", function () {
   f_load();
});

f_on_project__active(function () {
   f_load();
});

export {
   f_load,
   f_n_ms__zoom,
   f_on_tick,
   f_on_zoom,
   f_pause,
   f_play,
   f_report_time,
   f_seek,
   f_set_speed,
   f_set_zoom,
   f_subscribe,
   f_tick,
   o_data,
};
