// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_on, f_send } from "./f_ws.js";
import { f_set_project__active, o_state } from "./f_state.js";

let el_body__panel = null;

let f_render = function (a_o_project) {
   if (!el_body__panel) return;
   el_body__panel.innerHTML = "";

   let el_row__create = document.createElement("div");
   el_row__create.className = "el_row";
   let el_input = document.createElement("input");
   el_input.placeholder = "new project name";
   let el_btn__create = document.createElement("button");
   el_btn__create.textContent = "create";
   el_btn__create.addEventListener("click", function () {
      let s_name = el_input.value.trim();
      if (s_name.length === 0) return;
      f_send("project_create", { s_name });
      el_input.value = "";
   });
   el_row__create.appendChild(el_input);
   el_row__create.appendChild(el_btn__create);
   el_body__panel.appendChild(el_row__create);

   let el_list = document.createElement("div");
   el_list.className = "el_list";
   a_o_project.forEach(function (o_project) {
      let el_item = document.createElement("div");
      el_item.className = "el_item";
      if (o_state.o_project__active && o_state.o_project__active.n_id === o_project.n_id) {
         el_item.classList.add("el_item__active");
      }

      let el_name = document.createElement("span");
      el_name.className = "el_grow";
      el_name.textContent = o_project.s_name;
      el_name.addEventListener("click", function () {
         f_set_project__active(o_project);
         f_render(a_o_project);
      });

      let el_btn__rename = document.createElement("button");
      el_btn__rename.textContent = "rename";
      el_btn__rename.addEventListener("click", function () {
         let s_name = prompt("rename project", o_project.s_name);
         if (s_name && s_name.trim().length > 0) {
            f_send("project_update", { n_id: o_project.n_id, s_name: s_name.trim() });
         }
      });

      let el_btn__delete = document.createElement("button");
      el_btn__delete.textContent = "delete";
      el_btn__delete.className = "el_danger";
      el_btn__delete.addEventListener("click", function () {
         if (confirm("delete project '" + o_project.s_name + "'?")) {
            f_send("project_delete", { n_id: o_project.n_id });
         }
      });

      el_item.appendChild(el_name);
      el_item.appendChild(el_btn__rename);
      el_item.appendChild(el_btn__delete);
      el_list.appendChild(el_item);
   });
   el_body__panel.appendChild(el_list);
};

let f_init = function (el_body) {
   el_body__panel = el_body;
   f_send("project_list", {});
};

f_on("project_list", function (o_v_data) {
   f_render(o_v_data.a_o_project);
});
f_on("project_create", function (o_v_data) {
   if (o_v_data.o_project) f_set_project__active(o_v_data.o_project);
   f_render(o_v_data.a_o_project);
});
f_on("project_update", function (o_v_data) {
   f_render(o_v_data.a_o_project);
});
f_on("project_delete", function (o_v_data) {
   if (o_state.o_project__active) {
      let b_still = o_v_data.a_o_project.some(function (o) {
         return o.n_id === o_state.o_project__active.n_id;
      });
      if (!b_still) f_set_project__active(null);
   }
   f_render(o_v_data.a_o_project);
});

export { f_init };
