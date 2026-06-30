// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { computed, onMounted, onUnmounted, ref } from "vue";
import { f_use_timeline } from "../store/use_timeline.js";
import { f_use_section } from "../store/use_section.js";
import { f_n_ms__interval, f_s_time, f_s_zoom } from "../f_util.js";

// Zoomable, scrolling timeline. All positions are computed reactively from the
// shared playhead/zoom/videos. Click+drag scrubs; hover shows a cursor + tooltip.

export default {
   setup() {
      let o_tl = f_use_timeline();
      let o_sc = f_use_section();
      let el_track = ref(null);
      let n_w = ref(1);
      let b_hover = ref(false);
      let n_px__cursor = ref(0);
      let s_tooltip = ref("");
      let b_scrubbing = false;
      let n_t__seek = 0;

      let n_ms__total = computed(function () {
         return o_tl.o_state.o_timeline ? o_tl.o_state.o_timeline.n_ms__total : 0;
      });
      let n_ms__playhead = computed(function () {
         return o_tl.o_state.o_timeline ? o_tl.o_state.o_timeline.n_ms__playhead : 0;
      });
      let n_ms__span = computed(function () {
         let n_zoom = o_tl.n_ms__zoom.value;
         return (n_ms__total.value > 0 && n_zoom > n_ms__total.value) ? n_ms__total.value : n_zoom;
      });
      let n_ms__view = computed(function () {
         let n_span = n_ms__span.value;
         let n_total = n_ms__total.value;
         if (n_total <= n_span) return 0;
         let n_start = n_ms__playhead.value - n_span / 2;
         if (n_start < 0) return 0;
         if (n_start > n_total - n_span) return n_total - n_span;
         return n_start;
      });

      let f_pct = function (n_ms) {
         return ((n_ms - n_ms__view.value) / n_ms__span.value) * 100;
      };

      // video offsets along the global timeline
      let o_offset_by_video = computed(function () {
         let o_map = {};
         let n_acc = 0;
         (o_tl.o_state.a_o_video || []).forEach(function (o_video) {
            o_map[o_video.n_id] = n_acc;
            n_acc += o_video.n_ms__duration || 0;
         });
         return o_map;
      });

      let a_o_block = computed(function () {
         let n_acc = 0;
         return (o_tl.o_state.a_o_video || []).map(function (o_video, n_idx) {
            let o = {
               n_id: o_video.n_id,
               s_name: (o_video.s_path_abs || "").split("/").pop(),
               n_ms__start: n_acc,
               n_ms__duration: o_video.n_ms__duration || 0,
               b_alt: n_idx % 2 === 1,
            };
            n_acc += o.n_ms__duration;
            return o;
         });
      });

      let a_o_section_box = computed(function () {
         return (o_sc.o_sec.a_o_video_section || []).map(function (o_s) {
            let n_off = o_offset_by_video.value[o_s.n_o_video_n_id];
            if (n_off === undefined) return null;
            return { n_ms__start: n_off + o_s.n_ms__start, n_ms__end: n_off + o_s.n_ms__end };
         }).filter(function (o) {
            return o !== null;
         });
      });

      let f_style_box = function (n_ms__start, n_ms__end) {
         return {
            left: f_pct(n_ms__start) + "%",
            width: ((n_ms__end - n_ms__start) / n_ms__span.value) * 100 + "%",
         };
      };
      let f_style_marker = function (n_ms) {
         let n_left = f_pct(n_ms);
         return { left: n_left + "%", display: (n_left < 0 || n_left > 100) ? "none" : "block" };
      };
      let o_style_playhead = computed(function () {
         return { left: Math.max(0, Math.min(100, f_pct(n_ms__playhead.value))) + "%" };
      });
      let o_style_highlight = computed(function () {
         let o_h = o_sc.o_highlight.value;
         if (!o_h || o_h.n_ms__end <= o_h.n_ms__start) return { display: "none" };
         return { display: "block", ...f_style_box(o_h.n_ms__start, o_h.n_ms__end) };
      });
      let o_style_grid = computed(function () {
         let n_span = n_ms__span.value;
         let n_interval = f_n_ms__interval(n_span);
         let n_major = (n_interval / n_span) * n_w.value;
         let n_off = -(n_ms__view.value / n_span) * n_w.value;
         return {
            backgroundSize: n_major + "px 100%, " + (n_major / 5) + "px 100%",
            backgroundPositionX: n_off + "px, " + n_off + "px",
         };
      });

      let f_n_ms__from_evt = function (o_evt) {
         let o_rect = el_track.value.getBoundingClientRect();
         let n_nor = (o_evt.clientX - o_rect.left) / o_rect.width;
         let n_ms = n_ms__view.value + Math.max(0, Math.min(1, n_nor)) * n_ms__span.value;
         return Math.round(Math.max(0, Math.min(n_ms__total.value, n_ms)));
      };
      let f_overlay = function (o_evt, n_ms) {
         let o_rect = el_track.value.getBoundingClientRect();
         n_px__cursor.value = Math.max(0, Math.min(o_rect.width, o_evt.clientX - o_rect.left));
         s_tooltip.value = f_s_time(n_ms);
      };
      let f_scrub = function (n_ms, b_force) {
         o_tl.f_set_playhead(n_ms);
         let n_t = performance.now();
         if (b_force || n_t - n_t__seek > 60) {
            n_t__seek = n_t;
            o_tl.f_seek(n_ms);
         }
      };
      let f_down = function (o_evt) {
         if (n_ms__total.value <= 0) return;
         b_scrubbing = true;
         try {
            el_track.value.setPointerCapture(o_evt.pointerId);
         } catch (_o_err) { /* best-effort */ }
         let n_ms = f_n_ms__from_evt(o_evt);
         b_hover.value = true;
         f_overlay(o_evt, n_ms);
         f_scrub(n_ms, true);
      };
      let f_move = function (o_evt) {
         if (n_ms__total.value <= 0) return;
         let n_ms = f_n_ms__from_evt(o_evt);
         b_hover.value = true;
         f_overlay(o_evt, n_ms);
         if (b_scrubbing) f_scrub(n_ms, false);
      };
      let f_up = function (o_evt) {
         if (!b_scrubbing) return;
         b_scrubbing = false;
         try {
            el_track.value.releasePointerCapture(o_evt.pointerId);
         } catch (_o_err) { /* best-effort */ }
         f_scrub(f_n_ms__from_evt(o_evt), true);
         let o_rect = el_track.value.getBoundingClientRect();
         if (
            !(o_evt.clientX >= o_rect.left && o_evt.clientX <= o_rect.right &&
               o_evt.clientY >= o_rect.top && o_evt.clientY <= o_rect.bottom)
         ) b_hover.value = false;
      };
      let f_leave = function () {
         if (!b_scrubbing) b_hover.value = false;
      };

      let o_ro = null;
      onMounted(function () {
         n_w.value = el_track.value.clientWidth || 1;
         o_ro = new ResizeObserver(function () {
            n_w.value = el_track.value.clientWidth || 1;
         });
         o_ro.observe(el_track.value);
      });
      onUnmounted(function () {
         if (o_ro) o_ro.disconnect();
      });

      return {
         el_track,
         o_zoom: o_tl.n_ms__zoom,
         o_sec: o_sc.o_sec,
         n_ms__total,
         a_o_block,
         a_o_section_box,
         o_style_grid,
         o_style_playhead,
         o_style_highlight,
         b_hover,
         n_px__cursor,
         s_tooltip,
         f_style_box,
         f_style_marker,
         f_set_zoom: o_tl.f_set_zoom,
         f_s_zoom,
         f_down,
         f_move,
         f_up,
         f_leave,
      };
   },
   template: `
<div class="el_timeline">
   <div class="el_zoom_row">
      <span class="el_ctrl_label">zoom</span>
      <input class="el_slider" type="range" min="2000" max="1800000" step="1000"
             :value="o_zoom" @input="e => f_set_zoom(Number(e.target.value))">
      <span class="el_slider_val">{{ f_s_zoom(o_zoom) }}</span>
      <button @click="f_set_zoom(10000)">10s</button>
      <button @click="f_set_zoom(120000)">2min</button>
      <button @click="f_set_zoom(600000)">10min</button>
   </div>
   <div v-if="n_ms__total <= 0" class="el_empty">no videos — add some from the Files window</div>
   <div ref="el_track" class="el_track"
        @pointerdown="f_down" @pointermove="f_move" @pointerup="f_up"
        @pointerleave="f_leave" @pointercancel="f_up">
      <div v-for="o_block in a_o_block" :key="o_block.n_id" class="el_block"
           :class="{ el_block__alt: o_block.b_alt }"
           :style="f_style_box(o_block.n_ms__start, o_block.n_ms__start + o_block.n_ms__duration)"
           :title="o_block.s_name">{{ o_block.s_name }}</div>
      <div class="el_grid" :style="o_style_grid"></div>
      <div v-for="(o_box, n_i) in a_o_section_box" :key="'s' + n_i" class="el_section"
           :style="f_style_box(o_box.n_ms__start, o_box.n_ms__end)"></div>
      <div class="el_highlight" :style="o_style_highlight"></div>
      <div v-for="(n_ms, n_i) in o_sec.a_n_ms__marker" :key="'m' + n_i" class="el_marker"
           :style="f_style_marker(n_ms)"></div>
      <div v-show="b_hover" class="el_cursor" :style="{ left: n_px__cursor + 'px' }"></div>
      <div class="el_playhead" :style="o_style_playhead"></div>
      <div v-show="b_hover" class="el_tooltip" :style="{ left: n_px__cursor + 'px' }">{{ s_tooltip }}</div>
   </div>
</div>`,
};
