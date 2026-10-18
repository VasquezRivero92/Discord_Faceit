import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Terminal, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight, 
  Download, 
  Trophy, 
  HelpCircle, 
  Copy, 
  Check, 
  Award,
  Zap,
  Sparkles,
  Bot,
  UserCheck,
  RefreshCw,
  Radio,
  ArrowUpRight,
  Flame,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { FaceitLogo, SteamLogo, DiscordLogo, YapeLogo } from './BrandLogos';
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
    <div className="py-10 px-4 sm:px-6 max-w-5xl mx-auto text-white font-sans">
      <div className="space-y-8">
        
        {/* Header Hero */}
        <div className="rounded-2xl bg-[#0E1017]/90 border border-white/[0.08] p-6 sm:p-10 shadow-[0_16px_50px_rgba(0,0,0,0.6)] relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0088FF] via-[#FF5500] to-[#5865F2]" />
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase mb-4">
            <Trophy className="w-3.5 h-3.5" /> COMUNIDAD MACHUPEEK // GUÍA OFICIAL DE VINCULACIÓN CS2
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-black italic tracking-tight uppercase font-mono text-white mb-3">
            GUÍA OFICIAL: <span className="text-[#0088FF]">STEAM</span> ↔ <span className="text-[#FF5500]">FACEIT</span> ↔ <span className="text-[#5865F2]">DISCORD</span>
          </h1>
          
          <p className="text-neutral-300 text-sm sm:text-base font-sans leading-relaxed max-w-3xl">
            Para disfrutar de los mixtones diarios y torneos de <strong className="text-white">MachuPeek</strong>, vincula tus cuentas en 1 clic. Ahora nuestro sistema se conecta directamente con la <strong className="text-white">API oficial de Steam y FACEIT</strong> para sincronizar tu ELO, asignarte tu Tier y permitir que nuestro <strong className="text-[#0088FF]">Steam Bot</strong> te invite automáticamente a las partidas de CS2.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-[#0088FF] to-[#0066CC] hover:from-[#1A94FF] hover:to-[#0077EE] text-white font-black uppercase flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(0,136,255,0.35)] cursor-pointer active:scale-[0.98]"
            >
              <SteamLogo className="w-4 h-4 text-white" />
              <span>{currentUser ? 'Vincular Cuentas en Mi Perfil' : 'Iniciar Sesión y Vincular'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>

            <a
              href="https://discord.gg/xsWwaNjQ"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] border border-[#5865F2] text-white font-bold uppercase flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(88,101,242,0.3)] active:scale-[0.98]"
            >
              <DiscordLogo className="w-4 h-4 text-white" />
              <span>Discord Oficial</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://www.faceit.com/en/anti-cheat"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-white/[0.1] hover:border-emerald-500/60 text-emerald-400 font-bold uppercase flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Anti-Cheat</span>
            </a>
          </div>
        </div>

        {/* HUD INTERACTIVO: ESTADO ACTUAL DE TUS CUENTAS */}
        <div className="rounded-2xl bg-neutral-900/60 border border-white/[0.08] p-5 sm:p-6 backdrop-blur-md shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-neutral-300">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>DIAGNÓSTICO EN VIVO // ESTADO DE TUS CUENTAS EN MACHUPEEK</span>
            </div>
            {currentUser && (
              <button
                type="button"
                onClick={() => setActiveView('cuenta')}
                className="text-xs font-mono font-bold text-[#FF5500] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Administrar en Mi Cuenta</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
            {/* Discord Status */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${
              currentUser 
                ? 'bg-[#5865F2]/10 border-[#5865F2]/40 text-neutral-200'
                : 'bg-neutral-900/40 border-white/[0.08] text-neutral-400'
            }`}>
              <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center shrink-0">
                <DiscordLogo className="w-5 h-5 text-[#5865F2]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-neutral-400">Cuenta Discord</div>
                <div className="text-white font-bold truncate">
                  {currentUser ? `@${currentUser.username}` : 'No conectado'}
                </div>
                <div className="text-[10px] text-emerald-400 font-sans">
                  {currentUser ? '✓ Sesión iniciada' : 'Pendiente de iniciar sesión'}
                </div>
              </div>
            </div>

            {/* Steam Status */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${
              currentUser?.steam_id_64
                ? 'bg-[#0088FF]/10 border-[#0088FF]/40 text-neutral-200'
                : 'bg-neutral-900/40 border-white/[0.08] text-neutral-400'
            }`}>
              <div className="w-10 h-10 rounded-lg bg-[#0088FF]/20 border border-[#0088FF]/40 flex items-center justify-center shrink-0">
                <SteamLogo className="w-5 h-5 text-[#0088FF]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-neutral-400">Steam (CS2)</div>
                <div className="text-white font-bold truncate">
                  {currentUser?.steam_id_64 ? (currentUser.steam_nickname || currentUser.steam_id_64) : 'Sin vincular'}
                </div>
                <div className="text-[10px] font-sans">
                  {currentUser?.steam_id_64 ? (
                    <span className="text-emerald-400">✓ Conectado para Steam Bot</span>
                  ) : (
                    <span className="text-amber-400">⚠️ Requiere OpenID (1 clic)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Faceit Status */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${
              currentUser?.faceit_nickname
                ? 'bg-[#FF5500]/10 border-[#FF5500]/40 text-neutral-200'
                : 'bg-neutral-900/40 border-white/[0.08] text-neutral-400'
            }`}>
              <div className="w-10 h-10 rounded-lg bg-[#FF5500]/20 border border-[#FF5500]/40 flex items-center justify-center shrink-0">
                <FaceitLogo className="w-5 h-5 text-[#FF5500]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-neutral-400">Cuenta FACEIT</div>
                <div className="text-white font-bold truncate">
                  {currentUser?.faceit_nickname ? currentUser.faceit_nickname : 'Sin vincular'}
                </div>
                <div className="text-[10px] font-sans">
                  {currentUser?.faceit_nickname ? (
                    <span className="text-emerald-400">
                      ✓ Nivel {currentUser.skillLevel || '?'} • {currentUser.elo ? `${currentUser.elo} ELO` : ''}
                    </span>
                  ) : (
                    <span className="text-neutral-400">Se jala automáticamente al conectar Steam</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MÉTODO 1 RECOMENDADO: VINCULACIÓN EN 1 CLIC DESDE LA WEB */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0088FF]/15 border border-[#0088FF]/40 text-[#0088FF] text-[10px] font-mono font-bold uppercase mb-1">
                <Zap className="w-3 h-3" /> MÉTODO OFICIAL 100% AUTOMÁTICO (RECOMENDADO)
              </span>
              <h2 className="text-2xl font-black uppercase text-white font-mono">
                CÓMO VINCULAR TU STEAM Y FACEIT EN 1 CLIC DESDE LA WEB
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed">
            Ya no necesitas escribir tus IDs ni nicknames manualmente. Gracias a la integración con el protocolo oficial <strong className="text-white">Steam OpenID</strong> y la <strong className="text-white">API oficial de FACEIT</strong>, puedes completar tu registro en menos de 30 segundos:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono text-xs pt-2">
            
            {/* Paso 1 */}
            <div className="rounded-xl bg-neutral-900/60 border border-[#0088FF]/40 p-6 flex flex-col justify-between shadow-[0_8px_25px_rgba(0,136,255,0.12)]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl font-black text-[#0088FF] font-mono">01</span>
                  <div className="p-2 rounded-lg bg-[#0088FF]/15 text-[#0088FF]">
                    <SteamLogo className="w-5 h-5 text-[#0088FF]" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white uppercase mb-2">
                  Inicia Sesión con Steam (OpenID)
                </h3>
                <p className="text-neutral-400 text-xs font-sans leading-relaxed mb-4">
                  Ve a <strong className="text-white">Mi Billetera & Cuenta</strong> y pulsa <strong className="text-[#0088FF]">"Conectar e Iniciar Sesión con Steam"</strong>. Valve verificará tu cuenta de forma 100% segura sin compartir contraseñas.
                </p>
              </div>
              <div className="pt-3 border-t border-white/[0.08] text-neutral-400 font-sans text-[11px]">
                🔒 Autenticación oficial de Valve Corporation.
              </div>
            </div>

            {/* Paso 2 */}
            <div className="rounded-xl bg-neutral-900/60 border border-[#FF5500]/40 p-6 flex flex-col justify-between shadow-[0_8px_25px_rgba(255,85,0,0.12)]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl font-black text-[#FF5500] font-mono">02</span>
                  <div className="p-2 rounded-lg bg-[#FF5500]/15 text-[#FF5500]">
                    <FaceitLogo className="w-5 h-5 text-[#FF5500]" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white uppercase mb-2">
                  Sincronización Automática con FACEIT
                </h3>
                <p className="text-neutral-400 text-xs font-sans leading-relaxed mb-4">
                  En cuanto Steam se conecta, nuestro sistema consulta la API de FACEIT con tu <strong className="text-white">SteamID64</strong>. ¡Jala tu nickname, ELO actual, Nivel y Tier al instante sin que tengas que escribir nada!
                </p>
              </div>
              <div className="pt-3 border-t border-white/[0.08] text-emerald-400 font-sans text-[11px]">
                ⚡ Detección inmediata en tiempo real.
              </div>
            </div>

            {/* Paso 3 */}
            <div className="rounded-xl bg-neutral-900/60 border border-emerald-500/40 p-6 flex flex-col justify-between shadow-[0_8px_25px_rgba(16,185,129,0.12)]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl font-black text-emerald-400 font-mono">03</span>
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                    <Bot className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white uppercase mb-2">
                  Invitación Automática por Steam Bot
                </h3>
                <p className="text-neutral-400 text-xs font-sans leading-relaxed mb-4">
                  Cuando empiece el partido tras el draft, el <strong className="text-white">Steam Bot de MachuPeek</strong> te invitará directamente a tu cliente de CS2 a través de Steam, sin que tengas que agregar a nadie como amigo.
                </p>
              </div>
              <div className="pt-3 border-t border-white/[0.08] text-cyan-300 font-sans text-[11px]">
                🎮 Entra al servidor con 1 solo clic.
              </div>
            </div>

          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0088FF] via-[#FF5500] to-[#5865F2] hover:opacity-95 text-white font-mono font-black text-xs uppercase tracking-wider transition-all shadow-[0_4px_25px_rgba(0,136,255,0.25)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <SteamLogo className="w-4 h-4 text-white" />
              <span>Ir a Mi Cuenta y Vincular Steam / FACEIT Ahora</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MÉTODO 2 ALTERNATIVO: DESDE DISCORD O BÚSQUEDA POR NICK */}
        <div className="rounded-2xl bg-neutral-900/40 border border-white/[0.08] p-6 sm:p-8 space-y-4 backdrop-blur-md">
          <div className="border-b border-white/[0.08] pb-3">
            <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider block">
              MÉTODO ALTERNATIVO
            </span>
            <h3 className="text-xl font-black uppercase text-white font-mono mt-0.5">
              VINCULACIÓN POR COMANDO EN DISCORD O NICK MANUAL
            </h3>
          </div>

          <p className="text-xs text-neutral-300 font-sans leading-relaxed">
            Si tu perfil de Steam tiene la privacidad en privado o prefieres vincularte directamente mediante comandos de Discord, puedes utilizar nuestro comando oficial:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs pt-1">
            <div className="bg-black/60 border border-white/[0.1] rounded-xl p-4 flex flex-col justify-between shadow-inner">
              <div>
                <span className="text-[#FF5500] font-bold block mb-1">COMANDO EN DISCORD</span>
                <p className="text-xs text-neutral-400 font-sans mb-3">
                  Escribe en el canal <code>#comandos</code> o <code>#registro</code> de nuestro Discord oficial:
                </p>
                <div className="bg-neutral-900 border border-white/[0.1] rounded-lg p-3 flex items-center justify-between text-white font-bold mb-2">
                  <code className="text-xs text-[#FF5500]">/verificar_fc tu_nickname</code>
                  <button
                    type="button"
                    onClick={handleCopyCommand}
                    className="p-1.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white transition-all cursor-pointer ml-2 active:scale-90"
                    title="Copiar comando"
                  >
                    {copiedCommand ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-neutral-400 font-sans">
                El bot responderá con tu nivel, ELO y te asignará el rol de Tier automáticamente.
              </span>
            </div>

            <div className="bg-black/60 border border-white/[0.1] rounded-xl p-4 flex flex-col justify-between shadow-inner">
              <div>
                <span className="text-[#5865F2] font-bold block mb-1">BÚSQUEDA POR NICK EN LA WEB</span>
                <p className="text-xs text-neutral-400 font-sans mb-3">
                  En la sección <strong className="text-white">Mi Billetera & Cuenta</strong>, también dispones de un buscador donde solo colocas tu nickname de FACEIT y el panel lo enlaza a tu usuario de Discord.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
                className="py-2.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-white/[0.1] text-white font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                <span>Probar búsqueda en Mi Cuenta</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* CÓMO FUNCIONA EL STEAM BOT DE MACHUPEEK */}
        <div className="rounded-2xl bg-gradient-to-br from-neutral-900/90 via-[#0A101C]/80 to-black border border-[#0088FF]/30 p-6 sm:p-8 space-y-5 backdrop-blur-md shadow-[0_8px_30px_rgba(0,136,255,0.1)]">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <div className="w-12 h-12 rounded-xl bg-[#0088FF]/20 border border-[#0088FF]/40 flex items-center justify-center text-[#0088FF] shrink-0">
              <Bot className="w-6 h-6 text-[#0088FF]" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-[#0088FF] uppercase tracking-wider block">
                TECNOLOGÍA PROPIA MACHUPEEK
              </span>
              <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-mono">
                ¿CÓMO FUNCIONA EL STEAM BOT EN LOS MIXTONES?
              </h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed">
            Hemos desarrollado un bot propio conectado a la red de Steam para que no tengas que copiar IPs manuales ni buscar servidores en consolas:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs pt-1">
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08]">
              <span className="text-[#0088FF] font-bold block mb-1">FASE 1 // DRAFT</span>
              <p className="text-neutral-400 font-sans text-xs">
                Los 10 jugadores son elegidos por los capitanes en la Arena Web en tiempo real.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08]">
              <span className="text-[#FF5500] font-bold block mb-1">FASE 2 // SERVIDOR</span>
              <p className="text-neutral-400 font-sans text-xs">
                La API oficial de FACEIT crea la sala de juego y despliega el servidor 128-tick.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-[#0088FF]/40">
              <span className="text-cyan-400 font-bold block mb-1">FASE 3 // INVITE STEAM</span>
              <p className="text-neutral-400 font-sans text-xs">
                El Steam Bot toma tu SteamID64 y te envía la invitación de CS2 directamente.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/40">
              <span className="text-emerald-400 font-bold block mb-1">FASE 4 // A JUGAR</span>
              <p className="text-neutral-400 font-sans text-xs">
                Aceptas la invitación en CS2 con tu Anti-Cheat activo y juegas por el pozo.
              </p>
            </div>
          </div>
        </div>

        {/* REQUISITO CRÍTICO: TODAS LAS PARTIDAS EN FACEIT CON ANTICHEAT */}
        <div className="rounded-2xl bg-red-950/20 border border-red-500/40 p-6 sm:p-8 shadow-[0_8px_30px_rgba(220,38,38,0.15)] relative backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-2.5">
              <h2 className="text-base sm:text-lg font-black uppercase text-red-200 font-mono tracking-tight flex items-center gap-2">
                <span>REGLA OBLIGATORIA: PARTIDAS EXCLUSIVAS EN FACEIT CON ANTICHEAT</span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed">
                Todas las partidas de los mixtones de <strong className="text-white">MachuPeek</strong> se juegan <strong className="text-white">estrictamente en los servidores oficiales de FACEIT</strong>. Es <strong className="text-red-400">100% obligatorio tener el cliente FACEIT Anti-Cheat activo y funcionando</strong> antes de unirse al servidor.
              </p>
              <ul className="text-xs text-neutral-300 font-sans space-y-2 pt-2 list-disc list-inside">
                <li><strong className="text-white">Sin Anticheat no hay partida:</strong> El servidor de FACEIT bloqueará automáticamente la conexión de cualquier jugador que no tenga el cliente Anti-Cheat activo.</li>
                <li><strong className="text-white">Integridad competitiva:</strong> Esta medida garantiza partidas 100% limpias, sin scripts, hacks ni ventajas desleales para todos los participantes.</li>
                <li><strong className="text-white">Estadísticas reales:</strong> Los resultados, K/D, ELO y headshots son auditados y registrados directamente por la plataforma FACEIT.</li>
                <li><strong className="text-white">Tiempo de calentamiento:</strong> Dispones de 5 minutos desde el lanzamiento del servidor para entrar. Si no conectas a tiempo, la partida se anula y se aplica sanción por abandono.</li>
              </ul>
              
              <div className="pt-2">
                <a
                  href="https://www.faceit.com/en/anti-cheat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/30 hover:bg-red-600 border border-red-500/50 text-white font-mono text-xs font-bold uppercase transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar FACEIT Anti-Cheat Oficial</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* TIERS COMPETITIVOS DE MACHUPEEK */}
        <div className="rounded-2xl bg-neutral-900/50 border border-white/[0.08] p-6 sm:p-8 space-y-5 backdrop-blur-md">
          <div className="border-b border-white/[0.08] pb-3">
            <h3 className="text-xl font-black uppercase text-white font-mono flex items-center gap-2.5">
              <FaceitLogo className="w-5 h-5 text-[#FF5500]" />
              SISTEMA DE TIERS BALANCEADOS EN EL MIXTÓN
            </h3>
            <p className="text-neutral-400 text-xs font-sans mt-1">
              Al vincular tu cuenta con Steam o FACEIT, nuestro sistema analiza tu ELO y te clasifica en uno de los 4 Tiers para garantizar drafts equilibrados entre capitanes:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="rounded-xl bg-black/40 border border-amber-500/40 p-4 shadow-sm hover:border-amber-400 transition-colors">
              <span className="text-xs font-black text-amber-400 block mb-1">TIER S // ELITE</span>
              <div className="text-lg font-black text-white mb-1">Nivel 9 - 10</div>
              <p className="text-xs text-neutral-400 font-sans">
                Jugadores de alto rendimiento competitivo, capitanes naturales y líderes en el mapa.
              </p>
            </div>

            <div className="rounded-xl bg-black/40 border border-purple-500/40 p-4 shadow-sm hover:border-purple-400 transition-colors">
              <span className="text-xs font-black text-purple-400 block mb-1">TIER A // AVANZADO</span>
              <div className="text-lg font-black text-white mb-1">Nivel 7 - 8</div>
              <p className="text-xs text-neutral-400 font-sans">
                Jugadores con excelente puntería, utilidades y dominio del juego táctico en CS2.
              </p>
            </div>

            <div className="rounded-xl bg-black/40 border border-blue-500/40 p-4 shadow-sm hover:border-blue-400 transition-colors">
              <span className="text-xs font-black text-blue-400 block mb-1">TIER B // INTERMEDIO</span>
              <div className="text-lg font-black text-white mb-1">Nivel 4 - 6</div>
              <p className="text-xs text-neutral-400 font-sans">
                Jugadores en constante progreso con buen conocimiento del mapa y juego en equipo.
              </p>
            </div>

            <div className="rounded-xl bg-black/40 border border-emerald-500/40 p-4 shadow-sm hover:border-emerald-400 transition-colors">
              <span className="text-xs font-black text-emerald-400 block mb-1">TIER C // INICIAL</span>
              <div className="text-lg font-black text-white mb-1">Nivel 1 - 3</div>
              <p className="text-xs text-neutral-400 font-sans">
                Jugadores nuevos en la escena competitiva que buscan mejorar su nivel y ganar experiencia.
              </p>
            </div>
          </div>
        </div>

        {/* PREGUNTAS FRECUENTES (ACTUALIZADAS) */}
        <div className="rounded-2xl bg-neutral-900/50 border border-white/[0.08] p-6 sm:p-8 space-y-5 backdrop-blur-md">
          <h3 className="text-xl font-black uppercase text-white font-mono flex items-center gap-2.5 border-b border-white/[0.08] pb-3">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            PREGUNTAS FRECUENTES
          </h3>

          <div className="space-y-4 text-xs font-sans text-neutral-300">
            <div>
              <strong className="text-white block font-mono text-sm mb-1">
                ¿Por qué ahora es obligatorio o recomendado conectar mi cuenta de Steam con OpenID?
              </strong>
              <p className="text-neutral-400 leading-relaxed">
                Porque el protocolo <strong className="text-white">Steam OpenID</strong> es 100% seguro (válidado directamente en los servidores de Valve) y nos entrega tu <strong className="text-white">SteamID64 oficial</strong>. Con ese dato, nuestro Steam Bot puede enviarte invitaciones automáticas dentro del juego y consultar a la API de FACEIT para jalar tus estadísticas sin errores tipográficos.
              </p>
            </div>

            <div>
              <strong className="text-white block font-mono text-sm mb-1">
                ¿Qué pasa si me autentico con Steam pero la API de FACEIT no detecta mi cuenta?
              </strong>
              <p className="text-neutral-400 leading-relaxed">
                Esto suele ocurrir si tu perfil de Steam está en modo privado o si creaste tu cuenta de FACEIT con otro identificador. En ese caso, en la misma pestaña de <strong className="text-white">Mi Billetera & Cuenta</strong> dispones de un formulario para ingresar tu nickname exacto de FACEIT o puedes escribir <code>/verificar_fc tu_nick</code> en Discord.
              </p>
            </div>

            <div>
              <strong className="text-white block font-mono text-sm mb-1">
                ¿Qué hago si cambié mi nickname en FACEIT o en Steam?
              </strong>
              <p className="text-neutral-400 leading-relaxed">
                Puedes presionar el botón de <strong className="text-white">"⚡ Jalar y Vincular FACEIT desde mi Steam"</strong> o <strong className="text-white">"Re-autenticar con Steam"</strong> en tu perfil web en cualquier momento. El sistema refrescará tu avatar, nickname, nivel y ELO en segundos.
              </p>
            </div>

            <div>
              <strong className="text-white block font-mono text-sm mb-1">
                ¿Qué pasa si no tengo el FACEIT Anti-Cheat abierto antes de conectar al servidor?
              </strong>
              <p className="text-neutral-400 leading-relaxed">
                El servidor oficial de FACEIT denegará tu conexión. Dispones de 5 minutos de tiempo de espera (warmup). Si no conectas a tiempo por falta de Anti-Cheat, el sistema anulará el encuentro y se te aplicará una penalización temporal por abandono.
              </p>
            </div>

            <div>
              <strong className="text-white block font-mono text-sm mb-1">
                ¿Los mixtones de esta web son para cualquier servidor o comunidad?
              </strong>
              <p className="text-neutral-400 leading-relaxed">
                No. Todos los mixtones organizados en esta plataforma son <strong className="text-white">exclusivos para la comunidad MachuPeek</strong>. Toda la infraestructura de partidas, drafts, bots y pozos en Soles (PEN) está dedicada a nuestros miembros.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="rounded-2xl bg-neutral-900/60 border border-white/[0.08] p-8 text-center space-y-4 font-mono shadow-xl backdrop-blur-md">
          <h4 className="text-lg font-black uppercase text-white">
            ¿LISTO PARA VINCULARTE Y COMPETIR?
          </h4>
          <p className="text-xs text-neutral-400 max-w-xl mx-auto font-sans leading-relaxed">
            Conecta tu Steam y FACEIT en tu perfil para que el bot te invite de forma automática a los lobbies y recarga saldo con Yape para disputar los torneos diarios.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#0088FF] to-[#0066CC] hover:from-[#1A94FF] hover:to-[#0077EE] text-white text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 shadow-[0_4px_20px_rgba(0,136,255,0.3)] active:scale-[0.98]"
            >
              <SteamLogo className="w-4 h-4 text-white" />
              <span>Vincular Cuentas en Mi Perfil</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('mixton')}
              className="px-6 py-3 rounded-lg bg-[#FF5500] hover:bg-[#FF661A] text-white text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 shadow-[0_4px_20px_rgba(255,85,0,0.3)] active:scale-[0.98]"
            >
              <Trophy className="w-4 h-4" />
              <span>Lobby del Mixtón</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
              className="px-6 py-3 rounded-lg bg-[#742284] hover:bg-[#8B2FA0] border border-[#A855F7]/40 text-white text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 shadow-[0_4px_20px_rgba(168,85,247,0.25)] active:scale-[0.98]"
            >
              <YapeLogo className="w-4 h-4 rounded-xs shrink-0" />
              <span>Recargar Saldo con Yape</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
