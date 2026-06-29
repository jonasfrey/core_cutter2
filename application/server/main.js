// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { serveFile } from "jsr:@std/http@1/file-server";
import { f_db_init } from "./db/f_db.js";
import { f_handler_register, f_route } from "./f_ws_router.js";
import { f_register as f_register__project } from "./handler/h_project.js";
import { f_register as f_register__fsnode } from "./handler/h_fsnode.js";
import { f_register as f_register__video, f_s_path_abs__video } from "./handler/h_video.js";
import { f_register as f_register__keyval } from "./handler/h_keyval.js";
import { f_register as f_register__timeline } from "./handler/h_timeline.js";

let s_dir__server = new URL(".", import.meta.url).pathname;
let s_dir__app = new URL("../", import.meta.url).pathname;
let s_dir__client = s_dir__app + "client";
let s_path_db = s_dir__app + ".gitignored/app.db";
let s_path_schema = s_dir__server + "db/schema.sql";

let n_port = Number(Deno.env.get("PORT") || "8000");

f_db_init(s_path_db, s_path_schema);

f_handler_register("ping", function () {
   return { s_message: "pong" };
});
f_register__project();
f_register__fsnode();
f_register__video();
f_register__keyval();
f_register__timeline();

let o_type_by_ext = {
   html: "text/html; charset=utf-8",
   js: "text/javascript; charset=utf-8",
   css: "text/css; charset=utf-8",
   json: "application/json; charset=utf-8",
};

let f_o_response__static = async function (s_pathname) {
   let s_rel = s_pathname === "/" ? "/index.html" : s_pathname;
   let s_path_abs = s_dir__client + s_rel;
   try {
      let nu8_body = await Deno.readFile(s_path_abs);
      let s_ext = s_rel.split(".").pop();
      let s_type = o_type_by_ext[s_ext] || "application/octet-stream";
      return new Response(nu8_body, { headers: { "content-type": s_type } });
   } catch (_o_err) {
      return new Response("not found", { status: 404 });
   }
};

let f_o_response__media = async function (o_request, s_n_id) {
   let s_path_abs = f_s_path_abs__video(Number(s_n_id));
   if (!s_path_abs) return new Response("not found", { status: 404 });
   return await serveFile(o_request, s_path_abs);
};

let f_handle = function (o_request) {
   let o_url = new URL(o_request.url);
   if (o_url.pathname === "/ws") {
      let { socket: o_ws, response: o_response } = Deno.upgradeWebSocket(o_request);
      o_ws.onmessage = function (o_evt) {
         f_route(o_ws, o_evt.data);
      };
      o_ws.onerror = function () {};
      return o_response;
   }
   if (o_url.pathname.startsWith("/media/")) {
      return f_o_response__media(o_request, o_url.pathname.slice("/media/".length));
   }
   return f_o_response__static(o_url.pathname);
};

Deno.serve({ port: n_port }, f_handle);
console.error(`core_cutter server listening on http://localhost:${n_port}`);
