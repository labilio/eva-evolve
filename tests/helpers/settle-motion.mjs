// Geometry and next-popup assertions must observe the completed native transition.
// Keep exact geometry assertions; never disable production motion for the tests.
export async function settleMotion(page) {
 await page.evaluate(async()=>{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));
 });
}
