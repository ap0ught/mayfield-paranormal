"""Deterministic, editable SVG-generated backgrounds for the Mayfield Bank level.
Requires cairosvg and Pillow to regenerate; the pre-rendered WEBP assets ship with Vite.
Run: python scripts/generate-bank-art.py
"""
from __future__ import annotations
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import cairosvg

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'assets'
ROOT.mkdir(parents=True, exist_ok=True)
W, H = 960, 540

# Gradients, lighting, architectural details and fixtures use vector source.
HEADER = '''<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
<defs>
 <linearGradient id="wall" x1="0" y1="0" x2="0.14" y2="1"><stop stop-color="#283d57"/><stop offset=".55" stop-color="#28314b"/><stop offset="1" stop-color="#111d37"/></linearGradient>
 <linearGradient id="floor" x1="0" y1="0" x2="0.4" y2="1"><stop stop-color="#766d6d"/><stop offset=".48" stop-color="#36465c"/><stop offset="1" stop-color="#182a46"/></linearGradient>
 <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#775a48"/><stop offset=".6" stop-color="#42394a"/><stop offset="1" stop-color="#231e30"/></linearGradient>
 <linearGradient id="metal" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#c5d5dc"/><stop offset=".4" stop-color="#708ba6"/><stop offset="1" stop-color="#29445f"/></linearGradient>
 <radialGradient id="goldglow"><stop stop-color="#ffeabb" stop-opacity=".52"/><stop offset="1" stop-color="#ffcb6b" stop-opacity="0"/></radialGradient>
 <filter id="glow"><feGaussianBlur stdDeviation="7"/></filter>
</defs>
<rect width="960" height="540" fill="#071127"/>
<rect x="0" y="0" width="960" height="369" fill="url(#wall)"/>
<path d="M0 355 L960 355 960 540 0 540Z" fill="url(#floor)"/>
<path d="M0 355 H960" stroke="#e6bc76" stroke-width="7"/>
<path d="M0 397 H960 M0 477 H960 M170 355 L90 540 M380 355 L340 540 M590 355 L625 540 M800 355 L875 540" stroke="#aeb8b9" stroke-width="2" opacity=".33"/>
<rect y="20" width="960" height="14" fill="#e4ad6a" opacity=".68"/><rect y="51" width="960" height="3" fill="#e9ca99" opacity=".35"/>
<rect x="24" y="54" width="18" height="304" fill="#927c74"/><rect x="41" y="54" width="6" height="304" fill="#edc17e" opacity=".7"/>
<rect x="916" y="54" width="18" height="304" fill="#927c74"/><rect x="913" y="54" width="5" height="304" fill="#edc17e" opacity=".7"/>
<ellipse cx="480" cy="96" rx="195" ry="90" fill="url(#goldglow)"/>
<path d="M465 0 v75 M495 0 v75" stroke="#f1d092" stroke-width="7"/>
<path d="M448 82 h65 l-13 28 h-39z" fill="#ddad66" stroke="#ffe2a1" stroke-width="3"/>
<circle cx="480" cy="109" r="12" fill="#fff0aa"/>
<circle cx="451" cy="109" r="7" fill="#ffe29c"/><circle cx="509" cy="109" r="7" fill="#ffe29c"/>
<rect x="0" y="354" width="960" height="7" fill="#f6d49c" opacity=".7"/>
'''
END = '</svg>'

def r(x,y,w,h,fill='#25334c',stroke='#a88e79',sw=3,rx=0):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def text(x,y,t,size=25,col='#ffe5ac',anchor='middle',weight=700):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-family="DejaVu Sans, sans-serif" font-weight="{weight}" fill="{col}" text-anchor="{anchor}" stroke="#0d1424" stroke-width="1.5" paint-order="stroke">{t}</text>'
def line(x1,y1,x2,y2,col='#d6c7aa',sw=3):
    return f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{col}" stroke-width="{sw}"/>'
def desk(x,y,w=240):
    return r(x,y,w,65,'url(#wood)','#ddba83',5,5)+r(x+10,y+12,w-20,13,'#b18756','#caa876',2)+r(x+14,y+48,w-28,7,'#272d41','#ddc09a',1)
