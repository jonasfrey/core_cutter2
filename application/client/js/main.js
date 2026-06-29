// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

import { f_on, f_send } from "./f_ws.js";
import { f_restore, f_toggle, f_window_register } from "./f_window_manager.js";
import { f_init as f_init__project } from "./ui_project.js";
import { f_init as f_init__filebrowser } from "./ui_filebrowser.js";
import { f_init as f_init__player } from "./ui_player.js";
import { f_init as f_init__timeline } from "./ui_timeline.js";

f_window_register("window_project", "Projects", f_init__project);
f_window_register("window_file", "Files", f_init__filebrowser);
f_window_register("window_player", "Player", f_init__player);
f_window_register("window_timeline", "Timeline", f_init__timeline);

document.querySelectorAll("#el_topbar [data-s_window]").forEach(function (el_btn) {
   el_btn.addEventListener("click", function () {
      f_toggle(el_btn.getAttribute("data-s_window"));
   });
});

f_on("keyval_list", function (o_v_data) {
   f_restore(o_v_data.a_o_key_val);
});
f_send("keyval_list", { s_prefix: "" });
