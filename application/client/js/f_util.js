// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

// shared formatting helpers (pure functions)

let f_s_clock = function (n_ms) {
   let n_sec__total = Math.floor((n_ms || 0) / 1000);
   let n_min = Math.floor(n_sec__total / 60);
   let n_sec = n_sec__total % 60;
   return n_min + ":" + String(n_sec).padStart(2, "0");
};

let f_s_time = function (n_ms) {
   let n = Math.max(0, n_ms || 0);
   let n_sec__total = Math.floor(n / 1000);
   let n_min = Math.floor(n_sec__total / 60);
   let n_sec = n_sec__total % 60;
   let n_ds = Math.floor((n % 1000) / 100);
   return n_min + ":" + String(n_sec).padStart(2, "0") + "." + n_ds;
};

let f_s_zoom = function (n_ms) {
   if (n_ms < 60000) return Math.round(n_ms / 1000) + " s";
   return (n_ms / 60000).toFixed(1) + " min";
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

let f_n_ms__interval = function (n_ms__span) {
   for (let n_idx = 0; n_idx < a_n_ms__interval.length; n_idx++) {
      if (n_ms__span / a_n_ms__interval[n_idx] <= 16) return a_n_ms__interval[n_idx];
   }
   return a_n_ms__interval[a_n_ms__interval.length - 1];
};

export { f_n_ms__interval, f_s_clock, f_s_time, f_s_zoom };
