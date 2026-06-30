// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { ref } from "vue";
import { f_on, f_send } from "../f_ws.js";
import { o_project__active } from "./use_project.js";

// Reactive server-side file browser (backed by the server's fs_ls).

let o_listing = ref(null);
let a_s_ext__video = ["mp4", "mov", "mkv", "webm", "avi", "m4v", "mpg", "mpeg"];

let f_b_video = function (s_name) {
   return a_s_ext__video.includes(s_name.split(".").pop().toLowerCase());
};

let f_ls = function (s_path_abs) {
   f_send("fs_ls", { s_path_abs: s_path_abs || "" });
};

let f_add_video = function (s_path_abs) {
   let o_project = o_project__active.value;
   if (o_project) f_send("project_video_add", { n_o_project_n_id: o_project.n_id, s_path_abs });
};

f_on("fs_ls", function (o_v_data) {
   o_listing.value = o_v_data;
});

let f_use_file = function () {
   return { o_listing, f_b_video, f_ls, f_add_video };
};

export { f_use_file };
