// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_o_query__one } from "../db/f_db.js";
import { f_handler_register, f_send } from "../f_ws_router.js";
import { f_o_run_executable, f_stderr_each_line } from "../exec/f_run_executable.js";
import { f_s_path_abs__video } from "./h_video.js";
import { f_a_o_video_section } from "./h_section.js";

// Export: for each o_video_section in order, trim the segment from its source
// video (stream copy for speed), then concat all segments into one output file.
// Supports configurable resolution, fps, format, and output name.
// Progress is streamed to the client via "export_progress" messages.

let f_s_dir = function () {
   let s_dir__app = new URL("../../", import.meta.url).pathname;
   return s_dir__app + ".gitignored/exports";
};

let f_s_path_out = function (s_name, s_format) {
   return f_s_dir() + "/" + s_name + "." + s_format;
};

let f_s_path_tmp = function (n_idx) {
   return f_s_dir() + "/temp/segment_" + n_idx + ".ts";
};

let f_ensure_dir = function () {
   try {
      Deno.mkdirSync(f_s_dir());
   } catch (_o_err) { /* already exists */ }
   try {
      Deno.mkdirSync(f_s_dir() + "/temp");
   } catch (_o_err) { /* already exists */ }
};

let f_cleanup = function (a_s_path_tmp) {
   a_s_path_tmp.forEach(function (s_path) {
      try {
         Deno.removeSync(s_path);
      } catch (_o_err) { /* best-effort */ }
   });
};

let f_s_project_name = function (n_o_project_n_id) {
   let o_row = f_o_query__one("SELECT s_name FROM o_project WHERE n_id = ?", [n_o_project_n_id]);
   return o_row ? o_row.s_name : "project_" + n_o_project_n_id;
};

// Build codec/format-specific args for the concat step
let f_a_s_codec = function (s_format) {
   if (s_format === "webm") {
      return ["-c:v", "libvpx-vp9", "-c:a", "libopus", "-pix_fmt", "yuv420p"];
   }
   // mp4, mov, mkv all use h264/aac
   return ["-c:v", "libx264", "-c:a", "aac", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];
};

let f_a_s_vf = function (n_scl_x, n_scl_y) {
   if (n_scl_x > 0 && n_scl_y > 0) {
      return ["-vf", "scale=" + n_scl_x + ":" + n_scl_y];
   }
   return [];
};

let f_a_s_fps = function (n_fps) {
   if (n_fps > 0) {
      return ["-r", String(n_fps)];
   }
   return [];
};

