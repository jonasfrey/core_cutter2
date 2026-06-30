// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { computed } from "vue";

// A movable + resizable window. Geometry lives in the reactive o_geo prop; this
// component mutates it during drag/resize and emits "persist" when a gesture ends.

export default {
   props: {
      s_title: { type: String, required: true },
      o_geo: { type: Object, required: true },
   },
   emits: ["front", "persist", "close"],
   setup(o_props, o_ctx) {
      let o_style = computed(function () {
         return {
            left: o_props.o_geo.n_pos_x + "px",
            top: o_props.o_geo.n_pos_y + "px",
            width: o_props.o_geo.n_scl_x + "px",
            height: o_props.o_geo.n_scl_y + "px",
            zIndex: o_props.o_geo.n_idx__z,
         };
      });

      let f_front = function () {
         o_ctx.emit("front");
      };

      let f_drag = function (o_evt__down, b_resize) {
         o_evt__down.preventDefault();
         o_ctx.emit("front");
         let n_x__start = o_evt__down.clientX;
         let n_y__start = o_evt__down.clientY;
         let o_geo = o_props.o_geo;
         let n_pos_x__start = o_geo.n_pos_x;
         let n_pos_y__start = o_geo.n_pos_y;
         let n_scl_x__start = o_geo.n_scl_x;
         let n_scl_y__start = o_geo.n_scl_y;
         let f_on_move = function (o_evt) {
            let n_dx = o_evt.clientX - n_x__start;
            let n_dy = o_evt.clientY - n_y__start;
            if (b_resize) {
               o_geo.n_scl_x = Math.max(200, n_scl_x__start + n_dx);
               o_geo.n_scl_y = Math.max(120, n_scl_y__start + n_dy);
            } else {
               o_geo.n_pos_x = n_pos_x__start + n_dx;
               o_geo.n_pos_y = n_pos_y__start + n_dy;
            }
         };
         let f_on_up = function () {
            globalThis.removeEventListener("mousemove", f_on_move);
            globalThis.removeEventListener("mouseup", f_on_up);
            o_ctx.emit("persist");
         };
         globalThis.addEventListener("mousemove", f_on_move);
         globalThis.addEventListener("mouseup", f_on_up);
      };

      return {
         o_style,
         f_front,
         f_down_move: function (o_evt) {
            f_drag(o_evt, false);
         },
         f_down_resize: function (o_evt) {
            f_drag(o_evt, true);
         },
      };
   },
   template: `
<div class="el_window" :style="o_style" @mousedown="f_front">
   <div class="el_titlebar" @mousedown="f_down_move">
      <span>{{ s_title }}</span>
      <button class="el_close" @click.stop="$emit('close')">x</button>
   </div>
   <div class="el_body"><slot></slot></div>
   <div class="el_resize" @mousedown.stop="f_down_resize"></div>
</div>`,
};
