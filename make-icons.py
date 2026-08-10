#!/usr/bin/env python3
"""아이콘 생성기. 의존성 없음 — 표준 라이브러리만 쓴다.

    python3 make-icons.py

앱 액센트(#007aff)에서 인디고로 흐르는 그라디언트 위에 바벨 마크를 얹는다.
둥근 아이콘은 모서리가 투명하고, 마스커블은 꽉 채운 뒤 마크를 안전 영역 안에 둔다.
"""
import zlib, struct, math, os

# 킷 액센트에서 뽑은 그라디언트 스톱
G0 = (0x35, 0x9b, 0xff)   # 밝은 하늘빛 (좌상단)
G1 = (0x00, 0x7a, 0xff)   # blue-500 = 앱 액센트
G2 = (0x4b, 0x4d, 0xd4)   # indigo 쪽 (우하단)
STOP = 0.62               # G1 이 차지하는 지점 — 액센트 블루를 넓게 깐다
ANGLE = 142.0             # CSS linear-gradient 와 같은 각도 규약
CORNER_RATIO = 0.2226     # iOS 스퀘어클 근사

# 바벨 마크 (viewBox 0..100): x, y, w, h, r, alpha
BARS = [
    (14.0, 46.4, 72.0, 7.2, 3.60, 1.00),
    (27.5, 29.0, 10.5, 42.0, 5.25, 1.00),
    (62.0, 29.0, 10.5, 42.0, 5.25, 1.00),
    (13.5, 36.5, 9.0, 27.0, 4.50, 0.68),
    (77.5, 36.5, 9.0, 27.0, 4.50, 0.68),
]


def write_png(path, w, h, ch, pix):
    """행마다 5개 필터를 모두 시도해 절대차 합이 가장 작은 걸 고른다."""
    stride = w * ch
    parts = []
    prev = bytearray(stride)
    for y in range(h):
        line = pix[y * stride:(y + 1) * stride]
        best = None
        for fid in range(5):
            o = bytearray(stride)
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                b = prev[i]
                c = prev[i - ch] if i >= ch else 0
                if fid == 0:
                    pr = 0
                elif fid == 1:
                    pr = a
                elif fid == 2:
                    pr = b
                elif fid == 3:
                    pr = (a + b) >> 1
                else:
                    pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                    pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                o[i] = (line[i] - pr) & 255
            score = sum(v if v < 128 else 256 - v for v in o)
            if best is None or score < best[0]:
                best = (score, fid, bytes(o))
        parts.append(bytes([best[1]]) + best[2])
        prev = bytearray(line)

    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)

    open(path, 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6 if ch == 4 else 2, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(b''.join(parts), 9))
        + chunk(b'IEND', b''))


def coverage(px, py, cx, cy, hw, hh, r):
    """둥근 사각형 부호거리로 안티에일리어싱 커버리지를 낸다."""
    dx = abs(px - cx) - (hw - r)
    dy = abs(py - cy) - (hh - r)
    ax = dx if dx > 0 else 0.0
    ay = dy if dy > 0 else 0.0
    d = math.hypot(ax, ay) + min(max(dx, dy), 0.0) - r
    c = 0.5 - d
    return 0.0 if c < 0 else (1.0 if c > 1 else c)


def lerp(a, b, t):
    return a + (b - a) * t


def render(size, rounded, mark_frac):
    S = float(size)
    px = bytearray(size * size * 4)
    corner = S * CORNER_RATIO if rounded else 0.0

    ang = math.radians(ANGLE)
    gx, gy = math.sin(ang), -math.cos(ang)
    # 코너 투영의 최소/최대로 정규화해야 t 가 0..1 을 온전히 쓴다
    lo = min(0.0, gx) + min(0.0, gy)
    hi = max(0.0, gx) + max(0.0, gy)
    span = hi - lo

    m = S * mark_frac
    u = m / 100.0
    ox = oy = (S - m) / 2.0
    shapes = [(ox + (x + w / 2) * u, oy + (y + h / 2) * u, w / 2 * u, h / 2 * u, r * u, a)
              for (x, y, w, h, r, a) in BARS]

    for j in range(size):
        fy = j + 0.5
        for i in range(size):
            fx = i + 0.5
            t = ((fx / S) * gx + (fy / S) * gy - lo) / span
            t = 0.0 if t < 0 else (1.0 if t > 1 else t)
            if t < STOP:
                k = t / STOP
                R, G, B = lerp(G0[0], G1[0], k), lerp(G0[1], G1[1], k), lerp(G0[2], G1[2], k)
            else:
                k = (t - STOP) / (1.0 - STOP)
                R, G, B = lerp(G1[0], G2[0], k), lerp(G1[1], G2[1], k), lerp(G1[2], G2[2], k)

            dx = (fx / S - 0.24) / 1.15
            dy = (fy / S - 0.10) / 0.85
            g = math.hypot(dx, dy) / 0.60
            if g < 1.0:
                a = 0.26 * (1.0 - g) * (1.0 - g)
                R, G, B = lerp(R, 255, a), lerp(G, 255, a), lerp(B, 255, a)

            for (cx, cy, hw, hh, rr, al) in shapes:
                c = coverage(fx, fy, cx, cy, hw, hh, rr)
                if c > 0:
                    a = c * al
                    R, G, B = lerp(R, 255, a), lerp(G, 255, a), lerp(B, 255, a)

            A = coverage(fx, fy, S / 2, S / 2, S / 2, S / 2, corner) * 255.0 if rounded else 255.0
            o = (j * size + i) * 4
            px[o] = int(R + 0.5); px[o + 1] = int(G + 0.5)
            px[o + 2] = int(B + 0.5); px[o + 3] = int(A + 0.5)
    return bytes(px)


def emit(path, size, rounded, frac):
    pix = render(size, rounded, frac)
    opaque = all(pix[i] == 255 for i in range(3, len(pix), 4))
    if opaque:                      # 알파가 쓸모없으면 RGB 로 낮춰 25% 절약
        rgb = bytearray()
        for i in range(0, len(pix), 4):
            rgb += pix[i:i + 3]
        write_png(path, size, size, 3, bytes(rgb))
    else:
        write_png(path, size, size, 4, pix)
    print('%-24s %dx%d  %-4s  %6d B' % (path, size, size, 'RGB' if opaque else 'RGBA',
                                        os.path.getsize(path)))


if __name__ == '__main__':
    emit('icon-512.png', 512, True, 0.586)
    emit('icon-192.png', 192, True, 0.586)
    emit('icon-512-maskable.png', 512, False, 0.453)
