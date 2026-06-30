// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { f_use_timeline } from "../store/use_timeline.js";
import { f_s_clock } from "../f_util.js";

// The <video> element is a dumb decode/render surface. The store owns the
// authoritative playhead/speed; this component applies that state and, while
// playing, runs one rAF loop driving the playhead and reporting progress back.

export default {
   setup() {
      let o = f_use_timeline();
      let el_video = ref(null);
      let n_speed = ref(1);

      let o_cursor__loaded = null;
      let b_playing__local = false;
      let n_speed__cur = 1;
      let n_id__raf = null;
      let n_t__last = 0;
      let n_t__report = 0;

      let o_t = computed(function () {
         return o.o_state.o_timeline;
      });
      let o_cursor = computed(function () {
         return o_t.value ? o_t.value.o_cursor : null;
      });
      let s_clock = computed(function () {
         return o_t.value
            ? f_s_clock(o_t.value.n_ms__playhead) + " / " + f_s_clock(o_t.value.n_ms__total)
            : "0:00 / 0:00";
      });

      let f_stop_playback = function () {
         b_playing__local = false;
         if (n_id__raf !== null) {
            cancelAnimationFrame(n_id__raf);
            n_id__raf = null;
         }
         if (el_video.value) el_video.value.pause();
      };

      let f_loop = function (n_tt) {
         if (!b_playing__local || !o_cursor__loaded) {
            n_id__raf = null;
            return;
         }
         let n_dt__sec = n_t__last ? (n_tt - n_t__last) / 1000 : 0;
         n_t__last = n_tt;
         let el = el_video.value;
         if (n_speed__cur < 0) {
            let n_next = el.currentTime + n_speed__cur * n_dt__sec;
            if (n_next <= 0) {
               el.currentTime = 0;
               o.f_seek(o_cursor__loaded.n_ms__start);
               f_stop_playback();
               return;
            }
            el.currentTime = n_next;
         }
         let n_ms = o_cursor__loaded.n_ms__start + el.currentTime * 1000;
         o.f_set_playhead(n_ms);
         if (n_tt - n_t__report > 200) {
            n_t__report = n_tt;
            o.f_report_time(n_ms);
         }
         n_id__raf = requestAnimationFrame(f_loop);
      };

      let f_start_playback = function (n_sp) {
         b_playing__local = true;
         n_speed__cur = n_sp;
         n_t__last = 0;
         if (n_sp > 0) {
            el_video.value.playbackRate = n_sp;
            let o_promise = el_video.value.play();
            if (o_promise && o_promise.catch) o_promise.catch(function () {});
         } else {
            el_video.value.pause();
         }
         if (n_id__raf === null) n_id__raf = requestAnimationFrame(f_loop);
      };

      let f_apply_cursor = function () {
         let o_c = o_cursor.value;
         if (!el_video.value || !o_c) return;
         let b_changed = !o_cursor__loaded ||
            o_cursor__loaded.n_o_video_n_id !== o_c.n_o_video_n_id;
         o_cursor__loaded = o_c;
         if (b_changed) {
            el_video.value.src = "/media/" + o_c.n_o_video_n_id;
            el_video.value.load();
            el_video.value.addEventListener("loadedmetadata", function () {
               el_video.value.currentTime = o_c.n_ms__local / 1000;
               if (o_t.value && o_t.value.b_playing) f_start_playback(o_t.value.n_speed);
            }, { once: true });
         }
      };

      // load/switch the video when the cursor's video changes
      watch(function () {
         return o_cursor.value ? o_cursor.value.n_o_video_n_id : null;
      }, function () {
         f_apply_cursor();
      });
      // start/stop on play state
      watch(function () {
         return o_t.value ? o_t.value.b_playing : false;
      }, function (b_playing) {
         if (b_playing) f_start_playback(o_t.value.n_speed);
         else f_stop_playback();
      });
      // reflect server speed onto the slider + live rate
      watch(function () {
         return o_t.value ? o_t.value.n_speed : 1;
      }, function (n_sp) {
         n_speed.value = n_sp;
         if (b_playing__local) f_start_playback(n_sp);
      });
      // explicit seek -> jump the video (even while playing)
      watch(o.n_seek_token, function () {
         let o_c = o_cursor.value;
         if (
            el_video.value && o_c && o_cursor__loaded &&
            o_cursor__loaded.n_o_video_n_id === o_c.n_o_video_n_id
         ) {
            el_video.value.currentTime = o_c.n_ms__local / 1000;
         }
      });

      onMounted(function () {
         f_apply_cursor();
      });
      onUnmounted(function () {
         f_stop_playback();
      });

      let f_on_play = function () {
         let n_sp = Number(n_speed.value);
         if (Math.abs(n_sp) < 0.1) n_sp = 1;
         o.f_play(n_sp);
      };
      let f_on_ended = function () {
         if (o_cursor__loaded) {
            o.f_seek(o_cursor__loaded.n_ms__start + o_cursor__loaded.n_ms__duration);
         }
      };
      let f_on_speed_input = function () {
         let n_sp = Number(n_speed.value);
         if (b_playing__local && n_sp > 0) el_video.value.playbackRate = n_sp;
      };
      let f_on_speed_change = function () {
         let n_sp = Number(n_speed.value);
         if (b_playing__local) o.f_play(n_sp);
         else o.f_set_speed(n_sp);
      };

      return {
         el_video,
         n_speed,
         s_clock,
         f_on_play,
         f_on_pause: o.f_pause,
         f_on_ended,
         f_on_speed_input,
         f_on_speed_change,
      };
   },
   template: `
<div class="el_player">
   <video ref="el_video" class="el_video" @ended="f_on_ended"></video>
   <div class="el_controls">
      <button @click="f_on_play">▶ play</button>
      <button @click="f_on_pause">❚❚ pause</button>
      <span class="el_ctrl_label">speed</span>
      <input class="el_slider" type="range" min="-10" max="10" step="0.2"
             v-model="n_speed" @input="f_on_speed_input" @change="f_on_speed_change">
      <span class="el_slider_val">{{ Number(n_speed).toFixed(1) }}x</span>
      <span class="el_clock">{{ s_clock }}</span>
   </div>
</div>`,
};
