#!/usr/bin/env python3
"""Deterministic, transparent 6-frame sprite sheets for all Mayfield actor templates.

Source: public/assets/sprites/cast.json (created by export-sprite-cast.mjs).
Output: public/assets/sprites/<level>/<actor-id>.png (384x88, frames 64x88).
Pillow is only required to regenerate assets; the shipped game uses plain PNGs.
"""
from __future__ import annotations
import colorsys
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / 'public' / 'assets' / 'sprites'
CAST = json.loads((SPRITES / 'cast.json').read_text())
FRAMES = 6
W, H, UPSCALE = 32, 44, 2
W2, H2 = W * UPSCALE, H * UPSCALE


def seed_for(text):
    return int.from_bytes(hashlib.sha256(text.encode('utf-8')).digest()[:4], 'big')


def rgba(hexstr, alpha=255):
    h = hexstr.lstrip('#')
    if len(h) == 3:
        h = ''.join(c*2 for c in h)
    return (*tuple(int(h[i:i+2], 16) for i in (0, 2, 4)), alpha)


def color_shift(rgb, factor):
    return tuple(max(0, min(255, int(v * factor))) for v in rgb[:3]) + (rgb[3] if len(rgb) == 4 else 255,)


def px(draw, box, fill, outline=None):
    draw.rectangle(tuple(round(a) for a in box), fill=fill, outline=outline)


def oval(draw, box, fill, outline=None):
    draw.ellipse(tuple(round(a) for a in box), fill=fill, outline=outline)


