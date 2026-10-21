import React, { useState, useEffect } from 'react';
import { ActiveView } from '../types';
import { 
  Gamepad2, 
  Trophy, 
  ShieldCheck, 
  Zap, 
  Award, 
  Coins, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink,
  Sparkles,
  Layers,
  HelpCircle,
  BookOpen,
  Activity,
  Cpu,
  Lock,
  Wallet,
  ChevronDown,
  Flame,
  Radio,
  Swords,
  Crosshair,
  Server,
  Check,
  PhoneCall
} from 'lucide-react';
import { FaceitLogo, SteamLogo, YapeLogo, DiscordLogo } from './BrandLogos';

interface LandingHomeViewProps {
  setActiveView: (view: ActiveView) => void;
  currentUser: any;
}

// CS2 Official Tournament Active Duty Maps
const CS2_MAPS = [
  { id: 'de_mirage', name: 'Mirage', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_mirage.png', type: 'Competitivo Popular' },
  { id: 'de_inferno', name: 'Inferno', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_inferno.png', type: 'Táctico Clásico' },
  { id: 'de_nuke', name: 'Nuke', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_nuke.png', type: 'Vertical & Rotaciones' },
  { id: 'de_anubis', name: 'Anubis', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_anubis.png', type: 'Ritmo Dinámico' },
  { id: 'de_ancient', name: 'Ancient', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_ancient.png', type: 'Control de Mid' },
  { id: 'de_dust2', name: 'Dust II', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_dust2.png', type: 'Leyenda del CS' },
  { id: 'de_vertigo', name: 'Vertigo', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_vertigo.png', type: 'Ataque Multinivel' }
];

export const LandingHomeView: React.FC<LandingHomeViewProps> = ({
  setActiveView,
  currentUser
}) => {
  const [activeSection, setActiveSection] = useState<'hero' | 'mixton' | 'pasos' | 'maps' | 'seguridad'>('hero');

  // Track active section for floating dot navigation
  useEffect(() => {
    const sections = ['hero', 'mixton', 'pasos', 'maps', 'seguridad'];
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= windowHeight * 0.45 && rect.bottom >= windowHeight * 0.45) {
            setActiveSection(sectionId as any);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="text-white font-sans selection:bg-[#FF5500] selection:text-white relative">
      
      {/* Floating Section Indicator (Desktop Right Side) */}
      <nav 
        aria-label="Navegación por secciones"
        className="hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-3 bg-black/60 backdrop-blur-xl p-2.5 rounded-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
      >
        {[
          { id: 'hero', label: 'Inicio' },
          { id: 'mixton', label: 'El Mixtón' },
          { id: 'pasos', label: 'Cómo Jugar' },
          { id: 'maps', label: 'Map Pool CS2' },
          { id: 'seguridad', label: 'Seguridad & Legal' }
        ].map((sec, idx) => {
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className="relative group p-1 flex items-center justify-center cursor-pointer"
              aria-label={`Ir a sección ${sec.label}`}
            >
              <span className={`block rounded-full transition-all duration-300 ${
                isActive 
                  ? 'w-3 h-3 bg-[#FF5500] shadow-[0_0_12px_#FF5500] scale-125' 
                  : 'w-2 h-2 bg-neutral-500 hover:bg-neutral-300'
              }`} />
              
              {/* Tooltip on hover */}
              <span className="absolute right-7 px-2.5 py-1 rounded bg-[#11131A] border border-white/10 text-[10px] font-mono text-neutral-200 uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                {sec.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* =========================================================================
          SECTION 1: HERO DISPLAY (SCROLL SNAP SECTION)
          ========================================================================= */}
      <section 
        id="hero"
        className="snap-section min-h-[calc(100vh-98px)] flex flex-col justify-center relative overflow-hidden bg-[#08090C] border-b border-white/[0.08] py-12 sm:py-16 px-4 sm:px-6"
      >
        {/* Layered Ambient Cones */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[480px] bg-gradient-to-b from-[#FF5500]/20 via-red-600/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/10 w-[350px] h-[350px] bg-purple-600/12 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/10 w-[320px] h-[320px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
        
        {/* Tactical dot grid overlay */}
        <div className="absolute inset-0 tactical-grid opacity-35 pointer-events-none" />

        <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10 w-full">
          
          {/* Logo with Soft Dynamic Aura */}
          <div className="mb-5 sm:mb-6 relative group select-none">
            <div className="absolute -inset-3 bg-gradient-to-r from-red-600 via-[#FF5500] to-amber-500 rounded-full blur-2xl opacity-45 group-hover:opacity-85 transition-opacity duration-500 animate-pulse-slow" />
            <img 
              src="/logo-machupeek.png" 
              alt="MachuPeek Esports CS2 Perú" 
              className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 object-contain drop-shadow-[0_16px_36px_rgba(0,0,0,0.95)] animate-float"
            />
          </div>

          {/* Tactical Status Tag */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-md text-neutral-300 text-xs font-mono font-medium uppercase tracking-widest mb-5 shadow-lg shadow-black/40">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5500] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5500]" />
            </span>
            <span>COMUNIDAD COMPETITIVA #1 DE CS2 EN EL PERÚ</span>
          </div>

          {/* Main Hero Display Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black italic tracking-tight uppercase leading-[0.95] max-w-4xl mb-4 font-mono text-balance">
            BIENVENIDO A <span className="bg-gradient-to-r from-[#FF5500] via-[#FF7733] to-[#FFAA00] bg-clip-text text-transparent drop-shadow-[0_4px_25px_rgba(255,85,0,0.45)]">MACHUPEEK</span>
          </h1>

          <p className="text-neutral-300 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed mb-8 font-normal text-pretty">
            La plataforma de Counter-Strike 2 en el Perú. Partidas mixtón 5v5 con draft de capitanes, servidores oficiales <strong className="text-white font-semibold">FACEIT con anticheat obligatorio</strong> y torneos con pozos acumulados en Soles (PEN).
          </p>

          {/* Tactical CTAs with Physical Micro-Interactions */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-mono text-xs font-bold uppercase mb-10">
            <button
              type="button"
              onClick={() => setActiveView('mixton')}
              className="px-7 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#FF661A] text-white font-black tracking-wider shadow-[0_4px_24px_rgba(255,85,0,0.45)] hover:shadow-[0_6px_36px_rgba(255,85,0,0.6)] transition-all flex items-center gap-2.5 cursor-pointer active:scale-[0.97]"
            >
              <Trophy className="w-4 h-4 text-white" />
              <span>Entrar al Mixtón en Vivo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
              className="px-6 py-3.5 rounded-xl bg-[#742284] hover:bg-[#8B2FA0] border border-[#A855F7]/40 text-white font-black tracking-wider shadow-[0_4px_20px_rgba(168,85,247,0.35)] transition-all flex items-center gap-2.5 cursor-pointer active:scale-[0.97]"
            >
              <YapeLogo className="w-4 h-4 rounded-xs shrink-0" />
              <span>Recargar Saldo Yape</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('guia-faceit')}
              className="px-5 py-3.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-white/[0.12] hover:border-white/30 text-neutral-200 hover:text-white transition-all flex items-center gap-2 cursor-pointer active:scale-[0.97]"
            >
              <FaceitLogo className="w-4 h-4 text-[#FF5500]" />
              <span>Guía FACEIT</span>
            </button>
          </div>

          {/* Live Telemetry Highlights (Stats HUD) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-4xl mx-auto text-left font-mono">
            
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-sky-500/40 transition-all group">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#1b2838]/90 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <SteamLogo className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block leading-tight">LOBBY STEAM & CS2</span>
                  <span className="text-[11px] text-neutral-400 font-sans">Invitaciones y conexión directa</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-[#FF5500]/50 transition-all group">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#FF5500]/15 border border-[#FF5500]/30 text-[#FF5500] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FaceitLogo className="w-5 h-5 shrink-0 text-[#FF5500]" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block leading-tight">ANTICHEAT FACEIT</span>
                  <span className="text-[11px] text-neutral-400 font-sans">100% obligatorio y limpio</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-[#A855F7]/50 transition-all group">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-xl bg-[#742284]/30 border border-[#A855F7]/30 flex items-center justify-center w-11 h-11 shrink-0 group-hover:scale-105 transition-transform">
                  <YapeLogo className="w-full h-full object-contain rounded-md" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block leading-tight">PAGOS CON YAPE</span>
                  <span className="text-[11px] text-neutral-400 font-sans">Acreditación automática en Soles</span>
                </div>
              </div>
            </div>

          </div>

          {/* Smooth Scroll Down Indicator */}
          <button
            type="button"
            onClick={() => scrollToSection('mixton')}
            className="mt-8 text-neutral-500 hover:text-neutral-300 font-mono text-[11px] uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Desliza para explorar el sistema</span>
            <ChevronDown className="w-3.5 h-3.5 animate-bounce text-[#FF5500]" />
          </button>

        </div>
      </section>

      {/* =========================================================================
          SECTION 2: ¿QUÉ ES EL MIXTÓN? BENTO GRID 2.0 (SCROLL SNAP SECTION)
          ========================================================================= */}
      <section 
        id="mixton"
        className="snap-section min-h-[calc(100vh-98px)] flex flex-col justify-center relative py-14 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto"
      >
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase mb-3">
            <Swords className="w-3.5 h-3.5 text-[#FF5500]" /> COMPETICIÓN EN TIEMPO REAL
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tight uppercase font-mono text-white text-balance">
            ¿QUÉ ES EL MIXTÓN EN MACHUPEEK?
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm mt-3 leading-relaxed font-sans text-pretty">
            El Mixtón es el formato competitivo insignia de nuestra comunidad: partidas 5v5 donde 2 capitanes seleccionan a sus integrantes mediante turnos de draft balanceados, disputando el encuentro en servidores oficiales de FACEIT o servidores dedicados en Lima.
          </p>
        </div>

        {/* 4 Feature Pillars Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Card 1: Tiers */}
          <div className="rounded-2xl bg-neutral-900/60 border border-white/[0.08] hover:border-amber-500/50 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                1. Clasificación Tiers
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans text-pretty">
                Los jugadores son clasificados en <strong className="text-amber-400">Tier S</strong>, <strong className="text-purple-400">A</strong>, <strong className="text-blue-400">B</strong> y <strong className="text-emerald-400">C</strong> según su ELO de FACEIT.
              </p>
              
              <div className="flex flex-wrap gap-1.5 mt-3 pt-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">Tier S</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">Tier A</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">Tier B</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">Tier C</span>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-white/[0.08] text-[10px] font-mono text-neutral-400 uppercase font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Balance justo garantizado</span>
            </div>
          </div>

          {/* Card 2: Draft */}
          <div className="rounded-2xl bg-neutral-900/60 border border-white/[0.08] hover:border-blue-500/50 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                2. Draft en Vivo
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans text-pretty">
                Los capitanes entran a la <strong className="text-white">Arena Web</strong> y seleccionan compañeros y mapas en tiempo real con canales de voz sincronizados en Discord.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/[0.08] text-[10px] font-mono text-neutral-400 uppercase font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Pick order 1-2-2-2-1</span>
            </div>
          </div>

          {/* Card 3: Servidor FACEIT */}
          <div className="rounded-2xl bg-neutral-900/60 border border-white/[0.08] hover:border-[#FF5500]/50 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#FF5500]/15 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] mb-5 group-hover:scale-110 transition-transform">
                <FaceitLogo className="w-6 h-6 text-[#FF5500]" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                3. Anticheat FACEIT
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans text-pretty">
                Partidas protegidas al 100% con anticheat mandatorio a nivel de kernel de FACEIT y registro automático de estadísticas (K/D, ADR, MVPs).
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/[0.08] text-[10px] font-mono text-neutral-400 uppercase font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>100% Libre de Cheats</span>
            </div>
          </div>

          {/* Card 4: Pozos en Soles */}
          <div className="rounded-2xl bg-neutral-900/60 border border-white/[0.08] hover:border-[#A855F7]/50 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#742284]/25 border border-[#A855F7]/30 flex items-center justify-center p-2 text-[#C084FC] mb-5 group-hover:scale-110 transition-transform">
                <YapeLogo className="w-full h-full object-contain" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                4. Pozos en Soles
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed font-sans text-pretty">
                Partidas con cuota de S/ 2, S/ 5 o S/ 10. El equipo ganador recibe el pozo total acreditado automáticamente a su billetera en Soles (PEN).
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/[0.08] text-[10px] font-mono text-neutral-400 uppercase font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C084FC]" />
              <span>Premios automáticos Yape</span>
            </div>
          </div>

        </div>

        {/* Live Draft & Veto Visual Showcase */}
        <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-neutral-900/40 border border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#FF5500]/15 border border-[#FF5500]/30 text-[#FF5500]">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <span className="text-xs font-mono font-bold text-white uppercase block">
                SISTEMA INTEGRADO DE VETO Y DRAFT
              </span>
              <span className="text-[11px] text-neutral-400 font-sans">
                Todo ocurre dentro de la web sin necesidad de hojas de cálculo ni esperas.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('mixton')}
              className="px-4 py-2 rounded-xl bg-[#FF5500] hover:bg-[#FF661A] text-white text-xs font-mono font-bold uppercase transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              Ver Sala Mixtón →
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: GUÍA EN 4 PASOS (SCROLL SNAP SECTION)
          ========================================================================= */}
      <section 
        id="pasos"
        className="snap-section min-h-[calc(100vh-98px)] flex flex-col justify-center relative py-14 sm:py-20 px-4 sm:px-6 bg-[#0B0C10] border-y border-white/[0.08]"
      >
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-10 sm:mb-12">
            <span className="text-xs font-mono font-bold uppercase text-[#FF5500] tracking-widest block mb-2">
              GUÍA RÁPIDA DE INGRESO
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tight uppercase font-mono text-white text-balance">
              ¿CÓMO JUGAR TU PRIMER MIXTÓN?
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm mt-2 font-sans max-w-xl mx-auto text-pretty">
              Sigue estos 4 pasos y estarás listo para disputar partidas con anticheat en menos de 2 minutos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-5 font-mono text-xs">
            
            {/* Step 1 */}
            <div className="p-5 rounded-2xl bg-neutral-900/50 border border-white/[0.08] relative group hover:border-[#5865F2]/50 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-[#FF5500] block mb-2 font-mono">01</span>
                <h4 className="text-sm font-bold text-white uppercase mb-2">Únete a Discord</h4>
                <p className="text-neutral-400 text-xs leading-relaxed font-sans mb-4 text-pretty">
                  Ingresa al servidor oficial de MachuPeek donde se organizan las salas de voz y los avisos de partidas.
                </p>
              </div>
              <a 
                href="https://discord.gg/xsWwaNjQ" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#5865F2] hover:underline font-bold inline-flex items-center gap-1.5 pt-3 border-t border-white/[0.06]"
              >
                Unirse a Discord <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl bg-neutral-900/50 border border-white/[0.08] relative group hover:border-[#FF5500]/50 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-[#FF5500] block mb-2 font-mono">02</span>
                <h4 className="text-sm font-bold text-white uppercase mb-2">Verifica tu FACEIT</h4>
                <p className="text-neutral-400 text-xs leading-relaxed font-sans mb-4 text-pretty">
                  En el canal de Discord escribe el comando <code>/verificar_fc</code> con tu nickname para sincronizar nivel y roles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('guia-faceit')}
                className="text-[#FF5500] hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer pt-3 border-t border-white/[0.06]"
              >
                Ver Guía de Vinculación →
              </button>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl bg-neutral-900/50 border border-white/[0.08] relative group hover:border-[#A855F7]/50 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-[#FF5500] block mb-2 font-mono">03</span>
                <h4 className="text-sm font-bold text-white uppercase mb-2">Recarga tu Saldo</h4>
                <p className="text-neutral-400 text-xs leading-relaxed font-sans mb-4 text-pretty">
                  Entra a tu Billetera y recarga saldo en Soles con Yape de forma instantánea y 100% segura.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
                className="text-[#C084FC] hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer pt-3 border-t border-white/[0.06]"
              >
                Ir a Recargar Saldo →
              </button>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-2xl bg-neutral-900/50 border border-white/[0.08] relative group hover:border-emerald-500/50 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-[#FF5500] block mb-2 font-mono">04</span>
                <h4 className="text-sm font-bold text-white uppercase mb-2">¡Ponte Listo y Juega!</h4>
                <p className="text-neutral-400 text-xs leading-relaxed font-sans mb-4 text-pretty">
                  Usa <code>/mixton_listo</code> en Discord o entra al lobby web. ¡Tu capitán te elegirá en el draft!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('mixton')}
                className="text-emerald-400 hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer pt-3 border-t border-white/[0.06]"
              >
                Ver Lobby del Mixtón →
              </button>
            </div>

          </div>

          {/* Banner Guía FACEIT & Anticheat */}
          <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-neutral-900/60 border border-[#FF5500]/40 flex flex-col sm:flex-row items-center justify-between gap-5 font-mono shadow-[0_4px_25px_rgba(255,85,0,0.15)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FF5500]/15 border border-[#FF5500]/40 flex items-center justify-center text-[#FF5500] shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase leading-tight">
                  PARTIDAS 100% EN FACEIT CON ANTICHEAT MANDATORIO
                </h4>
                <p className="text-neutral-400 text-xs font-sans mt-1 text-pretty">
                  Los mixtones se juegan en servidores oficiales de FACEIT. Consulta nuestra guía ilustrada con capturas paso a paso.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('guia-faceit')}
              className="px-6 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#FF661A] text-white text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer shadow-md transition-all active:scale-[0.98]"
            >
              Ver Guía de Vinculación →
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: ACTIVE DUTY MAP POOL CS2 (SCROLL SNAP SECTION)
          ========================================================================= */}
      <section 
        id="maps"
        className="snap-section min-h-[calc(100vh-98px)] flex flex-col justify-center relative py-14 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto"
      >
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase mb-3">
            <Crosshair className="w-3.5 h-3.5 text-[#FF5500]" /> TOURNAMENT MAP POOL
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tight uppercase font-mono text-white text-balance">
            MAP POOL OFICIAL DE COUNTER-STRIKE 2
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm mt-2 font-sans max-w-xl mx-auto text-pretty">
            Los 7 mapas del Active Duty oficial de Valve disputados en torneos internacionales. Durante el mixtón, los capitanes banean mapas por turnos hasta definir el mapa final.
          </p>
        </div>

        {/* 7 Maps Carousel Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 mb-8">
          {CS2_MAPS.map((map) => (
            <div 
              key={map.id}
              className="group relative rounded-2xl overflow-hidden bg-neutral-900 border border-white/[0.1] hover:border-[#FF5500] transition-all duration-300 shadow-md hover:-translate-y-1"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-black/60 relative">
                <img 
                  src={map.image} 
                  alt={map.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <span className="absolute bottom-2 left-2 text-xs font-mono font-black text-white uppercase tracking-wider drop-shadow-md">
                  {map.name}
                </span>
              </div>
              <div className="p-2 text-center bg-[#0D0F14] border-t border-white/[0.05]">
                <span className="text-[10px] text-neutral-400 font-sans block truncate">
                  {map.type}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Dual Mode Feature Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-neutral-900/50 border border-[#FF5500]/30 shadow-[inset_0_1px_0_0_rgba(255,85,0,0.1)] flex items-start gap-4">
            <div className="p-3 rounded-xl bg-[#FF5500]/15 text-[#FF5500] shrink-0">
              <FaceitLogo className="w-6 h-6 text-[#FF5500]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-mono uppercase mb-1">
                Modo FACEIT Hub (Oficial)
              </h4>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed text-pretty">
                Asigna automáticamente una de las colas exclusivas del Hub de FACEIT. Anticheat mandatario y estadísticas oficiales de FACEIT registradas.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/50 border border-sky-500/30 shadow-[inset_0_1px_0_0_rgba(2,132,199,0.1)] flex items-start gap-4">
            <div className="p-3 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
              <Server className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-mono uppercase mb-1">
                Servidor Dedicado CS2 (Lima)
              </h4>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed text-pretty">
                Enciende un servidor CS2 dedicado 5v5 con el mapa seleccionado. La IP de conexión se envía automáticamente por Discord a los 10 jugadores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: SEGURIDAD, PAGOS Y LEGALIDAD (SCROLL SNAP SECTION)
          ========================================================================= */}
      <section 
        id="seguridad"
        className="snap-section min-h-[calc(100vh-98px)] flex flex-col justify-center relative py-14 sm:py-20 px-4 sm:px-6 bg-[#08090C] border-t border-white/[0.08]"
      >
        <div className="max-w-5xl mx-auto w-full">
          
          <div className="text-center mb-10 sm:mb-12">
            <span className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-widest block mb-2">
              TRANSPARENCIA Y CONFIANZA
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tight uppercase font-mono text-white text-balance">
              PLATAFORMA 100% LEGAL Y SEGURA
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm mt-2 font-sans max-w-xl mx-auto text-pretty">
              Cumplimos estrictamente las normas del comercio electrónico peruano y garantizamos la seguridad de tus transacciones.
            </p>
          </div>

          {/* 3 Pillars of Security */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            
            <div className="p-6 rounded-2xl bg-neutral-900/50 border border-emerald-500/30 shadow-lg flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="text-base font-black uppercase text-white font-mono mb-2">
                  Cifrado SSL 256-Bit
                </h4>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed text-pretty">
                  Tus datos de navegación y credenciales están encriptados con los estándares de seguridad bancaria más rigurosos.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-emerald-400 font-bold uppercase">
                Seguridad Verificada
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-900/50 border border-[#A855F7]/30 shadow-lg flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#742284]/25 border border-[#A855F7]/30 flex items-center justify-center p-2 text-[#C084FC] mb-4">
                  <YapeLogo className="w-full h-full object-contain" />
                </div>
                <h4 className="text-base font-black uppercase text-white font-mono mb-2">
                  Depósitos Yape
                </h4>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed text-pretty">
                  Recarga con código de aprobación en segundos. Los premios se envían directamente a tu celular Yape registrado.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-purple-300 font-bold uppercase">
                Acreditación Instantánea
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-900/50 border border-sky-500/30 shadow-lg flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h4 className="text-base font-black uppercase text-white font-mono mb-2">
                  Libro INDECOPI
                </h4>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed text-pretty">
                  Contamos con Libro de Reclamaciones Virtual conforme a la Ley N° 29571 y respuesta garantizada en el plazo legal.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-sky-400 font-bold uppercase">
                Cumplimiento Legal Perú
              </div>
            </div>

          </div>

          {/* Grand Call To Action Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#1F140E] border-2 border-[#FF5500]/50 shadow-[0_8px_32px_rgba(255,85,0,0.25)] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF5500] block mb-1">
                ¿LISTO PARA COMPETIR?
              </span>
              <h3 className="text-xl sm:text-2xl font-black italic uppercase font-mono text-white">
                ÚNETE AL MIXTÓN DE HOY Y DISPUTA EL POZO
              </h3>
              <p className="text-xs text-neutral-400 font-sans mt-1 text-pretty">
                Ingresa al lobby en vivo, vincula tu cuenta y juega con los mejores del Perú.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveView('mixton')}
                className="px-6 py-3 rounded-xl bg-[#FF5500] hover:bg-[#FF661A] text-white font-black uppercase tracking-wider shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                Entrar al Mixtón →
              </button>
              <button
                type="button"
                onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
                className="px-5 py-3 rounded-xl bg-[#742284] hover:bg-[#8B2FA0] border border-[#A855F7]/40 text-white font-bold uppercase transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                Recargar Saldo
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
