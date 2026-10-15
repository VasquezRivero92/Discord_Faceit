import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Terminal, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight, 
  Download, 
  Gamepad2, 
  Trophy, 
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { ActiveView, CurrentUser } from '../types';

interface GuiaFaceitViewProps {
  setActiveView: (view: ActiveView) => void;
  currentUser: CurrentUser | null;
}

export const GuiaFaceitView: React.FC<GuiaFaceitViewProps> = ({ setActiveView, currentUser }) => {
  const [copiedCommand, setCopiedCommand] = React.useState(false);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText('/verificar_fc tu_nickname');
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div className="py-8 px-4 sm:px-6 max-w-5xl mx-auto text-white font-sans">
      <div className="space-y-8">
        
        {/* Header Hero */}
        <div className="bg-[#121212] border-2 border-[#242424] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FF5500] via-[#5865F2] to-emerald-500" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF5500]/15 border border-[#FF5500]/40 text-[#FF5500] text-xs font-mono font-bold uppercase mb-3">
            <Trophy className="w-3.5 h-3.5" /> COMUNIDAD MACHUPEEK // GUÍA OFICIAL CS2
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase font-mono text-white mb-3">
            GUÍA DE VINCULACIÓN: <span className="text-[#5865F2]">DISCORD</span> ↔ <span className="text-[#FF5500]">FACEIT</span>
          </h1>
          
          <p className="text-neutral-300 text-xs sm:text-sm font-sans leading-relaxed max-w-3xl">
            Para participar en los mixtones diarios y torneos competitivos de <strong>MachuPeek</strong>, es indispensable vincular tu cuenta de FACEIT con nuestro bot de Discord. Todas las partidas se disputan en servidores oficiales con anticheat obligatorio.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 font-mono text-xs">
            <a
              href="https://discord.gg/xsWwaNjQ"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] border border-[#5865F2] text-white font-bold uppercase flex items-center gap-2 transition-all shadow-md"
            >
              <span>Servidor Oficial de Discord</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://www.faceit.com/en/anti-cheat"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-[#333] hover:border-emerald-500 text-emerald-400 font-bold uppercase flex items-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar FACEIT Anti-Cheat</span>
            </a>
          </div>
        </div>

        {/* REQUISITO CRÍTICO: TODAS LAS PARTIDAS EN FACEIT CON ANTICHEAT */}
        <div className="bg-[#1A0E0E] border-2 border-red-600/70 p-6 shadow-2xl relative">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-black uppercase text-red-200 font-mono tracking-wide flex items-center gap-2">
                <span>REGLA OBLIGATORIA: PARTIDAS EXCLUSIVAS EN FACEIT CON ANTICHEAT</span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed">
                Todas las partidas de los mixtones de <strong className="text-white">MachuPeek</strong> se juegan <strong className="text-white">estrictamente en los servidores oficiales de FACEIT</strong>. Es <strong className="text-red-400">100% obligatorio tener el cliente FACEIT Anti-Cheat activo y funcionando</strong> antes de unirse al servidor.
              </p>
              <ul className="text-xs text-neutral-300 font-sans space-y-1.5 pt-2 list-disc list-inside">
                <li><strong className="text-white">Sin Anticheat no hay partida:</strong> El servidor de FACEIT bloqueará automáticamente la conexión de cualquier jugador que no tenga el cliente Anti-Cheat activo.</li>
                <li><strong className="text-white">Integridad competitiva:</strong> Esta medida garantiza partidas 100% limpias, sin scripts, hacks ni ventajas desleales para todos los participantes.</li>
                <li><strong className="text-white">Estadísticas reales:</strong> Los resultados, K/D, ELO y headshots son auditados y registrados directamente por la plataforma FACEIT.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* PASO A PASO DETALLADO */}
        <div className="space-y-4">
          <div className="border-b border-[#2C2C2C] pb-2">
            <span className="text-xs font-mono font-bold text-[#FF5500] uppercase tracking-wider block">
              TUTORIAL PASO A PASO
            </span>
            <h3 className="text-xl font-black uppercase text-white font-mono">
              ¿CÓMO VINCULAR TU CUENTA EN 3 MINUTOS?
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            
            {/* Paso 1 */}
            <div className="bg-[#141414] border-2 border-[#262626] p-6 flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-[#5865F2] block mb-2 font-mono">01</span>
                <h4 className="text-sm font-bold text-white uppercase mb-2">Ingresa al Discord</h4>
                <p className="text-neutral-400 text-xs font-sans leading-relaxed mb-4">
                  Únete a nuestro servidor de Discord oficial de MachuPeek donde se organizan las salas de voz, avisos de torneos y los lobbies en tiempo real.
                </p>
              </div>
              <a
                href="https://discord.gg/xsWwaNjQ"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-[#5865F2]/15 hover:bg-[#5865F2] border border-[#5865F2]/40 text-[#5865F2] hover:text-white font-bold uppercase transition-all flex items-center justify-center gap-1.5"
              >
                <span>Entrar a Discord</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Paso 2 */}
            <div className="bg-[#141414] border-2 border-[#FF5500]/60 p-6 flex flex-col justify-between relative shadow-lg shadow-[#FF5500]/10">
              <span className="absolute top-3 right-3 text-[9px] bg-[#FF5500] text-black px-1.5 py-0.5 font-bold uppercase">
                Paso Clave
              </span>
              <div>
                <span className="text-3xl font-black text-[#FF5500] block mb-2 font-mono">02</span>
                <h4 className="text-sm font-bold text-white uppercase mb-2">Comando /verificar_fc</h4>
                <p className="text-neutral-400 text-xs font-sans leading-relaxed mb-3">
                  En el canal de texto <code>#comandos</code> o <code>#registro</code>, escribe el comando con tu nickname exacto de FACEIT:
                </p>
                <div className="bg-black border border-[#333] p-2.5 flex items-center justify-between text-[#FF5500] font-bold mb-4">
                  <code>/verificar_fc tu_nickname</code>
                  <button
                    type="button"
                    onClick={handleCopyCommand}
                    className="text-neutral-400 hover:text-white transition-colors cursor-pointer ml-2"
                    title="Copiar comando"
                  >
                    {copiedCommand ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <span className="text-emerald-400 text-[11px] font-sans block">
                ✓ Sincroniza automáticamente tu Tier (S/A/B/C), ELO y nivel FACEIT.
              </span>
            </div>

            {/* Paso 3 */}
            <div className="bg-[#141414] border-2 border-[#262626] p-6 flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-emerald-400 block mb-2 font-mono">03</span>
                <h4 className="text-sm font-bold text-white uppercase mb-2">Anti-Cheat Activo</h4>
                <p className="text-neutral-400 text-xs font-sans leading-relaxed mb-4">
                  Descarga e inicia sesión en el cliente <strong>FACEIT Anti-Cheat</strong>. Déjalo abierto en segundo plano antes de entrar al CS2.
                </p>
              </div>
              <a
                href="https://www.faceit.com/en/anti-cheat"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold uppercase transition-all flex items-center justify-center gap-1.5"
              >
                <span>Descargar AC</span>
                <Download className="w-3 h-3" />
              </a>
            </div>

          </div>
        </div>

        {/* TIERS COMPETITIVOS DE MACHUPEEK */}
        <div className="bg-[#121212] border-2 border-[#262626] p-6 sm:p-8 space-y-4">
          <div className="border-b border-[#2C2C2C] pb-3">
            <h3 className="text-lg font-black uppercase text-white font-mono flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-[#FF5500]" />
              SISTEMA DE TIERS BALANCEADOS EN EL MIXTÓN
            </h3>
            <p className="text-neutral-400 text-xs font-sans mt-1">
              Al vincular tu cuenta con <code>/verificar_fc</code>, nuestro sistema analiza tu ELO y te clasifica en uno de los 4 Tiers para garantizar drafts equilibrados entre capitanes:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="bg-[#181818] border-2 border-amber-500/50 p-4">
              <span className="text-xs font-black text-amber-400 block mb-1">TIER S // ELITE</span>
              <div className="text-lg font-black text-white mb-1">Nivel 9 - 10</div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Jugadores de alto rendimiento competitivo, capitanes naturales y líderes en el mapa.
              </p>
            </div>

            <div className="bg-[#181818] border-2 border-purple-500/50 p-4">
              <span className="text-xs font-black text-purple-400 block mb-1">TIER A // AVANZADO</span>
              <div className="text-lg font-black text-white mb-1">Nivel 7 - 8</div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Jugadores con excelente puntería, utilidades y dominio del juego táctico en CS2.
              </p>
            </div>

            <div className="bg-[#181818] border-2 border-blue-500/50 p-4">
              <span className="text-xs font-black text-blue-400 block mb-1">TIER B // INTERMEDIO</span>
              <div className="text-lg font-black text-white mb-1">Nivel 4 - 6</div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Jugadores en constante progreso con buen conocimiento del mapa y juego en equipo.
              </p>
            </div>

            <div className="bg-[#181818] border-2 border-emerald-500/50 p-4">
              <span className="text-xs font-black text-emerald-400 block mb-1">TIER C // INICIAL</span>
              <div className="text-lg font-black text-white mb-1">Nivel 1 - 3</div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Jugadores nuevos en la escena competitiva que buscan mejorar su nivel y ganar experiencia.
              </p>
            </div>
          </div>
        </div>

        {/* PREGUNTAS FRECUENTES */}
        <div className="bg-[#121212] border-2 border-[#262626] p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-black uppercase text-white font-mono flex items-center gap-2 border-b border-[#2C2C2C] pb-3">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            PREGUNTAS FRECUENTES
          </h3>

          <div className="space-y-4 text-xs font-sans text-neutral-300">
            <div>
              <strong className="text-white block font-mono text-sm mb-1">
                ¿Los mixtones de esta web son para cualquier servidor o comunidad?
              </strong>
              <p className="text-neutral-400 leading-relaxed">
                No. Todos los mixtones organizados en esta plataforma son <strong className="text-white">exclusivos para la comunidad MachuPeek</strong>. Toda la infraestructura de partidas, drafts y tablas de posiciones está dedicada al ecosistema de MachuPeek.
              </p>
            </div>

            <div>
              <strong className="text-white block font-mono text-sm mb-1">
                ¿Qué hago si cambié mi nickname en FACEIT?
              </strong>
              <p className="text-neutral-400 leading-relaxed">
                Simplemente vuelve a escribir <code>/verificar_fc tu_nuevo_nick</code> en el canal de comandos de Discord. El bot actualizará tu registro inmediatamente.
              </p>
            </div>

            <div>
              <strong className="text-white block font-mono text-sm mb-1">
                ¿Qué pasa si no abro el FACEIT Anti-Cheat antes de la partida?
              </strong>
              <p className="text-neutral-400 leading-relaxed">
                El servidor oficial de FACEIT no te dejará conectar. Dispones de un tiempo límite de calentamiento (5 minutos) para entrar al servidor. Si no conectas a tiempo por no tener el anticheat, el partido se cancela y se registra una falta por abandono en tu perfil.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="bg-[#181818] border-2 border-[#333] p-6 text-center space-y-3 font-mono">
          <h4 className="text-base font-black uppercase text-white">
            ¿LISTO PARA COMPETIR?
          </h4>
          <p className="text-xs text-neutral-400 max-w-xl mx-auto font-sans">
            Únete a la sala de espera del Mixtón en vivo o recarga saldo en tu billetera para participar en los torneos diarios.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveView('mixton')}
              className="px-6 py-2.5 bg-[#FF5500] hover:bg-[#FF7733] text-white text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trophy className="w-4 h-4" />
              <span>Ir al Lobby del Mixtón</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
              className="px-6 py-2.5 bg-[#742284] hover:bg-[#8B2FA0] text-white text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Recargar Saldo con Yape</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