def human_frame(a, frame):
    im = Image.new('RGBA', (W, H), (0,0,0,0))
    d = ImageDraw.Draw(im)
    idx = seed_for(a['level']+'/'+a['id'])
    role = a['role'].lower()
    name = a['name'].lower()
    small = 'child' in role or 'child' in name
    outfit = rgba(a['color'])
    outline = (15,24,40,255)
    shadow = color_shift(outfit, .65)
    skin_options = [(241,189,144,255),(192,129,96,255),(237,170,121,255),(145,94,70,255),(217,159,114,255)]
    skin = skin_options[idx % len(skin_options)]
    hair_options = [(55,35,43,255),(104,63,47,255),(37,32,36,255),(160,108,63,255),(214,172,92,255)]
    hair = hair_options[(idx // 3) % len(hair_options)]
    gait = [0, -2, 2, -1, 1, 0][frame]
    stance = frame in (1,2,3,4)
    hand_up = frame==5
    bounce = [0,0,-1,0,-1,0][frame]
    y = 1 if small else 0
    if small: y=3
    # shadow; feet and arms alternate to make walk poses discernible
    oval(d, (7,40,25,43), (0,0,0,65))
    legs = ((11+gait, 31-y, 15+gait, 39-y),(18-gait, 31-y, 22-gait, 39-y))
    for leg in legs: px(d,leg,outline)
    px(d,(10+gait, 39-y, 16+gait, 41-y), (28,30,41,255))
    px(d,(17-gait, 39-y, 23-gait, 41-y), (28,30,41,255))
    # arm swing
    arm_l = 0 if not stance else (-gait)
    arm_r = 0 if not stance else gait
    px(d,(7+arm_l,20-y-bounce,10+arm_l,29-y-bounce), outline)
    px(d,(8+arm_l,22-y-bounce,10+arm_l,29-y-bounce), skin)
    px(d,(23+arm_r,20-y-bounce,26+arm_r,29-y-bounce), outline)
    px(d,(23+arm_r,22-y-bounce,25+arm_r,29-y-bounce), skin)
    # shirt, pants, neck
    px(d,(10,20-y-bounce,22,32-y-bounce), outline)
    px(d,(11,21-y-bounce,21,30-y-bounce), outfit)
    px(d,(12,30-y-bounce,20,32-y-bounce),shadow)
    px(d,(14,18-y-bounce,18,21-y-bounce), skin)
    # head
    px(d,(11,8-y-bounce,21,19-y-bounce), outline)
    px(d,(12,9-y-bounce,20,18-y-bounce), skin)
    # hair
    px(d,(11,8-y-bounce,21,11-y-bounce), hair)
    px(d,(10,10-y-bounce,12,14-y-bounce), hair)
    px(d,(19,10-y-bounce,22,12-y-bounce), hair)
    px(d,(13,14-y-bounce,14,15-y-bounce),(26,25,30,255))
    px(d,(19,14-y-bounce,20,15-y-bounce),(26,25,30,255))
    px(d,(15,17-y-bounce,18,17-y-bounce), color_shift(skin, .8))
    if 'ranger' in role or 'security' in role or 'guard' in role or 'coach' in role:
        hat = (36,97,62,255) if 'ranger' in role else ((24,46,92,255) if 'guard' in role or 'security' in role else (41,89,170,255))
        px(d,(10,7-y-bounce,22,10-y-bounce),hat)
        px(d,(8,10-y-bounce,24,11-y-bounce),hat)
        px(d,(15,8-y-bounce,17,9-y-bounce),(232,193,91,255))
    if 'housekeeper' in role or 'teller' in role or 'employee' in role:
        px(d,(14,21-y-bounce,18,25-y-bounce),(238,240,222,255))
    if 'manager' in role or 'concierge' in role or 'executive' in role:
        px(d,(15,22-y-bounce,17,26-y-bounce),(236,188,72,255))
    if 'photographer' in role and (hand_up or frame in (0,3)):
        lens_y = 13 if hand_up else 18
        px(d,(21,lens_y-y-bounce,30,lens_y+5-y-bounce),outline)
        px(d,(23,lens_y+1-y-bounce,29,lens_y+3-y-bounce),(54,58,67,255))
        oval(d,(24,lens_y+1-y-bounce,27,lens_y+3-y-bounce),(115,208,236,255))
        if hand_up:
            px(d,(28,10-y-bounce,29,12-y-bounce),(254,242,186,255))
            px(d,(30,12-y-bounce,31,13-y-bounce),(254,242,186,255))
    if 'thief' in role:
        px(d,(11,12-y-bounce,21,15-y-bounce),(45,46,61,255))
        px(d,(12,13-y-bounce,20,14-y-bounce),(22,27,37,255))
    if 'child' in role:
        px(d,(11,31-y-bounce,21,32-y-bounce),(255,200,77,255))
    if hand_up and 'photographer' not in role:
        px(d,(23,16-y-bounce,25,23-y-bounce), skin)
        px(d,(23,15-y-bounce,27,17-y-bounce),skin)
        px(d,(24,13-y-bounce,25,15-y-bounce),skin)
    return im.resize((W2,H2),Image.Resampling.NEAREST)


def animal_frame(a,frame):
    im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    role=a['role'].lower()
    cat='cat' in role
    squirrel='squirrel' in role
    base=rgba(a['color']); dark=color_shift(base,.63); pale=color_shift(base,1.17)
    step=[0,2,0,-2,1,0][frame]
    # on ground. tip tail changes for animals
    oval(d,(6,39,28,43),(0,0,0,60))
    if squirrel:
        oval(d,(1,17-step,13,33-step),dark)
        oval(d,(1,14-step,10,27-step),base)
        oval(d,(3,14-step,7,20-step),pale)
    elif cat:
        d.line([(7,35),(4,27+step),(5,16-step),(7,13-step)],fill=dark,width=3)
        d.line([(7,35),(5,25+step),(6,16-step)],fill=base,width=1)
    else:
        d.line([(7,32),(4,25+step),(1,23)],fill=base,width=3)
    for foot in [(10+step,34,13+step,40),(19-step,34,22-step,40)]:
        px(d,foot,dark)
    oval(d,(8,23+step//2,25,37+step//2),dark)
    oval(d,(10,24+step//2,24,36+step//2),base)
    oval(d,(20,19+step//2,29,31+step//2),dark)
    oval(d,(21,20+step//2,28,29+step//2),base)
    if cat:
        d.polygon([(21,21),(23,14),(25,20)],fill=dark)
        d.polygon([(26,19),(29,14),(29,23)],fill=dark)
        d.polygon([(22,20),(23,17),(24,20)],fill=(237,166,154,255))
    elif squirrel:
        d.polygon([(22,19),(23,14),(25,19)],fill=dark)
        d.polygon([(26,18),(29,14),(29,23)],fill=dark)
    else:
        oval(d,(19,16,23,24),dark)
    px(d,(26,24+step//2,27,25+step//2),(23,24,30,255))
    px(d,(21,24+step//2,22,25+step//2),(25,25,30,255))
    px(d,(25,28+step//2,29,29+step//2),pale)
    if frame==5:
        oval(d,(27,33,31,37),(231,211,121,255))
    return im.resize((W2,H2),Image.Resampling.NEAREST)


def ghost_frame(a,frame):
    im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    tint=rgba(a['color']); t=tuple(min(255,int(v*.8+85)) for v in tint[:3])
    bounce=[0,-2,-3,-2,-1,-2][frame]
    oval(d,(6,8+bounce,27,31+bounce),(*t,75))
    oval(d,(10,9+bounce,25,25+bounce),(*t,190))
    d.polygon([(10,20+bounce),(26,20+bounce),(28,39+bounce),(21,35+bounce),(17,40+bounce),(13,35+bounce),(6,40+bounce)], fill=(*t,164))
    oval(d,(12,15+bounce,15,18+bounce),(11,36,80,230))
    oval(d,(21,15+bounce,24,18+bounce),(11,36,80,230))
    if frame==5:
        for x,y in [(4,11),(27,8),(4,33)]:
            px(d,(x,y,x+2,y+2),(*t,145))
    return im.resize((W2,H2),Image.Resampling.NEAREST)


def render():
    seen=set()
    for actor in CAST:
        level=actor['level']; ident=actor['id']
        assert (level,ident) not in seen
        seen.add((level,ident))
        render_fn={'human':human_frame,'animal':animal_frame,'ghost':ghost_frame}[actor['kind']]
        atlas=Image.new('RGBA',(FRAMES*W2,H2),(0,0,0,0))
        for f in range(FRAMES): atlas.alpha_composite(render_fn(actor,f),(W2*f,0))
        path=SPRITES/level/f'{ident}.png'
        path.parent.mkdir(parents=True,exist_ok=True)
        atlas.save(path,optimize=True)
    print(f'Generated {len(seen)} actor sprite atlases, six transparent frames each, {FRAMES*W2}x{H2}')
    # Visible sample with main actors + animal kinds and ghost: every level represented.
    choice=[]
    for level in ('house','park','bank','hotel'):
        actors=[a for a in CAST if a['level']==level]
        choice.extend(actors[:8])
    cell_w= 6 * W2 + 16
    cell_h= H2 + 29
    columns=2
    rows=math.ceil(len(choice)/columns)
    contact=Image.new('RGB',(columns*cell_w,rows*cell_h),(9,18,37))
    dc=ImageDraw.Draw(contact)
    font=ImageFont.load_default()
    for i,a in enumerate(choice):
        x=(i%columns)*cell_w;y=(i//columns)*cell_h
        atlas=Image.open(SPRITES/a['level']/f"{a['id']}.png")
        contact.paste(atlas,(x+6,y+21),atlas)
        dc.text((x+7,y+4),f"{a['level'].upper()} / {a['name']}",font=font,fill=(239,223,171))
    contact.save(ROOT/'sprite-sheet-preview.png')
    # Animated demonstration: 4 walk poses played repeatedly, same shipped PNGs.
    ranger = Image.open(SPRITES/'park'/'ranger.png')
    gif=[]
    for n in [1,2,3,4,3,2]:
        fr=ranger.crop((n*W2,0,(n+1)*W2,H2))
        scene=Image.new('RGBA',(192,148),(14,28,44,255));scene.alpha_composite(fr,(64,38))
        d=ImageDraw.Draw(scene);d.line((0,129,192,129),fill=(70,139,119,255),width=4)
        gif.append(scene.convert('RGB'))
    gif[0].save(ROOT/'walking-ranger-demo.gif',save_all=True,append_images=gif[1:],duration=145,loop=0)
    return len(seen)

if __name__=='__main__': render()
