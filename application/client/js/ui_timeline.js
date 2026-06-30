// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import {
   f_n_ms__zoom,
   f_on_tick,
   f_on_zoom,
   f_seek,
   f_set_zoom,
   f_subscribe,
   o_data,
} from "./f_timeline.js";
import { f_on_highlight, f_subscribe as f_subscribe__section } from "./f_section.js";

// Renders the project's videos along one zoomable track. The playhead position is
// read from the shared timeline module (single source of truth), never stored
// locally. "zoom" is the visible time span; the view follows the playhead.
// Clicking the track seeks (video + playhead jump there).

let el_track = null;
let el_grid = null;
let el_playhead = null;
let el_cursor = null;
let el_tooltip = null;
let el_highlight = null;
let el_empty = null;
let el_zoom = null;
let el_zoom_val = null;
let a_o_block = [];
let a_o_marker = [];
let a_o_section = [];
let o_sec__cur = { a_o_video_section: [], a_n_ms__marker: [] };
let o_highlight = null;
let b_scrubbing = false;
let n_t__seek_last = 0;

let n_ms__zoom__min = 2000;
let n_ms__zoom__max = 1800000;

let f_n_ms__total = function () {
   return o_data.o_timeline ? o_data.o_timeline.n_ms__total : 0;
};

let f_n_ms__playhead = function () {
   return o_data.o_timeline ? o_data.o_timeline.n_ms__playhead : 0;
};

let a_n_ms__interval = [
   100,
   200,
   500,
   1000,
   2000,
   5000,
   10000,
   30000,
   60000,
   120000,
   300000,
   600000,
   1800000,
];

let f_s_zoom = function (n_ms) {
   if (n_ms < 60000) return Math.round(n_ms / 1000) + " s";
   return (n_ms / 60000).toFixed(1) + " min";
};

// m:ss.s timecode for the scrub/hover tooltip
let f_s_time = function (n_ms) {
   let n = Math.max(0, n_ms);
   let n_sec__total = Math.floor(n / 1000);
   let n_min = Math.floor(n_sec__total / 60);
   let n_sec = n_sec__total % 60;
   let n_ds = Math.floor((n % 1000) / 100);
   return n_min + ":" + String(n_sec).padStart(2, "0") + "." + n_ds;
};

// pick a grid interval that yields a readable number of lines for the span
let f_n_ms__interval = function (n_ms__span) {
   for (let n_idx = 0; n_idx < a_n_ms__interval.length; n_idx++) {
      if (n_ms__span / a_n_ms__interval[n_idx] <= 16) return a_n_ms__interval[n_idx];
   }
   return a_n_ms__interval[a_n_ms__interval.length - 1];
};

// scroll the background grid to match the visible window, so motion is visible.
// two layers: major lines at the interval, minor lines at 1/5 of it.
let f_grid = function (n_ms__span, n_ms__view_start) {
   let n_w = el_track.clientWidth || 1;
   let n_ms__interval = f_n_ms__interval(n_ms__span);
   let n_px__major = (n_ms__interval / n_ms__span) * n_w;
   let n_px__minor = n_px__major / 5;
   let n_px__off = -(n_ms__view_start / n_ms__span) * n_w;
   el_grid.style.backgroundSize = n_px__major + "px 100%, " + n_px__minor + "px 100%";
   el_grid.style.backgroundPositionX = n_px__off + "px, " + n_px__off + "px";
};

// visible span = the zoom, but never wider than the whole project (so content
// always fills the track and clicks map precisely; zooming in still scrolls)
let f_n_ms__span = function () {
   let n_ms__zoom = f_n_ms__zoom();
   let n_ms__total = f_n_ms__total();
   if (n_ms__total > 0 && n_ms__zoom > n_ms__total) return n_ms__total;
   return n_ms__zoom;
};

