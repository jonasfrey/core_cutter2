// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_a_o_query, f_delete, f_n_id__insert, f_o_query__one } from "../db/f_db.js";
import { f_handler_register } from "../f_ws_router.js";
import { f_o_probe } from "../exec/f_ffmpeg.js";

let f_n_o_video_n_id = async function (s_path_abs) {
   let o_fsnode = f_o_query__one("SELECT * FROM o_fsnode WHERE s_path_abs = ?", [s_path_abs]);
   let n_o_fsnode_n_id = o_fsnode
      ? o_fsnode.n_id
      : f_n_id__insert("o_fsnode", { s_path_abs, b_is_dir: 0 });
   let o_video = f_o_query__one("SELECT * FROM o_video WHERE n_o_fsnode_n_id = ?", [
      n_o_fsnode_n_id,
   ]);
   if (o_video) return o_video.n_id;
   let o_meta = await f_o_probe(s_path_abs);
   return f_n_id__insert("o_video", {
      n_o_fsnode_n_id,
      n_ms__duration: o_meta.n_ms__duration,
      n_scl_x: o_meta.n_scl_x,
      n_scl_y: o_meta.n_scl_y,
      n_fps: o_meta.n_fps,
   });
};

let f_s_path_abs__video = function (n_o_video_n_id) {
   let o_row = f_o_query__one(
      `SELECT f.s_path_abs
       FROM o_video v JOIN o_fsnode f ON f.n_id = v.n_o_fsnode_n_id
       WHERE v.n_id = ?`,
      [n_o_video_n_id],
   );
   return o_row ? o_row.s_path_abs : null;
};

let f_a_o_video__project = function (n_o_project_n_id) {
   return f_a_o_query(
      `SELECT pv.n_id AS n_id__link, pv.n_idx__order,
              v.n_id, v.n_ms__duration, v.n_scl_x, v.n_scl_y, v.n_fps,
              f.s_path_abs
       FROM o_project_o_video pv
       JOIN o_video v ON v.n_id = pv.n_o_video_n_id
       JOIN o_fsnode f ON f.n_id = v.n_o_fsnode_n_id
       WHERE pv.n_o_project_n_id = ?
       ORDER BY pv.n_idx__order ASC, pv.n_id ASC`,
      [n_o_project_n_id],
   );
};

let f_register = function () {
   f_handler_register("project_video_add", async function (o_ws, o_v_data) {
      let n_o_video_n_id = await f_n_o_video_n_id(o_v_data.s_path_abs);
      let o_existing = f_o_query__one(
         "SELECT * FROM o_project_o_video WHERE n_o_project_n_id = ? AND n_o_video_n_id = ?",
         [o_v_data.n_o_project_n_id, n_o_video_n_id],
      );
      if (!o_existing) {
         let o_max = f_o_query__one(
            "SELECT MAX(n_idx__order) AS n_idx__max FROM o_project_o_video WHERE n_o_project_n_id = ?",
            [o_v_data.n_o_project_n_id],
         );
         f_n_id__insert("o_project_o_video", {
            n_o_project_n_id: o_v_data.n_o_project_n_id,
            n_o_video_n_id,
            n_idx__order: (o_max && o_max.n_idx__max !== null ? o_max.n_idx__max : -1) + 1,
         });
      }
      return { a_o_video: f_a_o_video__project(o_v_data.n_o_project_n_id) };
   });

   f_handler_register("project_video_list", function (o_ws, o_v_data) {
      return { a_o_video: f_a_o_video__project(o_v_data.n_o_project_n_id) };
   });

   f_handler_register("project_video_remove", function (o_ws, o_v_data) {
      f_delete("o_project_o_video", o_v_data.n_id__link);
      return { a_o_video: f_a_o_video__project(o_v_data.n_o_project_n_id) };
   });
};

export { f_a_o_video__project, f_register, f_s_path_abs__video };
