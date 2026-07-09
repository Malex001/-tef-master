from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT_DIR, exist_ok=True)

BG = (30, 58, 95)
FG = (255, 255, 255)
ACCENT = (79, 141, 255)


def find_font(size):
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = int(size * 0.12) if maskable else 0
    box = [pad, pad, size - pad, size - pad]
    radius = int(size * 0.22)
    draw.rounded_rectangle(box, radius=radius, fill=BG)

    bar_w = int(size * 0.10)
    bar_h = int(size * 0.34)
    bar_y = int(size * 0.30)
    bar_x = int(size * 0.24)
    draw.rounded_rectangle(
        [bar_x, bar_y, bar_x + bar_w, bar_y + bar_h],
        radius=int(bar_w * 0.3),
        fill=ACCENT,
    )

    text = "TEF"
    font = find_font(int(size * 0.20))
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = size / 2 - tw / 2 - bbox[0] + int(size * 0.08)
    ty = int(size * 0.30) + bar_h / 2 - th / 2 - bbox[1]
    draw.text((tx, ty), text, font=font, fill=FG)

    return img


for size in [192, 512]:
    draw_icon(size, maskable=False).save(os.path.join(OUT_DIR, f"icon-{size}.png"))
    draw_icon(size, maskable=True).save(os.path.join(OUT_DIR, f"icon-maskable-{size}.png"))

print("Icons generated in", OUT_DIR)
