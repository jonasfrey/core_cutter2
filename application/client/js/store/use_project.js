// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { ref } from "vue";
import { f_on, f_send } from "../f_ws.js";

// Reactive project store (singleton). The server owns the data; this mirrors it.

let a_o_project = ref([]);
let o_project__active = ref(null);

let f_load = function () {
   f_send("project_list", {});
};

let f_create = function (s_name) {
   f_send("project_create", { s_name });
};

let f_update = function (n_id, s_name) {
   f_send("project_update", { n_id, s_name });
};

let f_delete = function (n_id) {
   f_send("project_delete", { n_id });
};

let f_select = function (o_project) {
   o_project__active.value = o_project;
};

f_on("project_list", function (o_v_data) {
   a_o_project.value = o_v_data.a_o_project;
});
f_on("project_create", function (o_v_data) {
   a_o_project.value = o_v_data.a_o_project;
   if (o_v_data.o_project) o_project__active.value = o_v_data.o_project;
});
f_on("project_update", function (o_v_data) {
   a_o_project.value = o_v_data.a_o_project;
});
f_on("project_delete", function (o_v_data) {
   a_o_project.value = o_v_data.a_o_project;
   if (o_project__active.value) {
      let b_still = o_v_data.a_o_project.some(function (o) {
         return o.n_id === o_project__active.value.n_id;
      });
      if (!b_still) o_project__active.value = null;
   }
});

let f_use_project = function () {
   return { a_o_project, o_project__active, f_load, f_create, f_update, f_delete, f_select };
};

export { f_use_project, o_project__active };
