from PIL import Image
import os

mockups_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mockups")

def downscale(path, max_w=480):
    img = Image.open(path)
    w, h = img.size
    if w > max_w:
        ratio = max_w / w
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    return img

for f in ["android_02_login.png"]:
    p = os.path.join(mockups_dir, f)
    if os.path.exists(p):
        img = downscale(p)
        out = os.path.join(mockups_dir, "small_" + f)
        img.save(out)
        print(f"saved {out} {img.size}")
    else:
        print(f"missing {f}")
