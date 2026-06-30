// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { computed, onMounted, watch } from "vue";
import { f_use_export } from "../store/use_export.js";
import { f_use_section } from "../store/use_section.js";
import { o_project__active } from "../store/use_project.js";

// Export panel with settings: resolution, fps, format, and output name.
// Shows live progress during export. Opened via ctrl+s.

let a_o_resolution = [
   { s_label: "Original", n_scl_x: 0, n_scl_y: 0 },
   { s_label: "1080p (1920×1080)", n_scl_x: 1920, n_scl_y: 1080 },
   { s_label: "720p (1280×720)", n_scl_x: 1280, n_scl_y: 720 },
   { s_label: "480p (854×480)", n_scl_x: 854, n_scl_y: 480 },
   { s_label: "360p (640×360)", n_scl_x: 640, n_scl_y: 360 },
];

let a_n_fps = [
   { s_label: "Original", n_fps: 0 },
   { s_label: "60", n_fps: 60 },
   { s_label: "30", n_fps: 30 },
   { s_label: "24", n_fps: 24 },
   { s_label: "15", n_fps: 15 },
];

let a_s_format = ["mp4", "webm", "mov", "mkv"];

export default {
   setup() {
      let o = f_use_export();
      let o_sc = f_use_section();

      let n_cnt__section = computed(function () {
         return o_sc.a_o_pair.value.length;
      });

      let f_b_can_export = computed(function () {
         return n_cnt__section.value > 0 && !o.b_busy.value;
      });

      // persist settings whenever they change
      watch(
         function () {
            return [
               o.o_setting.n_scl_x,
               o.o_setting.n_scl_y,
               o.o_setting.n_fps,
               o.o_setting.s_format,
            ].join("|");
         },
         function () {
            o.f_persist();
         },
      );

      // keep name in sync with project name when it changes
      watch(o_project__active, function () {
         o.f_reset_name();
      });

      return {
         o_setting: o.o_setting,
         o_progress: o.o_progress,
         b_busy: o.b_busy,
         n_cnt__section,
         f_b_can_export,
         f_export: o.f_export,
         a_o_resolution,
         a_n_fps,
         a_s_format,
      };
   },
   template: `
<div>
   <div class="el_hint">ctrl+s to open/close this window</div>

   <div class="el_section_title">settings</div>
   <div v-if="n_cnt__section === 0" class="el_empty">
      no sections — create sections before exporting
   </div>

   <div class="el_export_form">
      <div class="el_form_row">
         <label class="el_form_label">resolution</label>
         <select v-model="o_setting.n_scl_x" class="el_form_select">
            <option v-for="o_res in a_o_resolution" :key="o_res.s_label"
                    :value="o_res.n_scl_x">{{ o_res.s_label }}</option>
         </select>
      </div>

      <div class="el_form_row">
         <label class="el_form_label">fps</label>
         <select v-model="o_setting.n_fps" class="el_form_select">
            <option v-for="o_fps in a_n_fps" :key="o_fps.s_label"
                    :value="o_fps.n_fps">{{ o_fps.s_label }}</option>
         </select>
      </div>

      <div class="el_form_row">
         <label class="el_form_label">format</label>
         <select v-model="o_setting.s_format" class="el_form_select">
            <option v-for="s_fmt in a_s_format" :key="s_fmt"
                    :value="s_fmt">{{ s_fmt }}</option>
         </select>
      </div>

      <div class="el_form_row">
         <label class="el_form_label">name</label>
         <input v-model="o_setting.s_name" class="el_form_input"
                placeholder="output filename (without extension)">
      </div>
   </div>

   <div class="el_row">
      <button :disabled="!f_b_can_export" @click="f_export">export project</button>
   </div>

   <div class="el_section_title">progress</div>
   <div v-if="!o_progress" class="el_empty">no export running</div>
   <div v-else-if="o_progress.s_stage !== 'done' && o_progress.s_stage !== 'error'"
        class="el_export_status">
      {{ o_progress.s_stage === 'trim' || o_progress.s_stage === 'trim_done'
         ? 'trimming section ' + (o_progress.n_idx__section + 1) + ' / ' + o_progress.n_cnt__section
         : o_progress.s_stage === 'concat' ? 'encoding ' + o_progress.n_pct + '%'
         : o_progress.s_stage + '...' }}
      <div v-if="o_progress.s_stage === 'concat'" class="el_progress_bar">
         <div class="el_progress_fill" :style="{ width: o_progress.n_pct + '%' }"></div>
      </div>
   </div>
   <div v-else-if="o_progress.s_stage === 'done'" class="el_export_status">
      ✓ exported: {{ o_progress.s_path_abs__output }}
   </div>
   <div v-else-if="o_progress.s_stage === 'error'" class="el_export_status el_export_error">
      ✗ {{ o_progress.s_message }}
   </div>
</div>`,
};
