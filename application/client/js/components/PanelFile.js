// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { onMounted, ref } from "vue";
import { f_use_file } from "../store/use_file.js";
import { o_project__active } from "../store/use_project.js";

export default {
   setup() {
      let o = f_use_file();
      let o_added = ref({}); // s_path_abs -> true (button feedback)

      onMounted(function () {
         o.f_ls(o.o_listing.value ? o.o_listing.value.s_path_abs : "");
      });

      let f_add = function (o_entry) {
         if (!o_project__active.value) {
            alert("select a project first (Projects window)");
            return;
         }
         o.f_add_video(o_entry.s_path_abs);
         o_added.value = { ...o_added.value, [o_entry.s_path_abs]: true };
      };

      return {
         o_listing: o.o_listing,
         o_project__active,
         o_added,
         f_b_video: o.f_b_video,
         f_ls: o.f_ls,
         f_add,
      };
   },
   template: `
<div v-if="o_listing">
   <div class="el_active_project" :class="{ el_warn: !o_project__active }">
      {{ o_project__active ? 'active project: ' + o_project__active.s_name
                           : 'no project selected — pick one in the Projects window' }}
   </div>
   <div class="el_path">{{ o_listing.s_path_abs }}</div>
   <div class="el_list">
      <div class="el_item" @click="f_ls(o_listing.s_path_abs__parent)">../</div>
      <div v-for="o_entry in o_listing.a_o_entry" :key="o_entry.s_path_abs" class="el_item">
         <span class="el_grow" @click="o_entry.b_is_dir && f_ls(o_entry.s_path_abs)">
            {{ o_entry.b_is_dir ? '[dir] ' : '' }}{{ o_entry.s_name }}
         </span>
         <button v-if="!o_entry.b_is_dir && f_b_video(o_entry.s_name)"
                 :disabled="o_added[o_entry.s_path_abs]" @click="f_add(o_entry)">
            {{ o_added[o_entry.s_path_abs] ? 'added ✓' : 'add' }}
         </button>
      </div>
   </div>
</div>`,
};
