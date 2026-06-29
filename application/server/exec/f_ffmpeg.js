// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_o_run_executable, f_s_stdout } from "./f_run_executable.js";

// Probe a video file via ffprobe (streamed, JSON output) and return normalized
// metadata. Never uses .output(); reads stdout as a stream.
let f_o_probe = async function (s_path_abs) {
   let a_s_arg = [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      s_path_abs,
   ];
   let o_process = f_o_run_executable("ffprobe", a_s_arg);
   let s_out = await f_s_stdout(o_process);
   await o_process.status;
   let o_probe = JSON.parse(s_out);
   let o_stream__video = (o_probe.streams || []).find((o) => o.codec_type === "video") || {};
   let n_sec__duration = Number(
      (o_probe.format && o_probe.format.duration) || o_stream__video.duration || 0,
   );
   let n_ms__duration = Math.round(n_sec__duration * 1000);
   let n_fps = f_n_fps(o_stream__video.avg_frame_rate || o_stream__video.r_frame_rate || "0/1");
   return {
      n_ms__duration,
      n_scl_x: Number(o_stream__video.width || 0),
      n_scl_y: Number(o_stream__video.height || 0),
      n_fps,
   };
};

let f_n_fps = function (s_rate) {
   let a_s = String(s_rate).split("/");
   let n_num = Number(a_s[0] || 0);
   let n_den = Number(a_s[1] || 1);
   if (!n_den) return 0;
   return Math.round((n_num / n_den) * 1000) / 1000;
};

export { f_o_probe };
