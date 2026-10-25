"""Star Circuit: original NROM cartridge; no external ROM or game assets."""
from pathlib import Path
code=bytearray();labels={};fix=[]
def emit(*b):code.extend(b)
def label(n):labels[n]=0x8000+len(code)
def imm(op,v):emit(op,v&255)
def zp(op,v):emit(op,v)
def absolute(op,v):emit(op,v&255,v>>8)
def branch(op,n):emit(op,0);fix.append((len(code)-1,n,'rel'))
def jump(n):emit(0x4c,0,0);fix.append((len(code)-2,n,'abs'))
def lda(v):imm(0xa9,v)
def sta(a):absolute(0x8d,a)
def ppuaddr(a):absolute(0x2c,0x2002);lda(a>>8);sta(0x2006);lda(a&255);sta(0x2006)
def text(row,col,s):
 ppuaddr(0x2000+row*32+col)
 for c in s:lda(ord(c));sta(0x2007)
label('reset');emit(0x78,0xd8);imm(0xa2,0xff);emit(0x9a,0xe8);absolute(0x8e,0x2000);absolute(0x8e,0x2001);absolute(0x8e,0x4010);lda(0x40);sta(0x4017)
label('wait1');absolute(0x2c,0x2002);branch(0x10,'wait1');lda(0);imm(0xa2,0)
label('clear')
for a in range(0,0x800,0x100):absolute(0x9d,a)
emit(0xe8);branch(0xd0,'clear');lda(0xff);imm(0xa2,0)
label('hidesprites');absolute(0x9d,0x200);emit(0xe8);branch(0xd0,'hidesprites')
label('wait2');absolute(0x2c,0x2002);branch(0x10,'wait2');ppuaddr(0x3f00)
for c in [15,33,42,7]*4+[15,38,22,48,15,40,24,48]+[15,33,42,7]*2:lda(c);sta(0x2007)
ppuaddr(0x2000);lda(0);imm(0xa2,0);imm(0xa0,4)
label('clearnt');sta(0x2007);emit(0xe8);branch(0xd0,'clearnt');emit(0x88);branch(0xd0,'clearnt')
text(2,10,'STAR CIRCUIT');text(4,10,'STARS: 0');text(27,4,'ARROWS: FLY   X: BOOST');text(28,5,"DREW'S 8-BIT LOUNGE")
for i in range(29):ppuaddr(0x2000+(7+(i*7)%18)*32+2+(i*11)%28);lda(130);sta(0x2007)
for a,v in [(0,120),(1,120),(2,180),(3,85),(4,0),(5,19),(6,0),(7,1),(8,0),(9,0)]:lda(v);zp(0x85,a)
lda(128);sta(0x201);lda(129);sta(0x205);lda(0);sta(0x202);lda(1);sta(0x206);sta(0x4015);lda(0x9a);sta(0x4000);lda(0);sta(0x4001);sta(0x2005);sta(0x2005);lda(0x80);sta(0x2000);lda(0x1e);sta(0x2001)
label('forever');jump('forever');label('nmi');emit(0x48,0x8a,0x48,0x98,0x48);zp(0xe6,6)
lda(1);sta(0x4016);lda(0);sta(0x4016);zp(0x85,9);imm(0xa2,8)
label('readpad');absolute(0xad,0x4016);emit(0x4a);zp(0x26,9);emit(0xca);branch(0xd0,'readpad')
lda(1);zp(0x85,7);zp(0xa5,9);imm(0x29,128);branch(0xf0,'noboost');lda(2);zp(0x85,7);zp(0xa5,6);imm(0x29,15);branch(0xd0,'noboost');lda(4);zp(0x85,8);lda(0x55);sta(0x4002);lda(8);sta(0x4003);label('noboost')
for name,mask,axis,op,lo,hi in [('up',8,1,0xe5,57,211),('down',4,1,0x65,57,211),('left',2,0,0xe5,12,237),('right',1,0,0x65,12,237)]:
 zp(0xa5,9);imm(0x29,mask);branch(0xf0,'skip'+name);zp(0xa5,axis);emit(0x38 if op==0xe5 else 0x18);zp(op,7);zp(0x85,axis);imm(0xc9,lo);branch(0xb0,'low'+name);lda(lo);zp(0x85,axis)
 label('low'+name);zp(0xa5,axis);imm(0xc9,hi);branch(0x90,'skip'+name);lda(hi-1);zp(0x85,axis);label('skip'+name)
