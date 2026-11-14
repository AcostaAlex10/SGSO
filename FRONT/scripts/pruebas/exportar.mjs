// Prueba del generador de CSV (RF37): escape, BOM, separador `;`, anti
// inyeccion de formulas, decimales con coma y fecha de Buenos Aires.
// No necesita navegador ni servidor: importa el modulo TypeScript directo
// (Node 22.18+ le quita los tipos solo).
import { generarCsv, celdaCsv, numeroAR, fechaAR, fechaLocalBA, nombreArchivo } from '../../src/app/exportar.ts';

let fallas = 0, total = 0;
const igual = (q, real, esperado) => {
  total++;
  const bien = real === esperado;
  if (!bien) fallas++;
  console.log(`${bien ? '  OK  ' : ' FALLA'} ${q}${bien ? '' : ` — esperado ${JSON.stringify(esperado)}, real ${JSON.stringify(real)}`}`);
};

// Escape
igual('celda con ; va entre comillas', celdaCsv('a;b'), '"a;b"');
igual('comillas se duplican', celdaCsv('di "hola"'), '"di ""hola"""');
igual('salto de linea va entre comillas', celdaCsv('a\nb'), '"a\nb"');
igual('texto comun queda igual', celdaCsv('Hormigon H21'), 'Hormigon H21');
igual('null y undefined quedan vacios', celdaCsv(null) + celdaCsv(undefined), '');

// Anti formula
for (const c of ['=1+1', '+1', '-1', '@SUMA(A1)', '\tx', '\rx', ' =1+1', '\u00A0=1+1', '  @x', '＝1', '＋1', '－1', '＠x', ' ＝1']) {
  const r = celdaCsv(c);
  igual(`formula ${JSON.stringify(c)} se prefija con '`, r.replace(/^"/, '').startsWith("'"), true);
}
igual('formula con ; se prefija y se escapa', celdaCsv('=A1;B1'), '"\'=A1;B1"');
igual('un numero negativo NO se prefija', celdaCsv(-5.5), '-5,5');

// Numeros
igual('decimal con coma', numeroAR(12.5), '12,5');
igual('sin separador de miles', numeroAR(1234567.25), '1234567,25');
igual('entero', numeroAR(40), '40');
igual('no finito queda vacio', numeroAR(NaN), '');

// Fechas
igual('fecha dd/mm/aaaa', fechaAR('2026-03-09'), '09/03/2026');
igual('fecha con hora', fechaAR('2026-03-09 14:00:00'), '09/03/2026');
igual('texto no fecha queda igual', fechaAR('ayer'), 'ayer');
// 02:30 UTC del 15/11 todavia es 14/11 a la noche en Buenos Aires (UTC-3).
igual('fecha BA no es UTC', fechaLocalBA(new Date('2026-11-15T02:30:00Z')), '2026-11-14');
igual('fecha BA de mediodia', fechaLocalBA(new Date('2026-11-15T15:00:00Z')), '2026-11-15');
igual('nombre de archivo', nombreArchivo(7, 'avance', new Date('2026-11-15T02:30:00Z')), 'obra-7-avance-2026-11-14.csv');

// CSV completo
const csv = generarCsv(['Material', 'Asignado'], [['Cemento', 12.5], ['=x', 3]]);
igual('empieza con BOM', csv.charCodeAt(0), 0xFEFF);
igual('contenido, separador y CRLF', csv.slice(1), 'Material;Asignado\r\nCemento;12,5\r\n\'=x;3\r\n');
igual('sin filas: solo encabezados', generarCsv(['A', 'B'], []).slice(1), 'A;B\r\n');

console.log(`\n${total - fallas}/${total} OK`);
process.exit(fallas ? 1 : 0);
