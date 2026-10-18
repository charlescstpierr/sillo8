"""Assemble les captures d'animation en une planche (docs/screenshots/sillo8-poses.png)."""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

shots = sys.argv[1] if len(sys.argv) > 1 else "docs/screenshots"
poses = [
    ("marche", "marche"),
    ("course", "course"),
    ("accroupi", "accroupi"),
    ("cle", "coup de clé"),
    ("lance-clous", "lance-clous"),
    ("recharge", "recharge"),
    ("eblouir", "éblouir"),
]
tiles = [Image.open(f"{shots}/pose-{n}.png").convert("RGB") for n, _ in poses]
w, h = tiles[0].size
cols = 4
rows = (len(tiles) + cols - 1) // cols
band = 44
sheet = Image.new("RGB", (w * cols, (h + band) * rows), "#f4ecd6")
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("node_modules/@fontsource/grandstander/files/grandstander-latin-700-normal.woff", 26)
except OSError:
    font = ImageFont.load_default()
for i, (tile, (_, label)) in enumerate(zip(tiles, poses)):
    x, y = (i % cols) * w, (i // cols) * (h + band)
    sheet.paste(tile, (x, y + band))
    draw.text((x + w / 2, y + band / 2), label.upper(), fill="#3a2a1c", font=font, anchor="mm")
for c in range(1, cols):
    draw.line([(c * w, 0), (c * w, sheet.height)], fill="#3a2a1c", width=3)
for r in range(1, rows):
    draw.line([(0, r * (h + band)), (sheet.width, r * (h + band))], fill="#3a2a1c", width=3)
sheet.save(f"{shots}/sillo8-poses.png")
print("ok", sheet.size)

# Captures intermédiaires (y compris l'ancienne pose « tir » de capture.spec.ts)
for n in [n for n, _ in poses] + ["tir"]:
    if os.path.exists(f"{shots}/pose-{n}.png"):
        os.remove(f"{shots}/pose-{n}.png")
