// Prueba de cómo reacciona cada elemento al chocar (esferas lanzadas, guardadas y en la mano):
// el aire y el agua le quitan vuelo a la tierra (el fuego no); el agua detiene al aire y al fuego; la tierra detiene todo; el fuego detiene al aire y achica al agua sin detenerla; mismo elemento: se anulan.
// Uso: node tools/hits.js
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ ...devices['iPhone 13'] });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
  await p.click('.elbtn[data-el="fuego"]');
  await p.evaluate(() => { document.getElementById('calib').hidden = true; G.phase = 'fight'; G.foeTest = false; G.foe.wait = 99; G.foe.el = 'tierra'; G.me.x = ARENA_W * 0.15; G.me.y = ARENA_D * 0.85; G.foe.x = ARENA_W * 0.85; G.foe.y = ARENA_D * 0.85; G.foe.home = { x: G.foe.x, y: G.foe.y }; });
  await p.waitForTimeout(500);
  // A (tuya) y B (del rival) lanzadas una contra otra
  const pairTest = (ka, kb) => p.evaluate(async ([ka, kb]) => {
    G.orbs = []; G.fx = []; const y = TOP + ARENA_D * 0.3 * DEPTH, a = newOrb(ka, 160, y), b = newOrb(kb, 360, y); G.orbs.push(a, b); launch(a, 500, 0, G.me); launch(b, -500, 0, G.foe);
    const va = Math.abs(a.vx), vb = Math.abs(b.vx); await new Promise(r => setTimeout(r, 300));
    const st = (o, v0) => o.life <= 0 || o.dead || (!o.thrown && o.k === 'earth') ? 'stop' : o.weak ? 'weak' : Math.abs(o.vx) < v0 * 0.9 ? 'slow' : 'ok';
    return [st(a, va), st(b, vb)];
  }, [ka, kb]);
  const want = { 'fire/water': ['stop', 'weak'], 'fire/air': ['ok', 'stop'], 'fire/earth': ['stop', 'ok'], 'water/air': ['ok', 'stop'], 'water/earth': ['stop', 'slow'], 'air/earth': ['stop', 'slow'], 'earth/earth': ['stop', 'stop'], 'fire/fire': ['stop', 'stop'], 'water/water': ['stop', 'stop'], 'air/air': ['stop', 'stop'] };
  const res = {};
  for (const [k, w] of Object.entries(want)) { const [ka, kb] = k.split('/'); const r = await pairTest(ka, kb); res[k] = r.join(' / ');
    if (r[0] !== w[0] || r[1] !== w[1]) errs.push(`${k}: se esperaba ${w.join(' / ')}, dio ${r.join(' / ')}`); }
  // guardadas y en la mano también chocan
  const stayTest = (mine, mode, inc) => p.evaluate(async ([mine, mode, inc]) => {
    G.orbs = []; const c = G.me.nodes[G.me.ix.upper], o = newOrb(mine, c.x + 40, c.y); o.owner = G.me; G.orbs.push(o);
    if (mode === 'docked') { o.docked = true; o.lvl = 1; if (mine === 'water') o.side = 1; } else { o.held = true; o.x = c.x + 60; o.y = c.y - 80; const v = view(); PTRS.set(999, { x: v.ox + o.x * v.k, y: v.oy + o.y * v.k, x0: 0, y0: 0, t0: performance.now(), moved: true, prop: -1, orb: o }); } // en la mano: un dedo simulado la sostiene
    await new Promise(r => setTimeout(r, 300));
    const tx = o.x, ty = o.y, i = newOrb(inc, tx + 140, ty); G.orbs.push(i); launch(i, -700, 0, G.foe);
    await new Promise(r => setTimeout(r, 350));
    PTRS.delete(999); return { mine: o.life <= 0 || o.dead ? 'gone' : o.weak ? 'weak' : 'ok', inc: i.weak ? 'weak' : i.life <= 0 || i.dead || (!i.thrown && inc === 'earth') ? 'stop' : 'ok' }; // (la que se achica puede seguir y golpearte)
  }, [mine, mode, inc]);
  const stays = [['fire', 'docked', 'air', 'ok', 'stop'], ['fire', 'docked', 'water', 'gone', 'weak'], ['earth', 'docked', 'fire', 'ok', 'stop'], ['water', 'held', 'fire', 'weak', 'stop']];
  res.stay = {};
  for (const [mine, mode, inc, wm, wi] of stays) { const r = await stayTest(mine, mode, inc); res.stay[`${mine} ${mode} / ${inc}`] = r;
    if (r.mine !== wm || r.inc !== wi) errs.push(`${mine} ${mode} contra ${inc}: se esperaba ${wm} / ${wi}, dio ${r.mine} / ${r.inc}`); }
  console.log(res);
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors'); await b.close();
})();