def plant(x,y):
    return f'<path d="M{x} {y} q-69 -110 -90 -80 M{x} {y} q30 -120 80 -80 M{x} {y} q-10 -130 15 -142" stroke="#2a986f" stroke-width="16" fill="none" stroke-linecap="round"/>'+r(x-28,y-18,57,64,'#8a6858','#cfad80',4,8)
def window(x,y,w=160,h=150):
    return r(x,y,w,h,'#0f294e','#c8a36e',9,2)+line(x+w/2,y,x+w/2,y+h,'#a3c2d6',4)+line(x,y+h/2,x+w,y+h/2,'#a3c2d6',4)
def chair(x,y):
    return r(x,y,95,28,'#7d5c67','#f0cb8f',3,8)+r(x+12,y-65,71,72,'#564b66','#caa778',3,8)+line(x+12,y+28,x+12,y+76,'#e1bb77',6)+line(x+83,y+28,x+83,y+76,'#e1bb77',6)
def rope(x,y):
    return line(x,y-73,x,y+20,'#ffdc92',7)+r(x-15,y-79,30,14,'#ffd475','#f9e4aa',3,7)+r(x-17,y+15,35,12,'#e1b86e','#eacb95',2,7)
def safe(x,y):
    out=r(x,y,245,248,'url(#metal)','#f9e2ab',7,25)
    out+=f'<circle cx="{x+123}" cy="{y+124}" r="90" fill="#365370" stroke="#e5d1a5" stroke-width="11"/><circle cx="{x+123}" cy="{y+124}" r="55" fill="#1d3b5d" stroke="#9ac4d2" stroke-width="5"/>'
    for dx,dy in [(0,-45),(43,0),(0,43),(-43,0)]: out+=line(x+123,y+124,x+123+dx,y+124+dy,'#c4e8f4',6)
    out+=f'<circle cx="{x+123}" cy="{y+124}" r="12" fill="#ffe5a8"/>'
    return out

def entry():
    return window(110,94,280,251)+window(560,94,280,251)+r(397,84,154,269,'#192c46','#f7d39c',13,1)+line(474,100,474,352,'#f8d18c',8)+text(474,157,'WELCOME',25)+plant(80,372)+plant(845,372)+text(480,64,'MAYFIELD BANK • MAIN ENTRANCE',24)

def lobby():
    return window(85,93,210,220)+window(665,93,210,220)+desk(340,283,280)+text(480,280,'INFORMATION',24)+chair(115,362)+chair(725,362)+plant(330,365)+plant(653,365)+text(480,64,'GRAND BANK LOBBY',24)

