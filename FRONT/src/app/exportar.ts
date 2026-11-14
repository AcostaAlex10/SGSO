// Exportación de resúmenes a CSV (RF37). Módulo puro: no toca el DOM salvo en
// `descargarCsv`. El CSV sale pensado para Excel en español de Argentina:
// separador `;`, UTF-8 con BOM y fin de línea CRLF.

export type Celda = string | number | null | undefined;

const BOM = "﻿";
const SEPARADOR = ";";
const FIN_DE_LINEA = "\r\n";
const ZONA = "America/Argentina/Buenos_Aires";

/** Número con coma decimal y sin separador de miles. Vacío si no es finito. */
export function numeroAR(n: number): string {
  if (!Number.isFinite(n)) return "";
  // toString() puede dar notación científica en magnitudes extremas: toFixed
  // no, pero redondea; se usa solo cuando hace falta.
  const texto = /e/i.test(String(n)) ? n.toFixed(20).replace(/\.?0+$/, "") : String(n);
  return texto.replace(".", ",");
}

/** `AAAA-MM-DD` (o con hora) a `dd/mm/aaaa`. Lo que no es una fecha ISO se deja tal cual. */
export function fechaAR(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

/** Fecha de hoy `AAAA-MM-DD` en Buenos Aires (no en UTC: a la noche UTC ya es mañana). */
export function fechaLocalBA(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(ahora);
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")}`;
}

/** Una celda lista para el CSV: números formateados, texto a prueba de fórmulas y escapado. */
export function celdaCsv(valor: Celda): string {
  if (valor === null || valor === undefined) return "";
  let texto: string;
  if (typeof valor === "number") {
    texto = numeroAR(valor);
  } else {
    texto = valor;
    // Una celda que empieza así la interpreta Excel como fórmula (inyección).
    if (/^[\s\u00A0]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]/.test(texto) || /^[\t\r]/.test(texto)) texto = "'" + texto;
  }
  if (/[;"\r\n]/.test(texto)) texto = '"' + texto.replace(/"/g, '""') + '"';
  return texto;
}

/** Arma el contenido del CSV (con BOM). Sin filas, queda solo el encabezado. */
export function generarCsv(encabezados: string[], filas: Celda[][]): string {
  const lineas = [encabezados, ...filas].map((f) => f.map(celdaCsv).join(SEPARADOR));
  return BOM + lineas.join(FIN_DE_LINEA) + FIN_DE_LINEA;
}

export function nombreArchivo(idObra: string | number, tipo: "avance" | "materiales", ahora: Date = new Date()): string {
  return `obra-${idObra}-${tipo}-${fechaLocalBA(ahora)}.csv`;
}

/** Dispara la descarga en el navegador. */
export function descargarCsv(nombre: string, contenido: string): void {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Se libera después del click: algunos navegadores necesitan el turno siguiente.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
