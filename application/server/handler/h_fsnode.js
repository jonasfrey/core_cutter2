// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_handler_register } from "../f_ws_router.js";

// Server-side file browser backed by Deno's directory reading (the architecture
// asks for a custom browser, not the native html file picker). We list entries
// for an absolute path and report whether each is a directory.

let f_a_o_entry = function (s_path_abs) {
   let a_o_entry = [];
   for (let o_dir_entry of Deno.readDirSync(s_path_abs)) {
      a_o_entry.push({
         s_name: o_dir_entry.name,
         b_is_dir: o_dir_entry.isDirectory,
         s_path_abs: f_s_join(s_path_abs, o_dir_entry.name),
      });
   }
   a_o_entry.sort(function (o_a, o_b) {
      if (o_a.b_is_dir !== o_b.b_is_dir) return o_a.b_is_dir ? -1 : 1;
      return o_a.s_name.localeCompare(o_b.s_name);
   });
   return a_o_entry;
};

let f_s_join = function (s_dir, s_name) {
   if (s_dir.endsWith("/")) return s_dir + s_name;
   return s_dir + "/" + s_name;
};

let f_s_parent = function (s_path_abs) {
   if (s_path_abs === "/") return "/";
   let s_trim = s_path_abs.replace(/\/+$/, "");
   let n_idx = s_trim.lastIndexOf("/");
   if (n_idx <= 0) return "/";
   return s_trim.slice(0, n_idx);
};

let f_register = function () {
   f_handler_register("fs_ls", function (o_ws, o_v_data) {
      let s_path_abs = o_v_data.s_path_abs || Deno.cwd();
      return {
         s_path_abs,
         s_path_abs__parent: f_s_parent(s_path_abs),
         a_o_entry: f_a_o_entry(s_path_abs),
      };
   });
};

export { f_register };