let f_n_ms__view_start = function () {
   let n_ms__span = f_n_ms__span();
   let n_ms__total = f_n_ms__total();
   if (n_ms__total <= n_ms__span) return 0;
   let n_start = f_n_ms__playhead() - n_ms__span / 2;
   if (n_start < 0) return 0;
   if (n_start > n_ms__total - n_ms__span) return n_ms__total - n_ms__span;
   return n_start;
};

let f_layout = function () {
   if (!el_track) return;
   let n_ms__span = f_n_ms__span();
   let n_ms__view_start = f_n_ms__view_start();
   f_grid(n_ms__span, n_ms__view_start);
   a_o_block.forEach(function (o_block) {
      let n_left = ((o_block.n_ms__start - n_ms__view_start) / n_ms__span) * 100;
      let n_width = (o_block.n_ms__duration / n_ms__span) * 100;
      o_block.el.style.left = n_left + "%";
      o_block.el.style.width = n_width + "%";
   });
   a_o_section.forEach(function (o_section) {
      let n_left = ((o_section.n_ms__start - n_ms__view_start) / n_ms__span) * 100;
      let n_width = ((o_section.n_ms__end - o_section.n_ms__start) / n_ms__span) * 100;
      o_section.el.style.left = n_left + "%";
      o_section.el.style.width = n_width + "%";
   });
   a_o_marker.forEach(function (o_marker) {
      let n_left = ((o_marker.n_ms - n_ms__view_start) / n_ms__span) * 100;
      o_marker.el.style.left = n_left + "%";
      o_marker.el.style.display = (n_left < 0 || n_left > 100) ? "none" : "block";
   });
   if (o_highlight && o_highlight.n_ms__end > o_highlight.n_ms__start) {
      let n_left = ((o_highlight.n_ms__start - n_ms__view_start) / n_ms__span) * 100;
      let n_width = ((o_highlight.n_ms__end - o_highlight.n_ms__start) / n_ms__span) * 100;
      el_highlight.style.left = n_left + "%";
      el_highlight.style.width = n_width + "%";
      el_highlight.style.display = "block";
   } else {
      el_highlight.style.display = "none";
   }
   let n_pct__playhead = ((f_n_ms__playhead() - n_ms__view_start) / n_ms__span) * 100;
   el_playhead.style.left = Math.max(0, Math.min(100, n_pct__playhead)) + "%";
};

// global ms offset where a video starts in the project timeline
let f_n_ms__video_start = function (n_o_video_n_id) {
   let n_acc = 0;
   let a_o_video = o_data.a_o_video || [];
   for (let n_idx = 0; n_idx < a_o_video.length; n_idx++) {
      if (a_o_video[n_idx].n_id === n_o_video_n_id) return n_acc;
      n_acc += a_o_video[n_idx].n_ms__duration || 0;
   }
   return null;
};

// rebuild section highlights + marker ticks from the shared section state
let f_overlay_build = function () {
   if (!el_track) return;
   a_o_section.forEach(function (o) {
      o.el.remove();
   });
   a_o_marker.forEach(function (o) {
      o.el.remove();
   });
   a_o_section = [];
   a_o_marker = [];

   (o_sec__cur.a_o_video_section || []).forEach(function (o_s) {
      let n_off = f_n_ms__video_start(o_s.n_o_video_n_id);
      if (n_off === null) return;
      let el = document.createElement("div");
      el.className = "el_section";
      el_track.appendChild(el);
      a_o_section.push({
         el,
         n_ms__start: n_off + o_s.n_ms__start,
         n_ms__end: n_off + o_s.n_ms__end,
      });
   });

   (o_sec__cur.a_n_ms__marker || []).forEach(function (n_ms) {
      let el = document.createElement("div");
      el.className = "el_marker";
      el_track.appendChild(el);
      a_o_marker.push({ el, n_ms });
   });

   f_layout();
};

