import json, sys
sys.stdout.reconfigure(encoding='utf-8')
canvas, fid = sys.argv[1], sys.argv[2]
depth_max = int(sys.argv[3]) if len(sys.argv) > 3 else 99
m=json.load(open(canvas,encoding='utf-8'));N=m['nodeChanges']
gid=lambda g: f"{g['sessionID']}:{g['localID']}"
by={gid(n['guid']):n for n in N}
kids={}
for n in N:
    p=n.get('parentIndex')
    if p: kids.setdefault(gid(p['guid']),[]).append((p['position'],gid(n['guid'])))
for k in kids: kids[k].sort()
def hexc(c, o=1): 
    a=round(c.get('a',1)*o,2); h='#%02x%02x%02x'%tuple(round(c[k]*255) for k in 'rgb'); return h if a>=1 else f'{h}@{a}'
def fills(n, key='fillPaints'):
    out=[]
    for p in n.get(key,[]):
        if p.get('visible') is False: continue
        if p['type']=='SOLID': out.append(hexc(p['color'],p.get('opacity',1)))
        elif p['type']=='IMAGE': out.append('IMG')
        else: out.append(p['type'][:6]+'('+','.join(hexc(s['color']) for s in p.get('stops',[]))+')')
    return out
def walk(k, ox, oy, d):
    for _,c in kids.get(k,[]):
        n=by[c]
        if n.get('visible') is False: continue
        t=n.get('transform',{}); x=ox+t.get('m02',0); y=oy+t.get('m12',0)
        w,h=n['size']['x'],n['size']['y']
        s=f"{'  '*d}{n['type'][:4]} {round(x)},{round(y)} {round(w)}x{round(h)}"
        f=fills(n); 
        if f and n['type']!='TEXT': s+=' bg='+'+'.join(f)
        st=fills(n,'strokePaints')
        if st: s+=f" bd={'+'.join(st)}/{n.get('strokeWeight',1):g}"
        r=n.get('cornerRadius')
        if r: s+=f' r={r:g}'
        if n.get('stackMode'): s+=f" AL={n['stackMode'][0]} gap{n.get('stackSpacing',0):g} p{n.get('stackVerticalPadding',0):g},{n.get('stackHorizontalPadding',0):g}"
        if n['type']=='TEXT':
            fn=n.get('fontName',{}); col=fills(n)
            s+=f" [{fn.get('family','')[:8]} {fn.get('style','')} {n.get('fontSize',0):g} {col[0] if col else ''}] {json.dumps(n['textData']['characters'][:90],ensure_ascii=False)}"
            print(s); continue
        if n['type'] in ('VECTOR','BOOLEAN_OPERATION','INSTANCE','ELLIPSE','LINE','STAR'):
            s+=f" '{n.get('name','')[:24]}'"
            print(s); continue
        s+=f" '{n.get('name','')[:24]}'"
        print(s)
        if d < depth_max: walk(c, x, y, d+1)
walk(fid, 0, 0, 0)
