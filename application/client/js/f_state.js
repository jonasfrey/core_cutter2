// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

// Minimal shared client state. The browser holds only what it needs to render;
// all authoritative data still lives on the server.

let o_state = {
   o_project__active: null,
};

let a_f_on_project = [];

let f_set_project__active = function (o_project) {
   o_state.o_project__active = o_project;
   a_f_on_project.forEach(function (f_h) {
      f_h(o_project);
   });
};

let f_on_project__active = function (f_h) {
   a_f_on_project.push(f_h);
};

export { f_on_project__active, f_set_project__active, o_state };