// rebuild the video blocks (only needed when the set of videos changes)
let f_render = function (o_data__in) {
   if (!el_track) return;
   let a_o_video = o_data__in.a_o_video || [];

   el_track.innerHTML = "";
   a_o_block = [];
   if (a_o_video.length === 0 || f_n_ms__total() <= 0) {
      el_empty.style.display = "block";
      el_track.appendChild(el_grid);
      el_track.appendChild(el_highlight);
      el_track.appendChild(el_cursor);
      el_track.appendChild(el_playhead);
      el_track.appendChild(el_tooltip);
      return;
   }
   el_empty.style.display = "none";

   let n_ms__start = 0;
   a_o_video.forEach(function (o_video, n_idx) {
      let n_ms__duration = o_video.n_ms__duration || 0;
      let el_block = document.createElement("div");
      el_block.className = "el_block";
      if (n_idx % 2 === 1) el_block.classList.add("el_block__alt");
      let s_name = (o_video.s_path_abs || "").split("/").pop();
      el_block.textContent = s_name;
      el_block.title = s_name;
      el_track.appendChild(el_block);
      a_o_block.push({ el: el_block, n_ms__start, n_ms__duration });
      n_ms__start += n_ms__duration;
   });

   el_track.appendChild(el_grid);
   el_track.appendChild(el_highlight);
   el_track.appendChild(el_cursor);
   el_track.appendChild(el_playhead);
   el_track.appendChild(el_tooltip);
   f_overlay_build();
};

let f_n_ms__from_evt = function (o_evt) {
   let o_rect = el_track.getBoundingClientRect();
   let n_nor = (o_evt.clientX - o_rect.left) / o_rect.width;
   let n_ms = f_n_ms__view_start() + Math.max(0, Math.min(1, n_nor)) * f_n_ms__span();
   return Math.round(Math.max(0, Math.min(f_n_ms__total(), n_ms)));
};

let f_show_overlay = function (b_show) {
   let s_display = b_show ? "block" : "none";
   el_cursor.style.display = s_display;
   el_tooltip.style.display = s_display;
};

let f_overlay = function (o_evt, n_ms) {
   let o_rect = el_track.getBoundingClientRect();
   let n_px = Math.max(0, Math.min(o_rect.width, o_evt.clientX - o_rect.left));
   el_cursor.style.left = n_px + "px";
   el_tooltip.style.left = n_px + "px";
   el_tooltip.textContent = f_s_time(n_ms);
};

// optimistic local move every frame; throttle the server seek while dragging
let f_scrub = function (n_ms, b_force) {
   if (o_data.o_timeline) o_data.o_timeline.n_ms__playhead = n_ms;
   f_layout();
   let n_t = performance.now();
   if (b_force || n_t - n_t__seek_last > 60) {
      n_t__seek_last = n_t;
      f_seek(n_ms);
   }
};

let f_on_pointer_down = function (o_evt) {
   if (f_n_ms__total() <= 0) return;
   b_scrubbing = true;
   try {
      el_track.setPointerCapture(o_evt.pointerId);
   } catch (_o_err) { /* capture is best-effort */ }
   let n_ms = f_n_ms__from_evt(o_evt);
   f_show_overlay(true);
   f_overlay(o_evt, n_ms);
   f_scrub(n_ms, true);
};

let f_on_pointer_move = function (o_evt) {
   if (f_n_ms__total() <= 0) return;
   let n_ms = f_n_ms__from_evt(o_evt);
   f_show_overlay(true);
   f_overlay(o_evt, n_ms);
   if (b_scrubbing) f_scrub(n_ms, false);
};

let f_on_pointer_up = function (o_evt) {
   if (!b_scrubbing) return;
   b_scrubbing = false;
   try {
      el_track.releasePointerCapture(o_evt.pointerId);
   } catch (_o_err) { /* capture is best-effort */ }
   f_scrub(f_n_ms__from_evt(o_evt), true);
   let o_rect = el_track.getBoundingClientRect();
   let b_inside = o_evt.clientX >= o_rect.left && o_evt.clientX <= o_rect.right &&
      o_evt.clientY >= o_rect.top && o_evt.clientY <= o_rect.bottom;
   if (!b_inside) f_show_overlay(false);
};

