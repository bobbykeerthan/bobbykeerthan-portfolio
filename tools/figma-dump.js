// Read-only Figma plugin script (run through the Figma MCP use_figma tool).
// Dumps every frame on one page as JSON: text with styles, images (by hash +
// crop), shapes and vectors, all in frame coordinates. tools/convert.py turns
// that JSON into magazine pages. Set PAGE_ID before running.
const PAGE_ID = '__PAGE__';
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const r2 = v => Math.round(v * 100) / 100;
function paint(p) {
  if (p.visible === false) return null;
  const o = p.opacity === undefined ? 1 : r2(p.opacity);
  if (p.type === 'SOLID') return { t: 's', c: hex(p.color), o };
  if (p.type.startsWith('GRADIENT')) return { t: p.type === 'GRADIENT_LINEAR' ? 'lg' : 'rg', o, m: p.gradientTransform.map(r => r.map(r2)), st: p.gradientStops.map(s => [hex(s.color), r2(s.color.a), r2(s.position)]) };
  if (p.type === 'IMAGE') return { t: 'i', h: p.imageHash, sm: p.scaleMode, tr: p.imageTransform ? p.imageTransform.map(r => r.map(v => Math.round(v * 10000) / 10000)) : null, o };
  return null;
}
function effects(n) {
  if (!('effects' in n)) return undefined;
  const e = n.effects.filter(x => x.visible !== false).map(x => ({ t: x.type, x: x.offset ? x.offset.x : 0, y: x.offset ? x.offset.y : 0, r: x.radius, s: x.spread || 0, c: x.color ? hex(x.color) : null, a: x.color ? r2(x.color.a) : null }));
  return e.length ? e : undefined;
}
function radius(n) {
  if (!('cornerRadius' in n)) return undefined;
  if (typeof n.cornerRadius === 'number') return n.cornerRadius || undefined;
  return [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius];
}
const out = [];
const frames = page.children.filter(n => n.type === 'FRAME').sort((a, b) => a.name.localeCompare(b.name));
for (const f of frames) {
  const fx = f.absoluteTransform[0][2], fy = f.absoluteTransform[1][2];
  const nodes = [];
  async function walk(n, clip, op) {
    if (!n.visible) return;
    const m = n.absoluteTransform;
    const base = {
      id: n.id, n: n.name.slice(0, 40), w: r2(n.width), h: r2(n.height),
      m: [r2(m[0][0]), r2(m[1][0]), r2(m[0][1]), r2(m[1][1]), r2(m[0][2] - fx), r2(m[1][2] - fy)],
      op: r2(op * (n.opacity === undefined ? 1 : n.opacity)),
    };
    if (clip) base.clip = clip;
    const fills = 'fills' in n && Array.isArray(n.fills) ? n.fills.map(paint).filter(Boolean) : [];
    const strokes = 'strokes' in n && Array.isArray(n.strokes) ? n.strokes.map(paint).filter(Boolean) : [];
    if (strokes.length) { base.st = strokes; base.sw = typeof n.strokeWeight === 'number' ? n.strokeWeight : 1; base.sa = n.strokeAlign; }
    const fx2 = effects(n); if (fx2) base.fx = fx2;
    const rad = radius(n); if (rad) base.r = rad;
    if (n.blendMode && n.blendMode !== 'PASS_THROUGH' && n.blendMode !== 'NORMAL') base.bm = n.blendMode;
    if (n.type === 'TEXT') {
      const segs = n.getStyledTextSegments(['fontName', 'fontSize', 'fills', 'letterSpacing', 'lineHeight', 'textCase', 'textDecoration', 'hyperlink', 'listOptions', 'indentation', 'paragraphSpacing']);
      nodes.push(Object.assign(base, {
        k: 'text', ah: n.textAlignHorizontal, av: n.textAlignVertical, ar: n.textAutoResize, tr: n.textTruncation === 'ENDING' ? 1 : undefined,
        sg: segs.map(s => ({
          x: s.characters, f: s.fontName.family, s: s.fontName.style, z: s.fontSize,
          c: s.fills[0] && s.fills[0].color ? hex(s.fills[0].color) : null, co: s.fills[0] && s.fills[0].opacity !== undefined ? r2(s.fills[0].opacity) : 1,
          ls: s.letterSpacing.unit === 'PERCENT' ? r2(s.letterSpacing.value) + '%' : r2(s.letterSpacing.value),
          lh: s.lineHeight.unit === 'AUTO' ? 'a' : s.lineHeight.unit === 'PERCENT' ? r2(s.lineHeight.value) + '%' : r2(s.lineHeight.value),
          tc: s.textCase !== 'ORIGINAL' ? s.textCase : undefined, td: s.textDecoration !== 'NONE' ? s.textDecoration : undefined,
          hl: s.hyperlink ? s.hyperlink : undefined, li: s.listOptions && s.listOptions.type !== 'NONE' ? s.listOptions.type : undefined,
          ps: s.paragraphSpacing || undefined,
        })),
      }));
      return;
    }
    const img = fills.find(p => p.t === 'i');
    if (img) { nodes.push(Object.assign(base, { k: 'img', fl: fills })); return; }
    if (['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE', 'INSTANCE'].includes(n.type) || (n.type === 'ELLIPSE')) {
      let svg = null;
      try { svg = await n.exportAsync({ format: 'SVG_STRING' }); } catch (e) { svg = null; }
      nodes.push(Object.assign(base, { k: 'svg', svg }));
      return;
    }
    if (fills.length || strokes.length || fx2) nodes.push(Object.assign({}, base, { k: 'box', fl: fills }));
    if ('children' in n) {
      let c2 = clip;
      if (n.clipsContent && n !== f) {
        const b = { x: r2(m[0][2] - fx), y: r2(m[1][2] - fy), w: r2(n.width), h: r2(n.height), r: rad };
        if (c2) {
          const x1 = Math.max(c2.x, b.x), y1 = Math.max(c2.y, b.y), x2 = Math.min(c2.x + c2.w, b.x + b.w), y2 = Math.min(c2.y + c2.h, b.y + b.h);
          c2 = { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1), r: b.r };
        } else c2 = b;
      }
      const childOp = n === f ? 1 : base.op;
      for (const c of n.children) await walk(c, c2, childOp);
    }
  }
  const bg = f.fills.map(paint).filter(Boolean);
  for (const c of f.children) await walk(c, null, 1);
  out.push({ id: f.id, name: f.name, w: f.width, h: f.height, bg, nodes });
}
return JSON.stringify({ page: PAGE_ID, frames: out });
