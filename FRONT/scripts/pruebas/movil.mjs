// Medicion de uso desde el celular (RNF01) sobre la demo estatica.
// Viewports 360x640 y 390x844 (pantallas) y 640x360 (dialogos en horizontal).
// Falla (salida 1) si hay scroll horizontal de la pagina, elementos fuera del
// viewport fuera de un contenedor con scroll, dialogos que no se pueden recorrer
// o botones de menu / cerrar sesion menores a 44x44. Lo demas (objetivos tactiles
// chicos, texto < 12 px, inputs numericos sin inputMode) solo se informa.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.SGSO_URL || 'http://127.0.0.1:8123/SGSO/';
const CAPTURAS = process.env.SGSO_CAPTURAS || join(process.env.TMPDIR || tmpdir(), 'sgso-movil');
mkdirSync(CAPTURAS, { recursive: true });

const datos = JSON.parse(readFileSync(new URL('../../src/app/mock/datos.json', import.meta.url), 'utf8'));
const ID_OBRA = String(datos.proyectos[0].id);

const CUENTAS = {
  tecnico:        { email: 'tecnico@sgso.test',        pass: 'tecnico123' },
  gerente:        { email: 'gerente@sgso.test',        pass: 'gerente123' },
  administrativo: { email: 'administrativo@sgso.test', pass: 'admin123' },
  admin:          { email: 'admin@sgso.test',          pass: 'admin123' },
};
const MENU = ['/', '/proyectos', '/seguimiento', '/materiales', '/documentacion', '/reportes', '/alertas', '/maquinaria'];
const PLAN = [
  { rol: 'tecnico', rutas: [...MENU, '/zzz-no-existe'], menu: true },
  { rol: 'gerente', rutas: ['/', '/alertas'] },
  { rol: 'administrativo', rutas: ['/proyectos', '/reportes', `/proyectos/${ID_OBRA}`], dialogos: true },
  { rol: 'admin', rutas: ['/usuarios'] },
  { rol: null, rutas: ['/login', '/olvide', '/restablecer'] },
];
const VIEWPORTS = [
  { nombre: '360x640', width: 360, height: 640 },
  { nombre: '390x844', width: 390, height: 844 },
];
const HORIZONTAL = { nombre: '640x360', width: 640, height: 360 };

const resultados = [];
const informe = []; // informativo, no falla
function chequear(donde, que, ok, detalle = '') {
  resultados.push({ donde, que, ok, detalle });
  console.log(`${ok ? '  OK  ' : ' FALLA'} [${donde}] ${que}${detalle ? ' — ' + detalle : ''}`);
}
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'raiz';

// --- Medidas dentro de la pagina -------------------------------------------

function medirPagina() {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };
  const desc = (el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return `${el.tagName.toLowerCase()}${t ? `"${t}"` : ''}`;
  };
  const scroller = (el) => {
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      if (a.tagName === 'MAIN' || a === document.body) continue; // main scrollea en Y, su overflow-x computado es auto pero no cuenta
      const ox = getComputedStyle(a).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    return false;
  };
  const enSidebarCerrado = (el) => !!el.closest('aside');
  const enDialogo = (el) => !!el.closest('[role=dialog]');

  const doc = document.documentElement;
  const main = document.querySelector('main');
  const hscrollDoc = doc.scrollWidth > doc.clientWidth + 1;
  const hscrollMain = !!main && main.scrollWidth > main.clientWidth + 1;

  const fuera = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    if (enSidebarCerrado(el) || enDialogo(el)) continue;
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    if (!(r.right > vw + 1 || r.left < -1)) continue;
    // sr-only y similares
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' && cs.clip !== 'auto' && r.width <= 1) continue;
    if (scroller(el)) continue;
    fuera.push(`${desc(el)}@${Math.round(r.left)}..${Math.round(r.right)}`);
  }

  // Informativos
  const sel = 'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=combobox], [role=checkbox], [role=tab], [role=switch]';
  let menor44 = 0, menor24 = 0;
  const chicos = [];
  for (const el of document.querySelectorAll(sel)) {
    if (enSidebarCerrado(el) || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right < 0 || r.left > vw) continue;
    const m = Math.min(r.width, r.height);
    if (m < 44) { menor44++; if (m < 24) { menor24++; if (chicos.length < 3) chicos.push(desc(el)); } }
  }
  let texto12 = 0;
  const textos = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.textContent.trim()) continue;
    const p = n.parentElement;
    if (!p || p.closest('aside,script,style') || !visible(p)) continue;
    if (parseFloat(getComputedStyle(p).fontSize) < 12) { texto12++; if (textos.size < 3) textos.add(n.textContent.trim().slice(0, 24)); }
  }
  const numSinModo = [...document.querySelectorAll('input[type=number]')].filter((i) => visible(i) && !i.getAttribute('inputmode')).length;

  return { hscrollDoc, hscrollMain, sw: doc.scrollWidth, cw: doc.clientWidth, fuera, menor44, menor24, chicos, texto12, textos: [...textos], numSinModo, vh };
}

