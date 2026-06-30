// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { computed, onMounted } from "vue";
import { f_send } from "../f_ws.js";
import { f_use_window } from "../store/use_window.js";
import "../store/use_project.js";
import "../store/use_timeline.js";
import "../store/use_section.js"; // registers ctrl+m / ctrl+d
import "../f_shortcut.js";
import WindowFrame from "./WindowFrame.js";
import PanelProject from "./PanelProject.js";
import PanelFile from "./PanelFile.js";
import PanelPlayer from "./PanelPlayer.js";
import PanelTimeline from "./PanelTimeline.js";
import PanelSection from "./PanelSection.js";

let a_o_window__def = [
   { s_window: "window_project", s_title: "Projects", o_component: PanelProject },
   { s_window: "window_file", s_title: "Files", o_component: PanelFile },
   { s_window: "window_player", s_title: "Player", o_component: PanelPlayer },
   { s_window: "window_timeline", s_title: "Timeline", o_component: PanelTimeline },
   { s_window: "window_section", s_title: "Sections", o_component: PanelSection },
];

export default {
   components: { WindowFrame },
   setup() {
      let o = f_use_window();
      a_o_window__def.forEach(function (o_def, n_idx) {
         o.f_ensure(o_def.s_window, n_idx);
      });

      let a_o_window__open = computed(function () {
         return a_o_window__def.filter(function (o_def) {
            return o.o_window[o_def.s_window].b_open;
         });
      });

      onMounted(function () {
         f_send("keyval_list", { s_prefix: "" });
      });

      return {
         a_o_window__def,
         a_o_window__open,
         o_window: o.o_window,
         f_toggle: o.f_toggle,
         f_front: o.f_front,
         f_persist: o.f_persist,
      };
   },
   template: `
<div id="el_app">
   <nav id="el_topbar">
      <span id="el_brand">core_cutter</span>
      <button v-for="o_def in a_o_window__def" :key="o_def.s_window"
              :class="{ el_nav__active: o_window[o_def.s_window].b_open }"
              @click="f_toggle(o_def.s_window)">{{ o_def.s_title }}</button>
   </nav>
   <main id="el_desktop">
      <WindowFrame v-for="o_def in a_o_window__open" :key="o_def.s_window"
                   :s_title="o_def.s_title" :o_geo="o_window[o_def.s_window]"
                   @front="f_front(o_def.s_window)" @persist="f_persist(o_def.s_window)"
                   @close="f_toggle(o_def.s_window)">
         <component :is="o_def.o_component"></component>
      </WindowFrame>
   </main>
</div>`,
};
