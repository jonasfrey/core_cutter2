// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

// Client UI smoke test: every Vue component template must compile (catches
// template syntax errors without needing a real browser). Browser globals the
// client modules touch on import are stubbed.

import { assert } from "jsr:@std/assert@1";

let a_s_module = [
   "../client/js/components/App.js",
   "../client/js/components/WindowFrame.js",
   "../client/js/components/PanelProject.js",
   "../client/js/components/PanelFile.js",
   "../client/js/components/PanelPlayer.js",
   "../client/js/components/PanelTimeline.js",
   "../client/js/components/PanelSection.js",
];

Deno.test("client component templates compile", async function () {
   globalThis.WebSocket = class {
      addEventListener() {}
      send() {}
      close() {}
   };
   globalThis.location = { protocol: "http:", host: "localhost:8000" };

   let { compile } = await import("../client/vendor/vue.esm-browser.js");
   // passthrough entity decoder so the compiler never needs a real DOM
   let o_opt = {
      decodeEntities: function (s_raw) {
         return s_raw;
      },
   };

   for (let s_module of a_s_module) {
      let o_module = await import(s_module);
      let o_component = o_module.default;
      assert(o_component, s_module + " has no default export");
      if (typeof o_component.template === "string") {
         compile(o_component.template, o_opt); // throws on a template syntax error
      }
   }
});
