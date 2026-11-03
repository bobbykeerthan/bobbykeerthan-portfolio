"""Flatten a .fig frame with component instances resolved (overrides, component
properties, derived auto-layout sizes). Prints one line per visible node."""
import json, sys
sys.stdout.reconfigure(encoding='utf-8')
canvas, fid = sys.argv[1], sys.argv[2]
m = json.load(open(canvas, encoding='utf-8')); N = m['nodeChanges']
gid = lambda g: f"{g['sessionID']}:{g['localID']}"
BY = {gid(n['guid']): n for n in N}
KIDS = {}
for n in N:
    p = n.get('parentIndex')
    if p: KIDS.setdefault(gid(p['guid']), []).append((p['position'], gid(n['guid'])))
for k in KIDS: KIDS[k].sort()

def hexc(c, o=1):
    a = round(c.get('a', 1) * o, 2); h = '#%02x%02x%02x' % tuple(round(c[k] * 255) for k in 'rgb')
    return h if a >= 1 else f'{h}@{a}'
def paints(lst):
    out = []
    for p in lst or []:
        if p.get('visible') is False: continue
        if p['type'] == 'SOLID': out.append(hexc(p['color'], p.get('opacity', 1)))
        elif p['type'] == 'IMAGE': out.append('IMG')
        else: out.append(p['type'][:6])
    return out

def styled(n, props):
    """Apply shared styles (text, fill, stroke) the node or its overrides point to."""
    out = dict(props)
    sid = props.get('styleIdForText', n.get('styleIdForText'))
    if sid and 'guid' in sid and gid(sid['guid']) in BY:
        st = BY[gid(sid['guid'])]
        for k in ('fontName', 'fontSize', 'lineHeight', 'letterSpacing', 'textCase'):
            if k in st: out.setdefault(k, st[k])
    for key, tgt in (('styleIdForFill', 'fillPaints'), ('styleIdForStrokeFill', 'strokePaints')):
        sid = props.get(key, n.get(key))
        if sid and 'guid' in sid and gid(sid['guid']) in BY and 'fillPaints' in BY[gid(sid['guid'])]:
            out[tgt] = BY[gid(sid['guid'])]['fillPaints']
    return out

def emit(n, props, x, y, d, path):
    props = styled(n, props)
    typ = n['type']; w, h = props.get('size', n['size'])['x'], props.get('size', n['size'])['y']
    s = f"{'  ' * d}{typ[:4]} {round(x)},{round(y)} {round(w)}x{round(h)}"
    f = paints(props.get('fillPaints', n.get('fillPaints')))
    if f and typ != 'TEXT': s += ' bg=' + '+'.join(f)
    st = paints(props.get('strokePaints', n.get('strokePaints')))
    if st: s += f" bd={'+'.join(st)}/{props.get('strokeWeight', n.get('strokeWeight', 1)):g}"
    r = props.get('cornerRadius', n.get('cornerRadius'))
    if r: s += f' r={r:g}'
    if typ == 'TEXT':
        fn = props.get('fontName', n.get('fontName', {})); col = paints(props.get('fillPaints', n.get('fillPaints')))
        td = props.get('textData', n.get('textData', {}))
        lh = props.get('lineHeight', n.get('lineHeight', {}))
        lhs = f"/{lh['value']:g}" if lh.get('units') == 'PIXELS' else ''
        s += f" [{fn.get('family','')[:7]} {fn.get('style','')} {props.get('fontSize', n.get('fontSize', 0)):g}{lhs} {col[0] if col else ''}] {json.dumps(td.get('characters',''), ensure_ascii=False)}"
    else:
        s += f" '{props.get('_name', n.get('name',''))[:26]}'"
    print(s)

def walk(nid, ox, oy, d, ctx):
    """ctx: dict with overrides {path: props}, assign {defID: value}, derived {path: entry}, prefix path tuple"""
    for _, c in KIDS.get(nid, []):
        n = BY[c]
        path = ctx['prefix'] + (c,)
        props = dict(ctx['overrides'].get(path, {}))
        der = ctx['derived'].get(path, {})
        for k in ('size', 'transform'):
            if k in der: props[k] = der[k]
        # component property references (text, visibility, swaps)
        vis = props.get('visible', n.get('visible', True))
        for ref in n.get('componentPropRefs', []):
            val = ctx['assign'].get(gid(ref['defID']))
            if val is None: continue
            fld = ref.get('componentPropNodeField')
            if fld == 'TEXT_DATA' and 'textValue' in val: props['textData'] = val['textValue']
            elif fld == 'VISIBLE' and 'boolValue' in val: vis = val['boolValue']
            elif fld == 'OVERRIDDEN_SYMBOL_ID' and 'guidValue' in val: props['overriddenSymbolID'] = val['guidValue']
        if vis is False: continue
        if n['type'] == 'INSTANCE' and props.get('overriddenSymbolID'):
            # a swapped variant takes its look (fill, stroke, radius) from the new component
            swap = BY.get(gid(props['overriddenSymbolID']), {})
            if swap.get('name'): props['_name'] = swap['name']
            for k in ('fillPaints', 'strokePaints', 'styleIdForFill', 'styleIdForStrokeFill', 'cornerRadius', 'strokeWeight'):
                if k in swap: props.setdefault(k, swap[k])
        t = props.get('transform', n.get('transform', {}))
        x, y = ox + t.get('m02', 0), oy + t.get('m12', 0)
        emit(n, props, x, y, d, path)
        if n['type'] == 'INSTANCE':
            sd = n.get('symbolData', {})
            sym = gid(props.get('overriddenSymbolID') or sd.get('overriddenSymbolID') or sd['symbolID'])
            # nested instance: its own overrides are relative to itself
            ov = dict(ctx['overrides']); asg = dict(ctx['assign'])
            own = {}
            for o in sd.get('symbolOverrides', []):  # several overrides can target one layer: combine them
                key = path + tuple(gid(g) for g in o['guidPath']['guids'])
                own.setdefault(key, {}).update({k: v for k, v in o.items() if k != 'guidPath'})
            for key, o in own.items():  # overrides from outer instances win over this symbol's own
                merged = dict(o); merged.update(ov.get(key, {}))
                ov[key] = merged
            # per-instance values (from the override) win over the instance's defaults
            for a in props.get('componentPropAssignments', []) + n.get('componentPropAssignments', []):
                if gid(a['defID']) not in asg or a in props.get('componentPropAssignments', []):
                    asg[gid(a['defID'])] = a.get('value')
            der2 = dict(ctx['derived'])
            for e in n.get('derivedSymbolData', []):
                key = path + tuple(gid(g) for g in e['guidPath']['guids'])
                der2.setdefault(key, e)
            # overrides addressed to the instance's own guid path apply to the symbol's children
            walk(sym, x, y, d + 1, {'overrides': ov, 'assign': asg, 'derived': der2, 'prefix': path})
        elif 'children' in n or KIDS.get(c):
            # override paths only list instance boundaries, so plain frames keep the prefix
            walk(c, x, y, d + 1, ctx)

def top_instance_ctx():
    return {'overrides': {}, 'assign': {}, 'derived': {}, 'prefix': ()}
walk(fid, 0, 0, 0, top_instance_ctx())
