// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_handler_register } from "../f_ws_router.js";
import { f_a_o_video__project } from "./h_video.js";

// The server owns the authoritative timeline state per project (single user):
// playhead position (global ms across the concatenated videos), play/pause and
// speed. The browser only renders this state and drives a <video> element.

let o_state_by_project = {};

let f_o_state = function (n_o_project_n_id) {
   if (!o_state_by_project[n_o_project_n_id]) {
      o_state_by_project[n_o_project_n_id] = { n_ms__playhead: 0, b_playing: false, n_speed: 1 };
   }
   return o_state_by_project[n_o_project_n_id];
};

let f_n_ms__total = function (a_o_video) {
   return a_o_video.reduce(function (n_acc, o_video) {
      return n_acc + (o_video.n_ms__duration || 0);
   }, 0);
};

// Map a global timeline ms to a specific video + local offset.
let f_o_cursor = function (a_o_video, n_ms) {
   if (a_o_video.length === 0) return null;
   let n_acc = 0;
   for (let n_idx = 0; n_idx < a_o_video.length; n_idx++) {
      let o_video = a_o_video[n_idx];
      let n_ms__duration = o_video.n_ms__duration || 0;
      if (n_ms < n_acc + n_ms__duration || n_idx === a_o_video.length - 1) {
         return {
            n_o_video_n_id: o_video.n_id,
            n_idx,
            n_ms__start: n_acc,
            n_ms__duration,
            n_ms__local: Math.max(0, Math.min(n_ms - n_acc, n_ms__duration)),
         };
      }
      n_acc += n_ms__duration;
   }
   return null;
};

let f_o_timeline = function (n_o_project_n_id) {
   let a_o_video = f_a_o_video__project(n_o_project_n_id);
   let n_ms__total = f_n_ms__total(a_o_video);
   let o_state = f_o_state(n_o_project_n_id);
   return {
      a_o_video,
      o_timeline: {
         n_ms__playhead: o_state.n_ms__playhead,
         n_ms__total,
         b_playing: o_state.b_playing,
         n_speed: o_state.n_speed,
         o_cursor: f_o_cursor(a_o_video, o_state.n_ms__playhead),
      },
   };
};

let f_set_playhead = function (n_o_project_n_id, n_ms) {
   let o_state = f_o_state(n_o_project_n_id);
   let n_ms__total = f_n_ms__total(f_a_o_video__project(n_o_project_n_id));
   if (n_ms <= 0) n_ms = 0;
   if (n_ms >= n_ms__total) {
      n_ms = n_ms__total;
      o_state.b_playing = false;
   }
   o_state.n_ms__playhead = Math.round(n_ms);
};

let f_register = function () {
   f_handler_register("timeline_get", function (o_ws, o_v_data) {
      return f_o_timeline(o_v_data.n_o_project_n_id);
   });

   f_handler_register("timeline_seek", function (o_ws, o_v_data) {
      f_set_playhead(o_v_data.n_o_project_n_id, o_v_data.n_ms);
      return f_o_timeline(o_v_data.n_o_project_n_id);
   });

   f_handler_register("timeline_play", function (o_ws, o_v_data) {
      let o_state = f_o_state(o_v_data.n_o_project_n_id);
      o_state.n_speed = o_v_data.n_speed || 1;
      o_state.b_playing = true;
      return f_o_timeline(o_v_data.n_o_project_n_id);
   });

   f_handler_register("timeline_pause", function (o_ws, o_v_data) {
      let o_state = f_o_state(o_v_data.n_o_project_n_id);
      o_state.b_playing = false;
      return f_o_timeline(o_v_data.n_o_project_n_id);
   });

   // set speed without changing the play/pause state
   f_handler_register("timeline_set_speed", function (o_ws, o_v_data) {
      let o_state = f_o_state(o_v_data.n_o_project_n_id);
      o_state.n_speed = o_v_data.n_speed;
      return f_o_timeline(o_v_data.n_o_project_n_id);
   });

   // Lightweight playhead update during realtime playback (no reply, to avoid a
   // feedback loop with the client-driven <video> element).
   f_handler_register("timeline_time", function (o_ws, o_v_data) {
      f_set_playhead(o_v_data.n_o_project_n_id, o_v_data.n_ms);
      return undefined;
   });
};

let f_n_ms__playhead = function (n_o_project_n_id) {
   return f_o_state(n_o_project_n_id).n_ms__playhead;
};

export { f_n_ms__playhead, f_o_cursor, f_register };