for axis,star,name in [(0,2,'cx'),(1,3,'cy')]:
 zp(0xa5,axis);emit(0x38);zp(0xe5,star);branch(0xb0,name);imm(0x49,255);emit(0x18);imm(0x69,1);label(name);imm(0xc9,8);branch(0xb0,'nocollision')
zp(0xe6,4);zp(0xa5,4);imm(0xc9,10);branch(0x90,'scoreok');lda(0);zp(0x85,4);label('scoreok')
zp(0xa5,2);emit(0x18);imm(0x69,71);imm(0xc9,230);branch(0x90,'starxok');emit(0x38);imm(0xe9,210);label('starxok');imm(0x09,16);zp(0x85,2)
zp(0xa5,3);emit(0x18);imm(0x69,47);imm(0xc9,200);branch(0x90,'staryok');emit(0x38);imm(0xe9,137);label('staryok');zp(0x85,3)
lda(12);zp(0x85,8);lda(0xaa);sta(0x4002);lda(8);sta(0x4003)
label('nocollision');zp(0xa5,8);branch(0xf0,'silence');zp(0xc6,8);lda(0x9a);sta(0x4000);jump('sounddone');label('silence');lda(0x90);sta(0x4000);label('sounddone')
for z,a in [(1,0x200),(0,0x203),(3,0x204),(2,0x207)]:zp(0xa5,z);sta(a)
lda(0);sta(0x2003);lda(2);sta(0x4014);ppuaddr(0x2091);zp(0xa5,4);emit(0x18);imm(0x69,48);sta(0x2007);lda(0);sta(0x2005);sta(0x2005);emit(0x68,0xa8,0x68,0xaa,0x68,0x40);label('irq');emit(0x40)
for pos,name,kind in fix:
 v=labels[name]
 if kind=='rel':
  offset=v-(0x8000+pos+1);assert -128<=offset<=127,(name,offset);code[pos]=offset&255
 else:code[pos]=v&255;code[pos+1]=v>>8
prg=code+bytearray(16384-len(code))
for pos,name in [(0x3ffa,'nmi'),(0x3ffc,'reset'),(0x3ffe,'irq')]:prg[pos:pos+2]=labels[name].to_bytes(2,'little')
# Compact original 5x7 font, one hexadecimal row per glyph row.
font={'A':'0e11111f111111','B':'1e11111e11111e','C':'0f10101010100f','D':'1e11111111111e','E':'1f10101e10101f','F':'1f10101e101010','G':'0f10101711110f','H':'1111111f111111','I':'1f04040404041f','J':'0702020212120c','K':'11121418141211','L':'1010101010101f','M':'111b1515111111','N':'11191513111111','O':'0e11111111110e','P':'1e11111e101010','Q':'0e11111115120d','R':'1e11111e141211','S':'0f10100e01011e','T':'1f040404040404','U':'1111111111110e','V':'11111111110a04','W':'11111115151b11','X':'11110a040a1111','Y':'11110a04040404','Z':'1f01020408101f','0':'0e11131519110e','1':'040c040404040e','2':'0e11010204081f','3':'1e01010e01011e','4':'02060a121f0202','5':'1f10101e01011e','6':'0e10101e11110e','7':'1f010204080808','8':'0e11110e11110e','9':'0e11110f01010e',':':'00040400040400','-':'0000001f000000',"'":'04040800000000'}
chr=bytearray(8192)
for c,rows in font.items():
 for y,r in enumerate(bytes.fromhex(rows)):chr[ord(c)*16+y]=r<<2
for index,rows in {128:[24,60,126,255,219,153,24,36],129:[24,24,126,255,126,60,102,66],130:[0,0,0,16,0,0,0,0]}.items():chr[index*16:index*16+8]=bytes(rows)
header=bytes([78,69,83,26,1,1,0,0,0,0,0,0,0,0,0,0]);root=Path(__file__).resolve().parents[1];(root/'dist/star-circuit.nes').write_bytes(header+prg+chr);print(f'Built original NES demo: {len(code)} bytes of 6502 code')
