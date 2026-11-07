"""Render the rooms the Spamton NEO scenes take place in (tile layers, asset sprites and background
layers, as GameMaker draws them at room start) to PNGs in assets/rooms/.

Usage: python -I tools/render_rooms.py --game "D:/Steam/steamapps/common/DELTARUNE" --out assets [--chapter 2]
"""
import argparse, os, struct, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from datawin import DataWin, write_png, scale_nearest  # noqa: E402

# room name -> rendered height (the scenes never move the camera below it)
ROOMS = {"room_dw_mansion_b_east": 480, "room_dw_mansion_b_east_a": 480}

TILE_INDEX, TILE_MIRROR, TILE_FLIP, TILE_ROTATE = 0x7FFFF, 0x10000000, 0x20000000, 0x40000000


def over(dst, dw, dh, src, sw, sh, dx, dy):
    """Alpha-composite src over dst (both RGBA bytearrays)."""
    for row in range(sh):
        ty = dy + row
        if ty < 0 or ty >= dh:
            continue
        for col in range(sw):
            tx = dx + col
            if tx < 0 or tx >= dw:
                continue
            s = (row * sw + col) * 4
            a = src[s + 3]
            if a == 0:
                continue
            o = (ty * dw + tx) * 4
            if a == 255:
                dst[o:o + 4] = src[s:s + 4]
                continue
            da = dst[o + 3]
            oa = a + da * (255 - a) // 255
            for k in range(3):
                dst[o + k] = (src[s + k] * a + dst[o + k] * da * (255 - a) // 255) // max(1, oa)
            dst[o + 3] = oa


def transform(px, w, h, mirror, flip, rotate):
    out = px
    if rotate:  # 90 degrees clockwise
        r = bytearray(len(out))
        for y in range(h):
            for x in range(w):
                s = (y * w + x) * 4
                nx, ny = h - 1 - y, x
                o = (ny * h + nx) * 4
                r[o:o + 4] = out[s:s + 4]
        out, w, h = r, h, w
    if mirror:
        r = bytearray(len(out))
        for y in range(h):
            for x in range(w):
                s = (y * w + x) * 4
                o = (y * w + (w - 1 - x)) * 4
                r[o:o + 4] = out[s:s + 4]
        out = r
    if flip:
        r = bytearray(len(out))
        for y in range(h):
            r[(h - 1 - y) * w * 4:(h - y) * w * 4] = out[y * w * 4:(y + 1) * w * 4]
        out = r
    return out


class Tileset:
    def __init__(self, d, index):
        p = d.chunk_list("BGND")[index]
        self.name = d.str(d.u32(p))
        self.tw, self.th = d.u32(p + 24), d.u32(p + 28)
        self.bx, self.by = d.u32(p + 32), d.u32(p + 36)
        self.cols = d.u32(p + 40)
        t = d.tpag_at(d.u32(p + 16))
        self.w, self.h, self.px = d.tpag_on_canvas(t)
        self.cache = {}

    def tile(self, v):
        if v in self.cache:
            return self.cache[v]
        i = v & TILE_INDEX
        x = (i % self.cols) * (self.tw + 2 * self.bx) + self.bx
        y = (i // self.cols) * (self.th + 2 * self.by) + self.by
        out = bytearray(self.tw * self.th * 4)
        for row in range(self.th):
            s = ((y + row) * self.w + x) * 4
            out[row * self.tw * 4:(row + 1) * self.tw * 4] = self.px[s:s + self.tw * 4]
        out = transform(out, self.tw, self.th, v & TILE_MIRROR, v & TILE_FLIP, v & TILE_ROTATE)
        self.cache[v] = out
        return out


def render(d, room_index, height):
    p = d.chunk_list("ROOM")[room_index]
    rw = d.u32(p + 8)
    rh = min(d.u32(p + 12), height)
    img = bytearray(rw * rh * 4)
    layers = []
    for lp in d.ptrlist(d.u32(p + 88)):
        if not d.u32(lp + 32):  # invisible
            continue
        layers.append((d.i32(lp + 12), lp))
    for _depth, lp in sorted(layers, key=lambda t: -t[0]):  # far (high depth) first
        typ, q = d.u32(lp + 8), lp + 48
        if typ == 1:  # background
            spr = d.i32(q + 8)
            if not d.u32(q) or spr < 0:
                col = d.u32(q + 24)  # 0xAABBGGRR
                if col >> 24:
                    c = bytes([col & 255, (col >> 8) & 255, (col >> 16) & 255, 255])
                    img[:] = c * (rw * rh)
                continue
            s = d.sprites[spr]
            w, h, px = d.sprite_frame(s, 0)
            htiled, vtiled = d.u32(q + 12), d.u32(q + 16)
            xs = range(0, rw, w) if htiled else [0]
            ys = range(0, rh, h) if vtiled else [0]
            for yy in ys:
                for xx in xs:
                    over(img, rw, rh, px, w, h, xx, yy)
        elif typ == 3:  # assets: sprite instances
            lst = d.u32(q + 4)
            for a in (d.ptrlist(lst) if lst else []):
                s = d.sprites[d.i32(a + 4)]
                ax, ay = d.i32(a + 8), d.i32(a + 12)
                sx, sy = d.f32(a + 16), d.f32(a + 20)
                w, h, px = d.sprite_frame(s, int(d.f32(a + 36)))
                dw, dh = int(round(w * sx)), int(round(h * sy))
                px = scale_nearest(px, w, h, dw, dh)
                over(img, rw, rh, px, dw, dh, ax - int(s["origin_x"] * sx), ay - int(s["origin_y"] * sy))
        elif typ == 4:  # tiles
            ts = Tileset(d, d.i32(q))
            tx, ty = d.u32(q + 4), d.u32(q + 8)
            data = struct.unpack_from("<%dI" % (tx * ty), d.d, q + 12)
            for j in range(ty):
                if j * ts.th >= rh:
                    break
                for i in range(tx):
                    v = data[j * tx + i]
                    if v & TILE_INDEX == 0:
                        continue
                    over(img, rw, rh, ts.tile(v), ts.tw, ts.th, i * ts.tw, j * ts.th)
    return rw, rh, img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", required=True)
    ap.add_argument("--out", default="assets")
    ap.add_argument("--chapter", default="2")
    a = ap.parse_args()
    d = DataWin(os.path.join(a.game, "chapter%s_windows" % a.chapter, "data.win"))
    names = [d.str(d.u32(p)) for p in d.chunk_list("ROOM")]
    os.makedirs(os.path.join(a.out, "rooms"), exist_ok=True)
    for name, height in ROOMS.items():
        w, h, img = render(d, names.index(name), height)
        path = os.path.join(a.out, "rooms", name + ".png")
        write_png(path, w, h, img)
        print("wrote", path, w, h)


if __name__ == "__main__":
    main()
