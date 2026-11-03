"""Turn the decoded portfolio .fig (canvas.json + images/) into magazine pages.

Usage:  python -I tools/convert.py <canvas.json> <images dir>

Writes, for every non-hand page in tools/pages.json:
  src/pages/gen/<mag>/<slug>.html   page fragment (text stays real text)
  src/css/pages-gen-<mag>.css       positions = Figma frame coordinates (.is-canvas),
                                    plus a reflowed reading order for phones (.is-flow)
  src/img/gen/*.webp                cropped, resized, EXIF-free images
  tools/report.json                 fonts per magazine, images needing alt text
Alt text comes from tools/alt.json (node id → text; "" marks a decorative image).
"""
import hashlib
import html
import json
import math
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
CANVAS, IMAGES = sys.argv[1], sys.argv[2]
DESIGN_W, DESIGN_H = 1754, 1240
CREAM = (0xF2, 0xEF, 0xE8)

PAGES = {k: v for k, v in json.load(open(os.path.join(ROOT, 'tools', 'pages.json'), encoding='utf-8')).items() if not k.startswith('_')}
ALT_PATH = os.path.join(ROOT, 'tools', 'alt.json')
ALT = json.load(open(ALT_PATH, encoding='utf-8')) if os.path.exists(ALT_PATH) else {}
SVG_PATH = os.path.join(ROOT, 'tools', 'svg.json')
SVG_OVERRIDES = json.load(open(SVG_PATH, encoding='utf-8')) if os.path.exists(SVG_PATH) else {}

# The site never shows the phone number (brief). Lines matching this are dropped.
PHONE = re.compile(r'(\+44|\b07\d{3})[\d\s]{8,}')

# Furniture that only makes sense on the printed spread
DESK_ONLY_NAMES = ('Index strip', 'Index mark', 'Folio')

WEIGHTS = [('ExtraLight', 200), ('Extra Light', 200), ('Thin', 100), ('Light', 300), ('Regular', 400),
           ('Medium', 500), ('SemiBold', 600), ('Semi Bold', 600), ('ExtraBold', 800), ('Extra Bold', 800),
           ('Bold', 700), ('Black', 900)]
STACKS = {
    'Fraunces': "'Fraunces', Georgia, serif",
    'Archivo': "'Archivo', system-ui, sans-serif",
    'Archivo Black': "'Archivo Black', 'Archivo', system-ui, sans-serif",
    'Inter': "'Inter', system-ui, sans-serif",
    'Cormorant Garamond': "'Cormorant Garamond', Georgia, serif",
    'Bebas Neue': "'Bebas Neue', Impact, sans-serif",
    'Anton': "'Anton', Impact, sans-serif",
    'IBM Plex Mono': "'IBM Plex Mono', ui-monospace, monospace",
    'Playfair Display': "'Playfair Display', Georgia, serif",
    'Dancing Script': "'Dancing Script', cursive",
    'Space Mono': "'Space Mono', ui-monospace, monospace",
}


def weight_style(style):
    italic = 'Italic' in style
    w = 400
    for name, val in WEIGHTS:
        if name in style:
            w = val
            break
    return w, italic


# ---------------------------------------------------------------- load tree
doc = json.load(open(CANVAS, encoding='utf-8'))
NODES = doc['nodeChanges']
BLOBS = doc.get('blobs', [])


def gid(g):
    return f"{g['sessionID']}:{g['localID']}"


BY = {gid(n['guid']): n for n in NODES}
KIDS = {}
for n in NODES:
    p = n.get('parentIndex')
    if p:
        KIDS.setdefault(gid(p['guid']), []).append((p['position'], gid(n['guid'])))
for k in KIDS:
    KIDS[k].sort()
FRAME_SLUG = {}
for mag, plist in PAGES.items():
    for p in plist:
        FRAME_SLUG[p['frame']] = p['slug']


# Section numbers. Each Figma edit numbers its sections (01 Introduction … 09 Contact) and prints
# them in three places: the big 'Section number', the 'Index strip' at the foot of every page and
# the 'Folio' page number. A magazine may leave pages out (e.g. a project kept in the other
# magazine only), so numbers are recomputed from the pages that remain: no gaps.
def is_named(t):
    """An active strip label: two digits, a space of some kind, then the section name."""
    return len(t) > 3 and t[:2].isdigit() and t[2].isspace()


def strip_labels(frame_id):
    """Children of a frame's 'Index strip', in order: [(node_id, text)]."""
    def find(nid):
        for _, k in KIDS.get(nid, []):
            if BY[k].get('name') == 'Index strip':
                return k
            r = find(k)
            if r:
                return r
    sid = find(frame_id)
    return [(k, BY[k]['textData']['characters']) for _, k in KIDS.get(sid, [])] if sid else []


SECTION_MAP = {}
for mag, plist in PAGES.items():
    active = set()
    for p in plist:
        active |= {t[:2] for _, t in strip_labels(p['frame']) if is_named(t)}
    SECTION_MAP[mag] = {old: f'{i + 1:02d}' for i, old in enumerate(sorted(active))}

# Where each section starts, so the strip's numbers can link there: {mag: {new number: slug}}
SECTION_START = {}
for mag, plist in PAGES.items():
    SECTION_START[mag] = {}
    for p in plist:
        for _, t in strip_labels(p['frame']):
            if is_named(t):
                SECTION_START[mag].setdefault(SECTION_MAP[mag][t[:2]], p['slug'])


