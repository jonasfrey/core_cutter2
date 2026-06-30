// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { computed } from "vue";
import { f_use_section } from "../store/use_section.js";
import { f_s_time } from "../f_util.js";

// Lists derived sections first (each is a marker pair; deleting removes its two
// markers; hovering highlights it in the timeline), then the raw markers.

export default {
   setup() {
      let o = f_use_section();

      let a_o_marker = computed(function () {
         let a_n_ms = o.o_sec.a_n_ms__marker;
         return a_n_ms.map(function (n_ms, n_idx) {
            return {
               n_ms,
               b_pending: n_idx === a_n_ms.length - 1 && a_n_ms.length % 2 === 1,
            };
         });
      });

      return {
         a_o_pair: o.a_o_pair,
         a_o_marker,
         f_s_time,
         f_marker_add: o.f_marker_add,
         f_marker_delete: o.f_marker_delete,
         f_marker_delete_at: o.f_marker_delete_at,
         f_section_delete: o.f_section_delete,
         f_set_highlight: o.f_set_highlight,
      };
   },
   template: `
<div>
   <div class="el_hint">ctrl+m: add marker · ctrl+d: delete nearest. marker pairs form sections.</div>
   <div class="el_row">
      <button @click="f_marker_add">+ marker</button>
      <button @click="f_marker_delete">- nearest</button>
   </div>

   <div class="el_section_title">sections ({{ a_o_pair.length }})</div>
   <div v-if="a_o_pair.length === 0" class="el_empty">no sections yet</div>
   <div v-else class="el_list">
      <div v-for="o_pair in a_o_pair" :key="o_pair.n_idx" class="el_item"
           @mouseenter="f_set_highlight({ n_ms__start: o_pair.n_ms__start, n_ms__end: o_pair.n_ms__end })"
           @mouseleave="f_set_highlight(null)">
         <span class="el_grow">{{ o_pair.n_idx + 1 }}. {{ f_s_time(o_pair.n_ms__start) }} – {{ f_s_time(o_pair.n_ms__end) }}</span>
         <button class="el_danger" @click="f_set_highlight(null); f_section_delete(o_pair.n_idx)">delete</button>
      </div>
   </div>

   <div class="el_section_title">markers ({{ a_o_marker.length }})</div>
   <div v-if="a_o_marker.length === 0" class="el_empty">no markers</div>
   <div v-else class="el_list">
      <div v-for="(o_marker, n_i) in a_o_marker" :key="n_i" class="el_item">
         <span class="el_grow">{{ n_i + 1 }}. {{ f_s_time(o_marker.n_ms) }}{{ o_marker.b_pending ? '  (pending)' : '' }}</span>
         <button class="el_danger" @click="f_marker_delete_at(o_marker.n_ms)">x</button>
      </div>
   </div>
</div>`,
};
