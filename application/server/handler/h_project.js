// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_a_o_query, f_delete, f_n_id__insert, f_o_query__one, f_update } from "../db/f_db.js";
import { f_handler_register } from "../f_ws_router.js";

let f_a_o_project = function () {
   return f_a_o_query("SELECT * FROM o_project ORDER BY n_ts_ms__updated DESC", []);
};

let f_register = function () {
   f_handler_register("project_list", function () {
      return { a_o_project: f_a_o_project() };
   });

   f_handler_register("project_create", function (o_ws, o_v_data) {
      let n_id = f_n_id__insert("o_project", { s_name: o_v_data.s_name || "untitled" });
      return {
         o_project: f_o_query__one("SELECT * FROM o_project WHERE n_id = ?", [n_id]),
         a_o_project: f_a_o_project(),
      };
   });

   f_handler_register("project_update", function (o_ws, o_v_data) {
      f_update("o_project", o_v_data.n_id, { s_name: o_v_data.s_name });
      return { a_o_project: f_a_o_project() };
   });

   f_handler_register("project_delete", function (o_ws, o_v_data) {
      f_delete("o_project", o_v_data.n_id);
      return { a_o_project: f_a_o_project() };
   });
};

export { f_register };
