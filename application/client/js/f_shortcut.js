// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

// Central keyboard-shortcut registry. Each functionality registers a name, a
// default shortcut and an action. A single keydown listener dispatches. The
// Settings window (Phase 4) will rebind shortcuts and persist them to o_key_val.

let a_o_action = [];

let f_action_register = function (s_name, s_shortcut, f_action) {
   a_o_action.push({ s_name, s_shortcut, f_action });
};

let f_set_shortcut = function (s_name, s_shortcut) {
   let o_action = a_o_action.find(function (o) {
      return o.s_name === s_name;
   });
   if (o_action) o_action.s_shortcut = s_shortcut;
};

let f_s_combo = function (o_evt) {
   let a_s = [];
   if (o_evt.ctrlKey) a_s.push("ctrl");
   if (o_evt.shiftKey) a_s.push("shift");
   if (o_evt.altKey) a_s.push("alt");
   if (o_evt.metaKey) a_s.push("meta");
   let s_key = o_evt.key.toLowerCase();
   if (s_key === " ") s_key = "space";
   a_s.push(s_key);
   return a_s.join("+");
};

let f_b_typing = function () {
   let el = document.activeElement;
   if (!el) return false;
   return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
};

globalThis.addEventListener("keydown", function (o_evt) {
   if (f_b_typing()) return;
   let s_combo = f_s_combo(o_evt);
   let o_action = a_o_action.find(function (o) {
      return o.s_shortcut === s_combo;
   });
   if (o_action) {
      o_evt.preventDefault();
      o_action.f_action();
   }
});

export { a_o_action, f_action_register, f_s_combo, f_set_shortcut };
