import React from 'react';
import { 
  ShieldCheck, 
  Gamepad2, 
  User, 
  LogOut, 
  Coins, 
  Trophy, 
  PhoneCall,
  FileText,
  BookOpen
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
  return (
    <header className="border-b-4 border-[#1A1A1A] bg-[#0E0E0E] sticky top-0 z-40 shadow-xl">
      {/* Top Security & Compliance Bar */}
      <div className="bg-[#141414] border-b border-[#222] px-4 py-1 text-[11px] text-neutral-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5" /> SITIO SEGURO SSL (HTTPS)
          </span>
          <span className="hidden sm:inline text-neutral-600">|</span>
          <span className="hidden sm:inline text-neutral-300">
            Pagos y recargas automáticas con <strong className="text-[#A855F7]">Yape</strong>
          </span>
          <span className="hidden md:inline text-neutral-600">|</span>
          <span className="hidden md:inline text-neutral-300">
            Libro de Reclamaciones conforme a <strong className="text-white">INDECOPI</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-[10px] text-neutral-400">
            Atención al cliente: <strong className="text-white">+51 949 165 677</strong>
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* MachuPeek Brand */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => setActiveView('inicio')}
        >
          <div className="relative w-11 h-11 shrink-0">
            <img 
              src="/logo-machupeek.png" 
              alt="MachuPeek Esports Perú" 
              className="w-full h-full object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-white font-mono">
                MACHU<span className="text-[#FF5500]">PEEK</span>
              </span>
              <span className="text-[9px] bg-red-950 text-red-200 border border-red-700 px-1.5 py-0.2 font-mono uppercase font-bold">
                PERÚ
              </span>
            </div>
            <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-mono font-bold">
              COMUNIDAD CS2 & MIXTON ARENA
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center flex-wrap justify-center gap-1 text-xs font-mono font-bold uppercase">
          <button
            type="button"
            onClick={() => setActiveView('inicio')}
            className={`px-3 py-1.5 border transition-all cursor-pointer ${
              activeView === 'inicio'
                ? 'bg-[#FF5500] text-white border-[#FF5500] shadow-sm'
                : 'bg-[#161616] text-neutral-300 border-[#262626] hover:border-neutral-500 hover:text-white'
            }`}
          >
            Inicio
          </button>

          <button
            type="button"
            onClick={() => setActiveView('mixton')}
            className={`px-3 py-1.5 border transition-all cursor-pointer flex items-center gap-1 ${
              activeView === 'mixton' || activeView === 'arena'
                ? 'bg-[#FF5500] text-white border-[#FF5500] shadow-sm'
                : 'bg-[#161616] text-neutral-300 border-[#262626] hover:border-neutral-500 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>El Mixtón</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('guia-faceit')}
            className={`px-3 py-1.5 border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'guia-faceit'
                ? 'bg-[#FF5500] text-white border-[#FF5500] shadow-sm'
                : 'bg-[#161616] text-neutral-300 border-[#262626] hover:border-[#FF5500] hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Guía FACEIT</span>
          </button>


          <button
            type="button"
            onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
            className={`px-3 py-1.5 border transition-all cursor-pointer flex items-center gap-1 ${
              activeView === 'cuenta' || activeView === 'login'
                ? 'bg-[#742284] text-white border-[#A855F7] shadow-sm'
                : 'bg-[#161616] text-purple-300 border-[#2E1A36] hover:border-[#A855F7] hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-[#A855F7]" />
            <span>{currentUser ? 'Mi Saldo' : 'Recargar / Login'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('libro-de-reclamaciones')}
            className={`px-2.5 py-1.5 border transition-all cursor-pointer hidden md:flex items-center gap-1 ${
              activeView === 'libro-de-reclamaciones'
                ? 'bg-[#0088FF] text-white border-[#0088FF]'
                : 'bg-[#161616] text-cyan-300 border-[#1E3A5F] hover:border-cyan-400'
            }`}
          >
            <FileText className="w-3 h-3 text-cyan-400" />
            <span>Reclamaciones</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('contacto')}
            className={`px-2.5 py-1.5 border transition-all cursor-pointer hidden sm:flex items-center gap-1 ${
              activeView === 'contacto'
                ? 'bg-[#FF5500] text-white border-[#FF5500]'
                : 'bg-[#161616] text-neutral-300 border-[#262626] hover:border-neutral-500 hover:text-white'
            }`}
          >
            <PhoneCall className="w-3 h-3 text-neutral-400" />
            <span>Contacto</span>
          </button>
        </nav>

        {/* Right Action: Cart & Auth */}
        <div className="flex items-center gap-3">


          {/* User profile or Login Button */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#2D2D2D]">
              <button
                type="button"
                onClick={() => setActiveView('cuenta')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
                title="Ir a mi billetera"
              >
                {currentUser.avatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${currentUser.userId}/${currentUser.avatar}.png?size=64`}
                    alt={currentUser.username}
                    className="w-7 h-7 rounded-none border border-white"
                  />
                ) : (
                  <div className="w-7 h-7 bg-[#2A2A2A] border border-white flex items-center justify-center text-xs font-bold text-white">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block">
                  <div className="text-[11px] font-bold text-white leading-none font-mono">
                    {currentUser.username}
                  </div>
                  <div className="text-[9px] text-emerald-400 font-mono font-bold">
                    S/ {(currentUser.balance || 0).toFixed(2)} PEN
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveView('login')}
                className="px-3 py-1.5 bg-[#742284] hover:bg-[#8B2FA0] border border-[#A855F7]/40 text-white text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Recargar & Login</span>
              </button>

              <a
                href="/auth/discord"
                className="px-2.5 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 shadow-md"
                title="Conectar Discord"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Discord</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
