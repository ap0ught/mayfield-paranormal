"""Generate Mayfield Hotel scene crops and cutaway map from original 6-floor concept.
Run from repo root: python scripts/generate-hotel-art.py
Requires Pillow. The source illustration is bundled in source-art/.
Every suite with a multi-cell footprint has just one generated scene image.
"""
from pathlib import Path
from PIL import Image, ImageEnhance
import re

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'source-art'/'hotel-cutaway.png'
ASSETS=ROOT/'public'/'assets'
img=Image.open(SOURCE).convert('RGB')
img.save(ASSETS/'hotel_map.webp', 'WEBP', quality=88, method=6)
# Crop boundaries follow the six architectural floors and columns on the concept.
# The artwork isn't perfectly orthographic; use room-level framing rather than
# treating it as an engine collision map.
xs=[80,295,507,720,938,1149,1369]
ys=[128,255,387,522,658,793,956]
rows=[
  ['H601','H602','H603','H603','H605','H606'],
  ['H501','H501','H503','H504','H505','H505'],
  ['H401','H402','H403','H404','H4SPA','H4SPA'],
  ['H301','H302','H303','H304','H3POOL','H3POOL'],
  ['H2FAMILY','H2FAMILY','H203','H204','H2LAUNDRY','H2MAPS'],
  ['H1DINING','H1DINING','H1LOBBY','H1LOBBY','H1BALL','H1BALL'],
]
regions={}
for row in range(6):
    for col in range(6):
        key=rows[row][col]
        left,top,right,bottom=xs[col],ys[row],xs[col+1],ys[row+1]
        if key not in regions: regions[key]=[left,top,right,bottom]
        else:
            bounds=regions[key]
            bounds[:]=[min(left,bounds[0]),min(top,bounds[1]),max(right,bounds[2]),max(bottom,bounds[3])]
for key,(l,t,r,b) in regions.items():
    # Keep a little architectural border while focusing the room, not HUD text.
    crop=img.crop((max(0,l+3),max(0,t+7),min(img.width,r-3),min(img.height,b-7)))
    # Scale to the same view ratio as the scene renderer; padding preserves proportions.
    W,H=960,540
    ratio=min(W/crop.width,H/crop.height)
    fitted=crop.resize((round(crop.width*ratio),round(crop.height*ratio)),Image.Resampling.LANCZOS)
    background=Image.new('RGB',(W,H),(15,25,45))
    bg=ImageEnhance.Brightness(fitted.resize((W,H),Image.Resampling.LANCZOS)).enhance(.48)
    background.paste(bg,(0,0))
    background.paste(fitted,((W-fitted.width)//2,(H-fitted.height)//2))
    background.save(ASSETS/f'hotel_{key.lower()}.webp','WEBP',quality=90,method=6)
print(f'Generated {len(regions)} hotel room/suite scenes and 6×6 overview map')
