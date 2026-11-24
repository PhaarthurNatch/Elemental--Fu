// Prueba de guardar la esfera: llevarla a tu personaje la adosa de inmediato (sin sacar otra ni salpicar al soltar); deslizar rápido hacia el rival la dispara y lo daña.
// Uso: node tools/store.js
const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ ...devices['iPhone 13'] });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
  await p.click('.elbtn[data-el="agua"]');
  await p.evaluate(() => { document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foe.wait = 99; G.foeTest = false; G.foe.el = 'tierra'; G.orbs = G.orbs.filter(o => o.owner !== G.foe); G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; });
  await p.waitForTimeout(600);
  const c = await p.context().newCDPSession(p), t = (type, pts) => c.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const pool = await p.evaluate(() => { const f = arenaProps()[1], v = view(); return { x: v.ox + f.x * v.k, y: v.oy + (TOP + f.y * DEPTH) * v.k }; });
  const me = await p.evaluate(() => { const v = view(), c = G.me.nodes[G.me.ix.upper]; return { x: v.ox + c.x * v.k, y: v.oy + (c.y + 4 * G.me.s) * v.k }; });
  // sacar la esfera despacio y llevarla a tu personaje
  await t('touchStart', [{ x: pool.x, y: pool.y }]); await p.waitForTimeout(60);
  for (let i = 1; i <= 25; i++) { await t('touchMove', [{ x: pool.x + (me.x - pool.x) * i / 25, y: pool.y + (me.y - pool.y) * i / 25 }]); await p.waitForTimeout(30); }
  await p.waitForTimeout(100); const early = await p.evaluate(() => G.orbs.filter(o => o.docked).length); // inmediato
  for (let i = 1; i <= 10; i++) { await t('touchMove', [{ x: me.x + i * 4, y: me.y - i * 3 }]); await p.waitForTimeout(60); } // sigue moviendo el dedo y lo suelta
  await t('touchEnd', []); await p.waitForTimeout(100);
  const extra = await p.evaluate(() => ({ orbs: G.orbs.filter(o => !o.docked).length, splash: G.splashes.length })); // no sale otra esfera ni una salpicadura
  await p.waitForTimeout(700); const docked = await p.evaluate(() => G.orbs.filter(o => o.docked).length);
  const still = await p.evaluate(() => { const o = G.orbs.find(o => o.docked), c = G.me.nodes[G.me.ix.upper]; return o ? Math.hypot(o.x - c.x, o.y - c.y) : null; });
  // llevar 3 esferas más: el máximo es 3 orbitando
  for (let n = 0; n < 3; n++) { await t('touchStart', [{ x: pool.x, y: pool.y }]); await p.waitForTimeout(60);
    for (let i = 1; i <= 15; i++) { await t('touchMove', [{ x: pool.x + (me.x - pool.x) * i / 15, y: pool.y + (me.y - pool.y) * i / 15 }]); await p.waitForTimeout(30); }
    await p.waitForTimeout(900); await t('touchEnd', []); await p.waitForTimeout(700); }
  const maxOk = await p.evaluate(() => { const d = G.orbs.filter(o => o.docked); return { n: d.length, lvl: d[0] && d[0].lvl, side: d[0] && d[0].side, held: G.orbs.filter(o => !o.docked && o.life > 0).length }; }); // agua: una sola que crece hasta 3
  await p.evaluate(() => { const d = G.orbs.filter(o => o.docked); G.orbs = [d[0]]; });
  // deslizar rápido hacia abajo (lejos del rival): también dispara, hacia abajo (sin apuntado automático)
  await t('touchStart', [{ x: 300, y: 400 }]); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', [{ x: 300, y: 400 + i * 60 }]); await p.waitForTimeout(8); } await t('touchEnd', []); await p.waitForTimeout(60);
  const back = await p.evaluate(() => { const o = G.orbs.find(o => o.thrown); return !!o && o.vy > 0 && Math.abs(o.vx) < o.vy * 0.2; });
  await p.waitForTimeout(400); await p.evaluate(() => { G.orbs = []; giveBubble(G.me, 3); }); await p.waitForTimeout(300);
  // deslizar rápido desde la esfera hacia el rival: dispara (sigue la dirección deslizada, sin apuntado automático)
  const hp0 = await p.evaluate(() => G.foe.hp);
  const u = await p.evaluate(() => { const o = G.orbs.find(o => o.docked), f = G.foe.nodes[G.foe.ix.upper], dx = f.x - o.x, dy = f.y + 4 * G.foe.s - o.y, d = Math.hypot(dx, dy); return { x: dx / d, y: dy / d }; });
  await t('touchStart', [{ x: 300, y: 600 }]); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', [{ x: 300 + u.x * i * 60, y: 600 + u.y * i * 60 }]); await p.waitForTimeout(8); } await t('touchEnd', []);
  const flying = await p.evaluate(() => G.orbs.filter(o => o.thrown).length), dirOk = await p.evaluate(u => { const o = G.orbs.find(o => o.thrown); return !!o && (o.vx * u.x + o.vy * u.y) / Math.hypot(o.vx, o.vy) > 0.97; }, u); await p.waitForTimeout(1200);
  const dmg = hp0 - await p.evaluate(() => G.foe.hp);
  // fuego: hasta 3 orbitando
  await p.evaluate(() => { document.getElementById('btnBack').click(); document.querySelector('.elbtn[data-el="fuego"]').click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foe.wait = 99; G.foeTest = false; G.foe.el = 'tierra'; G.orbs = G.orbs.filter(o => o.owner !== G.foe); G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; });
  await p.waitForTimeout(600);
  const fire = await p.evaluate(() => { const f = arenaProps()[0], v = view(); return { x: v.ox + f.x * v.k, y: v.oy + (TOP + f.y * DEPTH - 20) * v.k }; });
  const me2 = await p.evaluate(() => { const v = view(), c = G.me.nodes[G.me.ix.upper]; return { x: v.ox + c.x * v.k, y: v.oy + (c.y + 4 * G.me.s) * v.k }; });
  for (let n = 0; n < 4; n++) { await t('touchStart', [{ x: fire.x, y: fire.y }]); await p.waitForTimeout(60);
    for (let i = 1; i <= 15; i++) { await t('touchMove', [{ x: fire.x + (me2.x - fire.x) * i / 15, y: fire.y + (me2.y - fire.y) * i / 15 }]); await p.waitForTimeout(30); }
    await p.waitForTimeout(900); await t('touchEnd', []); await p.waitForTimeout(700); }
  const fireN = await p.evaluate(() => G.orbs.filter(o => o.docked && o.k === 'fire').length);
  if (fireN !== 3) errs.push('fuego: no quedaron 3 orbitando: ' + fireN);
  // aire: cualquier punto del suelo es una fuente. Tocar = saltar; mantener = nada (sólo el agua hace escudo); arrastrar despacio = aire que se guarda como un anillo
  await p.evaluate(() => { document.getElementById('btnBack').click(); document.querySelector('.elbtn[data-el="aire"]').click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foeTest = false; G.foe.wait = 99; G.foe.el = 'tierra'; G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; });
  await p.waitForTimeout(600);
  const fl = await p.evaluate(() => { const v = view(); return { x: v.ox + ARENA_W * 0.2 * v.k, y: v.oy + (TOP + ARENA_D * 0.45 * DEPTH) * v.k }; });
  const me3 = await p.evaluate(() => { const v = view(), c = G.me.nodes[G.me.ix.upper]; return { x: v.ox + c.x * v.k, y: v.oy + (c.y + 4 * G.me.s) * v.k }; });
  await t('touchStart', [{ x: fl.x, y: fl.y }]); await p.waitForTimeout(60); await t('touchEnd', []); await p.waitForTimeout(80);
  const airJump = await p.evaluate(() => G.me.z > 0); await p.waitForTimeout(900);
  await t('touchStart', [{ x: fl.x, y: fl.y }]); await p.waitForTimeout(1500);
  const airShield = await p.evaluate(() => ({ flow: G.flow.filter(q => q.k === 'air').length, sh: G.me.shield })); await t('touchEnd', []); await p.waitForTimeout(400);
  await t('touchStart', [{ x: fl.x, y: fl.y }]); await p.waitForTimeout(60);
  for (let i = 1; i <= 25; i++) { await t('touchMove', [{ x: fl.x + (me3.x - fl.x) * i / 25, y: fl.y + (me3.y - fl.y) * i / 25 }]); await p.waitForTimeout(30); }
  await p.waitForTimeout(150); const airOrb = await p.evaluate(() => G.orbs.filter(o => o.k === 'air' && o.docked).length); await t('touchEnd', []); await p.waitForTimeout(300);
  console.log({ airJump, airShield, airOrb });
  if (!airJump) errs.push('aire: tocar el suelo no saltó');
  if (airShield.flow || airShield.sh) errs.push('aire: todavía hace escudo');
  if (airOrb !== 1) errs.push('aire: no salió/guardó el aire');
  const bring = async (from, n) => { for (let k = 0; k < n; k++) { await t('touchStart', [{ x: from.x, y: from.y }]); await p.waitForTimeout(60);
    for (let i = 1; i <= 25; i++) { await t('touchMove', [{ x: from.x + (me3.x - from.x) * i / 25, y: from.y + (me3.y - from.y) * i / 25 }]); await p.waitForTimeout(30); }
    await p.waitForTimeout(150); await t('touchEnd', []); await p.waitForTimeout(300); } };
  await bring(fl, 2); const ring = await p.evaluate(() => G.orbs.filter(o => o.k === 'air' && o.docked).map(o => o.lvl));
  if (!(ring.length === 1 && ring[0] === 3)) errs.push('aire: el anillo no creció: ' + ring);
  // la corriente de aire se disipa si el rival está muy lejos; cerca lo golpea
  const shoot = async () => { const u = await p.evaluate(() => { const o = G.orbs.find(o => o.docked && o.owner === G.me) || G.me.nodes[G.me.ix.upper], f = G.foe.nodes[G.foe.ix.upper], dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy); return { x: dx / d, y: dy / d }; });
    const hp = await p.evaluate(() => G.foe.hp); await t('touchStart', [{ x: 300, y: 600 }]); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', [{ x: 300 + u.x * i * 60, y: 600 + u.y * i * 60 }]); await p.waitForTimeout(8); } await t('touchEnd', []); await p.waitForTimeout(1300); return hp - await p.evaluate(() => G.foe.hp); };
  await p.evaluate(() => { G.foe.x = ARENA_W * 0.5; G.foe.y = ARENA_D * 0.05; G.foe.home = { x: G.foe.x, y: G.foe.y }; }); await p.waitForTimeout(300);
  const airFar = await shoot();
  await p.evaluate(() => { G.orbs = []; const c = G.me.nodes[G.me.ix.upper], o = newOrb('air', c.x, c.y); o.docked = true; o.owner = G.me; o.lvl = 1; G.orbs.push(o); G.foe.x = ARENA_W * 0.5; G.foe.y = ARENA_D * 0.6 - 110; G.foe.home = { x: G.foe.x, y: G.foe.y }; }); await p.waitForTimeout(400);
  const airNear = await shoot();
  if (!(airFar < 0.5 && airNear > 5)) errs.push(`aire: la corriente no se disipó lejos o no dañó cerca (${airFar}, ${airNear})`);
  // tierra: piedras del suelo que orbitan (hasta 3) y giran; lanzada cae al suelo y se puede volver a tomar
  await p.evaluate(() => { document.getElementById('btnBack').click(); document.querySelector('.elbtn[data-el="tierra"]').click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foeTest = false; G.foe.wait = 99; G.foe.el = 'tierra'; G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; });
  await p.waitForTimeout(600);
  await bring(fl, 3);
  const rocks = await p.evaluate(() => { const r = G.orbs.filter(o => o.k === 'earth' && o.docked); return { n: r.length, shapes: new Set(r.map(o => o.shape.length + ':' + o.size.toFixed(2))).size, rot: r.map(o => o.rot) }; });
  await p.waitForTimeout(400); const rot2 = await p.evaluate(() => G.orbs.filter(o => o.k === 'earth' && o.docked).map(o => o.rot));
  if (!(rocks.n === 3 && rocks.shapes >= 2 && rot2.some((r, i) => Math.abs(r - rocks.rot[i]) > 0.1))) errs.push('tierra: no quedaron 3 piedras distintas orbitando y girando: ' + JSON.stringify(rocks));
  const stoneDmg = await shoot(); await p.waitForTimeout(300);
  const onFloor = await p.evaluate(() => { const o = G.orbs.find(o => o.k === 'earth' && o.rest); if (!o) return null; const v = view(); return { x: v.ox + o.x * v.k, y: v.oy + o.y * v.k }; });
  if (!(stoneDmg > 5 && onFloor)) errs.push('tierra: la piedra lanzada no dañó o no quedó en el suelo');
  if (onFloor) { await p.evaluate(() => { G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; }); await p.waitForTimeout(400); const n0 = await p.evaluate(() => G.orbs.filter(o => o.docked).length); await bring(onFloor, 1);
    const n1 = await p.evaluate(() => G.orbs.filter(o => o.docked).length); if (n1 !== n0 + 1) errs.push('tierra: no se pudo volver a tomar la piedra del suelo'); }
  // choques entre esferas lanzadas: fuego + agua = vapor; piedra + fuego = la piedra cae al suelo
  const orbClash = await p.evaluate(async () => { G.orbs = []; G.fx = []; const y = TOP + ARENA_D * 0.4 * DEPTH, a = newOrb('fire', 150, y), b = newOrb('water', 370, y); G.orbs.push(a, b); launch(a, 500, 0, G.me); launch(b, -500, 0, G.foe);
    await new Promise(r => setTimeout(r, 600)); const steam = G.fx.filter(q => q.k === 'steam').length, left = G.orbs.length;
    const c = newOrb('earth', 150, y), d = newOrb('fire', 370, y); G.orbs.push(c, d); launch(c, 500, 0, G.me); launch(d, -500, 0, G.foe);
    await new Promise(r => setTimeout(r, 900)); return { steam, left, stone: G.orbs.filter(o => o.k === 'earth' && o.rest).length, fire: G.orbs.filter(o => o.k === 'fire').length }; });
  if (!(orbClash.steam > 3 && orbClash.left === 0)) errs.push('fuego y agua lanzados no chocaron con vapor: ' + JSON.stringify(orbClash));
  if (!(orbClash.stone === 1 && orbClash.fire === 0)) errs.push('la piedra no cayó al chocar con el fuego: ' + JSON.stringify(orbClash));
  console.log({ ring, airFar, airNear, rocks: rocks.n, stoneDmg, orbClash });
  console.log({ early, extra, docked, maxOk, fireN, still: still && still.toFixed(1), back, flying, dmg: dmg.toFixed(1) });
  if (early !== 1) errs.push('no se adosó de inmediato');
  if (extra.orbs || extra.splash) errs.push('al adosar salió otra esfera o una salpicadura: ' + JSON.stringify(extra));
  if (docked !== 1 || !(still < 55)) errs.push('no quedó orbitando cerca del personaje');
  if (!(maxOk.n === 1 && maxOk.lvl === 3)) errs.push('agua: no quedó una sola esfera de tamaño 3: ' + JSON.stringify(maxOk));
  if (!back) errs.push('no disparó hacia atrás');
  if (flying !== 1 || !(dmg > 5)) errs.push('no se disparó al rival');
  if (!dirOk) errs.push('la esfera no siguió la dirección deslizada');
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors'); await b.close();
})();
