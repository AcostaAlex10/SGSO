// Vista de impresión de los resúmenes de una obra (RF37). Solo se ve al
// imprimir (`hidden print:block`); el "PDF" es la impresión del navegador.
// Fondo claro y texto oscuro a propósito: el tema de la app es oscuro.
import type { Proyecto, Resumen, Avance, AsignacionMaterial, EtapaPlanificacion } from "../api/proyectos";
import { etiquetaEstado } from "../estadosObra";
import { fechaAR, fechaLocalBA } from "../exportar";

export type TipoResumen = "avance" | "materiales";

interface Props {
  tipo: TipoResumen;
  proyecto: Proyecto;
  resumen: Resumen | null;
  avances: Avance[];
  materiales: AsignacionMaterial[];
  etapas: EtapaPlanificacion[];
  verCostos: boolean;
}

const th = "border border-neutral-400 bg-neutral-100 px-2 py-1 text-left font-semibold";
const td = "border border-neutral-400 px-2 py-1 align-top";
const tr = "break-inside-avoid";

export function ResumenImpresion({ tipo, proyecto, resumen, avances, materiales, etapas, verCostos }: Props) {
  const titulo = tipo === "avance" ? "Resumen de avance" : "Resumen de materiales";
  return (
    <div className="hidden print:block bg-white text-neutral-900 text-[11pt]" data-vista-impresion={tipo}>
      <h1 className="text-xl font-bold">{proyecto.nombre}</h1>
      <p className="text-sm">{titulo} · Emitido el {fechaAR(fechaLocalBA())}</p>

      <div className="grid grid-cols-4 gap-2 my-4 break-inside-avoid">
        <Dato etiqueta="Estado" valor={etiquetaEstado(proyecto.estado)} />
        <Dato etiqueta="Avance real" valor={resumen ? `${resumen.avance_real}%` : "—"} />
        <Dato etiqueta="Esperado hoy" valor={resumen ? `${resumen.avance_esperado}%` : "—"} />
        <Dato etiqueta="Desvío" valor={resumen ? `${resumen.desvio_pp} pp` : "—"} />
      </div>

      {tipo === "avance" ? (
        <>
          <h2 className="font-semibold mb-1">Avances registrados ({avances.length})</h2>
          {avances.length === 0 ? <p>Sin registros</p> : (
            <table className="w-full border-collapse text-sm mb-5">
              <thead><tr className={tr}><th className={th}>Fecha</th><th className={th}>Avance (%)</th><th className={th}>Cantidad ejecutada</th><th className={th}>Observaciones</th></tr></thead>
              <tbody>
                {avances.map((a) => (
                  <tr key={a.id_avance} className={tr}>
                    <td className={td}>{fechaAR(a.fecha)}</td>
                    <td className={td}>{a.porcentaje_avance}%</td>
                    <td className={td}>{a.cantidad_ejecutada}</td>
                    <td className={td}>{a.observaciones ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h2 className="font-semibold mb-1">Etapas de la planificación</h2>
          {etapas.length === 0 ? <p>Sin registros</p> : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className={tr}>
                  <th className={th}>Etapa</th><th className={th}>Peso (%)</th><th className={th}>Inicio</th><th className={th}>Fin</th>
                  {verCostos && <th className={th}>Presupuesto base</th>}
                </tr>
              </thead>
              <tbody>
                {etapas.map((e) => (
                  <tr key={e.id_etapa} className={tr}>
                    <td className={td}>{e.nombre}</td>
                    <td className={td}>{e.peso_porcentual}%</td>
                    <td className={td}>{fechaAR(e.fecha_inicio)}</td>
                    <td className={td}>{fechaAR(e.fecha_fin)}</td>
                    {verCostos && <td className={td}>${(e.presupuesto_base ?? 0).toLocaleString("es-AR")}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <>
          <h2 className="font-semibold mb-1">Materiales asignados ({materiales.length})</h2>
          {materiales.length === 0 ? <p>Sin registros</p> : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className={tr}>
                  <th className={th}>Material</th><th className={th}>Unidad</th><th className={th}>Asignado</th>
                  <th className={th}>Consumido</th><th className={th}>Restante</th><th className={th}>Excedido</th>
                </tr>
              </thead>
              <tbody>
                {materiales.map((m) => (
                  <tr key={m.id_asignacion} className={tr}>
                    <td className={td}>{m.nombre}</td>
                    <td className={td}>{m.unidad}</td>
                    <td className={td}>{m.cantidad_asignada}</td>
                    <td className={td}>{m.consumido}</td>
                    <td className={td}>{m.restante}</td>
                    <td className={td}>{m.excedido ? "Sí" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="border border-neutral-400 px-2 py-1">
      <div className="text-xs text-neutral-600">{etiqueta}</div>
      <div className="font-bold">{valor}</div>
    </div>
  );
}
