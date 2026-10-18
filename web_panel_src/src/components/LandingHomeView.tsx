import React from 'react';
import { ActiveView } from '../types';
import { 
  Gamepad2, 
  Trophy, 
  ShieldCheck, 
  Zap, 
  Users, 
  Award, 
  Coins, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink,
  Sparkles,
  Server,
  Layers,
  HelpCircle,
  BookOpen,
  Activity,
  Cpu,
  Lock,
  Wallet
} from 'lucide-react';
import { FaceitLogo, SteamLogo, YapeLogo } from './BrandLogos';

interface LandingHomeViewProps {
  setActiveView: (view: ActiveView) => void;
  currentUser: any;
}

export const LandingHomeView: React.FC<LandingHomeViewProps> = ({
  setActiveView,
  currentUser
}) => {
  return (
    <div className="text-white font-sans selection:bg-[#FF5500] selection:text-white">
      
      {/* 1. HERO SECTION WITH ATMOSPHERIC LIGHTING & TACTICAL GRID */}
      <section className="relative overflow-hidden bg-[#08090C] border-b border-white/[0.08] py-16 sm:py-24 px-4 sm:px-6">
        
        {/* Subtle Ambient Radial Cones */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-b from-[#FF5500]/15 via-red-600/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/6 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />
        
        {/* Tactical dot grid overlay */}
        <div className="absolute inset-0 tactical-grid opacity-35 pointer-events-none" />

        <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
          
          {/* Logo with Soft Dynamic Aura */}
          <div className="mb-6 relative group select-none">
            <div className="absolute -inset-2 bg-gradient-to-r from-red-600 via-[#FF5500] to-amber-500 rounded-full blur-xl opacity-40 group-hover:opacity-75 transition-opacity duration-500" />
            <img 
              src="/logo-machupeek.png" 
              alt="MachuPeek Esports CS2 Perú" 
              className="relative w-36 h-36 sm:w-44 sm:h-44 object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.9)] animate-float"
            />
          </div>

          {/* Tactical Status Tag */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-md text-neutral-300 text-xs font-mono font-medium uppercase tracking-widest mb-6 shadow-lg shadow-black/40">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5500] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5500]" />
            </span>
            <span>COMUNIDAD COMPETITIVA #1 DE CS2 EN EL PERÚ</span>
          </div>

          {/* Main Hero Display Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black italic tracking-tight uppercase leading-[0.95] max-w-4xl mb-5 font-mono">
            BIENVENIDO A <span className="bg-gradient-to-r from-[#FF5500] via-[#FF7733] to-[#FFAA00] bg-clip-text text-transparent drop-shadow-[0_4px_25px_rgba(255,85,0,0.4)]">MACHUPEEK</span>
          </h1>

          <p className="text-neutral-300 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed mb-9 font-normal">
            La plataforma líder de <strong className="text-white font-semibold">Counter-Strike 2</strong> en Perú. Disfruta de partidas mixtón exclusivamente en servidores oficiales de FACEIT con anticheat obligatorio, drafts balanceados por capitanes y torneos con pozos en Soles (PEN).
          </p>

          {/* Tactical CTAs with Physical Micro-Interactions */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-mono text-xs font-bold uppercase">
            <button
              type="button"
              onClick={() => setActiveView('mixton')}
              className="px-7 py-3.5 rounded-lg bg-[#FF5500] hover:bg-[#FF661A] text-white font-black tracking-wider shadow-[0_4px_20px_rgba(255,85,0,0.35)] hover:shadow-[0_6px_30px_rgba(255,85,0,0.5)] transition-all flex items-center gap-2.5 cursor-pointer active:scale-[0.98]"
            >
              <Trophy className="w-4 h-4" />
              <span>Entrar al Mixtón en Vivo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
              className="px-7 py-3.5 rounded-lg bg-[#742284] hover:bg-[#8B2FA0] border border-[#A855F7]/40 text-white font-black tracking-wider shadow-[0_4px_20px_rgba(168,85,247,0.25)] hover:shadow-[0_6px_30px_rgba(168,85,247,0.45)] transition-all flex items-center gap-2.5 cursor-pointer active:scale-[0.98]"
            >
              <YapeLogo className="w-5 h-5 rounded-sm shrink-0" />
              <span>{currentUser ? 'Mi Billetera & Recargar' : 'Recargar con Yape'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('guia-faceit')}
              className="px-6 py-3.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/90 border border-white/[0.12] hover:border-[#FF5500]/60 text-neutral-200 hover:text-white tracking-wider transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <FaceitLogo className="w-4 h-4 text-[#FF5500]" />
              <span>Guía FACEIT</span>
            </button>
          </div>

          {/* Live Telemetry Highlights (Stats HUD) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-14 w-full max-w-5xl text-left font-mono">
            
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-white/[0.18] transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500]">
                  <Server className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block leading-tight">SERVIDORES 128T</span>
                  <span className="text-[11px] text-neutral-400 font-sans">Oficiales bajo ping</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-white/[0.18] transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#FF5500]/15 border border-[#FF5500]/30 text-[#FF5500] flex items-center justify-center">
                  <FaceitLogo className="w-5 h-5 shrink-0 text-[#FF5500]" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block leading-tight">ANTICHEAT FACEIT</span>
                  <span className="text-[11px] text-neutral-400 font-sans">100% libre de trampas</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-white/[0.18] transition-all">
              <div className="flex items-center gap-3">
                <div className="p-1 rounded-lg bg-[#742284]/30 border border-[#A855F7]/30 flex items-center justify-center w-10 h-10 shrink-0">
                  <YapeLogo className="w-full h-full object-contain rounded-md" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block leading-tight">PAGOS CON YAPE</span>
                  <span className="text-[11px] text-neutral-400 font-sans">Acreditación instantánea</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-white/[0.18] transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  <Users className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block leading-tight">+5,000 GAMERS</span>
                  <span className="text-[11px] text-neutral-400 font-sans">Comunidad activa diaria</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. ¿QUÉ ES EL MIXTÓN? BENTO GRID PRESENTATION */}
      <section className="py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase mb-3">
            <FaceitLogo className="w-3.5 h-3.5 text-[#FF5500]" /> COMPETICIÓN EN TIEMPO REAL
          </div>
          <h2 className="text-3xl sm:text-4xl font-black italic tracking-tight uppercase font-mono text-white">
            ¿QUÉ ES EL MIXTÓN DE MACHUPEEK?
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm mt-3 leading-relaxed font-sans">
            El Mixtón es el formato competitivo insignia de nuestra comunidad: partidas 5 contra 5 donde 2 capitanes seleccionan a sus integrantes mediante turnos de draft balanceados, disputando el encuentro en servidores oficiales de FACEIT.
          </p>
        </div>

        {/* 4 Feature Pillars Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div className="rounded-xl bg-neutral-900/50 border border-white/[0.08] hover:border-[#FF5500]/50 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div>
              <div className="w-12 h-12 rounded-lg bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] mb-5 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                1. Clasificación Tiers
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans">
                Los jugadores son categorizados en <strong className="text-amber-400">Tier S</strong>, <strong className="text-purple-400">A</strong>, <strong className="text-blue-400">B</strong> y <strong className="text-emerald-400">C</strong> según su ELO de FACEIT, garantizando paridad competitiva.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/[0.08] text-[10px] font-mono text-neutral-400 uppercase font-semibold">
              Balance justo garantizado
            </div>
          </div>

          <div className="rounded-xl bg-neutral-900/50 border border-white/[0.08] hover:border-blue-500/50 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                2. Draft en Vivo
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans">
                Los capitanes entran a nuestra <strong className="text-white">Arena Web</strong> y eligen a sus compañeros en tiempo real. ¡Todo sincronizado con bots de Discord y canales de voz automáticos!
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/[0.08] text-[10px] font-mono text-neutral-400 uppercase font-semibold">
              Pick order automático
            </div>
          </div>

          <div className="rounded-xl bg-neutral-900/50 border border-white/[0.08] hover:border-emerald-500/50 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div>
              <div className="w-12 h-12 rounded-lg bg-[#FF5500]/15 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] mb-5 group-hover:scale-110 transition-transform">
                <FaceitLogo className="w-6 h-6 text-[#FF5500]" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                3. Servidor FACEIT
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans">
                Al culminar el draft, el bot genera automáticamente la sala oficial de FACEIT y lanza el servidor con anticheat mandatorio y stats registradas.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/[0.08] text-[10px] font-mono text-neutral-400 uppercase font-semibold">
              Anticheat FACEIT Obligatorio
            </div>
          </div>

          <div className="rounded-xl bg-neutral-900/50 border border-white/[0.08] hover:border-[#A855F7]/50 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div>
              <div className="w-12 h-12 rounded-lg bg-[#742284]/25 border border-[#A855F7]/30 flex items-center justify-center p-2 text-[#C084FC] mb-5 group-hover:scale-110 transition-transform">
                <YapeLogo className="w-full h-full object-contain" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                4. Pozos en Soles
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans">
                Las partidas pueden disputarse con cuota de pozo (ej. S/ 5 o S/ 10). El equipo ganador se lleva el pozo acreditado a su billetera de inmediato.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/[0.08] text-[10px] font-mono text-neutral-400 uppercase font-semibold">
              Premios en Soles PEN
            </div>
          </div>

        </div>
      </section>

      {/* 3. GUÍA PASO A PASO: ¿CÓMO UNIRSE Y JUGAR? */}
      <section className="py-20 px-4 sm:px-6 bg-[#0B0C10] border-y border-white/[0.08] relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-mono font-bold uppercase text-[#FF5500] tracking-widest block mb-2">
              GUÍA RÁPIDA DE INGRESO
            </span>
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-tight uppercase font-mono text-white">
              ¿CÓMO JUGAR TU PRIMER MIXTÓN?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 font-mono text-xs">
            
            <div className="p-5 rounded-xl bg-neutral-900/40 border border-white/[0.08] relative group hover:border-[#5865F2]/50 transition-all">
              <span className="text-3xl font-black text-[#FF5500] block mb-3 font-mono">01</span>
              <h4 className="text-sm font-bold text-white uppercase mb-2">Únete a Discord</h4>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans mb-4">
                Ingresa al servidor oficial de MachuPeek donde se organizan las salas de voz y los avisos de partidas.
              </p>
              <a 
                href="https://discord.gg/xsWwaNjQ" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#5865F2] hover:underline font-bold inline-flex items-center gap-1.5"
              >
                Unirse a Discord <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="p-5 rounded-xl bg-neutral-900/40 border border-white/[0.08] relative group hover:border-[#FF5500]/50 transition-all">
              <span className="text-3xl font-black text-[#FF5500] block mb-3 font-mono">02</span>
              <h4 className="text-sm font-bold text-white uppercase mb-2">Verifica tu FACEIT</h4>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans mb-4">
                En el canal de Discord escribe el comando <code>/verificar_fc</code> con tu nickname para sincronizar nivel y roles.
              </p>
              <button
                type="button"
                onClick={() => setActiveView('guia-faceit')}
                className="text-[#FF5500] hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                Ver Guía de Vinculación →
              </button>
            </div>

            <div className="p-5 rounded-xl bg-neutral-900/40 border border-white/[0.08] relative group hover:border-[#A855F7]/50 transition-all">
              <span className="text-3xl font-black text-[#FF5500] block mb-3 font-mono">03</span>
              <h4 className="text-sm font-bold text-white uppercase mb-2">Recarga tu Saldo</h4>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans mb-4">
                Entra a tu Billetera y recarga saldo en Soles con Yape de forma instantánea y 100% segura.
              </p>
              <button
                type="button"
                onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
                className="text-[#C084FC] hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                Ir a Recargar Saldo →
              </button>
            </div>

            <div className="p-5 rounded-xl bg-neutral-900/40 border border-white/[0.08] relative group hover:border-emerald-500/50 transition-all">
              <span className="text-3xl font-black text-[#FF5500] block mb-3 font-mono">04</span>
              <h4 className="text-sm font-bold text-white uppercase mb-2">¡Ponte Listo y Juega!</h4>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans mb-4">
                Usa <code>/mixton_listo</code> en Discord o entra al lobby web. ¡Tu capitán te elegirá en el draft!
              </p>
              <button
                type="button"
                onClick={() => setActiveView('mixton')}
                className="text-emerald-400 hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                Ver Lobby del Mixtón →
              </button>
            </div>

          </div>

          {/* Banner Guía FACEIT & Anticheat */}
          <div className="mt-8 p-6 rounded-xl bg-neutral-900/60 border border-[#FF5500]/40 flex flex-col sm:flex-row items-center justify-between gap-5 font-mono shadow-[0_4px_25px_rgba(255,85,0,0.12)]">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#FF5500]/15 border border-[#FF5500]/40 flex items-center justify-center text-[#FF5500] shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase leading-tight">
                  PARTIDAS 100% EN FACEIT CON ANTICHEAT MANDATORIO
                </h4>
                <p className="text-neutral-400 text-xs font-sans mt-1">
                  Los mixtones se juegan en servidores oficiales de FACEIT. Consulta nuestra guía detallada para vincularte.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('guia-faceit')}
              className="px-6 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#FF661A] text-white text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer shadow-md transition-all active:scale-[0.98]"
            >
              Ver Guía de Vinculación →
            </button>
          </div>
        </div>
      </section>

      {/* 4. PAYMENT & COMPLIANCE BANNER */}
      <section className="bg-[#08090C] border-t border-white/[0.08] py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-black uppercase text-white font-mono">
                PAGOS Y RECARGAS 100% SEGUROS
              </h4>
              <p className="text-xs text-neutral-400 mt-1 font-sans">
                Todas las recargas en MachuPeek cuentan con procesamiento protegido mediante cifrado bancario SSL 256-bit y soporte instantáneo para <strong className="text-white">Yape</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
              className="px-5 py-2.5 rounded-lg bg-[#742284] hover:bg-[#8B2FA0] border border-[#A855F7]/40 text-white font-bold uppercase transition-all shadow-[0_0_15px_rgba(168,85,247,0.25)] cursor-pointer active:scale-[0.98] flex items-center gap-2"
            >
              <YapeLogo className="w-4 h-4 rounded-sm shrink-0" />
              <span>Recargar con Yape</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('libro-de-reclamaciones')}
              className="px-4 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-white/[0.1] text-cyan-300 font-bold uppercase transition-all cursor-pointer active:scale-[0.98]"
            >
              Libro Reclamaciones
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
