// Prueba de la llamarada (fuego), la ráfaga (aire) y el chorro (agua): deslizar rápido hacia el rival y mantener el dedo.
// Pierden intensidad y alcance; el agua necesita su burbuja guardada y la gasta (más grande, dura más).
// Uso: node tools/beam.js
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ ...devices['iPhone 13'] });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
  const c = await p.context().newCDPSession(p), t = (type, pts) => c.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const start = async el => {
    await p.evaluate(el => { if (G) document.getElementById('btnBack').click(); document.querySelector(`.elbtn[data-el="${el}"]`).click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foe.wait = 99; G.foeTest = false; G.foe.el = 'tierra'; G.orbs = G.orbs.filter(o => o.owner !== G.foe); G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.5; G.foe.x = ARENA_W * 0.5; G.foe.y = ARENA_D * 0.25; G.foe.home = { x: G.foe.x, y: G.foe.y }; }, el);
    await p.waitForTimeout(600);
  };
  const swipe = async (dir) => { // deslizar rápido hacia el rival (desde donde sale el ataque: la mano o la burbuja) o en la dirección dada
    const u = dir || await p.evaluate(() => { const o = G.orbs.find(o => o.docked && o.owner === G.me) || G.me.nodes[G.me.ix.upper], f = G.foe.nodes[G.foe.ix.upper], dx = f.x - o.x, dy = f.y + 4 * G.foe.s - o.y, d = Math.hypot(dx, dy); return { x: dx / d, y: dy / d }; });
    await t('touchStart', [{ x: 200, y: 640 }]); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', [{ x: 200 + u.x * i * 60, y: 640 + u.y * i * 60 }]); await p.waitForTimeout(8); } };
  const reach = () => p.evaluate(() => { const bm = G.beams.find(x => x.on); if (!bm) return 0; return Math.max(0, ...bm.parts.map(q => Math.hypot(q.vx, q.vy))) * BEAM.life; }); // alcance = rapidez de las llamas nuevas × su vida
  const res = {};

  // fuego: llamarada que se mantiene, daña y pierde alcance
  await start('fuego');
  let hp0 = await p.evaluate(() => G.foe.hp);
  await swipe(); await p.waitForTimeout(450);
  res.fireOn = await p.evaluate(() => G.beams.filter(x => x.on).length); const r1 = await reach();
  await p.waitForTimeout(1300); const r2 = await reach(); res.breath = await p.evaluate(() => G.me.breath.toFixed(2));
  await t('touchEnd', []); await p.waitForTimeout(500);
  res.fireOff = await p.evaluate(() => G.beams.filter(x => x.on).length); res.fireDmg = (hp0 - await p.evaluate(() => G.foe.hp)).toFixed(1); res.reach = [r1.toFixed(0), r2.toFixed(0)];
  if (res.fireOn !== 1) errs.push('fuego: no salió la llamarada');
  if (!(r2 < r1 * 0.8)) errs.push('fuego: el alcance no disminuyó');
  if (res.fireOff !== 0) errs.push('fuego: no se cortó al soltar');
  if (!(res.fireDmg > 3)) errs.push('fuego: no dañó');
  await p.waitForTimeout(1500); res.regen = await p.evaluate(() => G.me.breath.toFixed(2));
  if (!(+res.regen > +res.breath)) errs.push('fuego: el aliento no se recupera');
  // fuego: deslizar y soltar sin bolas guardadas = llamarada corta
  await p.evaluate(() => { G.me.breath = 1; }); await swipe(); await t('touchEnd', []); await p.waitForTimeout(100);
  res.burst = await p.evaluate(() => G.beams.filter(x => x.on).length); await p.waitForTimeout(700);
  res.burstEnd = await p.evaluate(() => G.beams.filter(x => x.on).length);
  if (res.burst !== 1 || res.burstEnd !== 0) errs.push('fuego: la llamarada corta no funcionó');

  // aire: ráfaga que daña y empuja
  await start('aire');
  hp0 = await p.evaluate(() => G.foe.hp); const fy0 = await p.evaluate(() => G.foe.y);
  await swipe(); await p.waitForTimeout(1600); await t('touchEnd', []); await p.waitForTimeout(400);
  res.airDmg = (hp0 - await p.evaluate(() => G.foe.hp)).toFixed(1); res.airPush = (fy0 - await p.evaluate(() => G.foe.y)).toFixed(0);
  if (!(res.airDmg > 1)) errs.push('aire: la ráfaga no dañó');
  if (!(res.airPush > 10)) errs.push('aire: la ráfaga no empujó');

  // agua: sin burbuja no hay chorro; con burbuja la gasta, y más grande dura más
  await start('agua');
  await swipe(); await p.waitForTimeout(500); res.noBubble = await p.evaluate(() => G.beams.length); await t('touchEnd', []); await p.waitForTimeout(200);
  if (res.noBubble !== 0) errs.push('agua: salió el chorro sin burbuja');
  const waterDur = async lvl => {
    await p.evaluate(lvl => { const c = G.me.nodes[G.me.ix.upper]; G.orbs = [{ k: 'water', x: c.x + 30, y: c.y, vx: 0, vy: 0, t: 0, life: 1, docked: true, owner: G.me, lvl, side: 1 }]; G.foe.hp = HP_MAX; }, lvl);
    await p.waitForTimeout(200); hp0 = await p.evaluate(() => G.foe.hp);
    await swipe(); const t0 = Date.now(); await p.waitForTimeout(400);
    const on = await p.evaluate(() => G.beams.filter(x => x.on).length);
    await p.waitForFunction(() => !G.beams.some(x => x.on), null, { timeout: 8000 }).catch(() => errs.push('agua: el chorro no se acabó'));
    const d = (Date.now() - t0) / 1000; await t('touchEnd', []); await p.waitForTimeout(300);
    return { on, d: d.toFixed(1), left: await p.evaluate(() => G.orbs.filter(o => o.docked).length), dmg: (hp0 - await p.evaluate(() => G.foe.hp)).toFixed(1) };
  };
  res.w1 = await waterDur(1); res.w3 = await waterDur(3);
  if (res.w1.on !== 1 || res.w3.on !== 1) errs.push('agua: no salió el chorro');
  if (res.w1.left || res.w3.left) errs.push('agua: la burbuja no se gastó');
  if (!(res.w3.d > res.w1.d * 1.8)) errs.push('agua: la burbuja grande no duró más');
  if (!(res.w3.dmg > 3)) errs.push('agua: el chorro no dañó');
  // disparar hacia el lado te impulsa hacia el otro lado: aire más que fuego; hacia el rival, no
  const hop = {}; const recoil = async (el, u) => { await start(el); const x0 = await p.evaluate(() => G.me.x); await swipe(u);
    const r = await p.evaluate(() => new Promise(res => { let z = 0, sl = 0; const t0 = performance.now(); const f = () => { z = Math.max(z, G.me.z); if (G.me.slide > 0 && G.me.z === 0) sl++; if (performance.now() - t0 < 700) setTimeout(f, 16); else res({ z, sl }); }; f(); }));
    hop[el + (u ? 'Lado' : 'Adelante')] = r; const x1 = await p.evaluate(() => G.me.x); await t('touchEnd', []); await p.waitForTimeout(400); return x1 - x0; };
  res.recoil = { fuego: (await recoil('fuego', { x: 1, y: 0 })).toFixed(0), aire: (await recoil('aire', { x: 1, y: 0 })).toFixed(0), aireAdelante: (await recoil('aire')).toFixed(0) };
  if (!(res.recoil.fuego < -15)) errs.push('fuego: disparar hacia el lado no lo impulsó');
  if (!(+res.recoil.aire < +res.recoil.fuego * 1.4)) errs.push('aire: no impulsó más que el fuego');
  if (!(hop.aireAdelante && hop.aireAdelante.z > 4 && hop.aireAdelante.sl > 3)) errs.push('aire: disparar hacia el rival debía impulsarlo (saltito y deslizamiento)');
  res.hop = hop; if (!(hop.fuegoLado.z > 4 && hop.aireLado.z > 4 && hop.fuegoLado.sl > 3)) errs.push('al impulsarse no dio el saltito o no se deslizó: ' + JSON.stringify(hop));
  // con una llamarada ya en uso, una segunda hacia adelante (otro dedo) sí te impulsa (hacia atrás)
  const two = async (both) => { await start('fuego'); await p.evaluate(() => { G.foe.y = ARENA_D * 0.15; G.me.y = ARENA_D * 0.55; }); await p.waitForTimeout(300); const y0 = await p.evaluate(() => G.me.y);
    await t('touchStart', [{ x: 120, y: 640, id: 1 }]); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', [{ x: 120, y: 640 - i * 60, id: 1 }]); await p.waitForTimeout(8); }
    await p.waitForTimeout(250);
    if (both) { await t('touchStart', [{ x: 120, y: 460, id: 1 }, { x: 280, y: 640, id: 2 }]); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', [{ x: 120, y: 460, id: 1 }, { x: 280, y: 640 - i * 60, id: 2 }]); await p.waitForTimeout(8); } }
    await p.waitForTimeout(700); const r = { n: await p.evaluate(() => G.beams.filter(b => b.on && b.owner === G.me).length), dy: (await p.evaluate(() => G.me.y) - y0).toFixed(0) };
    await t('touchEnd', []); await p.waitForTimeout(500); return r; };
  res.one = await two(false); res.two = await two(true);
  if (!(res.one.dy > 15)) errs.push('una llamarada hacia adelante (una mano) debía impulsarte hacia atrás: ' + JSON.stringify(res.one));
  if (!(res.two.n === 2 && res.two.dy > 15)) errs.push('la segunda llamarada hacia adelante no te impulsó: ' + JSON.stringify(res.two));
  // rival de prueba: lanza fuego, agua y aire de corrido
  await start('tierra'); await p.evaluate(() => { G.foeTest = true; G.foe.cyT = 0; });
  await p.evaluate(() => { G.me.hp = 1e9; }); const kinds = new Set(), thrown = new Set(); let boulder = false; for (let i = 0; i < 110; i++) { await p.waitForTimeout(200); const r = await p.evaluate(() => ({ b: G.beams.filter(b => b.on && b.owner === G.foe).map(b => b.k + ':' + G.foe.el), o: G.orbs.filter(o => o.thrown && o.owner === G.foe && !o.big).map(o => o.k), big: G.orbs.some(o => o.big && o.owner === G.foe) })); r.b.forEach(k => kinds.add(k)); if (r.big) boulder = true; r.o.forEach(k => thrown.add(k)); if (kinds.size >= 3 && thrown.size >= 4 && boulder) break; }
  res.cycle = [...kinds];
  if (!['fire:fuego', 'water:agua', 'air:aire'].every(k => kinds.has(k))) errs.push('el rival de prueba no lanzó fuego, agua y aire: ' + res.cycle);
  res.thrown = [...thrown]; if (thrown.size < 4) errs.push('el rival de prueba no lanzó las 4 esferas: ' + res.thrown); if (!boulder) errs.push('el rival de prueba no levantó la roca grande');
  // choques: el rival contesta con su ataque; los elementos chocan (vapor, agua desparramada, fuego disperso) y si están cerca los dos retroceden
  const clash = async (mine, his, kind) => {
    await start(mine);
    await p.evaluate(his => { const f = G.foe; f.el = his; f.E = ELEM[his]; if (his === 'agua') giveBubble(f, 3); }, his); await p.waitForTimeout(200);
    const d0 = await p.evaluate(() => Math.hypot(G.foe.x - G.me.x, G.foe.y - G.me.y));
    await swipe(); let seen = 0, clashes = 0;
    for (let i = 0; i < 12; i++) { await p.waitForTimeout(120); const r = await p.evaluate(k => ({ n: G.fx.filter(q => q.k === k).length, c: G.clash ? 1 : 0, foeBeam: G.beams.some(b => b.on && b.owner === G.foe) }), kind); seen = Math.max(seen, r.n); clashes += r.c; }
    const d1 = await p.evaluate(() => Math.hypot(G.foe.x - G.me.x, G.foe.y - G.me.y)); await t('touchEnd', []); await p.waitForTimeout(700);
    return { seen, clashes, push: (d1 - d0).toFixed(0), foeOff: await p.evaluate(() => !G.beams.some(b => b.on && b.owner === G.foe)) };
  };
  res.fireWater = await clash('fuego', 'agua', 'steam'); res.airWater = await clash('aire', 'agua', 'wisp'); res.airFire = await clash('aire', 'fuego', 'wisp'); // el aire se detiene y se desvía
  for (const [n, r] of [['fuego/agua (vapor)', res.fireWater], ['aire/agua (el agua detiene el aire)', res.airWater], ['aire/fuego (el fuego detiene el aire)', res.airFire]]) {
    if (!(r.seen > 3 && r.clashes > 3)) errs.push(n + ': no chocaron');
    if (!(r.push > 10)) errs.push(n + ': no retrocedieron');
    if (!r.foeOff) errs.push(n + ': el rival no dejó de atacar');
  }
  console.log(res);
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors'); await b.close();
})();
