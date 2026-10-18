import React from 'react';
import { ActiveView } from '../types';
import { ShieldCheck, Mail, Phone, MapPin, Clock, ExternalLink, BookOpen, MessageSquare, Award } from 'lucide-react';

interface FooterProps {
  setActiveView: (view: ActiveView) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveView }) => {
  return (
    <footer className="bg-[#07080B] border-t border-white/[0.08] text-neutral-300 font-sans text-xs pt-12 pb-8 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main 4-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-12">
          
          {/* Column 1: Info Comercio */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img 
                src="/logo-machupeek.png" 
                alt="MachuPeek Esports" 
                className="w-9 h-9 object-contain drop-shadow"
              />
              <span className="text-xl font-black italic tracking-tight text-white uppercase font-mono">
                MACHU<span className="text-[#FF5500]">PEEK</span>
              </span>
            </div>
            <p className="text-neutral-400 text-xs leading-relaxed font-sans">
              Comunidad peruana de Counter-Strike 2 y plataforma competitiva Mixtón en FACEIT. Brindamos servicios competitivos, matchmaking por tiers, membresías VIP y recarga de créditos gamer en Soles (PEN).
            </p>
            <div className="text-xs font-mono text-neutral-400 space-y-1.5 pt-1">
              <div><strong className="text-white">Modalidad:</strong> Plataforma Digital Online</div>
              <div><strong className="text-white">Servidores:</strong> Oficiales FACEIT & Steam</div>
            </div>
          </div>

          {/* Column 2: Contacto y Horarios */}
          <div>
            <h4 className="text-white font-mono font-bold uppercase tracking-wider text-xs border-b border-white/[0.08] pb-2.5 mb-4 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#FF5500]" /> Datos de Contacto
            </h4>
            <ul className="space-y-3 text-xs text-neutral-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white block">Atención:</strong>
                  Online / Soporte Remoto Perú
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-white">WhatsApp Oficial:</strong>{' '}
                  <a href="https://wa.me/51949165677" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-mono font-bold hover:underline">
                    +51 949 165 677
                  </a>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  <strong className="text-white">Correo:</strong>{' '}
                  <a href="mailto:machupeek@gmail.com" className="text-sky-400 hover:underline">
                    machupeek@gmail.com
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white block">Horario de Operaciones:</strong>
                  Lunes a Domingo: 09:00 a 23:00 hrs (GMT-5)
                </span>
              </li>
            </ul>
          </div>

          {/* Column 3: Información Legal Obligatoria */}
          <div>
            <h4 className="text-white font-mono font-bold uppercase tracking-wider text-xs border-b border-white/[0.08] pb-2.5 mb-4">
              Información Legal
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('terminos')}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-left block"
                >
                  › Términos y Condiciones de Uso
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('devoluciones')}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-left block"
                >
                  › Política de Cambios y Devoluciones
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('guia-faceit')}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-left block"
                >
                  › Guía de Vinculación FACEIT
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('contacto')}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-left block"
                >
                  › Centro de Atención y Soporte
                </button>
              </li>
              <li className="pt-2">
                <span className="text-[11px] text-neutral-400 leading-snug block">
                  Cumplimiento con Ley N° 29571 (Código de Protección y Defensa del Consumidor).
                </span>
              </li>
            </ul>

            {/* Redes Sociales Oficiales */}
            <div className="mt-5 pt-3.5 border-t border-white/[0.08]">
              <span className="text-[11px] text-neutral-400 uppercase font-mono font-bold block mb-2.5">
                Canales Oficiales:
              </span>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://www.faceit.com/es/hub/52a88f17-1660-42ae-8322-76592f0c6f23/Mixtones"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded bg-neutral-900 border border-white/[0.1] hover:border-[#FF5500] text-neutral-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  FACEIT Hub <ExternalLink className="w-3 h-3 text-[#FF5500]" />
                </a>
                <a
                  href="https://discord.gg/xsWwaNjQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded bg-neutral-900 border border-white/[0.1] hover:border-[#5865F2] text-neutral-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  Discord <ExternalLink className="w-3 h-3 text-[#5865F2]" />
                </a>
                <a
                  href="https://wa.me/51949165677"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded bg-neutral-900 border border-white/[0.1] hover:border-emerald-500 text-neutral-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  WhatsApp <ExternalLink className="w-3 h-3 text-emerald-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Column 4: Libro de Reclamaciones INDECOPI */}
          <div className="rounded-xl bg-neutral-900/50 border border-sky-500/30 p-5 text-center flex flex-col justify-between shadow-[0_4px_25px_rgba(2,132,199,0.1)]">
            <div>
              <div className="w-12 h-12 mx-auto mb-3 bg-sky-500/10 border border-sky-500/30 rounded-full flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(2,132,199,0.25)]">
                <BookOpen className="w-6 h-6" />
              </div>
              <h5 className="text-white font-mono font-black uppercase text-xs tracking-tight mb-1">
                LIBRO DE RECLAMACIONES
              </h5>
              <p className="text-[11px] text-sky-400 font-mono font-bold mb-2">
                VIRTUAL // INDECOPI
              </p>
              <p className="text-xs text-neutral-400 mb-5 leading-relaxed font-sans">
                Conforme a lo establecido en el Código de Protección y Defensa del Consumidor (Ley N° 29571) y el D.S. N° 011-2011-PCM.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('libro-de-reclamaciones')}
              className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_2px_15px_rgba(2,132,199,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <BookOpen className="w-4 h-4" /> Ingresar Queja o Reclamo
            </button>
          </div>
        </div>

        {/* Security & Payment Badges */}
        <div className="border-t border-white/[0.08] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> SSL 256-Bit Activo
            </span>
            <span className="text-neutral-700">|</span>
            <span className="flex items-center gap-1.5 text-neutral-300">
              Pasarela de Pago Segura: <strong className="text-white font-bold">Yape</strong>
            </span>
            <span className="text-neutral-700">|</span>
            <span className="text-[#C084FC] font-bold">Yape Acreditación Directa</span>
          </div>

          <div className="text-xs text-neutral-400 font-mono text-center sm:text-right">
            © {new Date().getFullYear()} MachuPeek Esports. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
};
