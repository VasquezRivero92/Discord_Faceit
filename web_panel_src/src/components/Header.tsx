import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  LogOut, 
  Coins, 
  Trophy, 
  PhoneCall,
  FileText,
  BookOpen,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  Award,
  Radio,
  Flame,
  Wallet
} from 'lucide-react';
import { FaceitLogo, YapeLogo, DiscordLogo } from './BrandLogos';
import { ActiveView, CurrentUser } from '../types';

interface HeaderProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  currentUser: CurrentUser | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  currentUser,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    // Smooth scroll to top when changing views
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08090C]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.65)] transition-all">
      {/* 1. Top Security, Verification & Status Bar */}
      <div className="bg-[#0C0E14] border-b border-white/[0.05] px-3 sm:px-6 py-1 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SSL 256-BIT SEGURO</span>
            </span>
            <span className="hidden sm:inline text-neutral-700">|</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-neutral-300">
              <YapeLogo className="w-3.5 h-3.5 rounded-xs shrink-0" />
              <span>Recargas directas con <strong className="text-[#C084FC] font-semibold">Yape</strong></span>
            </span>
            <span className="hidden lg:inline text-neutral-700">|</span>
            <span className="hidden lg:inline text-neutral-300">
              Conforme a <strong className="text-white font-semibold">INDECOPI</strong> (Ley N° 29571)
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto text-[11px] font-mono">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <span>Soporte WhatsApp:</span>
              <a 
                href="https://wa.me/51949165677" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-emerald-400 font-bold hover:underline transition-colors"
              >
                +51 949 165 677
              </a>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand Logo & Name */}
        <div 
          className="flex min-w-0 items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
          onClick={() => handleNavClick('inicio')}
          title="MachuPeek Esports CS2 Perú - Inicio"
        >
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#FF5500] to-red-600 rounded-full blur-sm opacity-40 group-hover:opacity-90 transition-opacity duration-300" />
            <img 
              src="/logo-machupeek.png" 
              alt="MachuPeek Esports Perú" 
              className="relative w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-2xl font-black italic tracking-tighter uppercase text-white font-mono whitespace-nowrap">
                MACHU<span className="text-[#FF5500]">PEEK</span>
              </span>
              <span className="hidden min-[420px]:inline text-[10px] bg-red-950/80 text-red-300 border border-red-700/60 px-1.5 py-0.5 rounded font-mono uppercase font-bold tracking-wider">
                PERÚ
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-medium hidden sm:block">
              CS2 MIXTON ARENA & FACEIT
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs (Visible on lg and larger displays) */}
        <nav className="hidden lg:flex min-w-0 flex-1 items-center justify-center gap-1 xl:gap-1.5 text-[11px] font-mono font-semibold uppercase whitespace-nowrap">
          <button
            type="button"
            onClick={() => handleNavClick('inicio')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'inicio'
                ? 'bg-[#FF5500] text-white shadow-[0_0_16px_rgba(255,85,0,0.4)] border border-[#FF5500]'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <span>Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('mixton')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'mixton' || activeView === 'arena'
                ? 'bg-[#FF5500] text-white shadow-[0_0_16px_rgba(255,85,0,0.4)] border border-[#FF5500]'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>El Mixtón</span>
            <span className="relative flex h-2 w-2 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('historial')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'historial'
                ? 'bg-[#FF5500] text-white shadow-[0_0_16px_rgba(255,85,0,0.4)] border border-[#FF5500]'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Partidas</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('guia-faceit')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'guia-faceit'
                ? 'bg-[#FF5500] text-white shadow-[0_0_16px_rgba(255,85,0,0.4)] border border-[#FF5500]'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <FaceitLogo className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Guía FACEIT</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick(currentUser ? 'cuenta' : 'login')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'cuenta' || activeView === 'login'
                ? 'bg-[#742284] text-white shadow-[0_0_16px_rgba(168,85,247,0.4)] border border-[#A855F7]'
                : 'text-purple-300 hover:text-white hover:bg-purple-950/30 border border-purple-500/20'
            }`}
          >
            <YapeLogo className="w-3.5 h-3.5 rounded-xs shrink-0" />
            <span>{currentUser ? 'Mi Billetera' : 'Recargar / Saldo'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('libro-de-reclamaciones')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'libro-de-reclamaciones'
                ? 'bg-[#0284C7] text-white shadow-[0_0_16px_rgba(2,132,199,0.4)] border border-sky-400'
                : 'text-cyan-300 hover:text-white hover:bg-cyan-950/30 border border-cyan-500/20'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reclamaciones</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('contacto')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'contacto'
                ? 'bg-[#FF5500] text-white shadow-[0_0_16px_rgba(255,85,0,0.4)] border border-[#FF5500]'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-neutral-400" />
            <span>Contacto</span>
          </button>
        </nav>

        {/* Right Action: Auth / User / Mobile Menu Toggle */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-white/[0.1]">
              <button
                type="button"
                onClick={() => handleNavClick('cuenta')}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-white/[0.1] hover:border-[#FF5500]/60 transition-all cursor-pointer text-left group shadow-sm active:scale-[0.98]"
                title="Ir a mi billetera y cuenta"
              >
                <div className="relative">
                  {currentUser.avatar ? (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${currentUser.userId}/${currentUser.avatar}.png?size=64`}
                      alt={currentUser.username}
                      className="w-7 h-7 rounded-full object-cover border border-[#FF5500]/60 shadow-sm"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-neutral-800 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold text-white">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-black" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-white leading-tight font-mono group-hover:text-[#FF5500] transition-colors">
                    {currentUser.username}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono font-bold tabular-nums">
                    S/ {(currentUser.balance || 0).toFixed(2)} PEN
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/40 transition-all cursor-pointer active:scale-[0.96]"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => handleNavClick('login')}
                className="lg:hidden px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#742284] hover:bg-[#8B2FA0] border border-[#A855F7]/40 text-white text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)] cursor-pointer active:scale-[0.98]"
              >
                <YapeLogo className="w-3.5 h-3.5 rounded-xs shrink-0" />
                <span className="hidden min-[360px]:inline">Recargar</span>
              </button>

              <a
                href="/auth/discord"
                className="hidden min-[420px]:flex px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] border border-[#5865F2]/50 text-white text-xs font-mono font-bold uppercase transition-all items-center gap-1.5 shadow-[0_0_12px_rgba(88,101,242,0.3)] active:scale-[0.98]"
                title="Conectar Discord"
              >
                <DiscordLogo className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Discord</span>
              </a>
            </div>
          )}

          {/* Mobile Menu Toggle Button (Visible on screens smaller than lg) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-neutral-300 hover:text-white cursor-pointer active:scale-[0.96]"
            aria-label="Abrir menú de navegación"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#FF5500]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 3. Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0A0C12]/95 backdrop-blur-2xl border-b border-white/[0.1] px-4 py-3.5 space-y-1.5 font-mono text-xs uppercase font-semibold animate-fade-in shadow-2xl">
          <button
            type="button"
            onClick={() => handleNavClick('inicio')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
              activeView === 'inicio' ? 'bg-[#FF5500] text-white shadow-md' : 'text-neutral-300 hover:bg-white/[0.05]'
            }`}
          >
            <span>Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('mixton')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeView === 'mixton' || activeView === 'arena' ? 'bg-[#FF5500] text-white shadow-md' : 'text-neutral-300 hover:bg-white/[0.05]'
            }`}
          >
            <Trophy className="w-4 h-4 text-[#FF5500]" />
            <span className="flex-1">El Mixtón en Vivo</span>
            <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded text-emerald-400 font-bold">LIVE</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('historial')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeView === 'historial' ? 'bg-[#FF5500] text-white shadow-md' : 'text-neutral-300 hover:bg-white/[0.05]'
            }`}
          >
            <Award className="w-4 h-4 text-[#FF5500]" />
            <span>Historial de Partidas</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('guia-faceit')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeView === 'guia-faceit' ? 'bg-[#FF5500] text-white shadow-md' : 'text-neutral-300 hover:bg-white/[0.05]'
            }`}
          >
            <FaceitLogo className="w-4 h-4 text-[#FF5500]" />
            <span>Guía FACEIT & Vinculación</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick(currentUser ? 'cuenta' : 'login')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeView === 'cuenta' || activeView === 'login' ? 'bg-[#742284] text-white shadow-md' : 'text-purple-300 hover:bg-purple-950/30'
            }`}
          >
            <YapeLogo className="w-4 h-4 rounded-xs shrink-0" />
            <span>{currentUser ? 'Billetera & Saldo' : 'Recargar Saldo con Yape'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('libro-de-reclamaciones')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeView === 'libro-de-reclamaciones' ? 'bg-[#0284C7] text-white shadow-md' : 'text-cyan-300 hover:bg-cyan-950/30'
            }`}
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Libro de Reclamaciones INDECOPI</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('contacto')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeView === 'contacto' ? 'bg-[#FF5500] text-white shadow-md' : 'text-neutral-300 hover:bg-white/[0.05]'
            }`}
          >
            <PhoneCall className="w-4 h-4 text-neutral-400" />
            <span>Contacto y Soporte</span>
          </button>

          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-neutral-400">
            <span>Soporte WhatsApp:</span>
            <a 
              href="https://wa.me/51949165677" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-emerald-400 font-bold hover:underline"
            >
              +51 949 165 677
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
