# Mr. Drew’s Pocket Orff

Converted from Drew’s original app at https://musicaldrewby.github.io/music_teacher/orffensemble.html on 2026-10-08.

`source/orffensemble-original.html` preserves the retrieved original. `dist/` is the buildless Site: HTML, CSS, JavaScript, and locally hosted fonts. All sound is synthesized with the original Web Audio voices and tuning. No external audio or image assets are needed.

The migration preserves the instrument collection and visual style. It updates the title to Pocket Orff, adds Drew’s creator credit, fixes menu touch scrolling, consolidates input to pointer events with cleanup on instrument changes, restores removable bars, supports keyboard activation, and resets orientation visibility when returning to percussion. Hold the bottom of a pitched bar for 1.5 seconds to remove or restore it; keyboard users can focus a bar and press Delete.

The original GitHub site is unchanged. No build step or package installation is required.
