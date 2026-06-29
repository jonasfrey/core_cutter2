-- Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

CREATE TABLE IF NOT EXISTS o_fsnode (
  n_id INTEGER PRIMARY KEY AUTOINCREMENT,
  s_path_abs TEXT NOT NULL,
  b_is_dir INTEGER NOT NULL DEFAULT 0,
  n_ts_ms__created INTEGER NOT NULL,
  n_ts_ms__updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS o_video (
  n_id INTEGER PRIMARY KEY AUTOINCREMENT,
  n_o_fsnode_n_id INTEGER NOT NULL,
  n_ms__duration INTEGER,
  n_scl_x INTEGER,
  n_scl_y INTEGER,
  n_fps REAL,
  n_ts_ms__created INTEGER NOT NULL,
  n_ts_ms__updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS o_project (
  n_id INTEGER PRIMARY KEY AUTOINCREMENT,
  s_name TEXT NOT NULL,
  n_ts_ms__created INTEGER NOT NULL,
  n_ts_ms__updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS o_project_o_video (
  n_id INTEGER PRIMARY KEY AUTOINCREMENT,
  n_o_project_n_id INTEGER NOT NULL,
  n_o_video_n_id INTEGER NOT NULL,
  n_idx__order INTEGER NOT NULL DEFAULT 0,
  n_ts_ms__created INTEGER NOT NULL,
  n_ts_ms__updated INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS o_video_section (
  n_id INTEGER PRIMARY KEY AUTOINCREMENT,
  n_o_video_n_id INTEGER NOT NULL,
  n_o_project_n_id INTEGER NOT NULL,
  n_ms__start INTEGER NOT NULL,
  n_ms__end INTEGER NOT NULL,
  n_idx__order INTEGER NOT NULL DEFAULT 0,
  n_ts_ms__created INTEGER NOT NULL,
  n_ts_ms__updated INTEGER NOT NULL
);

-- general key/value store: shortcuts, ui/window state, misc settings
CREATE TABLE IF NOT EXISTS o_key_val (
  n_id INTEGER PRIMARY KEY AUTOINCREMENT,
  s_key TEXT NOT NULL UNIQUE,
  s_val TEXT NOT NULL,
  n_ts_ms__created INTEGER NOT NULL,
  n_ts_ms__updated INTEGER NOT NULL
);
