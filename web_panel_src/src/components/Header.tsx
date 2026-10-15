import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Gamepad2, 
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
  Sparkles
} from 'lucide-react';
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
  };

  return (
    <header className="sticky top-0 z-50 bg-[#08090C]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
      {/* 1. Top Security, Verification & Status Bar */}
      <div className="bg-[#0C0E14] border-b border-white/[0.05] px-4 py-1 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono font-medium tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SSL 256-BIT SEGURO</span>
            </span>
            <span className="hidden sm:inline text-neutral-700">|</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-neutral-300 font-mono text-[11px]">
              Recargas automáticas con <strong className="text-[#C084FC] font-semibold">Yape</strong>
            </span>
            <span className="hidden md:inline text-neutral-700">|</span>
            <span className="hidden md:inline text-neutral-300 font-mono text-[11px]">
              Libro de Reclamaciones conforme a <strong className="text-white font-semibold">INDECOPI</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto text-[11px] font-mono">
            <span className="text-neutral-400">
              Soporte WhatsApp: <a href="https://wa.me/51949165677" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-bold hover:underline">+51 949 165 677</a>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Name */}
        <div 
          className="flex items-center gap-3 cursor-pointer group select-none" 
          onClick={() => handleNavClick('inicio')}
        >
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#FF5500] to-red-600 rounded-full blur-sm opacity-30 group-hover:opacity-75 transition-opacity duration-300" />
            <img 
              src="/logo-machupeek.png" 
              alt="MachuPeek Esports Perú" 
              className="relative w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-white font-mono">
                MACHU<span className="text-[#FF5500]">PEEK</span>
              </span>
              <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-700/60 px-1.5 py-0.5 rounded font-mono uppercase font-bold tracking-wider">
                PERÚ
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-medium hidden sm:block">
              CS2 MIXTON ARENA & FACEIT
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1.5 text-xs font-mono font-semibold uppercase">
          <button
            type="button"
            onClick={() => handleNavClick('inicio')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeView === 'inicio'
                ? 'bg-[#FF5500] text-white shadow-[0_0_15px_rgba(255,85,0,0.35)]'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            Inicio
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('mixton')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'mixton' || activeView === 'arena'
                ? 'bg-[#FF5500] text-white shadow-[0_0_15px_rgba(255,85,0,0.35)]'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>El Mixtón</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('guia-faceit')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'guia-faceit'
                ? 'bg-[#FF5500] text-white shadow-[0_0_15px_rgba(255,85,0,0.35)]'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Guía FACEIT</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick(currentUser ? 'cuenta' : 'login')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'cuenta' || activeView === 'login'
                ? 'bg-[#742284] text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                : 'text-purple-300 hover:text-white hover:bg-purple-950/30'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-[#C084FC]" />
            <span>{currentUser ? 'Billetera' : 'Recargar / Saldo'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('libro-de-reclamaciones')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'libro-de-reclamaciones'
                ? 'bg-[#0284C7] text-white shadow-[0_0_15px_rgba(2,132,199,0.35)]'
                : 'text-cyan-300 hover:text-white hover:bg-cyan-950/30'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reclamaciones</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('contacto')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'contacto'
                ? 'bg-[#FF5500] text-white shadow-[0_0_15px_rgba(255,85,0,0.35)]'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-neutral-400" />
            <span>Contacto</span>
          </button>
        </nav>

        {/* Right Action: Auth / User / Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-white/[0.1]">
              <button
                type="button"
                onClick={() => handleNavClick('cuenta')}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-neutral-900/60 border border-white/[0.08] hover:border-[#FF5500]/50 transition-all cursor-pointer text-left group"
                title="Ir a mi billetera"
              >
                <div className="relative">
                  {currentUser.avatar ? (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${currentUser.userId}/${currentUser.avatar}.png?size=64`}
                      alt={currentUser.username}
                      className="w-7 h-7 rounded-full object-cover border border-[#FF5500]/60"
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
                  <div className="text-[10px] text-emerald-400 font-mono font-bold">
                    S/ {(currentUser.balance || 0).toFixed(2)} PEN
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-950/20 transition-all cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNavClick('login')}
                className="px-3 py-1.5 rounded-md bg-[#742284] hover:bg-[#8B2FA0] border border-[#A855F7]/40 text-white text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.25)] cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Recargar</span>
              </button>

              <a
                href="/auth/discord"
                className="px-3 py-1.5 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(88,101,242,0.25)]"
                title="Conectar Discord"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Discord</span>
              </a>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-md bg-white/[0.05] border border-white/[0.1] text-neutral-300 hover:text-white cursor-pointer"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 3. Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0A0C12] border-b border-white/[0.1] px-4 py-3 space-y-1.5 font-mono text-xs uppercase font-semibold">
          <button
            type="button"
            onClick={() => handleNavClick('inicio')}
            className={`w-full text-left px-3.5 py-2.5 rounded-md flex items-center justify-between ${
              activeView === 'inicio' ? 'bg-[#FF5500] text-white' : 'text-neutral-300 hover:bg-white/[0.05]'
            }`}
          >
            <span>Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('mixton')}
            className={`w-full text-left px-3.5 py-2.5 rounded-md flex items-center gap-2 ${
              activeView === 'mixton' || activeView === 'arena' ? 'bg-[#FF5500] text-white' : 'text-neutral-300 hover:bg-white/[0.05]'
            }`}
          >
            <Trophy className="w-4 h-4 text-[#FF5500]" />
            <span>El Mixtón en Vivo</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('guia-faceit')}
            className={`w-full text-left px-3.5 py-2.5 rounded-md flex items-center gap-2 ${
              activeView === 'guia-faceit' ? 'bg-[#FF5500] text-white' : 'text-neutral-300 hover:bg-white/[0.05]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#FF5500]" />
            <span>Guía FACEIT & Vinculación</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick(currentUser ? 'cuenta' : 'login')}
            className={`w-full text-left px-3.5 py-2.5 rounded-md flex items-center gap-2 ${
              activeView === 'cuenta' || activeView === 'login' ? 'bg-[#742284] text-white' : 'text-purple-300 hover:bg-purple-950/20'
            }`}
          >
            <Coins className="w-4 h-4 text-[#C084FC]" />
            <span>{currentUser ? 'Billetera & Saldo' : 'Recargar con Yape'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('libro-de-reclamaciones')}
            className={`w-full text-left px-3.5 py-2.5 rounded-md flex items-center gap-2 ${
              activeView === 'libro-de-reclamaciones' ? 'bg-[#0284C7] text-white' : 'text-cyan-300 hover:bg-cyan-950/20'
            }`}
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Libro de Reclamaciones INDECOPI</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('contacto')}
            className={`w-full text-left px-3.5 py-2.5 rounded-md flex items-center gap-2 ${
              activeView === 'contacto' ? 'bg-[#FF5500] text-white' : 'text-neutral-300 hover:bg-white/[0.05]'
            }`}
          >
            <PhoneCall className="w-4 h-4 text-neutral-400" />
            <span>Contacto y Soporte</span>
          </button>
        </div>
      )}
    </header>
  );
};
