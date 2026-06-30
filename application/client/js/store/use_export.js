// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { reactive, ref, watch } from "vue";
import { f_on, f_send } from "../f_ws.js";
import { o_project__active } from "./use_project.js";
import { f_toggle } from "./use_window.js";
import { f_action_register } from "../f_shortcut.js";

// Reactive export store. Manages export settings (resolution, fps, format,
// name) and export progress. Registers ctrl+s to toggle the Export window.

let s_prefix__key = "o_export__";
let o_setting = reactive({ s_name: "", n_scl_x: 0, n_scl_y: 0, n_fps: 0, s_format: "mp4" });
let o_progress = ref(null);
let b_busy = ref(false);

let f_reset_name = function () {
   let o_project = o_project__active.value;
   o_setting.s_name = o_project ? o_project.s_name : "";
};

let f_export = function () {
   let o_project = o_project__active.value;
   if (!o_project || b_busy.value) return;
   let s_name = o_setting.s_name.trim();
   if (s_name.length === 0) s_name = o_project.s_name;
   b_busy.value = true;
   o_progress.value = { s_stage: "starting", s_message: "starting export..." };
   f_send("export_run", {
      n_o_project_n_id: o_project.n_id,
      s_name,
      n_scl_x: o_setting.n_scl_x,
      n_scl_y: o_setting.n_scl_y,
      n_fps: o_setting.n_fps,
      s_format: o_setting.s_format,
   });
};

let f_on_progress = function (o_v_data) {
   let o_project = o_project__active.value;
   if (!o_project || o_v_data.n_o_project_n_id !== o_project.n_id) return;
   o_progress.value = o_v_data;
   if (o_v_data.s_stage === "done" || o_v_data.s_stage === "error") {
      b_busy.value = false;
   }
};

// Persist settings to o_key_val
let f_persist = function () {
   f_send("keyval_set", {
      s_key: s_prefix__key + "setting",
      s_val: JSON.stringify({
         n_scl_x: o_setting.n_scl_x,
         n_scl_y: o_setting.n_scl_y,
         n_fps: o_setting.n_fps,
         s_format: o_setting.s_format,
      }),
   });
};

// Load persisted settings on startup
f_on("keyval_list", function (o_v_data) {
   (o_v_data.a_o_key_val || []).forEach(function (o_kv) {
      if (o_kv.s_key !== s_prefix__key + "setting") return;
      try {
         let o_parsed = JSON.parse(o_kv.s_val);
         if (o_parsed.n_scl_x !== undefined) o_setting.n_scl_x = o_parsed.n_scl_x;
         if (o_parsed.n_scl_y !== undefined) o_setting.n_scl_y = o_parsed.n_scl_y;
         if (o_parsed.n_fps !== undefined) o_setting.n_fps = o_parsed.n_fps;
         if (o_parsed.s_format) o_setting.s_format = o_parsed.s_format;
      } catch (_o_err) { /* ignore malformed */ }
   });
});

f_on("export_progress", f_on_progress);

// Reset name when project changes; persist settings when they change
watch(o_project__active, function () {
   f_reset_name();
});

// Register ctrl+s to toggle the Export window
f_action_register("export_open", "ctrl+s", function () {
   f_toggle("window_export");
});

// Initialize name
f_reset_name();

let f_use_export = function () {
   return { o_setting, o_progress, b_busy, f_export, f_reset_name, f_persist };
};

export { f_use_export };
