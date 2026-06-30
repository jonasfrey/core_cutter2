# Implementation Plan — core_cutter (video editor)

This plan turns [requirements.md](requirements.md), [datastructure](datastructure) and the
[architecture/](../architecture/) docs into an actionable, phased build plan.

All code MUST follow [coding_guidelines.md](../architecture/coding_guidelines.md)
(functional only, no classes, prefix naming, no plural words) and start with the
[licensing.md](../architecture/licensing.md) header line.

---

## Status (as of 2026-06-29)

**Done — Phase 0 (skeleton):** Deno http+ws server, static serving, `{s_type,v_data,n_ts_ms}`
envelope router, `node:sqlite` DB layer + schema migration, the streaming executable
wrapper (spawn-only). Client: ws client (multi-handler), movable/resizable windows
with **state persisted to the DB** (`o_key_val`, key `o_window__*`) and restored on reload.

**Done — Phase 1 (projects & media):** project CRUD, `ls`-based file browser, add-video
(ffprobe metadata → `o_video`, linked via `o_project_o_video`).

**Done — Phase 2 (timeline & playback):** range-capable `/media/{n_id}` route;
server-authoritative timeline state (`h_timeline.js`) mapping a global playhead to a
video+local cursor; `<video>` element as dumb decode surface; play/pause buttons;
speed slider −10…+10x (rAF loop, forward via `playbackRate`, reverse by stepping
`currentTime`); zoom slider 2s–30min + presets (persisted in `o_key_val`
`o_view__zoom`); scrolling time grid; click-seek, **drag scrubbing**, and a hover
cursor + timecode tooltip. Single source of truth for the playhead lives in the
shared client timeline module.

**Done — Phase 3 (sections):** transient server-side markers per project; `ctrl+m`
adds a marker / forms an `o_video_section` from two markers; `ctrl+d` deletes the
marker nearest the playhead; section + marker overlays on the timeline (green
highlights, yellow ticks); a **Sections** window listing clips with delete; a
reusable keyboard-shortcut dispatcher (`f_shortcut.js`) ready for Phase 4.

**Done — Vue migration:** the client was rebuilt on Vue 3 (Composition API only,
no build step — vendored `vue.esm-browser.js` via an import map). Reactive stores
(`client/js/store/use_*.js`) replace the old pub/sub modules; UI is components
(`client/js/components/*.js`) with `setup()` + template strings; `f_ws.js`,
`f_shortcut.js`, `f_util.js` are shared. Tests added: `deno task test` runs a
client template-compile smoke test + server cursor-mapping unit tests.
`deno task rmdb` clears the DB.

**Next — Phase 4** (shortcut registry UI + Settings window, persisted in `o_key_val`),
then **Phase 5** (export: ffmpeg trim per section + concat → mp4/h264),
**Phase 6** (polish).

