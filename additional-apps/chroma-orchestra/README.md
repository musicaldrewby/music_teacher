# Chroma Orchestra

Private musical animation studio for Drew. MIDI import, three editable instrument machines, GeneralUser GS 1.471 soundfont synthesis, custom SF2/SF3 uploads, exact audio/video timeline, MP4/WebM/WAV and Blender package exports.

## Development

Use the Sites scripts for installation and builds. `pnpm test` exercises MIDI tempo maps, sustain, per-part isolation, sample-boundary events, first-note audio onset, actual SF2 synthesis, and project validation. `pnpm exec tsc --noEmit` validates the TypeScript code.

Durable performances use D1 with owner scoping and optimistic revisions. Custom soundfonts use owner-scoped R2 keys. The built-in soundfont is split into two static assets under the provider per-file limit; it is reassembled before parsing. No external CDN is needed for the engine, soundfont, or assets. The original font's license is retained in public/soundfonts/CREDITS.txt. SpessaSynth core is Apache-2.0.

`/mcp` supports discovery, listing/reading/creating/updating performances, targeted instrument/stage changes and preparation of browser renders. It does not claim to render remotely. All requests require the Site authenticated identity.

## Timeline

MIDI tempo changes are converted into absolute seconds by @tonejs/midi. Notes retain durations/velocity, controllers retain sustain and expressive changes, and pitch bends are replayed. A 1.6 second pre-roll gives marbles time to approach the first strike. One PCM result feeds preview and export. WebCodecs renders deterministic frames at i/fps with explicit timestamps; export is not a real-time screen recording. A 2.5 second tail retains decay. Projects allow 16 parts, 12,000 notes and 180 seconds of source music. Global playback speed scales notes, controllers and bends together.

The three machine appearances are independent of soundfont program and percussion-bank settings. Each station contains only its part's pitches and events. Machines expand for larger pitch ranges. Physics is choreographed to the musical timeline.

## Blender

The exporter packages editable JSON, the exact WAV soundtrack, a Python scene generator and Windows launchers. It builds native geometry, keyframes, materials, lights, camera and a packed soundtrack. Final output is 1080p60, Cycles, 64 samples and denoising; OptiX is selected when available, with CUDA/CPU fallback. Frames are resumable and hashed against the project, audio, script and Blender version. Film assembly includes AAC audio. Rebuilding replaces the generated .blend; manual edits should use Save As.

## Verification limits

Browser-control capability was unavailable in the build session. No browser preview or automated browser QA was performed. TypeScript, production build, pure timing/MIDI tests, real soundfont PCM rendering and a Blender Cycles test frame were checked. A short Blender H.264/AAC assembly was also verified. Windows launcher UI, real GPU performance and browser video encoding still require a check on the user's device.

MusicXML and scanned-score import are future additions; the UI does not advertise them as working imports.

## Cinematic machines

`waterfall` and `pipeworks` are playable instrument appearances, independent of the assigned soundfont program. The Machine menu can apply them to imported MIDI or MusicXML parts. The two Cinematic Machines starters include original arrangements, a furnished theater / haunted courtyard, and four camera cues.

Every pitch has its own release port, guided approach, striking surface, and collector. Note marbles are choreographed to the score. Supply loops, bucket lifts, and bellows are decorative mechanical cycles; this is not a rigid-body simulation or a physical engineering plan. Organ key/valve indicators follow written note durations; controller-driven audio still uses the soundfont engine.

`lib/contraption.ts` contains the shared motion contract. `lib/contraption-geometry.ts` builds the actual Three geometry and serializes it to `contraptions.json`. The native Blender builder imports those meshes, applies editable procedural materials, and animates at film frame times plus exact note onsets. Camera and soundtrack exports remain unchanged. Native renders are the visual validation route when the managed browser is unavailable.
