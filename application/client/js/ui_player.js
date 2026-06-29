// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import {
   f_pause,
   f_play,
   f_report_time,
   f_seek,
   f_set_speed,
   f_subscribe,
   f_tick,
} from "./f_timeline.js";

// The player uses a <video> element as a dumb decode/render surface. The server
// owns the authoritative playhead/speed; this module applies that state, and while
// playing runs one rAF loop that drives the playhead (forward via the element,
// reverse by stepping currentTime) and reports progress back to the server.

let el_video = null;
let el_time = null;
let el_speed = null;
let el_speed_val = null;
let o_cursor__loaded = null;
let b_playing__local = false;
let n_speed__cur = 1;
let n_id__raf = null;
let n_t__last = 0;
let n_t__report_last = 0;

let f_s_clock = function (n_ms) {
   let n_sec__total = Math.floor((n_ms || 0) / 1000);
   let n_min = Math.floor(n_sec__total / 60);
   let n_sec = n_sec__total % 60;
   return n_min + ":" + String(n_sec).padStart(2, "0");
};

let f_stop_playback = function () {
   b_playing__local = false;
   if (n_id__raf !== null) {
      cancelAnimationFrame(n_id__raf);
      n_id__raf = null;
   }
   if (el_video) el_video.pause();
};

let f_loop = function (n_t) {
   if (!b_playing__local || !o_cursor__loaded) {
      n_id__raf = null;
      return;
   }
   let n_dt__sec = n_t__last ? (n_t - n_t__last) / 1000 : 0;
   n_t__last = n_t;

   if (n_speed__cur < 0) {
      let n_next = el_video.currentTime + n_speed__cur * n_dt__sec;
      if (n_next <= 0) {
         el_video.currentTime = 0;
         f_seek(o_cursor__loaded.n_ms__start);
         f_stop_playback();
         return;
      }
      el_video.currentTime = n_next;
   }

   let n_ms = o_cursor__loaded.n_ms__start + el_video.currentTime * 1000;
   f_tick(n_ms);
   if (n_t - n_t__report_last > 200) {
      n_t__report_last = n_t;
      f_report_time(n_ms);
   }
   n_id__raf = requestAnimationFrame(f_loop);
};

let f_start_playback = function (n_speed) {
   b_playing__local = true;
   n_speed__cur = n_speed;
   n_t__last = 0;
   if (n_speed > 0) {
      el_video.playbackRate = n_speed;
      let o_promise = el_video.play();
      if (o_promise && o_promise.catch) o_promise.catch(function () {});
   } else {
      el_video.pause();
   }
   if (n_id__raf === null) n_id__raf = requestAnimationFrame(f_loop);
};

let f_apply = function (o_data, s_reason) {
   if (!el_video) return;
   let o_t = o_data.o_timeline;
   if (!o_t || !o_t.o_cursor) {
      el_video.removeAttribute("src");
      el_video.load();
      o_cursor__loaded = null;
      el_time.textContent = "0:00 / 0:00";
      return;
   }
   let o_c = o_t.o_cursor;
   el_time.textContent = f_s_clock(o_t.n_ms__playhead) + " / " + f_s_clock(o_t.n_ms__total);
   if (el_speed && document.activeElement !== el_speed) {
      el_speed.value = o_t.n_speed;
      el_speed_val.textContent = Number(o_t.n_speed).toFixed(1) + "x";
   }

   let b_video__changed = !o_cursor__loaded ||
      o_cursor__loaded.n_o_video_n_id !== o_c.n_o_video_n_id;
   o_cursor__loaded = o_c;

   if (b_video__changed) {
      el_video.src = "/media/" + o_c.n_o_video_n_id;
      el_video.load();
      el_video.addEventListener("loadedmetadata", function () {
         el_video.currentTime = o_c.n_ms__local / 1000;
         if (o_t.b_playing) f_start_playback(o_t.n_speed);
      }, { once: true });
      return;
   }

   // an explicit seek jumps the video even while playing; routine play/speed
   // updates must not yank currentTime back
   if (s_reason === "seek" || !b_playing__local) {
      el_video.currentTime = o_c.n_ms__local / 1000;
   }
   if (o_t.b_playing) f_start_playback(o_t.n_speed);
   else f_stop_playback();
};

let f_on_ended = function () {
   if (!o_cursor__loaded) return;
   f_seek(o_cursor__loaded.n_ms__start + o_cursor__loaded.n_ms__duration);
};

let f_o_btn = function (s_label, f_click) {
   let el_btn = document.createElement("button");
   el_btn.textContent = s_label;
   el_btn.addEventListener("click", f_click);
   return el_btn;
};

let f_init = function (el_body) {
   el_body.innerHTML = "";
   el_body.classList.add("el_player");

   el_video = document.createElement("video");
   el_video.className = "el_video";
   el_video.controls = false;
   el_video.addEventListener("ended", f_on_ended);

   let el_controls = document.createElement("div");
   el_controls.className = "el_controls";

   el_controls.appendChild(f_o_btn("▶ play", function () {
      let n_speed = Number(el_speed.value);
      if (Math.abs(n_speed) < 0.1) n_speed = 1;
      f_play(n_speed);
   }));
   el_controls.appendChild(f_o_btn("❚❚ pause", function () {
      f_pause();
   }));

   el_speed = document.createElement("input");
   el_speed.type = "range";
   el_speed.min = "-10";
   el_speed.max = "10";
   el_speed.step = "0.2";
   el_speed.value = "1";
   el_speed.className = "el_slider";
   el_speed_val = document.createElement("span");
   el_speed_val.className = "el_slider_val";
   el_speed_val.textContent = "1.0x";
   el_speed.addEventListener("input", function () {
      let n_speed = Number(el_speed.value);
      el_speed_val.textContent = n_speed.toFixed(1) + "x";
      if (b_playing__local && n_speed > 0) el_video.playbackRate = n_speed;
   });
   el_speed.addEventListener("change", function () {
      let n_speed = Number(el_speed.value);
      if (b_playing__local) f_play(n_speed);
      else f_set_speed(n_speed);
   });

   let el_speed_label = document.createElement("span");
   el_speed_label.className = "el_ctrl_label";
   el_speed_label.textContent = "speed";

   el_time = document.createElement("span");
   el_time.className = "el_clock";
   el_time.textContent = "0:00 / 0:00";

   el_controls.appendChild(el_speed_label);
   el_controls.appendChild(el_speed);
   el_controls.appendChild(el_speed_val);
   el_controls.appendChild(el_time);

   el_body.appendChild(el_video);
   el_body.appendChild(el_controls);

   f_subscribe(f_apply);
};

export { f_init };
