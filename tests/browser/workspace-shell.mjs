import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { unzlibSync } from 'fflate';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';

let server, browser, page, origin;
before(async () => {
  server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  page = await context.newPage();
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

// Decode browser PNG pixels, including PNG scanline filters; no image editing or golden-file tolerance.
function pixels(png) {
  let width, height, channels, chunks=[];
  for(let offset=8;offset<png.length;) {
    const length=png.readUInt32BE(offset), type=png.toString('ascii',offset+4,offset+8), data=png.subarray(offset+8,offset+8+length);
    if(type==='IHDR') {
      width=data.readUInt32BE(0);height=data.readUInt32BE(4);
      assert.equal(data[8],8);assert.equal(data[12],0);
      channels=({2:3,6:4})[data[9]];assert.ok(channels,'PNG must be RGB or RGBA');
    }
    if(type==='IDAT') chunks.push(data);
    offset+=length+12;
  }
  const raw=unzlibSync(Buffer.concat(chunks)), stride=width*channels, out=new Uint8Array(height*stride);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++) {
    const filter=raw[y*(stride+1)];assert.ok(filter<=4);
    for(let x=0;x<stride;x++) {
      const i=y*stride+x,a=x>=channels?out[i-channels]:0,b=y?out[i-stride]:0,c=y&&x>=channels?out[i-stride-channels]:0;
      out[i]=(raw[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;
    }
  }
  return (x,y)=>Array.from(out.subarray((y*width+x)*channels,(y*width+x)*channels+3));
}
const routes=[
  ['/guid','.eva-personal-sider-panel'],
  ['/messages?evaIM=my-ai','.eva-ai-team__sidebar'],
  ['/messages','.ch-list'],
  ['/drive','.eva-drive__header'],
  ['/contacts','.eva-contacts__main-head'],
  ['/eva-stub/工作板','.eva-feature-head'],
  ['/eva-stub/技能','.eva-connection-center__head'],
  ['/collab','.eva-page-header'],
  ['/eva-stub/站点','.eva-page-header'],
  ['/scheduled','.eva-page-header'],
  ['/eva-stub/数字员工','.eva-digital-center__head'],
];
test('All level-one pages share the same actually painted workspace boundary',async()=>{
  for(const width of [1200,1000]) {
    await page.setViewportSize({width,height:800});
    for(const [route,selector] of routes) {
      await page.goto(`${origin}/#${route}`);
      await page.locator(selector).first().waitFor({state:'visible'});
      await verifyExposedBackdrop();
    }
  }
});
test('The paint gate rejects broken clipping even when CSS radius remains correct',async()=>{
  await page.goto(`${origin}/#/messages?evaIM=my-ai`);
  await page.locator('.eva-ai-team__sidebar').waitFor();
  const style=await page.addStyleTag({content:'.layout-content{mask-image:none!important;overflow:visible!important;isolation:auto!important}'});
  try {
    assert.equal(await page.locator('.layout-content').evaluate(el=>getComputedStyle(el).borderRadius),'16px');
    await assert.rejects(verifyExposedBackdrop,{name:'AssertionError'});
  } finally {await style.evaluate(el=>el.remove());}
  await verifyExposedBackdrop();
});

async function verifyFrame(selector='.layout-content') {
  const actual=await page.locator(selector).evaluate(el=>{const s=getComputedStyle(el);return {border:s.borderWidth,color:s.borderColor,radius:s.borderRadius,overflow:s.overflow,mask:s.maskImage,after:getComputedStyle(el,'::after').content};});
  assert.deepEqual(actual,{border:'1px',color:'rgb(219, 219, 219)',radius:'16px',overflow:'hidden',mask:'none',after:'none'});
  const style=await page.addStyleTag({content:`${selector}{border-color:rgb(255,0,255)!important}`});
  try {
    const r=await page.locator(selector).boundingBox();
    for(const y of [r.y,r.y+r.height-20]) {
      const pixel=pixels(await page.screenshot({clip:{x:r.x,y,width:20,height:20}}));
      let visible=0;
      for(let py=0;py<20;py++)for(let px=0;px<20;px++){const [red,green,blue]=pixel(px,py);if(red>220&&blue>220&&green<180)visible++;}
      assert.ok(visible>=10,'Native border arcs must remain visible');
    }
  } finally {await style.evaluate(el=>el.remove());}
}
test('Every module and navigation use one visible native border without overlay frames',async()=>{
  for(const [route,selector] of routes){await page.goto(`${origin}/#${route}`);await page.locator(selector).first().waitFor();await verifyFrame();await verifyFrame('.layout-sider');}
});
async function verifyExposedBackdrop() {
  const style=await page.addStyleTag({content:'.app-shell,body,html{background:rgb(255,0,0)!important}'});
  try {
    for(const selector of ['.layout-sider','.layout-content']) {
      const r=await page.locator(selector).boundingBox();
      for(const [x,y,px,py] of [[r.x,r.y,2,2],[r.x+r.width-20,r.y,17,2],[r.x,r.y+r.height-20,2,17],[r.x+r.width-20,r.y+r.height-20,17,17]]) {
        const pixel=pixels(await page.screenshot({clip:{x,y,width:20,height:20}}));
        assert.deepEqual(pixel(px,py),[255,0,0],page.url()+' '+selector+' '+x+','+y+' Only the shared backdrop may appear outside either shell; no rectangular surface bleed');
      }
    }
  } finally {await style.evaluate(el=>el.remove());}
}
test('Actual filtered surfaces leave no rectangular backing outside rounded shells',async()=>{
  for(const [route,selector] of routes) {
    await page.goto(`${origin}/#${route}`);
    await page.locator(selector).first().waitFor({state:'visible'});
    await verifyExposedBackdrop();
  }
  await page.goto(`${origin}/#/messages`);
  await page.locator('.eva-rail-header').waitFor();
  const fault=await page.addStyleTag({content:'.layout-content{overflow:visible!important;border-radius:0!important}'});
  try {await assert.rejects(verifyExposedBackdrop,{name:'AssertionError'});}
  finally {await fault.evaluate(el=>el.remove());}
  await verifyExposedBackdrop();
});