def teller():
    s=text(480,66,'TELLER SERVICES',26)
    for x in [100,390,680]:
        s+=r(x,106,210,226,'#152c44','#ebc888',7,3)+r(x+20,130,170,92,'#88a7b9','#c5e1eb',2,1)+r(x+20,224,170,6,'#f6d898','#dab57d',3)+desk(x-8,302,226)+text(x+105,133,str((x//290)+1),19)
    s+=plant(28,385)
    return s

def queue():
    s=text(480,67,'CUSTOMER QUEUE',26)+r(260,95,440,83,'#152339','#f7c97d',6,8)+text(480,146,'NOW SERVING  •  042',35,'#7ceeea')
    for x in [152,368,586,802]:s+=rope(x,330)
    for x in [152,368,586]: s+=f'<path d="M{x} 262 q113 25 216 0" stroke="#bf718e" stroke-width="7" fill="none"/>'
    s+=desk(350,397,265)
    return s

def atm():
    s=text(480,64,'24-HOUR ATM LOUNGE',26)
    for x in [80,365,650]:
        s+=r(x,99,218,284,'url(#metal)','#f0dbb6',8,15)+r(x+23,131,172,95,'#122b49','#9ed8e1',4,3)+text(x+109,185,'$   200',25,'#78faff')+r(x+41,247,136,13,'#10233e','#e8bb80',2,5)+r(x+48,287,120,49,'#2f465f','#b6cad4',3,4)+text(x+109,316,'ENTER',14)
    return s

def office():
    return text(480,64,'PRIVATE BANKING OFFICE',25)+window(670,98,189,191)+r(106,104,249,181,'#284156','#e6bd83',6,3)+text(229,175,'CLIENT',27)+text(229,208,'ACCOUNTS',25)+desk(302,340,365)+chair(210,378)+chair(727,378)+r(438,303,85,50,'#1a2e45','#bba679',4,3)+plant(850,360)

def security():
    s=text(480,64,'SECURITY OPERATIONS',27)
    for x in [65,315,565]:
        s+=r(x,103,220,135,'#14263d','#7da3b1',6,4)
        s+=r(x+13,119,194,98,'#173e58','#a4e0d9',2,3)
        s+=line(x+20,163,x+200,163,'#75ddda',2)+line(x+108,122,x+108,216,'#75ddda',2)
        s+=text(x+110,143,'CAM',15)
    s+=desk(285,341,392)+r(421,294,105,46,'#1b344d','#86cacc',4,2)+chair(95,400)
    return s

def vault():
    return text(480,66,'VAULT • RESTRICTED ACCESS',28)+safe(364,90)+r(91,130,196,252,'#252e3a','#c2b18a',8,1)+r(672,130,196,252,'#252e3a','#c2b18a',8,1)+r(109,160,162,9,'#dbc591','#e1c48c',3)+r(690,160,162,9,'#dbc591','#e1c48c',3)+text(190,253,'BOXES',22)+text(768,253,'BOXES',22)

def lostfound():
    return text(480,64,'LOST PROPERTY &amp; HELP DESK',26)+desk(267,306,426)+text(480,347,'CUSTOMER CARE',23)+r(67,98,185,198,'#34445e','#d1b687',6,5)+text(160,167,'LOST',28)+text(160,199,'ITEMS',28)+r(717,102,159,226,'#34445e','#d1b687',6,5)+r(744,143,104,33,'#b58658','#e1bc8c',3,3)+r(744,191,104,33,'#b58658','#e1bc8c',3,3)+plant(104,390)+plant(855,390)

def express_tellers():
    return text(480,66,'EXPRESS TELLER SERVICE',27)+desk(100,327,760)+r(146,111,253,206,'#192e47','#e4be7e',8,7)+r(561,111,253,206,'#192e47','#e4be7e',8,7)+text(270,174,'FAST DEPOSIT',25)+text(686,174,'PICKUP',25)+plant(65,393)

def customer_lounge():
    return text(480,66,'CUSTOMER LOUNGE',27)+window(355,101,250,202)+chair(114,369)+chair(751,369)+desk(347,374,264)+plant(80,386)+plant(858,384)+text(474,171,'COFFEE  •  RELAX',24)

def consult_suite():
    return text(480,66,'CONSULTATION SUITE',27)+window(105,106,201,211)+window(658,106,206,211)+desk(312,339,330)+chair(176,391)+chair(749,391)+r(395,132,172,135,'#293f57','#ddbd87',6,5)+text(480,197,'PLANNING',24)

def cash_counting():
    s=text(480,66,'SECURE CASH COUNTING',27)
    for x in [102,393,682]:
        s+=r(x,128,190,213,'url(#metal)','#e3bf7f',7,10)+r(x+30,159,130,90,'#1b2a44','#b4dadd',4,3)+text(x+95,214,'$  100',21,'#a9ffdd')
    s+=desk(318,386,327)
    return s

def wire_desk():
    return text(480,66,'WIRE TRANSFER SERVICES',26)+desk(247,328,459)+window(88,106,182,214)+r(695,101,183,211,'#1d3d55','#d4b48b',7,5)+text(784,169,'TRANSFER',21)+text(784,209,'CONFIRMED',18,'#a0f4cf')+plant(79,384)

def break_room():
    return text(480,66,'EMPLOYEE BREAK ROOM',27)+window(702,103,183,207)+r(73,110,216,259,'#334660','#deb77e',6,6)+text(181,150,'FRIDGE',23)+desk(334,359,278)+chair(187,394)+chair(708,394)+plant(864,381)

def archive():
    s=text(480,66,'RECORDS ARCHIVE',27)
    for x in [78,339,600]:
        s+=r(x,107,222,265,'#344259','#ddba83',7,3)
        for y in [139,212,285]:
            s+=r(x+18,y,186,48,'#4c5360','#b9a68b',3,3)+text(x+110,y+34,'FILES',20)
    return s

ROOMS={
  'bank_entry':entry,'bank_lobby':lobby,'bank_teller':teller,
  'bank_queue':queue,'bank_atm':atm,'bank_office':office,
  'bank_security':security,'bank_vault':vault,'bank_lostfound':lostfound,
  'bank_teller2':express_tellers,'bank_lounge':customer_lounge,
  'bank_consult':consult_suite,'bank_counting':cash_counting,
  'bank_wire':wire_desk,'bank_break':break_room,'bank_archive':archive,
}
for name, fn in ROOMS.items():
    svg=HEADER+fn()+END
    svg_path=ROOT / f'{name}.svg'
    svg_path.write_text(svg)
    data=cairosvg.svg2png(bytestring=svg.encode(),output_width=W,output_height=H)
    Image.open(BytesIO(data)).convert('RGB').save(ROOT/f'{name}.webp','WEBP',quality=93,method=6)

# Map cutaway: align 16 zones to the 4×4 UI overlay (not a screenshot).
MW,MH=1000,1100
out=Image.new('RGB',(MW,MH),(10,24,47));d=ImageDraw.Draw(out)
for y in range(MH):
    k=y/MH
    d.line((0,y,MW,y),fill=(int(10+20*k),int(27+15*k),int(52+12*k)))
for x,y in [(88,92),(197,170),(875,103),(799,190),(611,92),(742,140),(319,93)]:
    d.ellipse((x,y,x+4,y+4),fill=(250,231,174))
d.ellipse((785,78,852,145),fill=(225,227,233))
for x in range(0,MW,86):
    h=86+(x*73%100)
    d.rectangle((x,256-h,x+55,256),fill=(14,36,65))
    for wy in range(256-h+16,250,21):
        for wx in range(x+10,x+55,21):d.rectangle((wx,wy,wx+5,wy+7),fill=(225,170,92))
d.rectangle((38,210,964,906),fill=(53,48,63),outline=(219,183,116),width=12)
d.rectangle((50,229,951,264),fill=(123,87,63),outline=(255,218,147),width=5)
left=int(MW*.12);top=int(MH*.25);cols=4;rows=4
cw=int(MW*.77)//cols;ch=int(MH*.60)//rows
names=['bank_entry','bank_lobby','bank_teller','bank_teller2',
       'bank_atm','bank_queue','bank_office','bank_lounge',
       'bank_lostfound','bank_security','bank_consult','bank_counting',
       'bank_wire','bank_break','bank_archive','bank_vault']
for i,name in enumerate(names):
    im=Image.open(ROOT/f'{name}.webp').convert('RGB')
    crop=im.crop((40,40,920,435)).resize((cw-7,ch-7),Image.Resampling.LANCZOS)
    x=left+(i%cols)*cw+4;y=top+(i//cols)*ch+4
    out.paste(crop,(x,y))
    d.rectangle((x,y,x+cw-7,y+ch-7),outline=(222,173,104),width=4)
for x in [left+i*cw for i in range(cols+1)]:d.rectangle((x-3,top-9,x+3,top+rows*ch+7),fill=(202,166,117))
for y in [top+i*ch for i in range(rows+1)]:d.rectangle((left-8,y-3,left+cols*cw+8,y+3),fill=(202,166,117))
d.rectangle((119,163,885,230),fill=(29,41,60),outline=(245,196,113),width=6)
try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',29)
except OSError:font=ImageFont.load_default()
d.text((500,197),'MAYFIELD BANK • 16-ZONE WATCH',fill=(255,226,165),font=font,anchor='mm')
for y in range(924,MH):d.line((0,y,MW,y),fill=(15,27,44))
d.rectangle((0,957,1000,981),fill=(39,47,58))
for x in range(60,1000,170):d.rectangle((x,1039,x+79,1045),fill=(238,204,116))
d.rectangle((0,904,1000,926),fill=(209,172,111))
out.save(ROOT/'bank_map.webp','WEBP',quality=92,method=6)
print('Rendered',len(ROOMS),'bank scenes and 4x4 bank map')
