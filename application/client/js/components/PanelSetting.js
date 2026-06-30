// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { onMounted, onUnmounted, ref } from "vue";
import { f_use_setting } from "../store/use_setting.js";
import { f_s_combo } from "../f_shortcut.js";

// Settings panel: lists all registered actions with their current shortcuts
// and lets the user rebind any shortcut by clicking "rebind" then pressing
// the desired key combination.

export default {
   setup() {
      let o = f_use_setting();
      let s_rebinding = ref(null); // name of the action currently being rebound

      let f_start_rebind = function (s_name) {
         s_rebinding.value = s_name;
      };

      let f_capture = function (o_evt) {
         if (!s_rebinding.value) return;
         // ignore modifier-only presses
         if (["control", "shift", "alt", "meta"].includes(o_evt.key.toLowerCase())) return;
         o_evt.preventDefault();
         o_evt.stopPropagation();
         let s_combo = f_s_combo(o_evt);
         o.f_rebind(s_rebinding.value, s_combo);
         s_rebinding.value = null;
      };

      let f_cancel_rebind = function () {
         s_rebinding.value = null;
      };

      onMounted(function () {
         o.f_load();
         globalThis.addEventListener("keydown", f_capture, true);
      });

      onUnmounted(function () {
         globalThis.removeEventListener("keydown", f_capture, true);
      });

      return {
         a_o_setting: o.a_o_setting,
         s_rebinding,
         f_start_rebind,
         f_cancel_rebind,
      };
   },
   template: `
<div>
   <div class="el_hint">click "rebind" then press the desired key combination</div>

   <div class="el_section_title">actions ({{ a_o_setting.length }})</div>
   <div v-if="a_o_setting.length === 0" class="el_empty">no actions registered</div>
   <div v-else class="el_list">
      <div v-for="o_action in a_o_setting" :key="o_action.s_name" class="el_item">
         <span class="el_grow">{{ o_action.s_name }}</span>
         <span class="el_shortcut_display">{{ o_action.s_shortcut }}</span>
         <button v-if="s_rebinding !== o_action.s_name"
                 @click="f_start_rebind(o_action.s_name)">rebind</button>
         <button v-else class="el_rebind__active"
                 @click="f_cancel_rebind">recording — press keys (click to cancel)</button>
      </div>
   </div>
</div>`,
};