let f_on_pointer_leave = function () {
   if (!b_scrubbing) f_show_overlay(false);
};

let f_o_btn = function (s_label, f_click) {
   let el_btn = document.createElement("button");
   el_btn.textContent = s_label;
   el_btn.addEventListener("click", f_click);
   return el_btn;
};

let f_init = function (el_body) {
   el_body.innerHTML = "";
   el_body.classList.add("el_timeline");

   let el_zoom_row = document.createElement("div");
   el_zoom_row.className = "el_zoom_row";
   let el_zoom_label = document.createElement("span");
   el_zoom_label.className = "el_ctrl_label";
   el_zoom_label.textContent = "zoom";
   el_zoom = document.createElement("input");
   el_zoom.type = "range";
   el_zoom.min = String(n_ms__zoom__min);
   el_zoom.max = String(n_ms__zoom__max);
   el_zoom.step = "1000";
   el_zoom.className = "el_slider";
   el_zoom_val = document.createElement("span");
   el_zoom_val.className = "el_slider_val";
   el_zoom.addEventListener("input", function () {
      f_set_zoom(Number(el_zoom.value));
   });
   el_zoom_row.appendChild(el_zoom_label);
   el_zoom_row.appendChild(el_zoom);
   el_zoom_row.appendChild(el_zoom_val);
   el_zoom_row.appendChild(f_o_btn("10s", function () {
      f_set_zoom(10000);
   }));
   el_zoom_row.appendChild(f_o_btn("2min", function () {
      f_set_zoom(120000);
   }));
   el_zoom_row.appendChild(f_o_btn("10min", function () {
      f_set_zoom(600000);
   }));

   el_empty = document.createElement("div");
   el_empty.className = "el_empty";
   el_empty.textContent = "no videos — add some from the Files window";
   el_empty.style.display = "none";

   el_track = document.createElement("div");
   el_track.className = "el_track";
   el_track.addEventListener("pointerdown", f_on_pointer_down);
   el_track.addEventListener("pointermove", f_on_pointer_move);
   el_track.addEventListener("pointerup", f_on_pointer_up);
   el_track.addEventListener("pointerleave", f_on_pointer_leave);
   el_track.addEventListener("pointercancel", f_on_pointer_up);

   el_grid = document.createElement("div");
   el_grid.className = "el_grid";

   el_cursor = document.createElement("div");
   el_cursor.className = "el_cursor";
   el_cursor.style.display = "none";

   el_tooltip = document.createElement("div");
   el_tooltip.className = "el_tooltip";
   el_tooltip.style.display = "none";

   el_playhead = document.createElement("div");
   el_playhead.className = "el_playhead";

   el_highlight = document.createElement("div");
   el_highlight.className = "el_highlight";
   el_highlight.style.display = "none";

   el_track.appendChild(el_grid);
   el_track.appendChild(el_highlight);
   el_track.appendChild(el_cursor);
   el_track.appendChild(el_playhead);
   el_track.appendChild(el_tooltip);

   el_body.appendChild(el_zoom_row);
   el_body.appendChild(el_empty);
   el_body.appendChild(el_track);

   // structural changes (video set / seek / play) rebuild blocks; ticks and zoom
   // just reposition using the shared playhead value.
   f_subscribe(f_render);
   f_subscribe__section(function (o_sec) {
      o_sec__cur = o_sec;
      f_overlay_build();
   });
   f_on_highlight(function (o_range) {
      o_highlight = o_range;
      f_layout();
   });
   f_on_tick(function () {
      f_layout();
   });
   f_on_zoom(function (n_ms) {
      if (el_zoom) {
         el_zoom.value = n_ms;
         el_zoom_val.textContent = f_s_zoom(n_ms);
      }
      f_layout();
   });
};

export { f_init };
