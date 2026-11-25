// Prueba de la pelea online: dos navegadores se conectan directo (WebRTC); Firestore se reemplaza por una memoria local
// (sólo sirve para pasarse los datos de conexión). Uno crea la sala, el otro se une con el código y pelean.
// Uso: node tools/online.js
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const errs = [], store = new Map();
  await ctx.exposeFunction('sigPut', (code, fields) => { store.set(code, { ...(store.get(code) || {}), ...fields }); });
  await ctx.exposeFunction('sigGet', code => store.get(code) || null);
  await ctx.exposeFunction('sigDel', code => { store.delete(code); });
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
    await p.evaluate(() => { FIREBASE.apiKey = 'prueba'; FIREBASE.projectId = 'prueba'; SIGNAL.put = (c, f) => window.sigPut(c, f); SIGNAL.get = c => window.sigGet(c); SIGNAL.del = c => window.sigDel(c); CTL = 'joy'; });
    return p; };
  const A = await open(), B = await open();
  // A crea la sala con Fuego; B se une con Agua
  await A.click('#netBtn'); await A.click('#netEls button[data-el="fuego"]'); await A.click('#netCreate');
  await A.waitForFunction(() => /^[A-Z]{4}$/.test(document.getElementById('netCode').textContent), null, { timeout: 10000 });
  const code = await A.textContent('#netCode'), saved = store.has(code);
  await B.click('#netBtn'); await B.click('#netEls button[data-el="agua"]'); await B.fill('#netIn', code.toLowerCase()); await B.click('#netJoin');
  for (const p of [A, B]) await p.waitForFunction(() => scene === 'duel' && G && G.phase === 'fight', null, { timeout: 20000 });
  const els = { A: await A.evaluate(() => [G.me.el, G.foe.el]), B: await B.evaluate(() => [G.me.el, G.foe.el]) }, roomGone = !store.has(code);
  // A camina a su izquierda: B lo ve a su derecha (cada uno se ve abajo)
  await A.evaluate(() => { G.me.x = ARENA_W * 0.2; G.me.y = ARENA_D * 0.7; }); await A.waitForTimeout(700);
  const seen = await B.evaluate(() => ({ x: G.foe.x / ARENA_W, y: G.foe.y / ARENA_D }));
  // A lanza una bola de fuego a B: B la recibe, le baja la vida (la cuenta B) y A ve esa vida
  await A.evaluate(() => { G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.75; }); await B.evaluate(() => { G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.75; G.me.shield = 0; }); await A.waitForTimeout(700);
  await A.evaluate(() => { const c = G.me.nodes[G.me.ix.upper], f = G.foe.nodes[G.foe.ix.upper], o = newOrb('fire', c.x, c.y - 20), dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy); G.orbs.push(o); launch(o, dx / d * 700, dy / d * 700, G.me); });
  await A.waitForTimeout(1500);
  const hit = { B: await B.evaluate(() => G.me.hp), Asees: await A.evaluate(() => G.foe.hp) };
  // B (agua) guarda una burbuja: A la ve a su costado
  await B.evaluate(() => giveBubble(G.me, 2)); await B.waitForTimeout(500);
  const bubble = await A.evaluate(() => G.orbs.filter(o => o.net && o.k === 'water' && o.docked).map(o => o.lvl));
  // A lanza una llamarada a B: B la ve y le hace daño
  const hpB0 = await B.evaluate(() => G.me.hp);
  await A.evaluate(() => { startBeam(null, G.me, performance.now() + 900, G.me.ix.arms[0], 'fire'); }); await A.waitForTimeout(400);
  const beamSeen = await B.evaluate(() => G.beams.some(b => b.net && b.k === 'fire')); await A.waitForTimeout(1300);
  const beamDmg = hpB0 - await B.evaluate(() => G.me.hp);
  // A sale: B vuelve a la pantalla de elegir
  await A.click('#btnBack'); await B.waitForTimeout(2500);
  const left = await B.evaluate(() => ({ scene, net: NET.on }));
  const res = { code, saved, els, roomGone, seen: { x: seen.x.toFixed(2), y: seen.y.toFixed(2) }, hit, bubble, beamSeen, beamDmg: beamDmg.toFixed(1), left };
  console.log(res);
  if (!saved) errs.push('no se guardó la sala en Firebase');
  if (!(els.A[0] === 'fuego' && els.A[1] === 'agua' && els.B[0] === 'agua' && els.B[1] === 'fuego')) errs.push('los elementos no llegaron: ' + JSON.stringify(els));
  if (!roomGone) errs.push('la sala no se borró de Firebase al conectarse');
  if (!(seen.x > 0.7 && seen.y < 0.4)) errs.push('B no vio a A donde corresponde (girado media vuelta): ' + JSON.stringify(seen));
  if (!(hit.B < 100 && Math.abs(hit.Asees - hit.B) < 1)) errs.push('la bola de fuego no dañó a B o A no vio su vida: ' + JSON.stringify(hit));
  if (!(bubble.length === 1 && bubble[0] === 2)) errs.push('A no ve la burbuja de B: ' + JSON.stringify(bubble));
  if (!beamSeen || !(beamDmg > 2)) errs.push('B no vio o no recibió la llamarada de A');
  if (!(left.scene === 'pick' && !left.net)) errs.push('B no volvió al salir A: ' + JSON.stringify(left));
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors'); await b.close();
})();