**Remaining architecture items:** `deno task start` should auto-install ffmpeg/deps
and download test data if missing; a full browser-driven UI smoke test (current
smoke test only compiles templates, doesn't render in a real browser).

**Known follow-ups / not yet done:** in-browser visual verification of the player
(built to spec, validated by logic + server contracts, not yet driven in a real
browser); reverse playback is best-effort; no automated tests yet.

---

## 1. Goals (from requirements)

1. Project CRUD.
2. Add video files to a project (via a server-side file browser, `ls`).
3. Timeline shows a project's video files.
4. Playhead can seek the timeline; the current video frame is shown.
5. Playback: realtime + 1x / 2x / 5x and reverse (+/-) speeds.
6. Sections:
   - `ctrl+m` adds a playhead marker at the current playhead time.
   - two markers form a `o_video_section`.
   - `ctrl+d` deletes the marker closest to the playhead.
7. Every action has a name + shortcut; shortcuts are editable in settings.
8. Export = all `o_video_section` clips concatenated into one video file.

---

## 2. Tech stack & hard constraints (from architecture)

- **Runtime:** Deno.js, pure JavaScript (no TypeScript).
- **Client:** Vanilla JS + HTML. Browser is a **pure GUI layer** — zero business
  logic, zero data calculation. Everything is requested from the server.
- **Transport:** WebSocket only, message format:
  `{ "s_type": "...", "v_data": {...}, "n_ts_ms": 0 }`.
- **Persistence:** SQLite.
- **Executables (ffmpeg, python):** always `Deno.Command().spawn()` with streamed
  stdin/stdout/stderr. Never `.output()`. Structured data = newline-delimited JSON;
  stderr = human logs.
- **File access:** custom file browser backed by `ls` on the server — never the
  browser's native file picker.
- **UI:** one fullscreen page; extra panels are movable/resizable windows toggled
  from a top navigation bar ([UI.md](../architecture/UI.md)).

---

## 3. Proposed directory layout

Per [README.md](../README.md), the app root is `application/`.

```
application/
  server/
    main.js                 // entry: http + websocket server, static file serving
    f_ws_router.js          // routes incoming s_type -> handler
    db/
      f_db.js               // sqlite open/migrate, query helpers
      schema.sql            // table definitions
    handler/
      h_project.js          // project crud
      h_fsnode.js           // file browser (ls) + add video to project
      h_video.js            // video metadata (ffprobe)
      h_timeline.js         // frame-at-time, playback streaming
      h_section.js          // markers + o_video_section crud
      h_export.js           // concat export
      h_setting.js          // shortcut config
    exec/
      f_run_executable.js   // the standardized spawn/stream wrapper
      f_ffmpeg.js           // ffmpeg/ffprobe call builders
    py/
      (optional python helper scripts)
  client/
    index.html
    css/
    js/
      f_ws.js               // websocket client + message format
      f_window_manager.js   // movable/resizable windows + top nav
      ui_timeline.js
      ui_player.js          // frame display + playback controls
      ui_project.js
      ui_filebrowser.js
      ui_setting.js         // shortcut editing
      f_shortcut.js         // keybind dispatch
  .gitignored/
    app.db                  // sqlite file (gitignored)
    cache/                  // extracted frame cache, export temp files
```

---

## 4. Data model

Follows [datastructure](datastructure) and the guideline conventions
(`n_id`, `n_{model}_n_id` foreign keys, `n_ts_ms__created/__updated`,
table names are singular `o_*`).

```sql
-- o_fsnode: a file or folder on disk
o_fsnode (
  n_id, s_path_abs, b_is_dir,
  n_ts_ms__created, n_ts_ms__updated
)

-- o_video: a video, backed by an fsnode
o_video (
  n_id, n_o_fsnode_n_id,
  n_ms__duration, n_scl_x, n_scl_y, n_fps,   -- from ffprobe
  n_ts_ms__created, n_ts_ms__updated
)

-- o_project
o_project (
  n_id, s_name,
  n_ts_ms__created, n_ts_ms__updated
)

-- o_project_o_video: which videos belong to a project (+ order on timeline)
o_project_o_video (
  n_id, n_o_project_n_id, n_o_video_n_id, n_idx__order,
  n_ts_ms__created, n_ts_ms__updated
)

-- o_video_section: a [start,end] cut within a video
o_video_section (
  n_id, n_o_video_n_id, n_ms__start, n_ms__end,
  n_o_project_n_id,        -- section belongs to a project context
  n_idx__order,            -- order in the export concat
  n_ts_ms__created, n_ts_ms__updated
)

-- o_key_val: general key/value store (shortcuts, ui/window state, settings)
o_key_val (
  n_id, s_key, s_val,        -- s_val is JSON-encoded by the caller
  n_ts_ms__created, n_ts_ms__updated
)
```

Notes / decisions:
- A "playhead marker" is transient UI state until paired. Decision: store the
  pending single marker server-side per project (in memory or `o_key_val`-
  scratch) so logic stays on the server. The second `ctrl+m` reads the pending
  marker + current playhead time and creates the `o_video_section`.
- `o_video_section.n_ms__start/__end` are offsets within that video's timeline.

---

## 5. Server architecture

### 5.1 WebSocket router
- `main.js` serves static client files and upgrades `/ws`.
- `f_ws_router.js` maps `s_type` → handler function. Every response reuses the
  `{ s_type, v_data, n_ts_ms }` envelope.
- All handlers are plain functions: `let f_h_xxx = function(o_ws, o_v_data){...}`.

### 5.2 Executable wrapper (critical, shared)
`f_run_executable.js` implements the architecture's mandated signature:
spawn-only, streamed stdin/stdout/stderr, newline-delimited JSON, no blocking
reads, no arg-length limits (large data via stdin). Both ffmpeg and any python
helper go through this single wrapper.

### 5.3 Database layer
`f_db.js` opens SQLite, runs `schema.sql` migration on boot, exposes small query
helpers. Returns plain objects.

---

## 6. Video frames — pragmatic decision (DECIDED)

**Decision:** the browser `<video>` element is used as a **dumb render/decode
surface only**. The server still owns all state and logic — the playhead time,
playback speed, markers, sections, and every action are computed/persisted
server-side and driven over WebSocket. The `<video>` element merely decodes the
bytes the server serves. This gives smooth realtime playback for free while
keeping the browser free of business logic.

Mechanics:
- **Source serving:** the server exposes each `o_video` file over HTTP (a single
  range-capable static route, e.g. `/media/{n_o_video_n_id}`). The browser sets
  this as the `<video>` `src`. (Bytes only — no logic.)
- **Seek:** client sends `timeline_seek {n_o_video_n_id, n_ms}`; server validates,
  updates the authoritative playhead state, and echoes back the canonical time.
  Client sets `video.currentTime` to render that frame.
- **Play / speed:** client sends `timeline_play {n_speed}` / `timeline_pause`;
  server updates state and instructs the client, which sets `video.playbackRate`
  (1/2/5) and `video.play()`. Reverse (`-` speed) is best-effort via a timed
  `currentTime` step-back loop driven by server ticks (HTML5 has no native
  reverse).
- **Frame-accurate ops** (export trims, section boundaries) remain pure
  ffmpeg/ffprobe on the server and never depend on the browser.

---

## 7. Client architecture

- `f_ws.js`: connect, send/receive with the standard envelope, dispatch by `s_type`.
- `f_window_manager.js`: top nav bar; each panel = a movable/resizable window
  (pointer-drag move, edge-drag resize). Panels: Projects, File Browser, Timeline,
  Player, Settings.
- `f_shortcut.js`: central keydown dispatcher. Loads the action→shortcut map from
  the server (`o_key_val`). Each action = `{ s_name, s_shortcut, f_action }`. This
  single registry powers both the live shortcuts and the Settings editor.
- `ui_timeline.js`: render videos as blocks, playhead, section overlays, markers.
- `ui_player.js`: canvas/img frame display + transport controls (play/pause,
  speed -, 1x, 2x, 5x +).
- `ui_setting.js`: list actions, rebind shortcuts, persist to server.

---

## 8. Feature → implementation map

| Feature | Messages (s_type) | Server work |
|---|---|---|
| Project CRUD | `project_list/create/update/delete` | `h_project` + sqlite |
| File browser | `fs_ls {s_path_abs}` | `ls` via exec wrapper → `a_o_fsnode` |
| Add video | `project_video_add {n_o_project_n_id, s_path_abs}` | create `o_fsnode`+`o_video` (ffprobe), link row |
| Timeline load | `timeline_get {n_o_project_n_id}` | join project→videos→sections |
| Media bytes | HTTP `/media/{n_o_video_n_id}` (range) | static range serving (no logic) |
| Seek | `timeline_seek` | validate + own playhead state, echo canonical n_ms |
| Play / speed | `timeline_play / timeline_pause` | own state; client sets playbackRate |
| Add marker (ctrl+m) | `marker_add {n_o_project_n_id, n_o_video_n_id, n_ms}` | pending marker → on 2nd, create `o_video_section` |
| Delete marker (ctrl+d) | `marker_delete {n_ms}` | find nearest marker, remove |
| Section list | `section_list/update/delete` | `h_section` |
| Settings/shortcuts | `keyval_set / keyval_list` | `o_key_val` store |
| UI/window state | `keyval_set / keyval_list` | `o_key_val` (key `o_window__*`) |
| Export | `export_run {n_o_project_n_id}` | ffmpeg trim each section + concat → output file, stream progress |

---

## 9. Phased milestones

**Phase 0 — skeleton**
- Deno http+ws server, static serving, `{s_type,v_data,n_ts_ms}` envelope echo.
- SQLite open + `schema.sql` migration.
- `f_run_executable.js` wrapper + a smoke test (`ls`).
- Client: ws connect, window manager + top nav, one empty panel.

**Phase 1 — projects & media**
- Project CRUD (UI + handlers).
- File browser (`ls`) panel.
- Add video → ffprobe metadata → timeline data model.

**Phase 2 — timeline & playback**
- Range-capable `/media/{n_o_video_n_id}` route; `<video>` src wired up.
- Render timeline + playhead; seek drives `video.currentTime` from server state.
- Playback play/pause + speed (1x/2x/5x via `playbackRate`); reverse best-effort.

**Phase 3 — sections**
- ctrl+m marker flow → `o_video_section`.
- ctrl+d nearest-marker delete.
- Section overlays on timeline; section list/edit.

**Phase 4 — shortcuts & settings**
- Central action registry; Settings panel to rebind; persist to `o_key_val`.

**Phase 5 — export**
- Per-section ffmpeg trim + concat; stream progress over WS; output to disk.

**Phase 6 — polish**
- Frame-cache tuning, error surfacing, reconnection, guideline compliance pass.

---

## 10. Decisions & remaining questions

**Decided:**
- **Playback (§6):** `<video>` as a dumb render/decode surface; server owns all
  state & logic.
- **Scope:** single user / local — pending-marker and playhead state live in
  simple server memory (module-level state in the relevant handler).
- **Export format:** MP4 / H.264 default (re-encode on concat).
- **Reverse playback:** best-effort (timed `currentTime` step-back), not
  guaranteed frame-smooth.

**Still open:**
1. **Export concat order:** global `o_video_section.n_idx__order` across all
   videos in the project, or grouped per video then by start time? (Assumed
   global `n_idx__order` until told otherwise.)
2. **Export audio:** keep each section's source audio (assumed yes).
