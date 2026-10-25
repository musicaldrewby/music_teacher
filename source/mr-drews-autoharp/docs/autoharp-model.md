# Standard 21-button autoharp model

The app follows the common Oscar Schmidt 21-chord layout, with 36 strings in standard F2–C6 tuning. It is a sampled virtual instrument; it does not simulate every physical resonance. Dulcimer remains the default of the six selectable SoundFont sounds.

| Top row / 1–7 | E♭ | B♭ | F | C | G | D | A |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Middle / Q–U | F7 | C7 | G7 | D7 | A7 | E7 | B7 |
| Bottom / A–J | A♭ | B♭7 | Cm | Gm | Dm | Am | Em |

## References checked 2026-10-12

- [Oscar Schmidt OS21C](https://www.oscarschmidt.com/product/os21c/): 21-chord model.
- [d’Aigle 21-bar conversion kit](https://www.daigleharp.com/product-page/21-bar-conversion): 8 major, 8 dominant seventh, 5 minor chords.
- [Standard button layout](https://www.autoharpstore.com/pdfs/chordlayout.pdf): three rows shown above.
- [RBI Standard Chromaharp string schedule](https://autoharp.org/articles/RBI_Standard_Chromaharp.pdf): all 36 pitches, F2 to C6; gaps in the bass are intentional.
- [Paul Race’s OS21 bar diagrams, page 1](https://harpersguild.com/autoharp_repairs/standard_setup/os_21_factory_chord_bar_sequence_p1.pdf) and [page 2](https://harpersguild.com/autoharp_repairs/standard_setup/os_21_factory_chord_bar_sequence_p2.pdf): felt openings and bass damping. The app treats the dark optional bass blocks as damped, the conventional setup described in these diagrams. Actual factory years and custom refelting can differ.
- [Oscar Schmidt conversion instructions](https://www.oscarschmidt.com/wp-content/uploads/2019/05/21BarConversionKit-2016.pdf): F/F7 openings at strings 1 and 36; damped strings 2 and 35.

## Playing and artwork

Hold is the physical mode: pressing a button damps disallowed ringing strings; it does not pluck. Releasing all buttons opens the strings without restarting damped notes. Simultaneous bars allow only the intersection of their individual felt openings. Touch and keyboard input may hold the same bar without an early release. Latch is the default one-handed adaptation.

The playing preference moves once to Latch as requested, then remembers an explicit choice of either mode. Dulcimer and all existing sound selections are preserved.

The original room artwork has inaccurate painted chord names. Live ivory faces cover those names at the measured positions in each scene. Each image and its corrected labels share one opacity layer, preserving smooth crossfades. Button spacing follows the existing photographic perspective, rather than recreating the staggered physical OS21 bar offsets. The illustration has 38 visible upper strands and 36 lower strands; there remain exactly 36 playable pitches, with the existing two upper-strand aliases. This is an artwork limitation, not two extra musical strings.

Automated checks exercise the complete tuning, chord inventory, bass openings, pairwise bar intersections, scheduled-voice damping, input release/cancellation, scene fades, six sample banks, recording, and menu focus recovery. A real browser/iPad session is still required for visual and audible device verification.

## Scene replacement

The available rooms are Sunlit windows, Classroom studio, Moonlit manor, and Stormy old house. The two 1970s rooms and their image assets have been removed. A stored choice of a retired room falls back to Sunlit windows.

The new scenes use separate generated environment and weathered-wood assets, plus the original sunlit instrument photograph clipped by native SVG. Both table surfaces share the reference tabletop outline. The original instrument image renders at 1672 × 941 with no scene-specific translation, rotation, perspective change, or scaling; chord faces, string hit targets and glow paths use the original sunlit calibration. Each complete composition and its labels fades as one scene layer. Texture decoding finishes before a transition can start, and a failed image/texture leaves the previous room active. Latch remains the default and Dulcimer is unchanged.
