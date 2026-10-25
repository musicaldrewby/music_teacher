"""Embed Bravura's engraved outlines as lightweight, font-independent vector paths."""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT=Path(__file__).resolve().parent.parent
source=ROOT/'reference/notation-font'
font=TTFont(source/'Bravura.otf');glyphs=font.getGlyphSet();cmap=font.getBestCmap()
names=json.loads((source/'glyphnames.json').read_text())
requested=['gClef','fClef','noteWhole','noteHalfUp','noteQuarterUp','note8thUp','noteheadBlack','noteheadHalf','noteheadWhole','augmentationDot','restQuarter','restHalf','restWhole','accidentalFlat','accidentalSharp']
out={}
for name in requested:
    cp=int(names[name]['codepoint'][2:],16);g=glyphs[cmap[cp]]
    pen=SVGPathPen(glyphs);g.draw(TransformPen(pen,(.004,0,0,-.004,0,0)))
    bounds=BoundsPen(glyphs);g.draw(TransformPen(bounds,(.004,0,0,-.004,0,0)))
    out[name]={'path':pen.getCommands(),'bounds':bounds.bounds}
(ROOT/'dist/notation-glyphs.js').write_text('// Bravura outlines, Copyright Steinberg Media Technologies GmbH. SIL OFL 1.1; see assets/notation/OFL-Bravura.txt.\nexport const GLYPHS='+json.dumps(out,separators=(',',':'))+';\n')
print('Exported',len(out),'vector glyphs')
