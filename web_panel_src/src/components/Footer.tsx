import React from 'react';
import { ActiveView } from '../types';
import { ShieldCheck, Mail, Phone, MapPin, Clock, ExternalLink, BookOpen, MessageSquare } from 'lucide-react';

interface FooterProps {
  setActiveView: (view: ActiveView) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveView }) => {
  return (
    <footer className="bg-[#0B0B0B] border-t-4 border-[#1A1A1A] text-neutral-300 font-sans text-xs pt-10 pb-6 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main 4-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          
          {/* Column 1: Info Comercio */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img 
                src="/logo-machupeek.png" 
                alt="MachuPeek Esports" 
                className="w-8 h-8 object-contain"
              />
              <span className="text-lg font-black italic tracking-tighter text-white uppercase font-mono">
                MACHU<span className="text-[#FF5500]">PEEK</span>
              </span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed mb-4">
              Comunidad peruana de Counter-Strike 2 y plataforma competitiva Mixtón en FACEIT. Brindamos servicios competitivos, matchmaking por tiers, membresías VIP y recarga de créditos gamer en Soles (PEN).
            </p>
            <div className="text-[11px] font-mono text-neutral-400 space-y-1">
              <div><strong className="text-white">Modalidad:</strong> Plataforma Digital Online</div>
              <div><strong className="text-white">Servidores:</strong> CS2 128 Tickrate en Lima</div>
            </div>
          </div>

          {/* Column 2: Contacto y Horarios */}
          <div>
            <h4 className="text-white font-mono font-bold uppercase tracking-wider text-xs border-b border-[#222] pb-2 mb-3 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#FF5500]" /> Datos de Contacto
            </h4>
            <ul className="space-y-2.5 text-[11px] text-neutral-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white block">Dirección Fiscal / Atención:</strong>
                  Online
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-white">Teléfono / WhatsApp:</strong>{' '}
                  <a href="https://wa.me/51949165677" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                    +51 949 165 677
                  </a>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#0088FF] shrink-0" />
                <span>
                  <strong className="text-white">Correo:</strong>{' '}
                  <a href="mailto:machupeek@gmail.com" className="text-[#0088FF] hover:underline">
                    machupeek@gmail.com
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white block">Horario de Atención:</strong>
                  Lunes a Domingo: 09:00 a 23:00 hrs (GMT-5)
                </span>
              </li>
            </ul>
          </div>

          {/* Column 3: Información Legal Obligatoria */}
          <div>
            <h4 className="text-white font-mono font-bold uppercase tracking-wider text-xs border-b border-[#222] pb-2 mb-3">
              Información Legal
            </h4>
            <ul className="space-y-2 text-[11px]">
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
                  onClick={() => setActiveView('tienda')}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-left block"
                >
                  › Catálogo de Productos y Servicios
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
              <li className="pt-1">
                <span className="text-[10px] text-neutral-500 block">
                  Cumplimiento con Ley N° 29571 (Código de Protección y Defensa del Consumidor)
                </span>
              </li>
            </ul>

            {/* Redes Sociales Oficiales Reales (Requisito Culqi: Enlaces reales) */}
            <div className="mt-4 pt-3 border-t border-[#1F1F1F]">
              <span className="text-[10px] text-neutral-400 uppercase font-mono font-bold block mb-2">
                Redes y Canales Oficiales:
              </span>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://www.faceit.com/es/hub/52a88f17-1660-42ae-8322-76592f0c6f23/Mixtones"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-[#1A1A1A] border border-[#333] hover:border-[#FF5500] text-neutral-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-all"
                >
                  FACEIT Hub <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href="https://discord.gg/xsWwaNjQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-[#1A1A1A] border border-[#333] hover:border-[#5865F2] text-neutral-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-all"
                >
                  Discord <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href="https://steamcommunity.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-[#1A1A1A] border border-[#333] hover:border-white text-neutral-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-all"
                >
                  Steam <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href="https://wa.me/51949165677"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-[#1A1A1A] border border-[#333] hover:border-emerald-500 text-neutral-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-all"
                >
                  WhatsApp <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Column 4: Libro de Reclamaciones INDECOPI */}
          <div className="bg-[#121212] border-2 border-[#1E3A5F] p-4 text-center flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 mx-auto mb-2 bg-[#0088FF]/10 border border-[#0088FF]/40 rounded-full flex items-center justify-center text-[#0088FF]">
                <BookOpen className="w-6 h-6" />
              </div>
              <h5 className="text-white font-mono font-black uppercase text-xs tracking-tight mb-1">
                LIBRO DE RECLAMACIONES
              </h5>
              <p className="text-[10px] text-cyan-300 font-mono mb-2">
                VIRTUAL // INDECOPI
              </p>
              <p className="text-[10px] text-neutral-400 mb-4 leading-normal">
                Conforme a lo establecido en el Código de Protección y Defensa del Consumidor (Ley N° 29571) y el D.S. N° 011-2011-PCM.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('libro-de-reclamaciones')}
              className="w-full py-2 bg-[#0088FF] hover:bg-[#0070D0] text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" /> Ingresar Queja o Reclamo
            </button>
          </div>
        </div>

        {/* Security & Payment Badges */}
        <div className="border-t border-[#1C1C1C] pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Certificado SSL 256-Bit Activo
            </span>
            <span className="text-neutral-600">|</span>
            <span className="flex items-center gap-1">
              Pasarela de Pago Segura: <strong className="text-white font-mono">Yape & Tarjetas</strong>
            </span>
            <span className="text-neutral-600">|</span>
            <span className="text-[#A855F7] font-bold font-mono">Yape Automático</span>
          </div>

          <div className="text-[10px] text-neutral-500 font-mono text-center sm:text-right">
            © {new Date().getFullYear()} MachuPeek. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
};
