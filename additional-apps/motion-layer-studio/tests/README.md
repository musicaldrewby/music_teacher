# Focused regression checks

Run from the repository root:

```sh
node tests/check-realism.cjs
node tests/check-flow.cjs
python tests/check-rendering.py
```

The JavaScript checks use a small DOM model to exercise the actual inspectors, slider handlers, project-default/validation logic, raw flow-field encoding, fixed points, and optional weather links. They do not replace browser interaction testing.

The Python check requires NumPy, Pillow, and a surfaceless EGL / OpenGL ES implementation (Mesa works). It compiles and draws the actual main and nature shaders, compares with the UI-review baseline in Git, checks loop endpoints and adjacent frames, checks empty masks and zero/frozen movement, and writes comparison frames and a motion contact sheet. Output defaults to a temporary directory; set `MLS_RENDER_OUTPUT` to choose one. It renders at 640×360 and does not certify browser performance or export codecs.

The app itself has no added runtime dependencies.
