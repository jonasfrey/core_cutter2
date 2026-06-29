// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { TextLineStream } from "jsr:@std/streams@1/text-line-stream";

// Standardized executable interface (see architecture.md).
// - spawn only, never .output()
// - stdin/stdout/stderr always streamed
// - stderr reserved for human-readable logs
// - structured data is newline-delimited JSON
//
// f_o_run_executable returns the spawned process plus its raw streams so callers
// can pipe/stream as needed without any blocking buffered read.

let f_o_run_executable = function (s_path_exec, a_s_arg, o_opt) {
   let o_opt__full = o_opt || {};
   let o_command = new Deno.Command(s_path_exec, {
      args: a_s_arg || [],
      stdin: o_opt__full.b_stdin ? "piped" : "null",
      stdout: "piped",
      stderr: "piped",
   });
   let o_process = o_command.spawn();
   return o_process;
};

// Stream stderr line by line to a callback (human-readable logs).
let f_stderr_each_line = async function (o_process, f_on_line) {
   let o_reader = o_process.stderr
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());
   for await (let s_line of o_reader) {
      f_on_line(s_line);
   }
};

// Stream stdout parsed as newline-delimited JSON to a callback.
let f_stdout_each_json = async function (o_process, f_on_o) {
   let o_reader = o_process.stdout
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());
   for await (let s_line of o_reader) {
      if (s_line.trim().length === 0) continue;
      f_on_o(JSON.parse(s_line));
   }
};

// Convenience: collect full stdout as text via streaming (no .output()).
let f_s_stdout = async function (o_process) {
   let s_out = "";
   let o_reader = o_process.stdout.pipeThrough(new TextDecoderStream());
   for await (let s_chunk of o_reader) {
      s_out += s_chunk;
   }
   return s_out;
};

export { f_o_run_executable, f_s_stdout, f_stderr_each_line, f_stdout_each_json };