def mat(n):
    t = n.get('transform') or {}
    return (t.get('m00', 1), t.get('m10', 0), t.get('m01', 0), t.get('m11', 1), t.get('m02', 0), t.get('m12', 0))


def mul(a, b):  # a ∘ b, both (a, b, c, d, e, f) like CSS matrix()
    return (a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
            a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
            a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5])


def rgba(c, extra=1.0):
    r, g, b = (round(c['r'] * 255), round(c['g'] * 255), round(c['b'] * 255))
    a = round(c.get('a', 1) * extra, 3)
    return f'#{r:02x}{g:02x}{b:02x}' if a >= 1 else f'rgba({r},{g},{b},{a})'


def lum(hexcol):
    h = hexcol.lstrip('#')
    if len(h) != 6:
        return 1
    v = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    v = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in v]
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def readable(col, bg, need):
    """Brief: text needs 4.5:1. Darken (or, on dark backgrounds, lighten) a Figma colour just
    enough to reach `need` against `bg`, keeping its hue. Returns col unchanged if it passes."""
    if not (col.startswith('#') and len(col) == 7 and bg and bg.startswith('#') and len(bg) == 7) or contrast(col, bg) >= need:
        return col
    rgb = [int(col[i:i + 2], 16) for i in (1, 3, 5)]
    to = 0 if lum(bg) > 0.18 else 255
    for step in range(1, 101):
        t = step / 100
        c = '#' + ''.join(f'{round(v + (to - v) * t):02x}' for v in rgb)
        if contrast(c, bg) >= need:
            return c
    return col


def css_paint(p, w, h):
    if p.get('visible') is False:
        return None
    op = p.get('opacity', 1)
    if p['type'] == 'SOLID':
        return rgba(p['color'], op)
    if p['type'] in ('GRADIENT_LINEAR', 'GRADIENT_RADIAL'):
        stops = ', '.join(f"{rgba(s['color'], op)} {round(s['position'] * 100, 1)}%" for s in p['stops'])
        if p['type'] == 'GRADIENT_RADIAL':
            return f'radial-gradient({stops})'
        t = p.get('transform', {})
        # Figma's gradient transform maps the box to gradient space; invert to get the direction
        a, b, c, d = t.get('m00', 1), t.get('m10', 0), t.get('m01', 0), t.get('m11', 1)
        det = a * d - b * c or 1
        dx, dy = d / det * w, -b / det * h
        ang = math.degrees(math.atan2(dx, -dy))
        return f'linear-gradient({round(ang, 1)}deg, {stops})'
    return None


# ---------------------------------------------------------------- images
os.makedirs(os.path.join(SRC, 'img', 'gen'), exist_ok=True)
IMG_DONE = {}


def export_image(paint, box_w, box_h):
    """Crop the original like Figma does, resize for the web, save WebP. Returns (path, fit)."""
    hsh = paint['image']['hash']
    mode = paint.get('imageScaleMode', 'FILL')
    t = paint.get('transform', {})
    key = (hsh, mode, round(box_w), round(box_h), json.dumps(t, sort_keys=True))
    if key in IMG_DONE:
        return IMG_DONE[key]
    im = Image.open(os.path.join(IMAGES, hsh))
    im.load()
    im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    W, H = im.size
    fit = 'cover'
    if mode == 'STRETCH':  # Figma "crop": transform maps the box to the visible part of the image
        x0, y0 = t.get('m02', 0) * W, t.get('m12', 0) * H
        x1, y1 = x0 + t.get('m00', 1) * W, y0 + t.get('m11', 1) * H
        im = im.crop((max(0, round(x0)), max(0, round(y0)), min(W, round(x1)), min(H, round(y1))))
        fit = 'fill'
    elif mode == 'FIT':
        fit = 'contain'
    else:  # FILL: cover, centred
        s = max(box_w / W, box_h / H)
        cw, ch = box_w / s, box_h / s
        x0, y0 = (W - cw) / 2, (H - ch) / 2
        im = im.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch)))
        fit = 'fill'
    # 1.15 × the Figma size covers a 1920 screen on retina; big images also cover a phone at 2×
    target = math.ceil(box_w * 1.15)
    if box_w >= 300:
        target = max(target, 760)
    target = min(target, im.width, 2400)
    if im.width > target:
        im = im.resize((target, max(1, round(im.height * target / im.width))), Image.LANCZOS)
    name = hashlib.sha1(repr(key).encode()).hexdigest()[:12] + '.webp'
    out = os.path.join(SRC, 'img', 'gen', name)
    q = 82
    while True:
        im.save(out, 'WEBP', quality=q, method=6)  # a fresh file: no EXIF or GPS carried over
        if os.path.getsize(out) < 400_000 or q <= 50:
            break
        q -= 8
    res = ('../img/gen/' + name, fit, im.size)
    IMG_DONE[key] = res
    return res


