// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_a_o_query, f_o_query__one, f_o_run } from "../db/f_db.js";
import { f_handler_register } from "../f_ws_router.js";

// Generic key/value store (o_key_val). Holds ui/window state, shortcuts and
// other general settings. All values are strings (JSON-encoded by the caller).

let f_set = function (s_key, s_val) {
   let n_ts_ms = Date.now();
   let o_existing = f_o_query__one("SELECT n_id FROM o_key_val WHERE s_key = ?", [s_key]);
   if (o_existing) {
      f_o_run("UPDATE o_key_val SET s_val = ?, n_ts_ms__updated = ? WHERE s_key = ?", [
         s_val,
         n_ts_ms,
         s_key,
      ]);
   } else {
      f_o_run(
         "INSERT INTO o_key_val (s_key, s_val, n_ts_ms__created, n_ts_ms__updated) VALUES (?, ?, ?, ?)",
         [s_key, s_val, n_ts_ms, n_ts_ms],
      );
   }
};

let f_s_val = function (s_key) {
   let o_row = f_o_query__one("SELECT s_val FROM o_key_val WHERE s_key = ?", [s_key]);
   return o_row ? o_row.s_val : null;
};

let f_a_o_key_val = function (s_prefix) {
   if (s_prefix) {
      return f_a_o_query("SELECT s_key, s_val FROM o_key_val WHERE s_key LIKE ? ORDER BY s_key", [
         s_prefix + "%",
      ]);
   }
   return f_a_o_query("SELECT s_key, s_val FROM o_key_val ORDER BY s_key", []);
};

let f_register = function () {
   f_handler_register("keyval_set", function (o_ws, o_v_data) {
      f_set(o_v_data.s_key, o_v_data.s_val);
      return undefined;
   });

   f_handler_register("keyval_delete", function (o_ws, o_v_data) {
      f_o_run("DELETE FROM o_key_val WHERE s_key = ?", [o_v_data.s_key]);
      return undefined;
   });

   f_handler_register("keyval_list", function (o_ws, o_v_data) {
      return { a_o_key_val: f_a_o_key_val(o_v_data.s_prefix || "") };
   });
};

export { f_register, f_s_val, f_set };
