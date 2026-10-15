import React from 'react';
import { ShieldCheck, FileText, Scale, CheckCircle2 } from 'lucide-react';

export const TerminosCondicionesView: React.FC = () => {
  return (
    <div className="py-8 px-4 sm:px-6 max-w-4xl mx-auto text-white font-sans">
      <div className="bg-[#121212] border-2 border-[#242424] p-6 sm:p-10 shadow-2xl space-y-8">
        
        {/* Header */}
        <div className="border-b border-[#2C2C2C] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF5500]/15 border border-[#FF5500]/40 text-[#FF5500] text-xs font-mono font-bold uppercase mb-3">
            <FileText className="w-3.5 h-3.5" /> MARCO LEGAL APLICABLE EN EL PERÚ
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white font-mono">
            TÉRMINOS Y CONDICIONES DE USO
          </h1>
          <p className="text-neutral-400 text-xs font-mono mt-1">
            Última actualización: Octubre 2026 // Plataforma MachuPeek
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-xs text-neutral-300 leading-relaxed font-sans">
          
          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">1.</span> INFORMACIÓN GENERAL Y CANAL DE ATENCIÓN
            </h2>
            <p>
              El presente sitio web <strong>https://apphub.wisp.uno</strong> es la plataforma oficial de la comunidad <strong>MachuPeek</strong> (en adelante, "MachuPeek"). Modalidad de operación y atención al usuario: <strong>Online</strong>.
            </p>
            <p>
              Para cualquier consulta, asistencia o comunicación formal, ponemos a disposición de los usuarios nuestro canal de atención: correo electrónico <strong>machupeek@gmail.com</strong> y WhatsApp <strong>+51 949 165 677</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">2.</span> OBJETO DEL SERVICIO
            </h2>
            <p>
              MachuPeek es una plataforma en línea de entretenimiento y esports que ofrece servicios de organización de torneos, emparejamiento competitivo balanceado (matchmaking draft) para jugadores del videojuego Counter-Strike 2 en servidores de bajo ping ubicados en Lima, venta de pases de acceso a torneos, suscripciones VIP, créditos gamer para cuotas y retos, y sesiones de asesoría y coaching individual.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">3.</span> CONDICIONES DE REGISTRO Y ACCESO
            </h2>
            <p>
              Para participar en las partidas competitivas, los usuarios deben vincular voluntariamente su cuenta de Discord y/o FACEIT. El usuario es el único responsable de la custodia de sus credenciales y de toda actividad realizada desde su cuenta. Se prohíbe la suplantación de identidad o el uso de cuentas compartidas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">4.</span> PRECIOS Y MEDIOS DE PAGO (YAPE Y TARJETAS)
            </h2>
            <p>
              Todos los precios de los productos y servicios ofrecidos en el sitio web están expresados en <strong>Soles peruanos (PEN)</strong> e incluyen el Impuesto General a las Ventas (IGV - 18%), de conformidad con la legislación tributaria peruana vigente.
            </p>
            <p>
              Las transacciones y cobros electrónicos se procesan de manera cifrada e inmediata mediante pasarela de pagos segura y certificada SSL. Los medios de pago habilitados incluyen:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-300">
              <li><strong>Yape:</strong> Cobro y recarga automática mediante número de celular y Código de Aprobación OTP generado en la app de Yape.</li>
              <li><strong>Tarjetas de Débito y Crédito:</strong> Visa, Mastercard, American Express y Diners Club con tecnología de autenticación segura 3D Secure y SSL.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">5.</span> ENTREGA DE BIENES Y SERVICIOS DIGITALES
            </h2>
            <p>
              Por tratarse de servicios y productos estrictamente digitales (créditos, suscripciones, pases de torneo, membresías), la acreditación o activación del servicio adquirido se realiza de forma automática e inmediata en la cuenta del usuario tras la confirmación de la pasarela de pagos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">6.</span> POLÍTICA DE JUEGO LIMPIO Y ANTI-TRAMPAS
            </h2>
            <p>
              Para preservar la integridad de las competencias, es obligatorio el uso del cliente anticheat oficial de FACEIT. Queda estrictamente prohibido el uso de hacks, scripts, cheats, bugs, colusión deliberada o conductas tóxicas. MachuPeek se reserva el derecho de suspender indefinidamente a cualquier jugador que infrinja estas reglas sin derecho a reembolso de fondos derivados de sanciones por trampas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">7.</span> PROTECCIÓN DE DATOS PERSONALES
            </h2>
            <p>
              De acuerdo con la <strong>Ley N° 29733 (Ley de Protección de Datos Personales del Perú)</strong> y su reglamento, los datos recabados en este sitio web (nombre, teléfono, correo) son tratados confidencialmente con el único propósito de facturar, gestionar el servicio adquirido y responder a las consultas o reclamaciones de los usuarios.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">8.</span> LIBRO DE RECLAMACIONES Y RESOLUCIÓN DE CONTROVERSIAS
            </h2>
            <p>
              En cumplimiento del Código de Protección y Defensa del Consumidor (Ley N° 29571) y el D.S. 011-2011-PCM, MachuPeek cuenta con un <strong>Libro de Reclamaciones Virtual nativo</strong> a disposición de todos los consumidores, accesible directamente en el pie de página o en la ruta <code>/libro-de-reclamaciones</code>. Toda queja o reclamo será atendida en un plazo máximo de quince (15) días hábiles.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
              <span className="text-[#FF5500]">9.</span> LEGISLACIÓN Y JURISDICCIÓN APLICABLE
            </h2>
            <p>
              Los presentes Términos y Condiciones se rigen e interpretan conforme a las leyes de la República del Perú. Para cualquier controversia no resuelta de mutuo acuerdo, las partes se someten a la competencia de los jueces y tribunales del Distrito Judicial de Lima, Perú.
            </p>
          </section>
        </div>

        {/* Seal */}
        <div className="pt-6 border-t border-[#2C2C2C] flex items-center gap-2 text-xs font-mono text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <span>Términos y Condiciones conformes a la normativa de comercio electrónico e INDECOPI.</span>
        </div>
      </div>
    </div>
  );
};
