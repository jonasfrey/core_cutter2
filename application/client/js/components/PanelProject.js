// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { onMounted, ref } from "vue";
import { f_use_project } from "../store/use_project.js";

export default {
   setup() {
      let o = f_use_project();
      let s_name__new = ref("");

      onMounted(function () {
         o.f_load();
      });

      let f_create = function () {
         let s_name = s_name__new.value.trim();
         if (s_name.length === 0) return;
         o.f_create(s_name);
         s_name__new.value = "";
      };

      let f_rename = function (o_project) {
         let s_name = prompt("rename project", o_project.s_name);
         if (s_name && s_name.trim().length > 0) o.f_update(o_project.n_id, s_name.trim());
      };

      let f_delete = function (o_project) {
         if (confirm("delete project '" + o_project.s_name + "'?")) o.f_delete(o_project.n_id);
      };

      let f_b_active = function (o_project) {
         return o.o_project__active.value && o.o_project__active.value.n_id === o_project.n_id;
      };

      return {
         a_o_project: o.a_o_project,
         s_name__new,
         f_create,
         f_rename,
         f_delete,
         f_select: o.f_select,
         f_b_active,
      };
   },
   template: `
<div>
   <div class="el_row">
      <input v-model="s_name__new" placeholder="new project name" @keyup.enter="f_create">
      <button @click="f_create">create</button>
   </div>
   <div class="el_list">
      <div v-for="o_project in a_o_project" :key="o_project.n_id"
           class="el_item" :class="{ el_item__active: f_b_active(o_project) }">
         <span class="el_grow" @click="f_select(o_project)">{{ o_project.s_name }}</span>
         <button @click="f_rename(o_project)">rename</button>
         <button class="el_danger" @click="f_delete(o_project)">delete</button>
      </div>
   </div>
</div>`,
};