# ---------------------------------------------------------------- vectors
def blob_path(idx):
    b = bytes.fromhex(BLOBS[idx]['bytes'])
    import struct
    i, out = 0, []
    while i < len(b):
        cmd = b[i]
        i += 1
        if cmd == 0:
            out.append('Z')
            continue
        n = {1: 2, 2: 2, 3: 4, 4: 6}.get(cmd)
        if n is None:
            break
        vals = struct.unpack('<' + 'f' * n, b[i:i + 4 * n])
        i += 4 * n
        out.append({1: 'M', 2: 'L', 3: 'Q', 4: 'C'}[cmd] + ' '.join(f'{v:.2f}' for v in vals))
    return ' '.join(out)


def vector_svg(n):
    nid = gid(n['guid'])
    if nid in SVG_OVERRIDES:
        return SVG_OVERRIDES[nid]
    w, h = n['size']['x'], n['size']['y']
    paths = []
    fill = next((css_paint(p, w, h) for p in n.get('fillPaints', []) if css_paint(p, w, h)), 'none')
    for g in n.get('fillGeometry', []):
        rule = 'evenodd' if g.get('windingRule') == 'ODD' else 'nonzero'
        paths.append(f'<path d="{blob_path(g["commandsBlob"])}" fill="{fill}" fill-rule="{rule}"/>')
    stroke = next((css_paint(p, w, h) for p in n.get('strokePaints', []) if css_paint(p, w, h)), None)
    if stroke:
        for g in n.get('strokeGeometry', []):
            paths.append(f'<path d="{blob_path(g["commandsBlob"])}" fill="{stroke}"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}" width="100%" height="100%" aria-hidden="true">{"".join(paths)}</svg>'


# ---------------------------------------------------------------- text
def retext(n, chars):
    """Copy of a text node showing `chars` in the node's first-run style."""
    st = text_runs(n)[0][2]
    c = dict(n)
    for k in ('fontName', 'fontSize', 'fillPaints', 'letterSpacing', 'lineHeight', 'textCase', 'textDecoration'):
        if st.get(k) is not None:
            c[k] = st[k]
    c['textData'] = {'characters': chars}
    return c


def text_runs(n):
    td = n['textData']
    chars = td['characters']
    ids = td.get('characterStyleIDs', [])
    table = {o['styleID']: o for o in td.get('styleOverrideTable', [])}
    base = {
        'fontName': n.get('fontName'), 'fontSize': n.get('fontSize', 12), 'fillPaints': n.get('fillPaints', []),
        'letterSpacing': n.get('letterSpacing'), 'lineHeight': n.get('lineHeight'), 'textCase': n.get('textCase'),
        'textDecoration': n.get('textDecoration'), 'hyperlink': n.get('hyperlink'),
    }
    runs = []
    for i, ch in enumerate(chars):
        sid = ids[i] if i < len(ids) else 0
        st = dict(base)
        if sid in table:
            for k, v in table[sid].items():
                if k in st:
                    st[k] = v
        key = json.dumps(st, sort_keys=True)
        if runs and runs[-1][1] == key:
            runs[-1][0] += ch
        else:
            runs.append([ch, key, st])
    return runs


def style_css(st, flow=False):
    fam = st['fontName']['family']
    w, it = weight_style(st['fontName']['style'])
    size = st['fontSize']
    css = {'font-family': STACKS.get(fam, f"'{fam}', sans-serif"), 'font-weight': str(w)}
    if it:
        css['font-style'] = 'italic'
    fill = next((p for p in st['fillPaints'] if p.get('visible', True)), None)
    if fill and fill['type'] == 'SOLID':
        css['color'] = rgba(fill['color'], fill.get('opacity', 1))
    ls = st.get('letterSpacing') or {}
    if ls.get('value'):
        css['letter-spacing'] = (f"{round(ls['value'] / 100, 4)}em" if ls.get('units') == 'PERCENT' else f"{ls['value']}px")
    tc = st.get('textCase')
    if tc == 'UPPER':
        css['text-transform'] = 'uppercase'
    elif tc == 'LOWER':
        css['text-transform'] = 'lowercase'
    elif tc == 'TITLE':
        css['text-transform'] = 'capitalize'
    if st.get('textDecoration') == 'UNDERLINE':
        css['text-decoration'] = 'underline'
    css['font-size'] = f'{size}px'
    lh = st.get('lineHeight') or {}
    if lh.get('units') == 'RAW':
        css['line-height'] = str(round(lh['value'], 4))
    elif lh.get('units') == 'PIXELS':
        css['line-height'] = f"{lh['value']}px"
    elif lh.get('units') == 'PERCENT' and lh.get('value') != 100:
        css['line-height'] = str(round(lh['value'] / 100, 4))
    else:
        css['line-height'] = 'normal'
    return css


def flow_size(px):
    """Readable phone size: body text ≥ 15px, display type scaled down."""
    if px <= 16:
        return max(15, px)
    return round(min(px, 16 + (px - 16) * 0.36), 1)


def css_block(sel, props):
    body = '; '.join(f'{k}: {v}' for k, v in props.items())
    return f'{sel} {{ {body}; }}'


# ---------------------------------------------------------------- page conversion
class Page:
    def __init__(self, mag, cfg):
        # the cover is what people see first: load its images straight away; the rest lazily
        self.load_attr = ('loading="eager" fetchpriority="high"' if PAGES[mag][0] is cfg else 'loading="lazy"') + ' decoding="async"'
        self.mag, self.cfg = mag, cfg
        self.page_no = f'{PAGES[mag].index(cfg) + 1:02d}'
        self.marks, self.active_x = [], []
        self.frame = BY[cfg['frame']]
        self.cls = 'g-' + cfg['frame'].replace(':', '-')
        self.items = []      # flowable / positioned elements
        self.css = []
        self.flow_css = []
        self.fonts = set()
        self.alt_missing = []
        self.counter = 0
        self.max_text = max((n.get('fontSize', 0) for n in self.walk_nodes(cfg['frame']) if n.get('type') == 'TEXT'), default=0)
        self.h_used = False

    def walk_nodes(self, nid):
        for _, k in KIDS.get(nid, []):
            n = BY[k]
            if n.get('visible') is False:
                continue
            yield n
            yield from self.walk_nodes(k)

    def new_cls(self):
        self.counter += 1
        return f'e{self.counter}'

    def bg(self):
        for p in self.frame.get('fillPaints', []):
            c = css_paint(p, DESIGN_W, DESIGN_H)
            if c:
                return c
        return '#F2EFE8'

    # -- walk in paint order, collecting elements with absolute boxes
    def collect(self, nid, M, clip, op, desk_only):
        for _, k in KIDS.get(nid, []):
            n = BY[k]
            if n.get('visible') is False or n.get('isMask'):
                continue
            m = mul(M, mat(n))
            o = op * n.get('opacity', 1)
            name = n.get('name', '')
            d_only = desk_only or name.startswith(DESK_ONLY_NAMES)
            w, h = n['size']['x'], n['size']['y']
            box = (m[4], m[5], w, h)
            typ = n['type']
            base = dict(node=n, id=k, m=m, box=box, op=o, clip=clip, desk=d_only, z=len(self.items) + 1)
            if typ == 'TEXT':
                if name in ('Section number', 'Folio'):
                    num = self.page_no if name == 'Folio' else SECTION_MAP[self.mag].get(n['textData']['characters'].strip())
                    if num:
                        base['node'] = retext(n, num)
                self.items.append(dict(base, kind='text'))
                continue
            if name == 'Index strip':
                self.index_strip(k, m, base)
                continue
            if name == 'Index mark':
                self.marks.append(len(self.items))
            img = next((p for p in n.get('fillPaints', []) if p['type'] == 'IMAGE' and p.get('visible', True)), None)
            if img:
                self.items.append(dict(base, kind='img', paint=img))
                continue
            if typ in ('VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'LINE', 'REGULAR_POLYGON', 'INSTANCE'):
                self.items.append(dict(base, kind='svg'))
                continue
            fills = [css_paint(p, w, h) for p in n.get('fillPaints', [])]
            fills = [f for f in fills if f]
            strokes = [css_paint(p, w, h) for p in n.get('strokePaints', [])]
            strokes = [s for s in strokes if s]
            if fills or strokes or n.get('effects'):
                self.items.append(dict(base, kind='box', fills=fills, strokes=strokes, ellipse=typ == 'ELLIPSE'))
            if typ in ('FRAME', 'GROUP', 'SYMBOL', 'SECTION'):
                c2 = clip
                if typ == 'FRAME' and not n.get('frameMaskDisabled'):
                    b = (m[4], m[5], w, h, self.radius(n))
                    if c2:
                        x1, y1 = max(c2[0], b[0]), max(c2[1], b[1])
                        x2, y2 = min(c2[0] + c2[2], b[0] + b[2]), min(c2[1] + c2[3], b[1] + b[3])
                        c2 = (x1, y1, max(0, x2 - x1), max(0, y2 - y1), b[4])
                    else:
                        c2 = b
                self.collect(k, m, c2, o, d_only)

    def index_strip(self, sid, M, base):
        """Re-lay the strip for this magazine's sections, keeping Figma's type, spacing and widths."""
        kids = [(k, BY[k], mul(M, mat(BY[k]))) for _, k in KIDS.get(sid, [])]
        plain = [x for x in kids if not is_named(x[1]['textData']['characters'])]
        actives = {x[1]['textData']['characters'][:2]: x for x in kids if is_named(x[1]['textData']['characters'])}
        if not kids or not plain:
            return
        gap = kids[1][2][4] - (kids[0][2][4] + kids[0][1]['size']['x'])
        plain_w = sorted(x[1]['size']['x'] for x in plain)[len(plain) // 2]
        x = kids[0][2][4]
        smap = SECTION_MAP[self.mag]
        self.active_x = []
        for old, new in sorted(smap.items(), key=lambda kv: kv[1]):
            if old in actives:
                k, n, m = actives[old]
                label = new + n['textData']['characters'][2:]  # keep Figma's separator and name
                self.active_x.append(x)
            else:
                k, n, m = plain[0]
                label = new
            w = n['size']['x'] if old in actives else plain_w
            mm = m[:4] + (x, m[5])
            self.items.append(dict(base, node=retext(n, label), id=f'{k}-{new}', m=mm, box=(x, m[5], w, n['size']['y']),
                                   kind='text', z=len(self.items) + 1, href=SECTION_START[self.mag].get(new)))
            x += w + gap

    def place_marks(self):
        """Move each red 'Index mark' over its (renumbered) active strip label."""
        for it, x in zip(sorted((self.items[i] for i in self.marks), key=lambda it: it['box'][0]), sorted(self.active_x)):
            it['box'] = (x,) + it['box'][1:]
            it['m'] = it['m'][:4] + (x, it['m'][5])

    @staticmethod
    def radius(n):
        if n.get('rectangleCornerRadiiIndependent'):
            r = [n.get('rectangleTopLeftCornerRadius', 0), n.get('rectangleTopRightCornerRadius', 0),
                 n.get('rectangleBottomRightCornerRadius', 0), n.get('rectangleBottomLeftCornerRadius', 0)]
            return ' '.join(f'{v:g}px' for v in r) if any(r) else None
        r = n.get('cornerRadius', 0)
        return f'{r:g}px' if r else None

    # -- render one element; returns html
    def render(self, it, ox, oy):
        n, cls = it['node'], self.new_cls()
        it['cls'] = cls
        x, y, w, h = it['box']
        m = it['m']
        pos = {'left': f'{round(x - ox, 2)}px', 'top': f'{round(y - oy, 2)}px', 'z-index': str(it['z'])}
        if abs(m[1]) > 1e-3 or abs(m[2]) > 1e-3:  # rotated or flipped
            pos['transform'] = f'matrix({m[0]:.4f}, {m[1]:.4f}, {m[2]:.4f}, {m[3]:.4f}, 0, 0)'
            pos['transform-origin'] = '0 0'
        shared = {}
        if it['op'] < 0.999:
            shared['opacity'] = str(round(it['op'], 3))
        desk = ' desk-only' if it['desk'] else ''
        if (self.cfg['slug'] == 'contents' and it['kind'] == 'text' and x > 520 and abs(x - 754) > 10
                and re.fullmatch(r'\d{2}', n['textData']['characters'].strip())):
            desk = ' desk-only'  # page numbers: meaningless when swiping, every title is a link
        sel = f'.{self.cls} .{cls}'

        if it['kind'] == 'app':
            a = it['app']
            self.css.append(css_block(f'.is-canvas {sel}', dict(pos, width=f"{a['w']}px")))
            frame = f' data-app-frame="{a["frame"]}"' if a.get('frame') else ''
            return (f'<button class="abs try-app {cls}" type="button" data-app="{html.escape(a["id"])}" '
                    f'data-app-title="{html.escape(a["title"])}"{frame}>{html.escape(a["label"])}</button>')

        if it['kind'] == 'text':
            runs = text_runs(n)
            text = ''.join(r[0] for r in runs)
            if PHONE.search(text):
                runs = [[PHONE.sub('', r[0]), r[1], r[2]] for r in runs]
                if not ''.join(r[0] for r in runs).strip():
                    return ''
            first = runs[0][2]
            css = style_css(first)
            size = first['fontSize']
            need = 3 if size >= 40 else 4.5  # headline sizes count as large text
            if 'color' in css:
                css['color'] = readable(css['color'], it.get('under_bg'), need)
            self.fonts.add((first['fontName']['family'], first['fontName']['style']))
            if n.get('textAutoResize') == 'WIDTH_AND_HEIGHT':
                pos['white-space'] = 'pre'
            else:
                pos['width'] = f'{w:g}px'
                shared['white-space'] = 'pre-wrap'
            if n.get('textAlignHorizontal') in ('CENTER', 'RIGHT', 'JUSTIFIED'):
                shared['text-align'] = {'CENTER': 'center', 'RIGHT': 'right', 'JUSTIFIED': 'justify'}[n['textAlignHorizontal']]
            self.css.append(css_block(f'.is-canvas {sel}', pos))
            self.css.append(css_block(sel, dict(css, **shared)))
            fs = flow_size(size)
            flow = {'font-size': f'{fs}px', 'white-space': 'pre-wrap'}
            if css['line-height'].endswith('px'):
                flow['line-height'] = str(round(float(css['line-height'][:-2]) / size, 3))
            if it.get('backdrop'):
                flow.update({'background': it['backdrop'], 'padding': '10px 14px', 'border-radius': '6px'})
            self.flow_css.append(css_block(f'.is-flow {sel}', flow))
            inner = []
            for chunk, _, st in runs:
                if not chunk:
                    continue
                s = html.escape(chunk)
                st_css = style_css(st)
                if 'color' in st_css:
                    st_css['color'] = readable(st_css['color'], it.get('under_bg'), 3 if st['fontSize'] >= 40 else 4.5)
                diff = {k: v for k, v in st_css.items() if css.get(k) != v}
                self.fonts.add((st['fontName']['family'], st['fontName']['style']))
                if diff:
                    rc = self.new_cls()
                    self.css.append(css_block(f'{sel} .{rc}', diff))
                    if 'font-size' in diff:
                        self.flow_css.append(css_block(f'.is-flow {sel} .{rc}', {'font-size': f"{flow_size(st['fontSize'])}px"}))
                    s = f'<span class="{rc}">{s}</span>'
                link = st.get('hyperlink') or {}
                url = link.get('url')
                target = link.get('guid') and FRAME_SLUG.get(gid(link['guid']))
                if url and url.startswith('mailto:'):
                    user, dom = url[7:].split('@', 1)
                    s = f'<a class="js-email" data-u="{html.escape(user)}" data-d="{html.escape(dom)}">{html.escape(user)} [at] {html.escape(dom.replace(".", " [dot] "))}</a>'
                elif url:
                    s = f'<a href="{html.escape(url)}" target="_blank" rel="noopener noreferrer">{s}</a>'
                elif target:
                    s = f'<a href="#{target}">{s}</a>'
                inner.append(s)
            if it.get('href'):  # index strip: each number jumps to the start of its section
                inner = [f'<a class="strip-link" href="#{it["href"]}">{"".join(inner)}</a>']
            tag = 'p'
            if size >= 40 and size == self.max_text and not self.h_used:
                tag = 'h1' if self.cfg.get('h1') else 'h2'
                self.h_used = True
            return f'<{tag} class="abs {cls}{desk}">{"".join(inner)}</{tag}>'

        pos.update({'width': f'{w:g}px', 'height': f'{h:g}px'})
        r = self.radius(n)
        if r:
            shared['border-radius'] = r
        for e in n.get('effects', []):
            if e['type'] == 'DROP_SHADOW' and e.get('visible', True):
                off = e.get('offset', {'x': 0, 'y': 0})
                shared['box-shadow'] = f"{off['x']:g}px {off['y']:g}px {e.get('radius', 0):g}px {e.get('spread', 0):g}px {rgba(e['color'])}"
        strokes = [css_paint(p, w, h) for p in n.get('strokePaints', [])]
        strokes = [s for s in strokes if s]
        if strokes:
            sw = n.get('strokeWeight', 1)
            if n.get('strokeAlign') == 'OUTSIDE':
                shared['outline'] = f'{sw:g}px solid {strokes[0]}'
            else:
                shared['box-shadow'] = (shared.get('box-shadow', '') + ', ' if 'box-shadow' in shared else '') + f'inset 0 0 0 {sw:g}px {strokes[0]}'

        if it['kind'] == 'img':
            src, fit, size_px = export_image(it['paint'], w, h)
            alt = ALT.get(it['id'])
            if alt is None:
                alt = n.get('name', '')
                self.alt_missing.append({'id': it['id'], 'page': self.cfg['slug'], 'name': n.get('name'), 'src': src})
            shared['object-fit'] = {'fill': 'fill', 'contain': 'contain', 'cover': 'cover'}[fit]
            self.css.append(css_block(f'.is-canvas {sel}', pos))
            self.css.append(css_block(sel, shared))
            aspect = f'{w:g} / {h:g}'
            if w >= 560:
                fw = '100%'
            else:
                fw = f'min(100%, {max(150, round(w * 0.8))}px)'
            self.flow_css.append(css_block(f'.is-flow {sel}', {'width': fw, 'height': 'auto', 'aspect-ratio': aspect}))
            img_tag = f'<img class="abs {cls}{desk}" src="{src}" width="{size_px[0]}" height="{size_px[1]}" alt="{html.escape(alt)}" {self.load_attr}>'
            qr = re.search(r'youtu\.be/[\w-]+', n.get('name', ''))
            return img_tag

        if it['kind'] == 'svg':
            svg = vector_svg(n)
            self.css.append(css_block(f'.is-canvas {sel}', pos))
            self.css.append(css_block(sel, shared))
            self.flow_css.append(css_block(f'.is-flow {sel}', {'width': f'min(100%, {round(w * 0.8)}px)', 'height': 'auto', 'aspect-ratio': f'{w:g} / {h:g}'}))
            qr = re.search(r'youtu\.be/[\w-]+', n.get('name', ''))
            if qr:
                url = 'https://' + qr.group(0)
                return (f'<a class="abs {cls}{desk}" href="{url}" target="_blank" rel="noopener noreferrer" '
                        f'aria-label="Watch on YouTube ({qr.group(0)})">{svg}</a>')
            return f'<div class="abs {cls}{desk}" aria-hidden="true">{svg}</div>'

        # plain box (panel, rule, swatch, ellipse)
        if it.get('ellipse'):
            shared['border-radius'] = '50%'
        if it['fills']:
            shared['background'] = ', '.join(reversed(it['fills']))
        self.css.append(css_block(f'.is-canvas {sel}', pos))
        self.css.append(css_block(sel, shared))
        swatch = w <= 90 and h <= 90 and it['fills'] and abs(w - h) < 2
        if swatch:  # colour chips stay visible on phones
            self.flow_css.append(css_block(f'.is-flow {sel}', {'width': '44px', 'height': '44px', 'display': 'inline-block'}))
            return f'<span class="abs {cls}{desk}" aria-hidden="true"></span>'
        return f'<span class="abs {cls} desk-only" aria-hidden="true"></span>'

    # -- phones: reading order by recursive X/Y cuts on the element boxes
    @staticmethod
    def rows(items):
        """Read boxes row by row: boxes that overlap vertically share a row, left to right."""
        out, row, bottom = [], [], None
        for t in sorted(items, key=lambda t: t['fb'][1]):
            top, h = t['fb'][1], t['fb'][3]
            if row and top >= bottom - min(h, bottom - row[0]['fb'][1]) * 0.3:
                out.extend(sorted(row, key=lambda r: r['fb'][0]))
                row, bottom = [], None
            row.append(t)
            bottom = top + h if bottom is None else max(bottom, top + h)
        out.extend(sorted(row, key=lambda r: r['fb'][0]))
        return out

    @staticmethod
    def xy_cut(items, depth=0):
        if len(items) <= 1 or depth > 40:
            return items

        def gaps(axis, min_gap=6):
            k0, k1 = (0, 2) if axis == 'x' else (1, 3)
            srt = sorted(items, key=lambda t: t['fb'][k0])
            groups, cur, end, best = [], [srt[0]], srt[0]['fb'][k0] + srt[0]['fb'][k1], 0
            for t in srt[1:]:
                g = t['fb'][k0] - end
                if g > min_gap:
                    groups.append((cur, g))
                    cur = [t]
                else:
                    cur.append(t)
                end = max(end, t['fb'][k0] + t['fb'][k1])
            groups.append((cur, 0))
            best = max((g for _, g in groups[:-1]), default=0)
            return [c for c, _ in groups], best

        gy, by_ = gaps('y')
        if len(gy) > 2:
            # cut rows only at the widest whitespace bands; small gaps between list rows
            # would otherwise slice side-by-side columns into interleaved strips
            gy, by_ = gaps('y', max(6, by_ * 0.6))
        gx, bx = gaps('x')
        if len(gy) == 1 and len(gx) == 1:
            # boxes that only just overlap (a caption touching the next label) still read top to bottom
            gy, by_ = gaps('y', -12)
            if len(gy) == 1:
                # a full-width piece (a hero image) overlapping its neighbours blocks every cut:
                # read it first (or last, if it sits low), then cut the rest
                x0 = min(t['fb'][0] for t in items)
                x1 = max(t['fb'][0] + t['fb'][2] for t in items)
                wide = [t for t in items if t['fb'][2] >= 0.7 * (x1 - x0)]
                if wide and len(wide) < len(items):
                    t = min(wide, key=lambda t: t['fb'][1])
                    rest = [o for o in items if o is not t]
                    mid = sorted(o['fb'][1] for o in items)[len(items) // 2]
                    sub = Page.xy_cut(rest, depth + 1)
                    return [t] + sub if t['fb'][1] <= mid else sub + [t]
                return Page.rows(items)
        # magazine pages read column by column: a clean full-height gutter wins,
        # unless one "column" is just a narrow run of numbers beside a list
        # a narrow run of numbers ("01", "02") belongs with the list to its right
        merged, carry = [], []
        for g in gx:
            width = max(t['fb'][0] + t['fb'][2] for t in g) - min(t['fb'][0] for t in g)
            if width < 70 and g is not gx[-1]:
                carry += g
            else:
                merged.append(carry + g)
                carry = []
        if carry:
            merged.append(carry)
        if len(merged) > 1:
            parts = merged
        else:
            parts = gy
        if len(parts) == 1:  # number + label rows: read each row left to right
            return Page.rows(items)
        out = []
        for p in parts:
            out.extend(Page.xy_cut(p, depth + 1))
        return out

    def drop_row(self, label):
        """Remove a labelled row from a contact list and close the gap (the phone number is never shown)."""
        def txt(it):
            return it['kind'] == 'text' and it['node']['textData']['characters'].strip()
        lab = next((it for it in self.items if txt(it) == label), None)
        if not lab:
            return
        lx, ly = lab['box'][0], lab['box'][1]
        col = sorted(it['box'][1] for it in self.items if it['kind'] == 'text' and abs(it['box'][0] - lx) < 4)
        nxt = [y for y in col if y > ly + 2]
        if not nxt:
            return
        pitch, last = nxt[0] - ly, col[-1]
        lo, hi = ly - pitch * 0.4, ly + pitch * 0.6
        keep = []
        for it in self.items:
            x, y, w, h = it['box']
            if x >= lx - 40 and lo <= y < hi:
                continue
            if x >= lx - 40 and hi <= y < last + pitch * 0.6:
                it['box'] = (x, y - pitch, w, h)
                it['m'] = it['m'][:5] + (it['m'][5] - pitch,)
            keep.append(it)
        self.items = keep

    def build(self):
        self.collect(self.cfg['frame'], (1, 0, 0, 1, 0, 0), None, 1, False)
        self.place_marks()
        self.drop_row('Phone')
        # "Try the app" buttons (not in Figma): placed in clear space by tools/pages.json
        for app in self.cfg.get('apps', []):
            self.items.append(dict(node={'name': 'app'}, id='app-' + app['id'], m=(1, 0, 0, 1, app['x'], app['y']),
                                   box=(app['x'], app['y'], app['w'], 52), op=1, clip=None, desk=False,
                                   z=len(self.items) + 1, kind='app', app=app))
        bg = self.bg()
        # find what sits behind each text so light text keeps its backdrop on phones
        for i, it in enumerate(self.items):
            if it['kind'] != 'text':
                continue
            tx, ty = it['box'][0] + min(it['box'][2], 40) / 2, it['box'][1] + min(it['box'][3], 30) / 2
            behind = next((prev for prev in reversed(self.items[:i]) if prev['kind'] in ('box', 'img')
                           and prev['box'][0] <= tx <= prev['box'][0] + prev['box'][2] and prev['box'][1] <= ty <= prev['box'][1] + prev['box'][3]), None)
            if behind is None:
                it['under_bg'] = bg
            elif behind['kind'] == 'box' and behind['fills'] and behind['fills'][-1].startswith('#') and len(behind['fills'][-1]) == 7:
                it['under_bg'] = behind['fills'][-1]  # topmost fill
            fill = next((p for p in text_runs(it['node'])[0][2]['fillPaints'] if p['type'] == 'SOLID'), None)
            if not fill:
                continue
            col = rgba(fill['color'])
            if not col.startswith('#') or contrast(col, '#F2EFE8') >= 3 or contrast(col, bg if bg.startswith('#') else '#F2EFE8') >= 3:
                continue
            cx, cy = it['box'][0] + it['box'][2] / 2, it['box'][1] + min(it['box'][3], 30) / 2
            under = None
            for prev in reversed(self.items[:i]):
                x, y, w, h = prev['box']
                if prev['kind'] in ('box', 'img') and x <= cx <= x + w and y <= cy <= y + h:
                    under = prev
                    break
            if under and under['kind'] == 'box' and under['fills'] and under['fills'][0].startswith('#'):
                it['backdrop'] = under['fills'][0]
            else:
                it['backdrop'] = '#1A1916' if lum(col) > 0.4 else '#F2EFE8'

        # group by clip container so cropped images stay inside their frame on desktop
        groups = {}
        for it in self.items:
            key = it['clip'] if it['clip'] else None
            groups.setdefault(key, []).append(it)
        blocks = []
        for clip, its in groups.items():
            if clip is None:
                for it in its:
                    blocks.append(('el', it))
            else:
                blocks.append(('clip', clip, its))

        # flow boxes for reading order
        flowables = []
        for b in blocks:
            if b[0] == 'el':
                it = b[1]
                if it['desk'] or (it['kind'] == 'box' and not (it['box'][2] <= 90 and it['box'][3] <= 90)):
                    continue
                x, y, w, h = it['box']
                flowables.append({'fb': (x, y, w, h), 'block': b})
            else:
                clip = b[1]
                flowables.append({'fb': clip[:4], 'block': b})
        if os.environ.get('DEBUG_PAGE') == self.cfg['slug']:
            for f in sorted(flowables, key=lambda f: f['fb'][0]):
                b = f['block']
                label = (b[1]['node'].get('name', '') if b[0] == 'el' else 'clip')[:28]
                print('FB', [round(v) for v in f['fb']], label)
        order = self.xy_cut(flowables)
        flow_ids = {id(f['block']) for f in order}
        ordered = [f['block'] for f in order] + [b for b in blocks if id(b) not in flow_ids]

        parts = []
        for b in ordered:
            if b[0] == 'el':
                parts.append(self.render(b[1], 0, 0))
            else:
                clip, its = b[1], b[2]
                cc = self.new_cls()
                self.css.append(css_block(f'.is-canvas .{self.cls} .{cc}', {
                    'left': f'{clip[0]:g}px', 'top': f'{clip[1]:g}px', 'width': f'{clip[2]:g}px', 'height': f'{clip[3]:g}px',
                    'overflow': 'hidden', 'z-index': str(min(i['z'] for i in its)), **({'border-radius': clip[4]} if clip[4] else {})}))
                self.flow_css.append(css_block(f'.is-flow .{self.cls} .{cc}', {'display': 'flex', 'flex-direction': 'column', 'gap': '12px'}))
                inner = ''.join(self.render(i, clip[0], clip[1]) for i in sorted(its, key=lambda t: t['z']))
                only_deco = all(i['kind'] == 'box' or i['desk'] for i in its)
                parts.append(f'<div class="abs {cc}{" desk-only" if only_deco else ""}">{inner}</div>')
        title = html.escape(self.cfg['title'])
        alias = f' data-alias="{self.cfg["alias"]}"' if self.cfg.get('alias') else ''
        frag = (f'<section class="page" data-id="{self.cfg["slug"]}" data-title="{title}"{alias}>\n'
                f'  <div class="canvas {self.cls}">\n    ' + '\n    '.join(p for p in parts if p) + '\n  </div>\n</section>\n')
        self.css.insert(0, css_block(f'.canvas.{self.cls}, .is-canvas .canvas.{self.cls}', {'background': bg}))
        self.css.insert(1, css_block(f'.is-flow .page:has(> .{self.cls})', {'background': bg}))
        return frag


# ---------------------------------------------------------------- run
report = {'fonts': {}, 'alt_missing': []}
for mag, plist in PAGES.items():
    all_css = ['/* Generated by tools/convert.py from the portfolio Figma file — do not edit by hand */']
    fonts = set()
    os.makedirs(os.path.join(SRC, 'pages', 'gen', mag), exist_ok=True)
    for cfg in plist:
        if cfg.get('hand'):
            continue
        pg = Page(mag, cfg)
        frag = pg.build()
        open(os.path.join(SRC, 'pages', 'gen', mag, cfg['slug'] + '.html'), 'w', encoding='utf-8').write(frag)
        all_css.append(f'\n/* {mag} · {cfg["title"]} ({cfg["frame"]}) */')
        all_css.extend(pg.css)
        all_css.extend(pg.flow_css)
        fonts |= pg.fonts
        report['alt_missing'].extend(pg.alt_missing)
    report['fonts'][mag] = sorted(fonts)
    open(os.path.join(SRC, 'css', f'pages-gen-{mag}.css'), 'w', encoding='utf-8').write('\n'.join(all_css) + '\n')
json.dump(report, open(os.path.join(ROOT, 'tools', 'report.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print('pages done; images', len(IMG_DONE), '; alt missing', len(report['alt_missing']))
for mag, f in report['fonts'].items():
    print(mag, sorted({x[0] for x in f}))