function medirDialogo() {
  const vh = window.innerHeight, vw = document.documentElement.clientWidth;
  const d = document.querySelector('[role=dialog]');
  if (!d) return null;
  const cs = getComputedStyle(d);
  const scrollable = (cs.overflowY === 'auto' || cs.overflowY === 'scroll');
  const r0 = d.getBoundingClientRect();
  const cabe = r0.top >= -1 && r0.bottom <= vh + 1;
  const fueraAncho = r0.left < -1 || r0.right > vw + 1;
  const recorrible = d.scrollHeight <= d.clientHeight + 1 || scrollable;
  d.scrollTop = d.scrollHeight;
  const botonesFuera = [];
  for (const b of d.querySelectorAll('button')) {
    const r = b.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (b.querySelector('.sr-only') && r.width < 30) continue; // la X de cerrar vive arriba
    if (r.bottom > vh + 1 || r.top < -1 || r.right > vw + 1 || r.left < -1)
      botonesFuera.push(`"${(b.textContent || '').trim().slice(0, 20)}"@${Math.round(r.top)}..${Math.round(r.bottom)}`);
  }
  const abajo = d.scrollHeight - d.clientHeight - d.scrollTop <= 1;
  d.scrollTop = 0;
  return { cabe, fueraAncho, scrollable, recorrible, botonesFuera, abajo, alto: Math.round(r0.height), scrollH: d.scrollHeight, vh };
}

// --- Ayudas de navegacion --------------------------------------------------

