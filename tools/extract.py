"""Export Prototype V3 for tools/convert.py.

Usage: python tools/extract.py "path/to/NeuroAIQ Prototype V3 (standalone).html"
Renders the standalone prototype in Chromium, then writes the rendered HTML of
each page frame to tools/extract.json and every embedded image to tools/raw-assets/.
"""
import asyncio, sys, json, base64, hashlib, os
from pathlib import Path
from playwright.async_api import async_playwright
PROTO=Path(sys.argv[1]).resolve(); OUT=str(Path(__file__).resolve().parent)
os.makedirs(OUT+'/raw-assets', exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1400,'height':900})
        await pg.goto(PROTO.as_uri()); await pg.wait_for_function("document.querySelectorAll('.dv-card').length>=9"); await pg.wait_for_timeout(2500)
        imgs=await pg.evaluate('''async()=>{const out={}; for(const im of document.images){ const s=im.currentSrc||im.src; if(out[s]) continue; try{const r=await fetch(s); const bl=await r.blob(); const buf=await bl.arrayBuffer(); let bin=''; const u=new Uint8Array(buf); for(let i=0;i<u.length;i++) bin+=String.fromCharCode(u[i]); out[s]={type:bl.type, b64:btoa(bin), alt:im.alt, w:im.naturalWidth, h:im.naturalHeight}}catch(e){out[s]={err:String(e)}}} return out}''')
        mapping={}
        for src,v in imgs.items():
            if 'err' in v: print('ERR',src[:80],v['err']); continue
            ext={'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp','image/svg+xml':'svg'}.get(v['type'],'bin')
            data=base64.b64decode(v['b64']); h=hashlib.sha1(data).hexdigest()[:8]
            fn=f'img-{h}.{ext}'; open(f'{OUT}/raw-assets/{fn}','wb').write(data)
            mapping[src]={'file':fn,'alt':v['alt'],'w':v['w'],'h':v['h'],'type':v['type'],'size':len(data)}
        cards=await pg.evaluate('''()=>[...document.querySelectorAll('.dv-opt')].map(o=>({id:o.id,label:o.querySelector('.dv-olabel').innerText.replace(/\\s+/g,' ').trim(), html:o.querySelector('.dv-card').innerHTML, srcs:[...o.querySelectorAll('img')].map(i=>i.currentSrc||i.src)}))''')
        json.dump({'cards':cards,'images':mapping},open(OUT+'/extract.json','w'))
        for c in cards: print(c['id'],c['label'],len(c['html']),len(c['srcs']))
        print(len(mapping),'images', sum(v['size'] for v in mapping.values())//1024,'KB')
        await b.close()
asyncio.run(main())