let f_export = async function (o_ws, n_o_project_n_id, o_opt) {
   // o_opt: { s_name, n_scl_x, n_scl_y, n_fps, s_format }
   let s_name = o_opt.s_name || f_s_project_name(n_o_project_n_id);
   let n_scl_x = o_opt.n_scl_x || 0;
   let n_scl_y = o_opt.n_scl_y || 0;
   let n_fps = o_opt.n_fps || 0;
   let s_format = o_opt.s_format || "mp4";

   // sanitize name: strip path separators and dots
   let s_name__safe = s_name.replace(/[\/\\]/g, "_").replace(/\.+/g, "_");
   if (s_name__safe.length === 0) s_name__safe = f_s_project_name(n_o_project_n_id);

   f_ensure_dir();

   let a_o_section = f_a_o_video_section(n_o_project_n_id);
   if (a_o_section.length === 0) {
      f_send(o_ws, "export_progress", {
         n_o_project_n_id,
         s_stage: "error",
         s_message: "no sections to export — create at least one section first",
      });
      return;
   }

   let n_cnt = a_o_section.length;
   let a_s_path_tmp = [];

   f_send(o_ws, "export_progress", {
      n_o_project_n_id,
      s_stage: "trim_start",
      n_cnt__section: n_cnt,
      s_project_name: s_name__safe,
   });

   // Step 1: trim each section from its source video (stream copy)
   for (let n_idx = 0; n_idx < n_cnt; n_idx++) {
      let o_section = a_o_section[n_idx];
      let s_path_src = f_s_path_abs__video(o_section.n_o_video_n_id);
      if (!s_path_src) {
         f_cleanup(a_s_path_tmp);
         f_send(o_ws, "export_progress", {
            n_o_project_n_id,
            s_stage: "error",
            s_message: "video not found for section " + n_idx,
         });
         return;
      }

      let s_path_tmp = f_s_path_tmp(n_idx);
      a_s_path_tmp.push(s_path_tmp);

      let n_sec__start = o_section.n_ms__start / 1000;
      let n_sec__duration = (o_section.n_ms__end - o_section.n_ms__start) / 1000;

      f_send(o_ws, "export_progress", {
         n_o_project_n_id,
         s_stage: "trim",
         n_idx__section: n_idx,
         n_cnt__section: n_cnt,
         s_path_src,
      });

      let o_process = f_o_run_executable("ffmpeg", [
         "-ss", String(n_sec__start),
         "-i", s_path_src,
         "-t", String(n_sec__duration),
         "-c", "copy",
         "-avoid_negative_ts", "make_zero",
         "-y",
         s_path_tmp,
      ]);

      f_stderr_each_line(o_process, function (_s_line) {
         // ffmpeg trim stderr is informational; not parsed for progress here
      });

      let o_status = await o_process.status;
      if (!o_status.success) {
         f_cleanup(a_s_path_tmp);
         f_send(o_ws, "export_progress", {
            n_o_project_n_id,
            s_stage: "error",
            s_message: "ffmpeg trim failed for section " + n_idx + " (exit code " +
               o_status.code + ")",
         });
         return;
      }

      f_send(o_ws, "export_progress", {
         n_o_project_n_id,
         s_stage: "trim_done",
         n_idx__section: n_idx,
         n_cnt__section: n_cnt,
      });
   }

   // Step 2: write concat file list
   let s_path_filelist = f_s_dir() + "/temp/filelist.txt";
   let a_s_line = a_s_path_tmp.map(function (s_path) {
      return "file '" + s_path + "'";
   });
   Deno.writeTextFileSync(s_path_filelist, a_s_line.join("\n") + "\n");

   // Step 3: concat + re-encode with user-selected settings
   let s_path_out = f_s_path_out(s_name__safe, s_format);

   f_send(o_ws, "export_progress", {
      n_o_project_n_id,
      s_stage: "concat_start",
      n_cnt__section: n_cnt,
   });

   let a_s_arg = [
      "-f", "concat",
      "-safe", "0",
      "-i", s_path_filelist,
      ...f_a_s_vf(n_scl_x, n_scl_y),
      ...f_a_s_fps(n_fps),
      ...f_a_s_codec(s_format),
      "-y",
      s_path_out,
   ];

   let o_process__concat = f_o_run_executable("ffmpeg", a_s_arg);

   // parse concat progress from stderr (ffmpeg writes "time=HH:MM:SS.ms" there)
   let n_sec__total = a_o_section.reduce(function (n_acc, o_s) {
      return n_acc + (o_s.n_ms__end - o_s.n_ms__start);
   }, 0) / 1000;

   f_stderr_each_line(o_process__concat, function (s_line) {
      let n_idx__time = s_line.indexOf("time=");
      if (n_idx__time < 0) return;
      let s_rest = s_line.slice(n_idx__time + 5);
      let s_time = s_rest.split(/\s/)[0];
      let a_n_part = s_time.split(":");
      if (a_n_part.length < 3) return;
      let n_sec = Number(a_n_part[0]) * 3600 + Number(a_n_part[1]) * 60 +
         Number(a_n_part[2]);
      let n_pct = n_sec__total > 0 ? Math.min(100, Math.round((n_sec / n_sec__total) * 100)) : 0;
      f_send(o_ws, "export_progress", {
         n_o_project_n_id,
         s_stage: "concat",
         n_pct,
         n_sec__total,
      });
   });

   let o_status__concat = await o_process__concat.status;

   // cleanup temp files
   f_cleanup(a_s_path_tmp);
   try {
      Deno.removeSync(s_path_filelist);
   } catch (_o_err) { /* ok */ }

   if (!o_status__concat.success) {
      f_send(o_ws, "export_progress", {
         n_o_project_n_id,
         s_stage: "error",
         s_message: "ffmpeg concat failed (exit code " + o_status__concat.code + ")",
      });
      return;
   }

   f_send(o_ws, "export_progress", {
      n_o_project_n_id,
      s_stage: "done",
      s_path_abs__output: s_path_out,
      s_project_name: s_name__safe,
   });
};

let f_register = function () {
   f_handler_register("export_run", async function (o_ws, o_v_data) {
      await f_export(o_ws, o_v_data.n_o_project_n_id, {
         s_name: o_v_data.s_name,
         n_scl_x: o_v_data.n_scl_x,
         n_scl_y: o_v_data.n_scl_y,
         n_fps: o_v_data.n_fps,
         s_format: o_v_data.s_format,
      });
      return undefined; // all communication via export_progress pushes
   });
};

export { f_register };
