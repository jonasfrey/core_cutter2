// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

// Server unit test: the global-ms -> (video, local offset) cursor mapping.

import { assertEquals } from "jsr:@std/assert@1";
import { f_o_cursor } from "../server/handler/h_timeline.js";

let a_o_video = [
   { n_id: 1, n_ms__duration: 2000 },
   { n_id: 2, n_ms__duration: 4000 },
];

Deno.test("cursor maps into the first video", function () {
   let o = f_o_cursor(a_o_video, 500);
   assertEquals(o.n_o_video_n_id, 1);
   assertEquals(o.n_ms__local, 500);
   assertEquals(o.n_ms__start, 0);
});

Deno.test("cursor maps across the video boundary", function () {
   let o = f_o_cursor(a_o_video, 3000);
   assertEquals(o.n_o_video_n_id, 2);
   assertEquals(o.n_ms__local, 1000); // 3000 - 2000
   assertEquals(o.n_ms__start, 2000);
});

Deno.test("cursor clamps at the end", function () {
   let o = f_o_cursor(a_o_video, 999999);
   assertEquals(o.n_o_video_n_id, 2);
   assertEquals(o.n_ms__local, 4000);
});

Deno.test("cursor is null with no videos", function () {
   assertEquals(f_o_cursor([], 0), null);
});
