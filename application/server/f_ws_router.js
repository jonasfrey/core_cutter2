// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

// Maps incoming s_type -> handler function.
// Handler signature: f_h(o_ws, o_v_data) -> v_data (the response payload) or Promise.
// A handler may return undefined to send no automatic reply.

let o_handler = {};

let f_handler_register = function (s_type, f_h) {
   o_handler[s_type] = f_h;
};

let f_send = function (o_ws, s_type, o_v_data) {
   o_ws.send(JSON.stringify({ s_type, v_data: o_v_data, n_ts_ms: Date.now() }));
};

let f_route = async function (o_ws, s_message) {
   let o_msg = null;
   try {
      o_msg = JSON.parse(s_message);
   } catch (o_err) {
      f_send(o_ws, "error", { s_message: "invalid json", s_detail: String(o_err) });
      return;
   }
   let f_h = o_handler[o_msg.s_type];
   if (!f_h) {
      f_send(o_ws, "error", { s_message: "unknown s_type", s_type: o_msg.s_type });
      return;
   }
   try {
      let v_data__reply = await f_h(o_ws, o_msg.v_data || {});
      if (v_data__reply !== undefined) {
         f_send(o_ws, o_msg.s_type, v_data__reply);
      }
   } catch (o_err) {
      f_send(o_ws, "error", {
         s_message: "handler failed",
         s_type: o_msg.s_type,
         s_detail: String(o_err),
      });
   }
};

export { f_handler_register, f_route, f_send };
