"""Extract supplied chart artwork; construct added notes from the same components."""
from pathlib import Path
import fitz, base64, json, shutil

ROOT=Path(__file__).resolve().parent.parent
D=fitz.open(ROOT/'reference/original-chart.pdf')
A=ROOT/'dist/assets'; A.mkdir(parents=True,exist_ok=True)
def png(page,rect,path,scale=4):
    D[page].get_pixmap(matrix=fitz.Matrix(scale,scale),clip=fitz.Rect(rect),alpha=False).save(A/path)
def crop64(page,rect):
    p=D[page].get_pixmap(matrix=fitz.Matrix(4,4),clip=fitz.Rect(rect),alpha=False)
    return 'data:image/png;base64,'+base64.b64encode(p.tobytes('png')).decode()
def img(page,rect,x,y,w=None,h=None):
    w=w or rect[2]-rect[0];h=h or rect[3]-rect[1]
    return f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="{crop64(page,rect)}"/>'
def svg(name,w,h,body):
    body=body.replace(' href=', ' xlink:href=')
    (A/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="100%" height="100%" fill="white"/>{body}</svg>')

# Existing figures are directly cropped, including all original key shapes and labels.
for inst,pg in [('flute',0),('trumpet',5),('trombone',7),('euphonium',8)]:
    for idx in range(1,6):
        row=5-idx;dy=125*row
        png(pg,(67,133+dy,224,244+dy),f'{inst}-{idx}-staff.png')
        rect=(288,143+dy,550,242+dy) if inst=='flute' else ((290,133+dy,546,242+dy) if inst=='trombone' else (319,140+dy,532,239+dy))
        # Trombone pictures begin farther left; preserve the complete horn and caption.
        if inst=='trombone':rect=(269,130+dy,548,243+dy)
        png(pg,rect,f'{inst}-{idx}-fingers.png')
for inst,pg in [('clarinet',2),('sax',3)]:
    offsets=[0,145,288,431,574]
    for idx,dx in enumerate(offsets,1):
        png(pg,(44+dx,121,173+dx,220),f'{inst}-{idx}-staff.png')
        png(pg,(55+dx,286,170+dx,558),f'{inst}-{idx}-fingers.png')

# Source clef/staff images are reused unchanged for the extra notes and boards.
for name,xref in [('treble',12),('bass',254)]:
    im=fitz.Pixmap(D,xref)
    mask=D.extract_image(xref).get('smask')
    if mask: im=fitz.Pixmap(im,fitz.Pixmap(D,mask))
    im.save(A/f'{name}-staff.png')

treble='data:image/png;base64,'+base64.b64encode((A/'treble-staff.png').read_bytes()).decode()
bass='data:image/png;base64,'+base64.b64encode((A/'bass-staff.png').read_bytes()).decode()
def extra_staff(inst,idx,note):
    isbass=inst in ('trombone','euphonium')
    # Original treble staff: E4 bottom line at y83; bass: G2 bottom at y86.
    letter,octave=note[0],int(note[-1]); diat=octave*7+'CDEFGAB'.index(letter)
    origin=(2*7+4) if isbass else (4*7+2)
    gap=13.25 if not isbass else 17.13
    bottom=82.81 if not isbass else 82.47
    y=bottom-(diat-origin)*gap/2
    x=119 if isbass else 99
    body=f'<image href="{bass if isbass else treble}" x="0" y="0" width="152" height="{92 if isbass else 106}"/>'
    if isbass: y+=7;body=f'<image href="{bass}" x="0" y="7" width="152" height="92"/>'
    # Only B3 needs a ledger at C4; sharp is drawn as a proper symbol alongside F#4.
    if not isbass and diat<29:
        for ledger in range(28,diat-1,-2):
            ledger_y=bottom-(ledger-origin)*gap/2
            body+=f'<path d="M83 {ledger_y}H115" stroke="black" stroke-width="1.5"/>'
    if '#' in note:
        body+=f'<path d="M75 {y-12}v24 M82 {y-14}v24 M70 {y-4}l17 -3 M70 {y+4}l17 -3" fill="none" stroke="black" stroke-width="1.7"/>'
    body+=f'<ellipse cx="{x}" cy="{y}" rx="{11.5 if isbass else 10.5}" ry="{8 if isbass else 7}" fill="black"/>'
    svg(f'{inst}-{idx}-staff.svg',160,120,body)

for inst,notes in {'clarinet':['B3','A4'],'flute':['A4','G5'],'sax':['F#4','E5'],'trumpet':['B3','A4'],'trombone':['A2','G3'],'euphonium':['A2','G3']}.items():
    for idx,note in zip([0,6],notes): extra_staff(inst,idx,note)

# Flute A and G: exact F diagram, opening the required fingers.
for idx in [0,6]:
    body=img(0,(288,143,550,242),0,0)
    # RH index open, sampled from C's open RH index. For A also open LH ring.
    body+=img(0,(421,542,449,568),133,24,28,26)
    if idx==0:body+=img(0,(366,542,394,568),78,24,28,26)
    svg(f'flute-{idx}-fingers.svg',262,99,body)

# Clarinet low B uses the right MIDDLE finger. A uses the throat A key, holes open.
body=img(2,(55,286,170,558),0,0)
body+=img(2,(106,337,146,375),51,192,40,38)
svg('clarinet-0-fingers.svg',115,272,body)
body=img(2,(629,286,744,558),0,45)
body+='<path d="M64 8 C78 4 84 9 81 20 L74 39 C70 47 59 44 59 34 Z" fill="black" stroke="black" stroke-width="1.5"/><text x="8" y="19" font-family="Arial,sans-serif" font-size="11">A key</text><path d="M39 18h15" stroke="black" stroke-width="1"/>'
svg('clarinet-6-fingers.svg',115,317,body)

# Sax: add RH middle to G; for E open RH ring on D while keeping octave key.
body=img(3,(55,286,170,558),0,0)+img(3,(684,481,725,520),55,194,41,39)
svg('sax-0-fingers.svg',115,272,body)
body=img(3,(629,286,744,558),0,0)+img(3,(111,520,150,558),55,234,39,38)
svg('sax-6-fingers.svg',115,272,body)

# Brass valve drawings are made from exact open and pressed valve artwork.
for inst,pg in [('trumpet',5),('euphonium',8)]:
    body=img(pg,(319,140,532,239),0,0)
    body+=img(pg,(392,390,463,489),73,0,71,99)  # middle valve pressed, same drawn geometry
    svg(f'{inst}-0-fingers.svg',213,99,body)
    png(pg,(319,390,532,489),f'{inst}-6-fingers.png')

# Trombone fourth position is reused directly; second uses original horn/marker.
png(7,(269,380,548,493),'trombone-6-fingers.png')
horn=fitz.Pixmap(D,256)
hornmask=D.extract_image(256).get('smask')
if hornmask:horn=fitz.Pixmap(horn,fitz.Pixmap(D,hornmask))
horndata='data:image/png;base64,'+base64.b64encode(horn.tobytes('png')).decode()
body=f'<image href="{horndata}" x="2" y="15" width="265" height="71"/>'
body+=img(7,(367,179,394,216),117,57,27,37)
body+='<text x="163" y="18" font-family="Arial,sans-serif" font-size="17" font-weight="bold">2nd Position</text><text x="100" y="110" font-family="Arial,sans-serif" font-size="11">A little out from 1st</text>'
svg('trombone-0-fingers.svg',279,113,body)

# Bells preserve the source keyboard. Extend only its cropped final G bar.
bellbase=img(10,(54,120,744,575),0,0)
bellbase+='<rect x="633.5" y="237" width="77" height="156.5" fill="white" stroke="black" stroke-width="3"/><path d="M633.5 237V211.5H675" stroke="black" stroke-width="3" fill="none"/>'
positions=[(126.5,238,77,197.5),(173.5,26.5,77,210),(295.5,211.5,77,210),(380.5,211.5,77,203),(418.5,46.5,77,189),(549.5,211.5,77,189),(633.5,238,77,155.5)]
for idx,(x,y,w,h) in enumerate(positions):
    b=bellbase+f'<rect x="{x+4}" y="{y+4}" width="{w-8}" height="{h-8}" rx="1" fill="#f2b544" fill-opacity=".2" stroke="#b57606" stroke-width="4"/>'
    if idx in [0,6]:b+=f'<text x="{x+w/2}" y="{y+107}" text-anchor="middle" font-family="Arial,sans-serif" font-size="35" font-weight="bold">{"A" if idx==0 else "G"}</text>'
    svg(f'bells-{idx}-fingers.svg',718,455,b)
    if idx in [1,2,3,4,5]:
        rect={1:(229,157,299,226),2:(350,352,423,420),3:(436,352,509,420),4:(475,174,547,242),5:(605,352,678,420)}[idx]
        png(10,rect,f'bells-{idx}-staff.png')
    else:extra_staff('bells',idx,'A3' if idx==0 else 'G4')

# Exact clefs from the supplied reference, cropped without the staff lines via source alpha.
# Whiteboard uses a standard music glyph when available, with reference-image fallback.
shutil.copyfile(ROOT/'reference/original-chart.pdf',A/'original-chart.pdf')
print('Chart assets:',len(list(A.iterdir())))
