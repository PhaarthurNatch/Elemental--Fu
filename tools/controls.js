// Prueba de los toques en la pelea: tocar = saltar (más largo, más alto), arrastrar = mover el brazo del lado del dedo, tocar un pozo o llama = el brazo se estira hacia allá y sigue al dedo; al soltar vuelve.
// Uso: node tools/controls.js
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ ...devices['iPhone 13'] });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
  await p.click('.elbtn[data-el="agua"]');
  await p.evaluate(() => { document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foe.wait = 99; G.foeTest = false; G.foe.el = 'tierra'; G.orbs = G.orbs.filter(o => o.owner !== G.foe); });
  const c = await p.context().newCDPSession(p);
  const touch = (type, pts) => c.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const maxZ = async () => p.evaluate(() => new Promise(r => { let m = 0; const t0 = performance.now(); const f = () => { m = Math.max(m, G.me.z); if (performance.now() - t0 < 1500) setTimeout(f, 16); else r(m); }; f(); }));
  // toque corto
  await touch('touchStart', [{ x: 300, y: 500, id: 1 }]); await p.waitForTimeout(30); await touch('touchEnd', []);
  const z1 = await maxZ();
  // toque más largo
  await touch('touchStart', [{ x: 300, y: 500, id: 1 }]); await p.waitForTimeout(300); const ch = await p.evaluate(() => G.me.charge); await p.waitForTimeout(150); await touch('touchEnd', []);
  const z2 = await maxZ(); await p.waitForTimeout(1500);
  // arrastrar en la mitad derecha: el brazo de la derecha sigue al dedo
  const before = await p.evaluate(() => { const N = G.me.nodes, a = [...G.me.ix.arms].sort((x, y) => N[x.sh].x - N[y.sh].x)[1]; return { x: N[a.ha].x, y: N[a.ha].y, rx: N[a.ha].x - N[a.sh].x, ry: N[a.ha].y - N[a.sh].y }; });
  await touch('touchStart', [{ x: 300, y: 500, id: 2 }]); for (let i = 1; i <= 12; i++) { await touch('touchMove', [{ x: 300 + i * 6, y: 500 - i * 8, id: 2 }]); await p.waitForTimeout(20); }
  await p.waitForTimeout(300);
  const during = await p.evaluate(() => { const N = G.me.nodes, a = G.me.ix.arms.find(x => x.ctl); if (!a) return null; const w = toWorld(372, 404); return { x: N[a.ha].x, y: N[a.ha].y, len: Math.hypot(N[a.ha].x - N[a.sh].x, N[a.ha].y - N[a.sh].y), toFinger: Math.hypot(N[a.ha].x - w.x, N[a.ha].y - w.y), shToFinger: Math.hypot(N[a.sh].x - w.x, N[a.sh].y - w.y), armLen: (BODY.armU + BODY.armF) * G.me.s }; }); // la mano más cercana sigue al dedo y se estira hacia él

  // y a la vez el otro lado
  await touch('touchMove', [{ x: 372, y: 404, id: 2 }, { x: 80, y: 500, id: 3 }]); await p.waitForTimeout(30);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: 372, y: 404, id: 2 }, { x: 80 - i * 5, y: 500 + i * 4, id: 3 }]); await p.waitForTimeout(20); }
  const both = await p.evaluate(() => G.me.ix.arms.filter(a => a.ctl).length);
  await touch('touchEnd', []); await p.waitForTimeout(1500);
  const after = await p.evaluate(() => ({ ctl: G.me.ix.arms.filter(a => a.ctl).length, z: G.me.z }));
  const back = await p.evaluate(() => { const N = G.me.nodes, a = [...G.me.ix.arms].sort((x, y) => N[x.sh].x - N[y.sh].x)[1]; return { rx: N[a.ha].x - N[a.sh].x, ry: N[a.ha].y - N[a.sh].y, mx: G.me.x, my: G.me.y }; });
  // tocar la llama de arriba a la izquierda: el brazo de la izquierda se estira hacia allá y sigue al dedo; no salta
  await p.waitForTimeout(800);
  const fire = await p.evaluate(() => { const f = arenaProps()[0], v = view(); return { x: v.ox + f.x * v.k, y: v.oy + (TOP + f.y * DEPTH - 20) * v.k }; });
  await touch('touchStart', [{ x: fire.x, y: fire.y, id: 4 }]); await p.waitForTimeout(400);
  const reach = await p.evaluate(() => { const N = G.me.nodes, a = G.me.ix.arms.find(x => x.ctl); if (!a) return null; const sh = N[a.sh], hn = N[a.ha], left = [...G.me.ix.arms].sort((x, y) => N[x.sh].x - N[y.sh].x)[0] === a; return { left, dx: hn.x - sh.x, dy: hn.y - sh.y, len: Math.hypot(hn.x - sh.x, hn.y - sh.y), z: G.me.z }; });
  await touch('touchMove', [{ x: fire.x + 150, y: fire.y, id: 4 }]); await p.waitForTimeout(400);
  const follow = await p.evaluate(() => { const N = G.me.nodes, a = G.me.ix.arms.find(x => x.ctl); return a ? N[a.ha].x - N[a.sh].x : null; });
  await touch('touchEnd', []); await p.waitForTimeout(600);
  const jumped = await p.evaluate(() => G.me.z > 0 || G.me.vz !== 0), freed = await p.evaluate(() => G.me.ix.arms.every(a => !a.ctl));
  const orbWrong = await p.evaluate(() => G.orbs.length);
  console.log({ reach, follow, jumped, freed, orbWrong });
  if (orbWrong) errs.push('sacó fuego sin ser de fuego');
  // como Fuego y como Agua: arrastrar desde su llama o su pozo saca el elemento, que sigue al dedo; al soltar se deshace
  for (const [el, idx] of [['fuego', 0], ['agua', 1]]) {
    await p.evaluate(el => { document.querySelector('#btnBack').click(); document.querySelector(`.elbtn[data-el="${el}"]`).click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foe.wait = 99; G.foeTest = false; G.foe.el = 'tierra'; G.orbs = G.orbs.filter(o => o.owner !== G.foe); }, el);
    await p.waitForTimeout(500);
    const pt = await p.evaluate(i => { const f = arenaProps()[i], v = view(); return { x: v.ox + f.x * v.k, y: v.oy + (TOP + f.y * DEPTH - (f.k === 'fire' ? 20 : 0)) * v.k }; }, idx);
    await touch('touchStart', [{ x: pt.x, y: pt.y, id: 5 }]); await p.waitForTimeout(100);
    const tx = 200, ty = 400; { const dx = tx - pt.x, dy = ty - pt.y, d = Math.hypot(dx, dy); for (let i = 1; i <= 6; i++) { await touch('touchMove', [{ x: pt.x + dx / d * 7 * i, y: pt.y + dy / d * 7 * i, id: 5 }]); await p.waitForTimeout(40); } } // empezar despacio = esfera (rápido sería salpicadura)
    for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: pt.x + (tx - pt.x) * i / 10, y: pt.y + (ty - pt.y) * i / 10, id: 5 }]); await p.waitForTimeout(25); }
    await p.waitForTimeout(700);
    const o = await p.evaluate(([tx, ty]) => { const o = G.orbs[0]; if (!o) return null; const v = view(); return { k: o.k, held: o.held, dist: Math.hypot(v.ox + o.x * v.k - tx, v.oy + o.y * v.k - ty) }; }, [tx, ty]);
    await touch('touchEnd', []); await p.waitForTimeout(1200);
    const gone = await p.evaluate(() => G.orbs.length === 0);
    console.log(el, o, gone);
    if (!o || !o.held || o.dist > 12) errs.push(`${el}: el elemento no siguió al dedo`);
    if (!gone) errs.push(`${el}: el elemento no se deshizo al soltar`);
  }
  if (!reach || !reach.left || !(reach.dx < -10 && reach.dy < -10)) errs.push('el brazo no se estiró hacia la llama');
  if (!(follow > reach.dx + 10)) errs.push('la mano no siguió al dedo');
  if (jumped || !freed) errs.push('saltó o el brazo no se soltó al tocar la llama');
  console.log({ z1: z1.toFixed(0), z2: z2.toFixed(0), charge: ch.toFixed(2), before, during, both, after, back });
  if (z1 > 0.5 || z2 > 0.5) errs.push('todavía salta al tocar la pantalla');
  if (!during || !(during.len > during.armLen * 1.2 && during.toFinger < during.shToFinger - during.armLen * 1.2)) errs.push('la mano no siguió al dedo estirándose: ' + JSON.stringify(during));
  if (both !== 2) errs.push('no se controlan los dos brazos a la vez');
  if (after.ctl !== 0 || Math.hypot(back.rx - before.rx, back.ry - before.ry) > 4) errs.push('el brazo no volvió');
  // el cuerpo gira con el brazo (el brazo no se va hacia atrás); con las dos manos gira sólo hasta cierto punto; el codo queda un poco doblado
  await p.evaluate(() => { document.querySelector('#btnBack').click(); document.querySelector('.elbtn[data-el="agua"]').click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foe.wait = 99; G.foeTest = false; G.foe.el = 'tierra'; G.orbs = []; G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.5; G.foe.x = ARENA_W * 0.5; G.foe.y = ARENA_D * 0.15; G.foe.home = { x: G.foe.x, y: G.foe.y }; });
  await p.waitForTimeout(600);
  const scr = (ax, ay) => p.evaluate(([ax, ay]) => { const v = view(); return { x: v.ox + (G.me.gx + ax) * v.k, y: v.oy + (G.me.gy + ay) * v.k }; }, [ax, ay]);
  const armAngle = () => p.evaluate(() => { const m = G.me, a = m.ix.arms.find(x => x.ctl); if (!a) return null; const c = a.ctl, beta = Math.atan2(c.x - m.x, (c.y - TOP) / DEPTH - m.y), al = Math.sign(a.lat) * wrapA(beta - m.ph);
    const N = m.nodes, sh = N[a.sh], el = N[a.el], ha = N[a.ha], dx = ha.x - sh.x, dy = ha.y - sh.y, L = Math.hypot(dx, dy) || 1, off = Math.abs((el.x - sh.x) * dy - (el.y - sh.y) * dx) / L; return { al: +(al * 180 / Math.PI).toFixed(0), elbow: +off.toFixed(1) }; });
  const behind = await scr(10, 90); // detrás y un poco al lado
  await touch('touchStart', [{ x: behind.x, y: behind.y, id: 7 }]); await p.waitForTimeout(1200);
  const one = await armAngle(); await touch('touchEnd', []); await p.waitForTimeout(1200);
  const l = await scr(40, 110), r = await scr(140, 60), ph0 = await p.evaluate(() => G.me.ph);
  await touch('touchStart', [{ x: l.x, y: l.y, id: 8 }, { x: r.x, y: r.y, id: 9 }]); await p.waitForTimeout(1200);
  const turn2 = await p.evaluate(ph0 => Math.abs(wrapA(G.me.ph - ph0)) * 180 / Math.PI, ph0); await touch('touchEnd', []); await p.waitForTimeout(600);
  console.log({ one, turn2: turn2.toFixed(0) });
  if (!one || one.al < -20 || one.al > 70) errs.push('el cuerpo no giró con el brazo (quedó hacia atrás): ' + JSON.stringify(one));
  if (!one || one.elbow < 2) errs.push('el codo quedó completamente estirado');
  if (!(turn2 > 25 && turn2 < 62)) errs.push('con las dos manos debía girar sólo hasta cierto punto: ' + turn2.toFixed(0));
  // opción de controles: elegir Joystick (se guarda); sin calibrar, y la palanca de abajo hace caminar
  await p.evaluate(() => document.querySelector('#btnBack').click()); await p.waitForTimeout(200);
  await p.click('#ctlBtn'); await p.click('.ctlopt[data-ctl="joy"]'); const label = await p.textContent('#ctlBtn'); await p.click('#ctlDone');
  const saved = await p.evaluate(() => load().ctl);
  await p.click('.elbtn[data-el="fuego"]'); await p.waitForTimeout(200);
  const calib = await p.evaluate(() => ({ phase: G.phase, hidden: document.getElementById('calib').hidden }));
  await p.waitForFunction(() => G.phase === 'fight', null, { timeout: 8000 });
  await p.evaluate(() => { G.foeTest = false; G.foe.wait = 99; G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.5; }); await p.waitForTimeout(300);
  const j = await p.evaluate(() => joyCenter()), x0 = await p.evaluate(() => G.me.x);
  await touch('touchStart', [{ x: j.x, y: j.y, id: 11 }]); await p.waitForTimeout(40); for (let i = 1; i <= 5; i++) { await touch('touchMove', [{ x: j.x + i * 10, y: j.y, id: 11 }]); await p.waitForTimeout(30); }
  await p.waitForTimeout(700); const x1 = await p.evaluate(() => G.me.x); await touch('touchEnd', []);
  console.log({ label, saved, calib, joyMoved: (x1 - x0).toFixed(0) });
  if (saved !== 'joy' || !/Joystick/.test(label)) errs.push('no se guardó la opción de Joystick');
  if (calib.phase !== 'count' || !calib.hidden) errs.push('con joystick todavía pide calibrar');
  if (!(x1 - x0 > 40)) errs.push('el joystick no hizo caminar');
  // diestro / zurdo: el joystick va abajo a la derecha / izquierda sin tapar las fuentes de esa esquina
  const side = async hand => p.evaluate(hand => { HAND = hand; const j = joyCenter(), v = view(); let over = false;
    for (const q of arenaProps()) { const cx = v.ox + q.x * v.k, gy = v.oy + (TOP + q.y * DEPTH) * v.k, hw = (q.r + 7) * v.k, top = gy - (q.k === 'fire' ? FIRE_H + q.r * 2.6 : (q.r + 7) * DEPTH) * v.k, bot = gy + (q.r + 7) * DEPTH * v.k; if (Math.hypot(j.x - clamp(j.x, cx - hw, cx + hw), j.y - clamp(j.y, top, bot)) < JOY_R) over = true; }
    const src = arenaProps().filter(q => hand === 'der' ? q.x > ARENA_W / 2 : q.x < ARENA_W / 2).sort((a, b) => b.y - a.y)[0], sx = v.ox + src.x * v.k, sy = v.oy + (TOP + src.y * DEPTH) * v.k;
    return { x: Math.round(j.x), W, over, above: j.y < sy && Math.abs(j.x - sx) < JOY_R }; }, hand); // encima de la fuente de ese lado
  const der = await side('der'), izq = await side('izq');
  console.log({ der, izq });
  if (!(der.x > der.W / 2 && izq.x < izq.W / 2)) errs.push('el joystick no quedó del lado de la mano');
  if (der.over || izq.over) errs.push('el joystick tapa una fuente');
  if (!der.above || !izq.above) errs.push('el joystick no quedó encima de la fuente de su lado');
  await p.evaluate(() => { HAND = 'der'; const st = load(); delete st.ctl; delete st.hand; save(st); });
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors'); await b.close();
})();
