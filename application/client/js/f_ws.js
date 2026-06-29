// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

let o_ws = null;
let o_a_f_handler = {};
let a_o_queue = [];

let f_connect = function () {
   let s_url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";
   o_ws = new WebSocket(s_url);
   o_ws.onopen = function () {
      while (a_o_queue.length > 0) {
         o_ws.send(JSON.stringify(a_o_queue.shift()));
      }
   };
   o_ws.onmessage = function (o_evt) {
      let o_msg = JSON.parse(o_evt.data);
      let a_f_h = o_a_f_handler[o_msg.s_type];
      if (a_f_h) {
         a_f_h.forEach(function (f_h) {
            f_h(o_msg.v_data, o_msg);
         });
      }
   };
   o_ws.onclose = function () {
      setTimeout(f_connect, 1000);
   };
};

let f_send = function (s_type, o_v_data) {
   let o_msg = { s_type, v_data: o_v_data || {}, n_ts_ms: Date.now() };
   if (o_ws && o_ws.readyState === WebSocket.OPEN) {
      o_ws.send(JSON.stringify(o_msg));
   } else {
      a_o_queue.push(o_msg);
   }
};

let f_on = function (s_type, f_h) {
   if (!o_a_f_handler[s_type]) o_a_f_handler[s_type] = [];
   o_a_f_handler[s_type].push(f_h);
};

f_connect();

export { f_on, f_send };
