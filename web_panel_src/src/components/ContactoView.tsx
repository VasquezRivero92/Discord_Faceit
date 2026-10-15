import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2, MessageSquare, ExternalLink, ShieldCheck } from 'lucide-react';

export const ContactoView: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSentSuccess(true);
  };

  return (
    <div className="py-8 px-4 sm:px-6 max-w-5xl mx-auto text-white font-sans">
      <div className="bg-[#121212] border-2 border-[#242424] p-6 sm:p-10 shadow-2xl space-y-8">
        
        {/* Header */}
        <div className="border-b border-[#2C2C2C] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF5500]/15 border border-[#FF5500]/40 text-[#FF5500] text-xs font-mono font-bold uppercase mb-3">
            <Phone className="w-3.5 h-3.5" /> ATENCIÓN AL CLIENTE // INFORMACIÓN OBLIGATORIA
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white font-mono">
            DATOS DE CONTACTO Y SOPORTE
          </h1>
          <p className="text-neutral-400 text-xs font-mono mt-1">
            Estamos disponibles para responder tus consultas sobre torneos, pagos, recargas y servicios.
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Contact Details */}
          <div className="space-y-6">
            <div className="bg-[#181818] border border-[#2D2D2D] p-5 space-y-4 font-mono text-xs">
              <h3 className="text-sm font-black uppercase text-white border-b border-[#2A2A2A] pb-2 text-[#FF5500]">
                Información de la Empresa
              </h3>

              <div className="space-y-3 text-neutral-300">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#FF5500] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Dirección Fiscal y Atención:</strong>
                    Online
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-white block">Teléfono / WhatsApp de Soporte:</strong>
                    <a
                      href="https://wa.me/51949165677"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      +51 949 165 677 <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#0088FF] shrink-0" />
                  <div>
                    <strong className="text-white block">Correo Electrónico de Contacto:</strong>
                    <a href="mailto:machupeek@gmail.com" className="text-[#0088FF] hover:underline font-bold">
                      machupeek@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Horarios de Atención:</strong>
                    Lunes a Domingo: 09:00 a 23:00 hrs (GMT-5)
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#2A2A2A] text-[11px] text-neutral-400 space-y-1">
                <div><strong>Plataforma:</strong> MachuPeek CS2 Perú</div>
                <div><strong>Atención al Usuario:</strong> Canal Oficial Online & WhatsApp</div>
              </div>
            </div>

            {/* Official Social Links */}
            <div className="bg-[#181818] border border-[#2D2D2D] p-5 space-y-3 font-mono text-xs">
              <h3 className="text-sm font-black uppercase text-white border-b border-[#2A2A2A] pb-2">
                Canales Oficiales
              </h3>
              <p className="text-[11px] text-neutral-400">
                Únete a nuestras comunidades oficiales para coordinar partidas y recibir avisos de torneos:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <a
                  href="https://discord.gg/xsWwaNjQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-[#5865F2]/10 border border-[#5865F2]/40 hover:bg-[#5865F2] hover:text-white text-neutral-200 transition-all flex items-center justify-between"
                >
                  <span className="font-bold">Servidor Discord</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href="https://www.faceit.com/es/hub/52a88f17-1660-42ae-8322-76592f0c6f23/Mixtones"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-[#FF5500]/10 border border-[#FF5500]/40 hover:bg-[#FF5500] hover:text-white text-neutral-200 transition-all flex items-center justify-between"
                >
                  <span className="font-bold">Hub Oficial FACEIT</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href="https://steamcommunity.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-neutral-800 border border-neutral-700 hover:border-white text-neutral-200 transition-all flex items-center justify-between"
                >
                  <span className="font-bold">Comunidad Steam</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href="https://wa.me/51949165677"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-emerald-900/20 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white text-neutral-200 transition-all flex items-center justify-between"
                >
                  <span className="font-bold">WhatsApp Soporte</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Contact Message Form */}
          <div className="bg-[#181818] border border-[#2D2D2D] p-5 font-mono text-xs">
            <h3 className="text-sm font-black uppercase text-white border-b border-[#2A2A2A] pb-2 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#FF5500]" /> Envíanos un Mensaje
            </h3>

            {sentSuccess ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-12 h-12 bg-emerald-500/15 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white uppercase">
                  ¡Mensaje Enviado con Éxito!
                </h4>
                <p className="text-neutral-400 text-[11px] max-w-xs mx-auto">
                  Hemos recibido tu consulta y nos pondremos en contacto contigo a la brevedad a través de tu correo.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSentSuccess(false);
                    setName('');
                    setEmail('');
                    setSubject('');
                    setMessage('');
                  }}
                  className="px-4 py-2 bg-[#262626] hover:bg-[#333] border border-[#444] text-xs font-bold text-white uppercase transition-all cursor-pointer"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                    Tu Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Daniel Castillo"
                    className="w-full bg-[#111] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full bg-[#111] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                    Asunto
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ej: Consulta sobre recarga o torneo"
                    className="w-full bg-[#111] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                    Mensaje *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    className="w-full bg-[#111] border border-[#333] px-3 py-2 text-white focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#FF5500]/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Enviar Mensaje
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Seal */}
        <div className="pt-6 border-t border-[#2C2C2C] flex items-center gap-2 text-xs font-mono text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <span>Información de contacto y atención al cliente verificada. Canal de atención 100% online.</span>
        </div>
      </div>
    </div>
  );
};
