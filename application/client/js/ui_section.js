// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import {
   f_marker_add,
   f_marker_delete,
   f_marker_delete_at,
   f_section_delete,
   f_set_highlight,
   f_subscribe,
} from "./f_section.js";

// Lists the derived sections first (each is a marker pair; deleting one removes
// its two markers; hovering highlights it in the timeline), then the raw markers.

let el_body__panel = null;

let f_s_time = function (n_ms) {
   let n = Math.max(0, n_ms);
   let n_sec__total = Math.floor(n / 1000);
   let n_min = Math.floor(n_sec__total / 60);
   let n_sec = n_sec__total % 60;
   let n_ds = Math.floor((n % 1000) / 100);
   return n_min + ":" + String(n_sec).padStart(2, "0") + "." + n_ds;
};

let f_o_section_title = function (s_text) {
   let el = document.createElement("div");
   el.className = "el_section_title";
   el.textContent = s_text;
   return el;
};

// logical sections = consecutive marker pairs (global ms)
let f_a_o_pair = function (a_n_ms__marker) {
   let a_o_pair = [];
   for (let n_i = 0; n_i + 1 < a_n_ms__marker.length; n_i += 2) {
      a_o_pair.push({
         n_idx: n_i / 2,
         n_ms__start: a_n_ms__marker[n_i],
         n_ms__end: a_n_ms__marker[n_i + 1],
      });
   }
   return a_o_pair;
};

let f_render__section = function (a_o_pair) {
   let el_list = document.createElement("div");
   el_list.className = "el_list";
   a_o_pair.forEach(function (o_pair) {
      let el_item = document.createElement("div");
      el_item.className = "el_item";
      el_item.addEventListener("mouseenter", function () {
         f_set_highlight({ n_ms__start: o_pair.n_ms__start, n_ms__end: o_pair.n_ms__end });
      });
      el_item.addEventListener("mouseleave", function () {
         f_set_highlight(null);
      });

      let el_label = document.createElement("span");
      el_label.className = "el_grow";
      el_label.textContent = (o_pair.n_idx + 1) + ". " + f_s_time(o_pair.n_ms__start) +
         " – " + f_s_time(o_pair.n_ms__end);

      let el_btn__del = document.createElement("button");
      el_btn__del.textContent = "delete";
      el_btn__del.className = "el_danger";
      el_btn__del.addEventListener("click", function () {
         f_set_highlight(null);
         f_section_delete(o_pair.n_idx);
      });

      el_item.appendChild(el_label);
      el_item.appendChild(el_btn__del);
      el_list.appendChild(el_item);
   });
   return el_list;
};

let f_render__marker = function (a_n_ms__marker) {
   let el_list = document.createElement("div");
   el_list.className = "el_list";
   a_n_ms__marker.forEach(function (n_ms, n_idx) {
      let el_item = document.createElement("div");
      el_item.className = "el_item";
      let el_label = document.createElement("span");
      el_label.className = "el_grow";
      let b_pending = n_idx === a_n_ms__marker.length - 1 && a_n_ms__marker.length % 2 === 1;
      el_label.textContent = (n_idx + 1) + ". " + f_s_time(n_ms) + (b_pending ? "  (pending)" : "");
      let el_btn__del = document.createElement("button");
      el_btn__del.textContent = "x";
      el_btn__del.className = "el_danger";
      el_btn__del.addEventListener("click", function () {
         f_marker_delete_at(n_ms);
      });
      el_item.appendChild(el_label);
      el_item.appendChild(el_btn__del);
      el_list.appendChild(el_item);
   });
   return el_list;
};

let f_o_empty = function (s_text) {
   let el = document.createElement("div");
   el.className = "el_empty";
   el.textContent = s_text;
   return el;
};

let f_render = function (o_sec) {
   if (!el_body__panel) return;
   el_body__panel.innerHTML = "";

   let el_hint = document.createElement("div");
   el_hint.className = "el_hint";
   el_hint.textContent = "ctrl+m: add marker · ctrl+d: delete nearest marker. " +
      "marker pairs form sections.";
   el_body__panel.appendChild(el_hint);

   let el_row = document.createElement("div");
   el_row.className = "el_row";
   let el_btn__mark = document.createElement("button");
   el_btn__mark.textContent = "+ marker";
   el_btn__mark.addEventListener("click", function () {
      f_marker_add();
   });
   let el_btn__unmark = document.createElement("button");
   el_btn__unmark.textContent = "- nearest";
   el_btn__unmark.addEventListener("click", function () {
      f_marker_delete();
   });
   el_row.appendChild(el_btn__mark);
   el_row.appendChild(el_btn__unmark);
   el_body__panel.appendChild(el_row);

   let a_n_ms__marker = o_sec.a_n_ms__marker || [];
   let a_o_pair = f_a_o_pair(a_n_ms__marker);

   el_body__panel.appendChild(f_o_section_title("sections (" + a_o_pair.length + ")"));
   el_body__panel.appendChild(
      a_o_pair.length === 0 ? f_o_empty("no sections yet") : f_render__section(a_o_pair),
   );

   el_body__panel.appendChild(f_o_section_title("markers (" + a_n_ms__marker.length + ")"));
   el_body__panel.appendChild(
      a_n_ms__marker.length === 0 ? f_o_empty("no markers") : f_render__marker(a_n_ms__marker),
   );
};

let f_init = function (el_body) {
   el_body__panel = el_body;
   f_subscribe(f_render);
};

export { f_init };
