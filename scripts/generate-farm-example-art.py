"""Deterministic placeholder art for the standalone 3×3 farm-field agent example.
Run: python scripts/generate-farm-example-art.py (Pillow required)
This is NOT a new playable level until the farm example is registered in LEVELS.
Do not bake ghosts, NPCs, lights or traps into these images: those are live UI.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import random, math

ASSETS=Path(__file__).resolve().parents[1]/'public'/'assets'
ASSETS.mkdir(exist_ok=True,parents=True)

font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(size):
    try:return ImageFont.truetype(font_path,size)
    except OSError:return ImageFont.load_default()

def field_scene(row,col,W=960,H=540):
    randomizer=random.Random(200+row*23+col)
    im=Image.new('RGB',(W,H))
    d=ImageDraw.Draw(im)
    for y in range(H):
        z=y/H
        if z<.63:
            k=z/.63;d.line((0,y,W,y),fill=(int(20+35*k),int(36+49*k),int(72+38*k)))
        else:
            k=(z-.63)/.37;d.line((0,y,W,y),fill=(int(34+21*k),int(69+4*k),int(46-10*k)))
    d.ellipse((714,35,778,99),fill=(255,220,158))
    for hill in [(0,320,590,400),(330,301,960,401)]:
        d.ellipse((hill[0],hill[1],hill[2],hill[3]+120),fill=(22,74,62))
    d.polygon([(0,345),(960,352),(960,540),(0,540)],fill=(61,80,44))
    for row_y in range(372,559,29):
        for offset in range(0,980,12):
            x=(offset+row_y*4)%W
            h=randomizer.randint(20,39)
            d.line((x,row_y+h,x+randomizer.randint(-6,6),row_y),fill=(185,161,72),width=2)
            d.ellipse((x-2,row_y-3,x+2,row_y+4),fill=(243,194,99))
    # Fence and farm buildings are far outside the active field grid.
    for x in range(0,W,100):
        d.rectangle((x,305,x+8,369),fill=(139,108,77))
    for y in [327,355]:d.line((0,y,W,y),fill=(163,122,79),width=7)
    # Slight compositional variants; crops are all natural field views.
    if row==0 and col==0:
        d.polygon([(60,306),(138,237),(225,306)],fill=(78,54,56))
        d.rectangle((81,305,203,352),fill=(113,73,67))
    if col==2:
        d.line((802,190,802,378),fill=(90,77,65),width=17)
        d.ellipse((739,156,863,260),fill=(36,105,66))
    d.text((24,25),f'FIELD SECTOR {row+1}{col+1}',font=font(28),fill=(250,234,172),stroke_width=2,stroke_fill=(20,28,49))
    return im

rows=[]
for r in range(3):
    row=[]
    for c in range(3):
        im=field_scene(r,c)
        im.save(ASSETS/f'farm_f{r+1}{c+1}.webp','WEBP',quality=88,method=6)
        row.append(im)
    rows.append(row)

MW,MH=1000,1100
canvas=Image.new('RGB',(MW,MH),(9,23,42))
d=ImageDraw.Draw(canvas)
for y in range(MH):
    if y<255:d.line((0,y,MW,y),fill=(15+int(y*.07),30+int(y*.06),63+int(y*.06)))
    elif y>940:d.line((0,y,MW,y),fill=(22,36,27))
# Outbuildings pictured OUTSIDE, never as a cell in the field grid.
d.polygon([(70,247),(185,147),(300,247)],fill=(115,68,64))
d.rectangle((100,240,265,274),fill=(157,90,67))
d.text((342,188),'MAYFIELD FARM — FIELD',font=font(35),fill=(250,219,139))
left=int(MW*.12);top=int(MH*.25);cw=int(MW*.77)//3;ch=int(MH*.60)//3
for r in range(3):
    for c in range(3):
        image=rows[r][c].resize((cw-9,ch-9),Image.Resampling.LANCZOS)
        x=left+c*cw+4;y=top+r*ch+4
        canvas.paste(image,(x,y))
        d.rectangle((x-1,y-1,x+cw-7,y+ch-7),outline=(216,174,97),width=4)
for k in range(4):
    x=left+k*cw;y=top+k*ch
    d.rectangle((x-3,top-6,x+3,top+3*ch+4),fill=(178,131,79))
    d.rectangle((left-6,y-3,left+3*cw+5,y+3),fill=(178,131,79))
d.rectangle((0,970,MW,1030),fill=(47,52,49))
d.text((470,1057),'FARM TRACK — OUTSIDE FIELD GRID',font=font(24),fill=(230,215,169),anchor='mm')
canvas.save(ASSETS/'farm_field_map.webp','WEBP',quality=90,method=6)
print('Created 9 independent sector scenes + standalone 3×3 field cutaway')
