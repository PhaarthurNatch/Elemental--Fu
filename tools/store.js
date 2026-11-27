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
  // agua: cada disparo con una mano gasta un nivel de la burbuja; con las dos manos a la vez sale completa
  const flick = async (pts) => { await t('touchStart', pts.map((q, i) => ({ x: q.x, y: q.y, id: i + 1 }))); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', pts.map((q, k) => ({ x: q.x, y: q.y - i * 60, id: k + 1 }))); await p.waitForTimeout(8); } await t('touchEnd', []); await p.waitForTimeout(60); };
  await p.waitForTimeout(500); await p.evaluate(() => { G.orbs = []; giveBubble(G.me, 3); }); await p.waitForTimeout(300);
  await flick([{ x: 300, y: 600 }]);
  const one = await p.evaluate(() => ({ shot: G.orbs.filter(o => o.thrown).map(o => o.lvl), left: G.orbs.filter(o => o.docked).map(o => o.lvl) }));
  await p.waitForTimeout(600); await p.evaluate(() => { G.orbs = []; giveBubble(G.me, 3); }); await p.waitForTimeout(300);
  await flick([{ x: 120, y: 600 }, { x: 300, y: 600 }]);
  const two = await p.evaluate(() => ({ shot: G.orbs.filter(o => o.thrown).map(o => o.lvl), left: G.orbs.filter(o => o.docked).length }));
  console.log({ one, two });
  if (!(one.shot.length === 1 && one.shot[0] === 1 && one.left[0] === 2)) errs.push('agua: con una mano no gastó sólo un nivel: ' + JSON.stringify(one));
  if (!(two.shot.length === 1 && two.shot[0] === 3 && two.left === 0)) errs.push('agua: con las dos manos no salió completa: ' + JSON.stringify(two));
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
  // aire: no saca nada del ambiente ni hace escudo; tocar = saltar; mantener presionado en cualquier parte carga el anillo de viento (más tiempo, más grande)
  await p.evaluate(() => { document.getElementById('btnBack').click(); document.querySelector('.elbtn[data-el="aire"]').click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foeTest = false; G.foe.wait = 99; G.foe.el = 'tierra'; G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; });
  await p.waitForTimeout(600);
  const fl = await p.evaluate(() => { const v = view(); return { x: v.ox + ARENA_W * 0.2 * v.k, y: v.oy + (TOP + ARENA_D * 0.45 * DEPTH) * v.k }; });
  const me3 = await p.evaluate(() => { const v = view(), c = G.me.nodes[G.me.ix.upper]; return { x: v.ox + c.x * v.k, y: v.oy + (c.y + 4 * G.me.s) * v.k }; });
  await t('touchStart', [{ x: fl.x, y: fl.y }]); await p.waitForTimeout(60); await t('touchEnd', []); await p.waitForTimeout(80);
  const airJump = await p.evaluate(() => G.me.z > 0); await p.waitForTimeout(900);
  await t('touchStart', [{ x: fl.x, y: fl.y }]); await p.waitForTimeout(900);
  const ring1 = await p.evaluate(() => ({ lvl: (G.orbs.find(o => o.k === 'air' && o.docked) || {}).lvl || 0, flow: G.flow.length, sh: G.me.shield })); await p.waitForTimeout(2100);
  const ring = await p.evaluate(() => G.orbs.filter(o => o.k === 'air' && o.docked).map(o => o.lvl)); await t('touchEnd', []); await p.waitForTimeout(300);
  const noJump = await p.evaluate(() => G.me.z === 0);
  // arrastrar desde el suelo ya no saca aire
  await t('touchStart', [{ x: fl.x, y: fl.y }]); await p.waitForTimeout(60); for (let i = 1; i <= 25; i++) { await t('touchMove', [{ x: fl.x + i * 4, y: fl.y - i * 3 }]); await p.waitForTimeout(30); }
  const airHeld = await p.evaluate(() => G.orbs.filter(o => o.held).length); await t('touchEnd', []); await p.waitForTimeout(300);
  console.log({ airJump, ring1, ring, noJump, airHeld });
  if (airJump) errs.push('aire: tocar todavía salta');
  if (!(ring1.lvl > 0.3 && ring1.lvl < 2.5 && !ring1.flow && !ring1.sh)) errs.push('aire: mantener no empezó a cargar el anillo (o hizo escudo): ' + JSON.stringify(ring1));
  if (!(ring.length === 1 && ring[0] === 3 && noJump)) errs.push('aire: el anillo no se cargó hasta 3 o saltó al soltar: ' + ring);
  if (airHeld) errs.push('aire: todavía saca aire del suelo');
  const bring = async (from, n) => { for (let k = 0; k < n; k++) { await t('touchStart', [{ x: from.x, y: from.y }]); await p.waitForTimeout(60);
    for (let i = 1; i <= 25; i++) { await t('touchMove', [{ x: from.x + (me3.x - from.x) * i / 25, y: from.y + (me3.y - from.y) * i / 25 }]); await p.waitForTimeout(30); }
    await p.waitForTimeout(600); await t('touchEnd', []); await p.waitForTimeout(300); } };
  // la corriente de aire se disipa si el rival está muy lejos; cerca lo golpea
  const shoot = async () => { const u = await p.evaluate(() => { const o = G.orbs.find(o => o.docked && o.owner === G.me) || G.me.nodes[G.me.ix.upper], f = G.foe.nodes[G.foe.ix.upper], dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy); return { x: dx / d, y: dy / d }; });
    const hp = await p.evaluate(() => G.foe.hp); await t('touchStart', [{ x: 300, y: 600 }]); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', [{ x: 300 + u.x * i * 60, y: 600 + u.y * i * 60 }]); await p.waitForTimeout(8); } await t('touchEnd', []); await p.waitForTimeout(1300); return hp - await p.evaluate(() => G.foe.hp); };
  await p.evaluate(() => { G.foe.x = ARENA_W * 0.95; G.foe.y = ARENA_D * 0.02; G.foe.home = { x: G.foe.x, y: G.foe.y }; G.me.x = ARENA_W * 0.05; G.me.y = ARENA_D * 0.98; }); await p.waitForTimeout(300); // muy lejos (en diagonal), más allá del alcance del aire
  const airFar = await shoot();
  await p.evaluate(() => { G.orbs = []; G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; const c = G.me.nodes[G.me.ix.upper], o = newOrb('air', c.x, c.y); o.docked = true; o.owner = G.me; o.lvl = 1; G.orbs.push(o); G.foe.x = ARENA_W * 0.5; G.foe.y = ARENA_D * 0.6 - 110; G.foe.home = { x: G.foe.x, y: G.foe.y }; }); await p.waitForTimeout(400);
  const airNear = await shoot();
  if (!(airFar < 0.5 && airNear > 5)) errs.push(`aire: la corriente no se disipó lejos o no dañó cerca (${airFar}, ${airNear})`);
  // tierra: ya no se sacan piedras pequeñas del piso; las que quedan al romperse la roca grande se toman, orbitan (hasta 3) y giran; lanzada cae al suelo y se puede volver a tomar
  await p.evaluate(() => { document.getElementById('btnBack').click(); document.querySelector('.elbtn[data-el="tierra"]').click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foeTest = false; G.foe.wait = 99; G.foe.el = 'tierra'; G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; });
  await p.waitForTimeout(600);
  await t('touchStart', [{ x: fl.x, y: fl.y }]); await p.waitForTimeout(60); for (let i = 1; i <= 25; i++) { await t('touchMove', [{ x: fl.x + (me3.x - fl.x) * i / 25, y: fl.y + (me3.y - fl.y) * i / 25 }]); await p.waitForTimeout(30); }
  const pulled = await p.evaluate(() => G.orbs.length); await t('touchEnd', []); await p.waitForTimeout(300);
  if (pulled) errs.push('tierra: todavía saca piedras pequeñas del piso');
  await t('touchStart', [{ x: fl.x, y: fl.y }]); await p.waitForTimeout(600); const held = await p.evaluate(() => G.orbs.filter(o => o.held).map(o => ({ k: o.k, big: !!o.big }))); await t('touchEnd', []); await p.waitForTimeout(400);
  if (!(held.length === 1 && held[0].k === 'earth' && !held[0].big)) errs.push('tierra: mantener presionado no sacó una piedra pequeña: ' + JSON.stringify(held));
  await p.evaluate(() => { G.orbs = []; });
  // la roca grande se rompe y deja piedras pequeñas en el suelo
  await p.evaluate(() => { const o = raiseBoulder(null, G.me, 0, null); o.rise = 1; o.x = G.me.gx - 120; breakBoulder(o); const r = newOrb('earth', G.me.gx + 110, G.me.gy - 40); r.fall = true; r.gy = G.me.gy - 20; G.orbs.push(r); }); await p.waitForTimeout(900);
  const smalls = await p.evaluate(() => { const v = view(); return G.orbs.filter(o => o.rest && !o.big).map(o => ({ x: v.ox + o.x * v.k, y: v.oy + o.y * v.k })); });
  if (smalls.length !== 3) errs.push('tierra: la roca grande no dejó piedras pequeñas: ' + smalls.length);
  for (const sp of smalls) await bring(sp, 1);
  const rocks = await p.evaluate(() => { const r = G.orbs.filter(o => o.k === 'earth' && o.docked); return { n: r.length, shapes: new Set(r.map(o => o.shape.length + ':' + o.size.toFixed(2))).size, rot: r.map(o => o.rot) }; });
  await p.waitForTimeout(400); const rot2 = await p.evaluate(() => G.orbs.filter(o => o.k === 'earth' && o.docked).map(o => o.rot));
  if (!(rocks.n === 3 && rocks.shapes >= 2 && rot2.some((r, i) => Math.abs(r - rocks.rot[i]) > 0.1))) errs.push('tierra: no quedaron 3 piedras distintas orbitando y girando: ' + JSON.stringify(rocks));
  const stoneDmg = await shoot(); await p.waitForTimeout(300);
  const onFloor = await p.evaluate(() => { const o = G.orbs.find(o => o.k === 'earth' && o.rest); if (!o) return null; const v = view(); return { x: v.ox + o.x * v.k, y: v.oy + o.y * v.k }; });
  if (!(stoneDmg > 5 && onFloor)) errs.push('tierra: la piedra lanzada no dañó o no quedó en el suelo');
  if (onFloor) { await p.evaluate(() => { G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; }); await p.waitForTimeout(400); const n0 = await p.evaluate(() => G.orbs.filter(o => o.docked).length); await bring(onFloor, 1);
    const n1 = await p.evaluate(() => G.orbs.filter(o => o.docked).length); if (n1 !== n0 + 1) errs.push('tierra: no se pudo volver a tomar la piedra del suelo'); }
  // bug: con una piedra en la mano, deslizar rápido no debe levantar además la roca grande (un dedo, una cosa)
  await p.evaluate(() => { G.orbs = []; const r = newOrb('earth', G.me.gx + 60, G.me.gy - 10); r.rest = true; r.gy = r.y; G.orbs.push(r); }); await p.waitForTimeout(200);
  const rk = await p.evaluate(() => { const o = G.orbs[0], v = view(); return { x: v.ox + o.x * v.k, y: v.oy + o.y * v.k }; });
  await t('touchStart', [{ x: rk.x, y: rk.y }]); await p.waitForTimeout(40); for (let i = 1; i <= 4; i++) { await t('touchMove', [{ x: rk.x + i * 6, y: rk.y - i * 4 }]); await p.waitForTimeout(40); }
  for (let i = 1; i <= 4; i++) { await t('touchMove', [{ x: rk.x + 24, y: rk.y - 16 - i * 60 }]); await p.waitForTimeout(8); } await p.waitForTimeout(400);
  const both = await p.evaluate(() => ({ big: G.orbs.filter(o => o.big).length, held: G.orbs.filter(o => o.held).length })); await t('touchEnd', []); await p.waitForTimeout(100);
  const flew = await p.evaluate(() => ({ big: G.orbs.filter(o => o.big).length, small: G.orbs.filter(o => o.thrown && !o.big).length }));
  console.log({ both, flew });
  if (both.big || flew.big) errs.push('bug: con una piedra en la mano también se levantó/lanzó la roca grande');
  // tierra: con una piedra guardada, deslizar y mantener levanta una roca grande delante (gasta la piedra) que defiende; al soltar sale lanzada dejando un surco y daña; sin piedras, nada
  await p.evaluate(() => { G.orbs = []; G.me.hp = 100; G.foe.hp = 100; G.me.x = ARENA_W * 0.5; G.me.y = ARENA_D * 0.6; G.foe.x = ARENA_W * 0.5; G.foe.y = ARENA_D * 0.6 - 200; G.foe.home = { x: G.foe.x, y: G.foe.y }; }); await p.waitForTimeout(400);
  const swipeUp = async () => { await t('touchStart', [{ x: 300, y: 600 }]); await p.waitForTimeout(40); for (let i = 1; i <= 3; i++) { await t('touchMove', [{ x: 300, y: 600 - i * 60 }]); await p.waitForTimeout(8); } };
  await swipeUp(); await p.waitForTimeout(500); const noStone = await p.evaluate(() => G.orbs.filter(o => o.big).length); await t('touchEnd', []); await p.waitForTimeout(300);
  await p.evaluate(() => { const c = G.me.nodes[G.me.ix.upper]; for (let i = 0; i < 2; i++) { const o = newOrb('earth', c.x, c.y); o.docked = true; o.owner = G.me; o.lvl = 1; G.orbs.push(o); } }); await p.waitForTimeout(300);
  await swipeUp(); await p.waitForTimeout(500);
  const raised = await p.evaluate(() => ({ big: G.orbs.filter(o => o.big && o.raised).length, left: G.orbs.filter(o => o.docked && o.k === 'earth' && !o.dead).length }));
  await p.evaluate(() => { const arm = G.foe.ix.arms[0]; startBeam(null, G.foe, performance.now() + 1100, arm, 'fire'); }); await p.waitForTimeout(1100);
  const blocked = await p.evaluate(() => { const o = G.orbs.find(o => o.big); return { hp: G.me.hp, marks: o && o.marks ? o.marks.length : 0, heat: o ? +o.heat.toFixed(2) : 0 }; });
  const hpB = await p.evaluate(() => G.foe.hp); await t('touchEnd', []); await p.waitForTimeout(150);
  const flyingB = await p.evaluate(() => ({ th: G.orbs.filter(o => o.big && o.thrown).length, trail: G.trails.length })); await p.waitForTimeout(1200);
  const boulderDmg = hpB - await p.evaluate(() => G.foe.hp), bigStays = await p.evaluate(() => G.orbs.filter(o => o.big && !o.dead && o.life > 0).length);
  console.log({ noStone, raised, blocked, flyingB, boulderDmg, bigStays });
  if (noStone) errs.push('tierra: sin piedras guardadas igual levantó la roca grande');
  if (!(raised.big === 1 && raised.left === 1)) errs.push('tierra: no levantó la roca grande gastando una piedra: ' + JSON.stringify(raised));
  if (!(blocked.hp > 99 && blocked.marks > 0 && blocked.heat > 0.3)) errs.push('tierra: la roca no defendió del fuego o no se quemó/calentó: ' + JSON.stringify(blocked));
  if (!(flyingB.trail > 0)) errs.push('tierra: la roca no salió lanzada dejando surco');
  if (!(boulderDmg > 15)) errs.push('tierra: la roca lanzada no dañó');
  if (bigStays !== 1) errs.push('tierra: la roca grande se rompió al golpear (ahora queda ahí)');
  // una roca grande en el suelo se puede volver a tomar y mover como esfera
  await p.evaluate(() => { G.orbs = []; G.foe.x = ARENA_W * 0.85; G.foe.y = ARENA_D * 0.15; G.foe.home = { x: G.foe.x, y: G.foe.y }; const o = raiseBoulder(null, G.me, 0, null); o.rise = 1; dropBig(o); }); await p.waitForTimeout(900);
  const restBig = await p.evaluate(() => { const o = G.orbs.find(o => o.big && o.rest); if (!o) return null; const v = view(); return { x: v.ox + o.x * v.k, y: v.oy + o.y * v.k }; });
  let grabbed = false; if (restBig) { await t('touchStart', [{ x: restBig.x, y: restBig.y }]); await p.waitForTimeout(40); for (let i = 1; i <= 10; i++) { await t('touchMove', [{ x: restBig.x + i * 6, y: restBig.y - i * 3 }]); await p.waitForTimeout(30); } grabbed = await p.evaluate(() => G.orbs.some(o => o.big && o.held)); await t('touchEnd', []); await p.waitForTimeout(500); }
  if (!restBig || !grabbed) errs.push('tierra: la roca grande no quedó en el suelo o no se pudo volver a mover');
  // contra la pared ya no se rompe: queda ahí
  const wall = await p.evaluate(async () => { G.orbs = []; G.foe.x = ARENA_W * 0.15; G.foe.y = ARENA_D * 0.85; G.foe.home = { x: G.foe.x, y: G.foe.y }; G.me.x = ARENA_W * 0.15; G.me.y = ARENA_D * 0.6; await new Promise(r => setTimeout(r, 300)); let kept = 0, broke = 0; for (let i = 0; i < 4; i++) { const o = newOrb('earth', ARENA_W * 0.5, TOP + ARENA_D * 0.15 * DEPTH); Object.assign(o, { big: true, size: BOULDER.size, hp: 1, heat: 0, spin: 0 }); G.orbs.push(o); throwBig(o, 500, 0, G.me); await new Promise(r => setTimeout(r, 700)); if (o.rest) kept++; else if (o.life <= 0) broke++; G.orbs = []; } return { kept, broke }; });
  if (!(wall.kept === 4 && wall.broke === 0)) errs.push('tierra: contra la pared debía quedar ahí: ' + JSON.stringify(wall));
  // corriendo + el gesto de la llamarada: surfea una roca (sólo con una piedra guardada, que gasta); al soltar se baja y la roca sale hacia donde apunta el dedo
  const surfTry = async (stone) => { await p.evaluate(stone => { G.orbs = []; G.me.x = ARENA_W * 0.3; G.me.y = ARENA_D * 0.6; if (stone) { const c = G.me.nodes[G.me.ix.upper], o = newOrb('earth', c.x, c.y); o.docked = true; o.owner = G.me; G.orbs.push(o); } }, stone); await p.waitForTimeout(300);
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(400); await swipeUp(); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ on: !!G.me.surf, z: +G.me.z.toFixed(0), sp: +Math.hypot(G.me.vx, G.me.vy).toFixed(0), stones: G.orbs.filter(o => o.docked && !o.dead).length }));
    await p.keyboard.up('ArrowRight'); await t('touchEnd', []); await p.waitForTimeout(100);
    r.after = await p.evaluate(() => { const o = G.orbs.find(o => o.big); return { on: !!G.me.surf, thrown: !!(o && o.thrown), up: o ? o.vy < -100 : false }; }); await p.waitForTimeout(800); r.landed = await p.evaluate(() => G.me.z === 0); return r; };
  const surfNo = await surfTry(false), surf = await surfTry(true);
  console.log({ restBig: !!restBig, grabbed, wall, surfNo, surf });
  if (surfNo.on) errs.push('tierra: surfeó sin piedras guardadas');
  if (!(surf.on && surf.z > 15 && surf.sp > 230 && surf.stones === 0)) errs.push('tierra: no surfeó la roca al correr (gastando la piedra): ' + JSON.stringify(surf));
  if (!(!surf.after.on && surf.after.thrown && surf.after.up && surf.landed)) errs.push('tierra: al soltar no se bajó o la roca no salió hacia donde apuntaba el dedo: ' + JSON.stringify(surf.after));
  // las piedras ya no se rompen: dos piedras lanzadas que chocan quedan ahí; una piedra contra la roca grande también; sólo dos rocas grandes se rompen
  await p.evaluate(() => { G.foe.x = ARENA_W * 0.8; G.foe.y = ARENA_D * 0.8; G.foe.home = { x: G.foe.x, y: G.foe.y }; G.me.x = ARENA_W * 0.2; G.me.y = ARENA_D * 0.3; }); await p.waitForTimeout(500);
  const breakR = await p.evaluate(async () => { G.orbs = []; const y = TOP + ARENA_D * 0.12 * DEPTH, a = newOrb('earth', 150, y), b = newOrb('earth', 370, y); G.orbs.push(a, b); launch(a, 500, 0, G.me); launch(b, -500, 0, G.foe);
    await new Promise(r => setTimeout(r, 700)); const left = G.orbs.filter(o => o.rest && !o.dead).length; G.orbs = []; const big = raiseBoulder(null, G.foe, Math.PI, null); big.rise = 1; const c = newOrb('earth', G.foe.gx - 160, big.gy - 20); G.orbs.push(c); launch(c, 600, 0, G.me);
    await new Promise(r => setTimeout(r, 600)); const stone = G.orbs.filter(o => !o.big && !o.dead && (o.rest || o.fall)).length; G.orbs = [];
    const y2 = TOP + ARENA_D * 0.12 * DEPTH, b1 = newOrb('earth', 120, y2), b2 = newOrb('earth', 400, y2); for (const q of [b1, b2]) { Object.assign(q, { big: true, size: BOULDER.size, hp: 1, heat: 0, spin: 0 }); G.orbs.push(q); } throwBig(b1, 500, 0, G.me); throwBig(b2, -500, 0, G.foe);
    await new Promise(r => setTimeout(r, 700)); return { left, stone, bigBroke: !G.orbs.some(o => o.big && !o.dead && o.life > 0), smallsFromBig: G.orbs.filter(o => !o.big && !o.dead).length }; });
  if (!(breakR.left === 2 && breakR.stone === 1 && breakR.bigBroke && breakR.smallsFromBig >= 2)) errs.push('las piedras debían quedar (sólo dos rocas grandes se rompen): ' + JSON.stringify(breakR));
  // aire: con anillo, corriendo + el gesto de la llamarada: se sienta en una bola de viento más veloz; al soltar sale como corriente
  await p.evaluate(() => { document.getElementById('btnBack').click(); document.querySelector('.elbtn[data-el="aire"]').click(); document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foeTest = false; G.foe.wait = 99; G.foe.el = 'tierra'; G.me.x = ARENA_W * 0.2; G.me.y = ARENA_D * 0.6; const c = G.me.nodes[G.me.ix.upper], o = newOrb('air', c.x, c.y); o.docked = true; o.owner = G.me; o.lvl = o.lvlS = 2; G.orbs.push(o); });
  await p.waitForTimeout(500); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(400); await swipeUp(); await p.waitForTimeout(500);
  const ride = await p.evaluate(() => ({ on: !!(G.me.surf && G.me.surf.ride), z: +G.me.z.toFixed(0), sp: +Math.hypot(G.me.vx, G.me.vy).toFixed(0), ring: +(G.orbs.find(o => o.docked && o.k === 'air') || { lvl: 0 }).lvl.toFixed(2) }));
  await p.keyboard.up('ArrowRight'); await t('touchEnd', []); await p.waitForTimeout(100); ride.current = await p.evaluate(() => G.orbs.some(o => o.k === 'air' && o.thrown));
  console.log({ ride });
  if (!(ride.on && ride.z > 15 && ride.sp > 330 && ride.ring < 2 && ride.current)) errs.push('aire: no se montó en la bola de viento o no salió como corriente: ' + JSON.stringify(ride));
  // choques entre esferas lanzadas: fuego + agua = vapor, el agua sigue achicada; piedra + fuego = la piedra detiene el fuego
  const orbClash = await p.evaluate(async () => { G.orbs = []; G.fx = []; const y = TOP + ARENA_D * 0.4 * DEPTH, a = newOrb('fire', 150, y), b = newOrb('water', 370, y); G.orbs.push(a, b); launch(a, 500, 0, G.me); launch(b, -500, 0, G.foe);
    await new Promise(r => setTimeout(r, 250)); const steam = G.fx.filter(q => q.k === 'steam').length, left = G.orbs.length, weak = !!b.weak && b.life > 0 && a.life <= 0; G.orbs = [];
    const c = newOrb('earth', 150, y), d = newOrb('fire', 370, y); G.orbs.push(c, d); launch(c, 500, 0, G.me); launch(d, -500, 0, G.foe);
    await new Promise(r => setTimeout(r, 250)); return { steam, left, weak, stone: G.orbs.filter(o => o.k === 'earth' && o.thrown && !o.weak).length, fire: G.orbs.filter(o => o.k === 'fire').length }; });
  if (!(orbClash.steam > 3 && orbClash.left === 1 && orbClash.weak)) errs.push('fuego contra agua: el agua debía seguir achicada y el fuego detenerse: ' + JSON.stringify(orbClash));
  if (!(orbClash.stone === 1 && orbClash.fire === 0)) errs.push('la piedra debía detener el fuego y seguir volando: ' + JSON.stringify(orbClash));
  console.log({ ring, airFar, airNear, smalls: smalls.length, rocks: rocks.n, stoneDmg, orbClash });
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
