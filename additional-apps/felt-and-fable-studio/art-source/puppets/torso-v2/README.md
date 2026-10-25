# Four-character arm rebuild · v1.62

The torso replacements were created with the built-in image editing tool. The exact prompts and original references are in [prompts.json](prompts.json).

Generated source files:
- `art-source/puppets/torso-v2/maya.png`
- `art-source/puppets/torso-v2/leo.png`
- `art-source/puppets/torso-v2/asha.png`
- `art-source/puppets/torso-v2/jun.png`

Each is a transparent torso with the original sleeve protrusions removed. Heads, legs, shoes and mitten hands are preserved from the original atlases. The renderer builds a continuous round-jointed sleeve with texture sampled from the new torso. Both complete arms render in front of the torso, with a small felt contact shadow; no upper/lower depth split. Original mitten centers still determine held-prop attachments.

Rebuild packed atlases with `node scripts/package-puppet-torsos.cjs`, then refresh artwork metadata and collection previews with `node scripts/package-cinema-art.cjs`. The original atlases remain under `art-source/cinema/puppets`. Versioned `-rig2.js` payloads prevent old cached body artwork from being reused after refresh.

All seven poses and four characters are checked by `node scripts/check-arm-rig.cjs`. Browser interaction testing was unavailable in this environment; native Canvas rendering and app harness checks cover the shared scene renderer.
