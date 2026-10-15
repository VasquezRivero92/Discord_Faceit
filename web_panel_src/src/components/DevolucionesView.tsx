import React from 'react';
import { RefreshCw, ShieldCheck, Clock, CheckCircle2, AlertCircle, Mail, Phone } from 'lucide-react';

export const DevolucionesView: React.FC = () => {
  return (
    <div className="py-8 px-4 sm:px-6 max-w-4xl mx-auto text-white font-sans">
      <div className="bg-[#121212] border-2 border-[#242424] p-6 sm:p-10 shadow-2xl space-y-8">
        
        {/* Header */}
        <div className="border-b border-[#2C2C2C] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF5500]/15 border border-[#FF5500]/40 text-[#FF5500] text-xs font-mono font-bold uppercase mb-3">
            <RefreshCw className="w-3.5 h-3.5" /> REQUISITO LEGAL DE COMERCIO ELECTRÓNICO
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white font-mono">
            POLÍTICA DE CAMBIOS, CANCELACIONES Y DEVOLUCIONES
          </h1>
          <p className="text-neutral-400 text-xs font-mono mt-1">
            Garantía de Transparencia // Plataforma MachuPeek
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-xs text-neutral-300 leading-relaxed font-sans">
          
          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">1.</span> DERECHO A SOLICITAR DEVOLUCIÓN O REEMBOLSO
            </h2>
            <p>
              En la comunidad y plataforma <strong>MachuPeek</strong> nuestro compromiso es brindar una experiencia competitiva transparente y justa. De conformidad con las normas de comercio electrónico y las disposiciones del Código de Protección y Defensa del Consumidor (Ley N° 29571), todo usuario que adquiera productos, créditos o servicios en nuestro portal tiene derecho a solicitar la devolución de su dinero bajo las condiciones descritas en este documento.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">2.</span> PLAZO DE SOLICITUD
            </h2>
            <p>
              El usuario dispone de un plazo de hasta <strong>siete (7) días calendario</strong> contados a partir de la fecha de realización de la compra o recarga para solicitar la cancelación y devolución del monto pagado, siempre que el saldo no haya sido consumido en partidas oficiales.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">3.</span> CASOS EN LOS QUE APLICA LA DEVOLUCIÓN (100% REEMBOLSABLE)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
              <div className="p-3 bg-[#181818] border border-[#2D2D2D] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Saldo / Créditos No Consumidos</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Cualquier recarga de créditos gamer o saldo en billetera que no haya sido utilizado en torneos o cuotas es reembolsable al 100%.
                </p>
              </div>

              <div className="p-3 bg-[#181818] border border-[#2D2D2D] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Torneos Suspendidos o Cancelados</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Si un torneo o jornada mixtón se cancela por falta de quórum o fallas técnicas imputables a la plataforma, el valor del pase se reintegra íntegramente.
                </p>
              </div>

              <div className="p-3 bg-[#181818] border border-[#2D2D2D] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Cobros Duplicados o Erróneos</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  En caso de que el sistema o la pasarela procese dos veces una misma transacción por error de red, el cargo duplicado se extorna de inmediato.
                </p>
              </div>

              <div className="p-3 bg-[#181818] border border-[#2D2D2D] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Cancelación de Coaching con 24h</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Si reservaste una sesión de coaching táctico y avisas con al menos 24 horas de anticipación a su inicio, puedes reprogramar o pedir reembolso.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">4.</span> EXCLUSIONES (NO APLICA DEVOLUCIÓN)
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-neutral-300">
              <li>Créditos que ya hayan sido disputados o consumidos en partidas ya jugadas o terminadas.</li>
              <li>Sesiones de coaching 1v1 que ya hayan sido impartidas en su totalidad.</li>
              <li>Usuarios sancionados o baneados por el anticheat de FACEIT o por el sistema de arbitraje por uso comprobado de trampas (cheats), toxicidad grave o desacato de las normas de la comunidad.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">5.</span> PROCEDIMIENTO PARA SOLICITAR UN REEMBOLSO
            </h2>
            <p>
              Para iniciar el trámite de devolución, el titular de la compra debe remitir un mensaje a cualquiera de nuestros canales oficiales:
            </p>
            <div className="bg-[#181818] border border-[#2D2D2D] p-4 space-y-2 font-mono text-xs">
              <div><strong className="text-white">Correo electrónico:</strong> <span className="text-[#0088FF]">machupeek@gmail.com</span></div>
              <div><strong className="text-white">WhatsApp de Soporte:</strong> <span className="text-emerald-400">+51 949 165 677</span></div>
              <div className="border-t border-[#262626] pt-2 text-neutral-400">
                <strong>Datos requeridos en la solicitud:</strong>
                <ul className="list-disc pl-5 mt-1 text-[11px]">
                  <li>Código de Referencia o ID de pago (visible en tu comprobante).</li>
                  <li>Nombre completo y correo del comprador.</li>
                  <li>Motivo de la solicitud de devolución.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">6.</span> TIEMPOS Y PLAZOS DE EXTORNOS Y REINTEGROS
            </h2>
            <div className="p-4 bg-[#141820] border border-[#1E3A5F] space-y-2 font-mono text-xs text-neutral-300">
              <div className="flex items-center gap-2 text-white font-bold">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Cronograma de procesamiento:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-neutral-300">
                <li><strong>Aprobación por MachuPeek:</strong> 24 a 48 horas hábiles tras recibir la solicitud.</li>
                <li><strong>Reintegro vía Yape:</strong> Se procesa dentro de las 24 a 48 horas siguientes a la aprobación.</li>
                <li><strong>Reversión en Tarjetas (Débito o Crédito):</strong> Una vez procesada la reversión, el tiempo en que se refleja en tu estado de cuenta depende de la entidad bancaria emisora (usualmente entre <strong>5 a 15 días hábiles</strong>).</li>
              </ul>
            </div>
          </section>
        </div>

        {/* Guarantee Seal */}
        <div className="pt-6 border-t border-[#2C2C2C] flex items-center gap-2 text-xs font-mono text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <span>Política de Devoluciones conforme al Código de Protección y Defensa del Consumidor (Ley N° 29571).</span>
        </div>
      </div>
    </div>
  );
};
