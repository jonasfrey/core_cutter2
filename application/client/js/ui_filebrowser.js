// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_on, f_send } from "./f_ws.js";
import { f_on_project__active, o_state } from "./f_state.js";

let el_body__panel = null;
let o_listing = null;

let a_s_ext__video = ["mp4", "mov", "mkv", "webm", "avi", "m4v", "mpg", "mpeg"];

let f_b_video = function (s_name) {
   let s_ext = s_name.split(".").pop().toLowerCase();
   return a_s_ext__video.includes(s_ext);
};

let f_render = function () {
   if (!el_body__panel || !o_listing) return;
   el_body__panel.innerHTML = "";

   let el_active = document.createElement("div");
   el_active.className = "el_active_project";
   el_active.textContent = o_state.o_project__active
      ? "active project: " + o_state.o_project__active.s_name
      : "no project selected — pick one in the Projects window";
   if (!o_state.o_project__active) el_active.classList.add("el_warn");
   el_body__panel.appendChild(el_active);

   let el_path = document.createElement("div");
   el_path.className = "el_path";
   el_path.textContent = o_listing.s_path_abs;
   el_body__panel.appendChild(el_path);

   let el_list = document.createElement("div");
   el_list.className = "el_list";

   let el_up = document.createElement("div");
   el_up.className = "el_item";
   el_up.textContent = "../";
   el_up.addEventListener("click", function () {
      f_send("fs_ls", { s_path_abs: o_listing.s_path_abs__parent });
   });
   el_list.appendChild(el_up);

   o_listing.a_o_entry.forEach(function (o_entry) {
      let el_item = document.createElement("div");
      el_item.className = "el_item";

      let el_name = document.createElement("span");
      el_name.className = "el_grow";
      el_name.textContent = (o_entry.b_is_dir ? "[dir] " : "") + o_entry.s_name;
      el_item.appendChild(el_name);

      if (o_entry.b_is_dir) {
         el_name.addEventListener("click", function () {
            f_send("fs_ls", { s_path_abs: o_entry.s_path_abs });
         });
      } else if (f_b_video(o_entry.s_name)) {
         let el_btn__add = document.createElement("button");
         el_btn__add.textContent = "add";
         el_btn__add.addEventListener("click", function () {
            if (!o_state.o_project__active) {
               alert("select a project first (Projects window)");
               return;
            }
            f_send("project_video_add", {
               n_o_project_n_id: o_state.o_project__active.n_id,
               s_path_abs: o_entry.s_path_abs,
            });
            el_btn__add.textContent = "added ✓";
            el_btn__add.disabled = true;
         });
         el_item.appendChild(el_btn__add);
      }
      el_list.appendChild(el_item);
   });
   el_body__panel.appendChild(el_list);
};

let f_init = function (el_body) {
   el_body__panel = el_body;
   f_send("fs_ls", { s_path_abs: o_listing ? o_listing.s_path_abs : "" });
};

f_on("fs_ls", function (o_v_data) {
   o_listing = o_v_data;
   f_render();
});

f_on_project__active(function () {
   f_render();
});

export { f_init };
