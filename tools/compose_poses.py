"""Assemble les captures d'animation en une planche (docs/screenshots/step1-poses.png)."""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

shots = sys.argv[1] if len(sys.argv) > 1 else "docs/screenshots"
names = ["marche", "course", "accroupi", "tir", "recharge"]
tiles = [Image.open(f"{shots}/pose-{n}.png").convert("RGB") for n in names]
w, h = tiles[0].size
sheet = Image.new("RGB", (w * len(tiles), h + 44), "#f4ecd6")
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("node_modules/@fontsource/grandstander/files/grandstander-latin-700-normal.woff", 26)
except OSError:
    font = ImageFont.load_default()
for i, (tile, name) in enumerate(zip(tiles, names)):
    sheet.paste(tile, (i * w, 44))
    draw.text((i * w + w / 2, 22), name.upper(), fill="#3a2a1c", font=font, anchor="mm")
    draw.line([(i * w, 0), (i * w, h + 44)], fill="#3a2a1c", width=3)
sheet.save(f"{shots}/step1-poses.png")
print("ok", sheet.size)

for n in names:
    os.remove(f"{shots}/pose-{n}.png")