async function abrirSesion(navegador, vp, rol, opts = {}) {
  const ctx = await navegador.newContext({
    viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
  if (rol) {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.fill('input[type=email]', CUENTAS[rol].email);
    await page.fill('input[type=password]', CUENTAS[rol].pass);
    await page.tap('button[type=submit]').catch(() => page.click('button[type=submit]'));
    await page.waitForURL((u) => !u.hash.includes('/login'), { timeout: 15000 }).catch(() => {});
  }
  return { ctx, page, errores };
}

async function irA(page, ruta) {
  await page.goto(BASE + '#' + ruta, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
}

const ruidoConsola = (e) => /favicon|Download the React DevTools|ERR_CERT_AUTHORITY_INVALID/i.test(e);

// --- Corrida ---------------------------------------------------------------

const navegador = await chromium.launch(process.env.SGSO_CHROMIUM ? { executablePath: process.env.SGSO_CHROMIUM } : {});

for (const vp of VIEWPORTS) {
  for (const plan of PLAN) {
    const { ctx, page, errores } = await abrirSesion(navegador, vp, plan.rol);
    const quien = plan.rol ?? 'sin sesion';
    for (const ruta of plan.rutas) {
      const donde = `${vp.nombre} ${quien} ${ruta}`;
      await irA(page, ruta);
      const m = await page.evaluate(medirPagina);
      await page.screenshot({ path: join(CAPTURAS, `${vp.nombre}_${quien}_${slug(ruta)}.png`), fullPage: false });
      chequear(donde, 'sin scroll horizontal de la pagina', !m.hscrollDoc, m.hscrollDoc ? `scrollWidth ${m.sw} > ${m.cw}` : '');
      chequear(donde, 'sin scroll horizontal de main', !m.hscrollMain);
      chequear(donde, 'nada fuera del viewport fuera de un scroll', m.fuera.length === 0, m.fuera.slice(0, 4).join(' | '));
      informe.push({ donde, m44: m.menor44, m24: m.menor24, chicos: m.chicos, t12: m.texto12, textos: m.textos, num: m.numSinModo });
    }

    // Boton del menu y cerrar sesion (una vez por rol y viewport)
    if (plan.rol) {
      await irA(page, '/');
      const menuBtn = page.locator('header button').first();
      const mb = await menuBtn.boundingBox();
      const ok1 = !!mb && mb.width >= 44 && mb.height >= 44;
      chequear(`${vp.nombre} ${quien}`, 'boton del menu >= 44x44 con aria-label',
        ok1 && !!(await menuBtn.getAttribute('aria-label')), mb ? `${Math.round(mb.width)}x${Math.round(mb.height)}` : 'no encontrado');
      await menuBtn.click().catch(() => {});
      await page.waitForTimeout(400);
      const out = page.locator('aside button[aria-label="Cerrar sesión"], aside button[title="Cerrar sesion"], aside button[title="Cerrar sesión"]').first();
      const ob = await out.boundingBox().catch(() => null);
      chequear(`${vp.nombre} ${quien}`, 'cerrar sesion >= 44x44 con aria-label',
        !!ob && ob.width >= 44 && ob.height >= 44 && !!(await out.getAttribute('aria-label').catch(() => null)),
        ob ? `${Math.round(ob.width)}x${Math.round(ob.height)}` : 'no encontrado');
      await page.screenshot({ path: join(CAPTURAS, `${vp.nombre}_${quien}_menu_abierto.png` ) });
      await page.reload({ waitUntil: 'networkidle' }); // cierra el menu
    }

    // Barra superior: nada se sale ni se parte en 360
    if (plan.rol) {
      await irA(page, '/');
      const hdr = await page.evaluate(() => {
        const h = document.querySelector('header');
        const r = h.getBoundingClientRect();
        return { sw: h.scrollWidth, cw: h.clientWidth, alto: Math.round(r.height) };
      });
      chequear(`${vp.nombre} ${quien}`, 'barra superior sin desborde', hdr.sw <= hdr.cw + 1, `scroll ${hdr.sw} / ancho ${hdr.cw}`);
    }

    // Dialogos
    if (plan.dialogos) {
      const casos = [
        { ruta: '/proyectos', boton: /Nuevo Proyecto/i, nombre: 'crear obra' },
        { ruta: '/reportes', boton: /Nuevo reporte/i, nombre: 'nuevo reporte' },
      ];
      for (const c of casos) {
        await irA(page, c.ruta);
        await page.getByRole('button', { name: c.boton }).first().click().catch(() => {});
        await page.waitForTimeout(500);
        const dd = await page.evaluate(medirDialogo);
        const donde = `${vp.nombre} ${quien} dialogo ${c.nombre}`;
        chequear(donde, 'el dialogo abre', !!dd);
        if (dd) {
          chequear(donde, 'se puede recorrer o cabe', dd.recorrible && (dd.cabe || dd.scrollable), `alto ${dd.alto}/${dd.vh}, contenido ${dd.scrollH}, scroll ${dd.scrollable}`);
          chequear(donde, 'botones de accion alcanzables al final', dd.botonesFuera.length === 0 && !dd.fueraAncho, dd.botonesFuera.join(' | '));
          await page.screenshot({ path: join(CAPTURAS, `${vp.nombre}_dialogo_${slug(c.nombre)}.png`) });
        }
        await page.keyboard.press('Escape');
      }
    }
    const ruido = errores.filter((e) => !ruidoConsola(e));
    chequear(`${vp.nombre} ${quien}`, 'sin errores en consola', ruido.length === 0, ruido.slice(0, 2).join(' | '));
    await ctx.close();
  }
}

// Dialogos en horizontal (640x360): el formulario largo tiene que poder recorrerse.
{
  const { ctx, page } = await abrirSesion(navegador, HORIZONTAL, 'administrativo');
  for (const c of [
    { ruta: '/proyectos', boton: /Nuevo Proyecto/i, nombre: 'crear obra' },
    { ruta: '/reportes', boton: /Nuevo reporte/i, nombre: 'nuevo reporte' },
  ]) {
    await irA(page, c.ruta);
    await page.getByRole('button', { name: c.boton }).first().click().catch(() => {});
    await page.waitForTimeout(500);
    const dd = await page.evaluate(medirDialogo);
    const donde = `${HORIZONTAL.nombre} dialogo ${c.nombre}`;
    chequear(donde, 'el dialogo abre', !!dd);
    if (dd) {
      chequear(donde, 'se puede recorrer o cabe', dd.recorrible && (dd.cabe || dd.scrollable), `alto ${dd.alto}/${dd.vh}, contenido ${dd.scrollH}, scroll ${dd.scrollable}`);
      chequear(donde, 'botones de accion alcanzables al final', dd.botonesFuera.length === 0 && !dd.fueraAncho, dd.botonesFuera.join(' | '));
      await page.screenshot({ path: join(CAPTURAS, `${HORIZONTAL.nombre}_dialogo_${slug(c.nombre)}.png`) });
    }
    await page.keyboard.press('Escape');
  }
  await ctx.close();
}

await navegador.close();

// --- Informe (no falla) ----------------------------------------------------
console.log('\n--- Informativo (no falla el guion) ---');
console.log('pantalla | objetivos tactiles <44 px | <24 px | textos <12 px | inputs numericos sin inputMode');
for (const i of informe) {
  console.log(`${i.donde} | ${i.m44} | ${i.m24}${i.chicos.length ? ' (' + i.chicos.join(', ') + ')' : ''} | ${i.t12}${i.textos.length ? ' (' + i.textos.join(', ') + ')' : ''} | ${i.num}`);
}
console.log(`Capturas en ${CAPTURAS}`);

const fallas = resultados.filter((r) => !r.ok);
console.log(`\n=== ${resultados.length - fallas.length}/${resultados.length} comprobaciones OK ===`);
if (fallas.length) {
  console.log('FALLAS:');
  for (const f of fallas) console.log(` - [${f.donde}] ${f.que} — ${f.detalle}`);
  process.exit(1);
}
