// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { DatabaseSync } from "node:sqlite";

let o_db = null;

let f_n_ts_ms = function () {
   return Date.now();
};

let f_db_init = function (s_path_db, s_path_schema) {
   o_db = new DatabaseSync(s_path_db);
   o_db.exec("PRAGMA journal_mode = WAL;");
   let s_schema = Deno.readTextFileSync(s_path_schema);
   o_db.exec(s_schema);
   return o_db;
};

let f_a_o_query = function (s_sql, a_v_param) {
   let o_stmt = o_db.prepare(s_sql);
   return o_stmt.all(...(a_v_param || []));
};

let f_o_query__one = function (s_sql, a_v_param) {
   let o_stmt = o_db.prepare(s_sql);
   return o_stmt.get(...(a_v_param || [])) || null;
};

let f_o_run = function (s_sql, a_v_param) {
   let o_stmt = o_db.prepare(s_sql);
   return o_stmt.run(...(a_v_param || []));
};

let f_n_id__insert = function (s_table, o_row) {
   let n_ts_ms = f_n_ts_ms();
   let o_row__full = { ...o_row, n_ts_ms__created: n_ts_ms, n_ts_ms__updated: n_ts_ms };
   let a_s_col = Object.keys(o_row__full);
   let s_col = a_s_col.join(", ");
   let s_placeholder = a_s_col.map(() => "?").join(", ");
   let a_v_param = a_s_col.map((s_col) => o_row__full[s_col]);
   let o_result = f_o_run(`INSERT INTO ${s_table} (${s_col}) VALUES (${s_placeholder})`, a_v_param);
   return Number(o_result.lastInsertRowid);
};

let f_update = function (s_table, n_id, o_row) {
   let o_row__full = { ...o_row, n_ts_ms__updated: f_n_ts_ms() };
   let a_s_col = Object.keys(o_row__full);
   let s_set = a_s_col.map((s_col) => `${s_col} = ?`).join(", ");
   let a_v_param = a_s_col.map((s_col) => o_row__full[s_col]);
   a_v_param.push(n_id);
   f_o_run(`UPDATE ${s_table} SET ${s_set} WHERE n_id = ?`, a_v_param);
};

let f_delete = function (s_table, n_id) {
   f_o_run(`DELETE FROM ${s_table} WHERE n_id = ?`, [n_id]);
};

export {
   f_a_o_query,
   f_db_init,
   f_delete,
   f_n_id__insert,
   f_n_ts_ms,
   f_o_query__one,
   f_o_run,
   f_update,
};
