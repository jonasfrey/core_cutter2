// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_a_o_query, f_n_id__insert, f_o_run } from "../db/f_db.js";
import { f_handler_register } from "../f_ws_router.js";
import { f_a_o_video__project } from "./h_video.js";
import { f_s_val as f_keyval_s_val, f_set as f_keyval_set } from "./h_keyval.js";

// Markers are persistent points on the global timeline (per project, stored in
// o_key_val). Sections are DERIVED from sorted marker pairs: (m0,m1),(m2,m3),...
// so they never overlap; a trailing odd marker is a pending in-point. Any marker
// change recomputes all o_video_section rows (split at video boundaries).

let f_s_key__marker = function (n_o_project_n_id) {
   return "o_marker__" + n_o_project_n_id;
};

let f_a_n_ms__marker = function (n_o_project_n_id) {
   let s_val = f_keyval_s_val(f_s_key__marker(n_o_project_n_id));
   let a_n_ms = s_val ? JSON.parse(s_val) : [];
   return a_n_ms.slice().sort(function (n_a, n_b) {
      return n_a - n_b;
   });
};

let f_set_marker = function (n_o_project_n_id, a_n_ms) {
   let a_n_ms__sorted = a_n_ms.slice().sort(function (n_a, n_b) {
      return n_a - n_b;
   });
   f_keyval_set(f_s_key__marker(n_o_project_n_id), JSON.stringify(a_n_ms__sorted));
};

let f_a_o_video_section = function (n_o_project_n_id) {
   return f_a_o_query(
      `SELECT n_id, n_o_video_n_id, n_ms__start, n_ms__end, n_idx__order
       FROM o_video_section WHERE n_o_project_n_id = ?
       ORDER BY n_idx__order ASC, n_id ASC`,
      [n_o_project_n_id],
   );
};

// rebuild o_video_section rows from marker pairs, split at video boundaries
let f_recompute = function (n_o_project_n_id) {
   let a_n_ms = f_a_n_ms__marker(n_o_project_n_id);
   f_o_run("DELETE FROM o_video_section WHERE n_o_project_n_id = ?", [n_o_project_n_id]);

   let a_o_video = f_a_o_video__project(n_o_project_n_id);
   let a_o_range = [];
   let n_acc = 0;
   a_o_video.forEach(function (o_video) {
      let n_ms__duration = o_video.n_ms__duration || 0;
      a_o_range.push({ n_id: o_video.n_id, n_ms__start: n_acc, n_ms__end: n_acc + n_ms__duration });
      n_acc += n_ms__duration;
   });

   let n_idx__order = 0;
   for (let n_i = 0; n_i + 1 < a_n_ms.length; n_i += 2) {
      let n_ms__a = a_n_ms[n_i];
      let n_ms__b = a_n_ms[n_i + 1];
      a_o_range.forEach(function (o_range) {
         let n_ms__ovl_start = Math.max(n_ms__a, o_range.n_ms__start);
         let n_ms__ovl_end = Math.min(n_ms__b, o_range.n_ms__end);
         if (n_ms__ovl_end > n_ms__ovl_start) {
            f_n_id__insert("o_video_section", {
               n_o_video_n_id: o_range.n_id,
               n_o_project_n_id: n_o_project_n_id,
               n_ms__start: n_ms__ovl_start - o_range.n_ms__start,
               n_ms__end: n_ms__ovl_end - o_range.n_ms__start,
               n_idx__order: n_idx__order++,
            });
         }
      });
   }
};

let f_o_payload = function (n_o_project_n_id) {
   return {
      a_o_video_section: f_a_o_video_section(n_o_project_n_id),
      a_n_ms__marker: f_a_n_ms__marker(n_o_project_n_id),
   };
};

let f_register = function () {
   f_handler_register("section_list", function (o_ws, o_v_data) {
      f_recompute(o_v_data.n_o_project_n_id); // keep in sync with current videos
      return f_o_payload(o_v_data.n_o_project_n_id);
   });

   f_handler_register("marker_add", function (o_ws, o_v_data) {
      let a_n_ms = f_a_n_ms__marker(o_v_data.n_o_project_n_id);
      let n_ms = Math.round(o_v_data.n_ms || 0);
      let b_dup = a_n_ms.some(function (n_ms__marker) {
         return Math.abs(n_ms__marker - n_ms) < 1;
      });
      if (!b_dup) {
         a_n_ms.push(n_ms);
         f_set_marker(o_v_data.n_o_project_n_id, a_n_ms);
         f_recompute(o_v_data.n_o_project_n_id);
      }
      return f_o_payload(o_v_data.n_o_project_n_id);
   });

   // delete a whole section = remove the two markers of pair n_idx
   f_handler_register("section_delete", function (o_ws, o_v_data) {
      let a_n_ms = f_a_n_ms__marker(o_v_data.n_o_project_n_id);
      let n_a = o_v_data.n_idx * 2;
      let n_b = n_a + 1;
      if (n_b < a_n_ms.length) {
         a_n_ms.splice(n_b, 1);
         a_n_ms.splice(n_a, 1);
         f_set_marker(o_v_data.n_o_project_n_id, a_n_ms);
         f_recompute(o_v_data.n_o_project_n_id);
      }
      return f_o_payload(o_v_data.n_o_project_n_id);
   });

   f_handler_register("marker_delete", function (o_ws, o_v_data) {
      let a_n_ms = f_a_n_ms__marker(o_v_data.n_o_project_n_id);
      if (a_n_ms.length > 0) {
         let n_ms = o_v_data.n_ms || 0;
         let n_idx__near = 0;
         let n_dist__near = Infinity;
         a_n_ms.forEach(function (n_ms__marker, n_idx) {
            let n_dist = Math.abs(n_ms__marker - n_ms);
            if (n_dist < n_dist__near) {
               n_dist__near = n_dist;
               n_idx__near = n_idx;
            }
         });
         a_n_ms.splice(n_idx__near, 1);
         f_set_marker(o_v_data.n_o_project_n_id, a_n_ms);
         f_recompute(o_v_data.n_o_project_n_id);
      }
      return f_o_payload(o_v_data.n_o_project_n_id);
   });
};

export { f_a_o_video_section, f_register };
