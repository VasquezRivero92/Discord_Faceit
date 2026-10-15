import React from 'react';
import { ActiveView, StoreProduct } from '../types';
import { INITIAL_PRODUCTS } from './StoreView';
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
  Flame,
  HelpCircle
} from 'lucide-react';

interface LandingHomeViewProps {
  setActiveView: (view: ActiveView) => void;
  onAddToCart: (product: StoreProduct) => void;
  onBuyNow: (product: StoreProduct) => void;
  currentUser: any;
}

export const LandingHomeView: React.FC<LandingHomeViewProps> = ({
  setActiveView,
  onAddToCart,
  onBuyNow,
  currentUser
}) => {
  return (
    <div className="text-white font-sans selection:bg-[#FF5500] selection:text-white">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#141414] via-[#0E0E0E] to-[#0A0A0A] border-b-4 border-[#1A1A1A] py-16 sm:py-24 px-4 sm:px-6">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#FF5500]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[300px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
          
          {/* Logo Badge */}
          <div className="mb-6 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-[#FF5500] to-amber-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500" />
            <img 
              src="/logo-machupeek.png" 
              alt="MachuPeek Esports CS2 Perú" 
              className="relative w-36 h-36 sm:w-48 sm:h-48 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Subtitle tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#1F1F1F] border border-[#333] text-neutral-300 text-xs font-mono font-bold uppercase tracking-widest mb-4 shadow-md">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>COMUNIDAD COMPETITIVA #1 DE CS2 EN EL PERÚ</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-6xl font-black italic tracking-tighter uppercase leading-none max-w-4xl mb-4 font-mono">
            BIENVENIDO A <span className="text-[#FF5500]">MACHUPEEK</span>
          </h1>

          <p className="text-neutral-300 text-sm sm:text-base max-w-2xl leading-relaxed mb-8">
            La plataforma líder de <strong className="text-white">Counter-Strike 2</strong> en Perú. Disfruta de partidas mixtón con anticheat oficial de FACEIT, servidores 128 tickrate en Lima, drafts balanceados por capitanes y torneos con premios en Soles (PEN).
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs font-bold uppercase">
            <button
              type="button"
              onClick={() => setActiveView('mixton')}
              className="px-6 py-3.5 bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-white font-black tracking-wider shadow-xl shadow-[#FF5500]/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              <span>Entrar al Mixtón en Vivo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
              className="px-6 py-3.5 bg-[#742284] hover:bg-[#8B2FA0] border border-[#A855F7]/40 text-white font-black tracking-wider shadow-lg shadow-purple-900/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span>{currentUser ? 'Mi Billetera & Recarga Culqi' : 'Login & Recarga Culqi'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('tienda')}
              className="px-6 py-3.5 bg-[#161616] hover:bg-[#222] border border-[#333] hover:border-neutral-400 text-white tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Tienda Oficial</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 w-full max-w-4xl text-left font-mono text-xs">
            <div className="p-3 bg-[#141414] border border-[#262626] flex items-center gap-3">
              <Server className="w-6 h-6 text-[#FF5500] shrink-0" />
              <div>
                <span className="text-white font-bold block">128 TICKRATE</span>
                <span className="text-[10px] text-neutral-400">Servidores en Lima (15ms)</span>
              </div>
            </div>

            <div className="p-3 bg-[#141414] border border-[#262626] flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <span className="text-white font-bold block">ANTICHEAT FACEIT</span>
                <span className="text-[10px] text-neutral-400">100% libre de trampas</span>
              </div>
            </div>

            <div className="p-3 bg-[#141414] border border-[#262626] flex items-center gap-3">
              <Coins className="w-6 h-6 text-[#A855F7] shrink-0" />
              <div>
                <span className="text-white font-bold block">PAGOS CON CULQI</span>
                <span className="text-[10px] text-neutral-400">Yape y Tarjetas en Soles</span>
              </div>
            </div>

            <div className="p-3 bg-[#141414] border border-[#262626] flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-400 shrink-0" />
              <div>
                <span className="text-white font-bold block">+5,000 JUGADORES</span>
                <span className="text-[10px] text-neutral-400">Comunidad activa diaria</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. ¿QUÉ ES EL MIXTÓN Y CÓMO FUNCIONA? */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FF5500]/15 border border-[#FF5500]/40 text-[#FF5500] text-xs font-mono font-bold uppercase mb-2">
            <Flame className="w-3.5 h-3.5" /> COMPETICIÓN EN TIEMPO REAL
          </div>
          <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase font-mono text-white">
            ¿QUÉ ES EL MIXTÓN DE MACHUPEEK?
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm mt-2 leading-relaxed">
            El Mixtón es el formato competitivo insignia de nuestra comunidad: partidas 5 contra 5 donde 2 capitanes seleccionan a sus integrantes mediante turnos de draft balanceados, disputando el encuentro en servidores oficiales de FACEIT.
          </p>
        </div>

        {/* 4 Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-[#121212] border-2 border-[#242424] hover:border-[#FF5500]/60 p-6 flex flex-col justify-between transition-all group">
            <div>
              <div className="w-12 h-12 bg-[#FF5500]/10 border border-[#FF5500]/40 flex items-center justify-center text-[#FF5500] mb-4 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                1. Clasificación por Tiers
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Los jugadores son categorizados en <strong>Tier S, A, B y C</strong> según su ELO y nivel de Faceit, garantizando que cada partida sea competitiva y equilibrada.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#222] text-[10px] font-mono text-neutral-500 uppercase">
              Balance justo garantizado
            </div>
          </div>

          <div className="bg-[#121212] border-2 border-[#242424] hover:border-[#FF5500]/60 p-6 flex flex-col justify-between transition-all group">
            <div>
              <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                2. Draft en Vivo
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Los capitanes entran a nuestra <strong className="text-white">Arena Web</strong> y eligen a sus compañeros en tiempo real. ¡Todo sincronizado con bots de Discord y voz!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#222] text-[10px] font-mono text-neutral-500 uppercase">
              Pick order automático
            </div>
          </div>

          <div className="bg-[#121212] border-2 border-[#242424] hover:border-[#FF5500]/60 p-6 flex flex-col justify-between transition-all group">
            <div>
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                3. Servidor FACEIT
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Al terminar la selección, el bot genera automáticamente la sala oficial de FACEIT y lanza el servidor con anticheat y stats registradas.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#222] text-[10px] font-mono text-neutral-500 uppercase">
              128 Tick / Anticheat Activo
            </div>
          </div>

          <div className="bg-[#121212] border-2 border-[#242424] hover:border-[#FF5500]/60 p-6 flex flex-col justify-between transition-all group">
            <div>
              <div className="w-12 h-12 bg-[#A855F7]/10 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] mb-4 group-hover:scale-110 transition-transform">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black uppercase text-white font-mono mb-2">
                4. Pozos en Soles
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Las partidas pueden disputarse con cuota de pozo (ej. S/ 5 o S/ 10). El equipo ganador se lleva el premio acreditado a su billetera de inmediato.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#222] text-[10px] font-mono text-neutral-500 uppercase">
              Pagos automáticos vía Culqi
            </div>
          </div>

        </div>
      </section>

      {/* 3. GUÍA PASO A PASO: ¿CÓMO UNIRSE Y JUGAR? */}
      <section className="py-16 px-4 sm:px-6 bg-[#0E0E0E] border-y-2 border-[#1A1A1A]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-mono font-bold uppercase text-[#FF5500] tracking-widest block mb-1">
              GUÍA RÁPIDA DE INGRESO
            </span>
            <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase font-mono text-white">
              ¿CÓMO JUGAR TU PRIMER MIXTÓN?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-mono text-xs">
            
            <div className="p-5 bg-[#141414] border-2 border-[#262626] relative">
              <span className="text-3xl font-black text-[#FF5500] block mb-2 font-mono">01</span>
              <h4 className="text-sm font-bold text-white uppercase mb-2">Únete a Discord</h4>
              <p className="text-neutral-400 text-[11px] leading-relaxed font-sans mb-3">
                Ingresa al servidor oficial de MachuPeek donde se organizan las salas de voz y los avisos de partidas.
              </p>
              <a 
                href="https://discord.gg/vKj45F6e" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#5865F2] hover:underline font-bold inline-flex items-center gap-1"
              >
                Unirse a Discord <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-5 bg-[#141414] border-2 border-[#262626] relative">
              <span className="text-3xl font-black text-[#FF5500] block mb-2 font-mono">02</span>
              <h4 className="text-sm font-bold text-white uppercase mb-2">Verifica tu FACEIT</h4>
              <p className="text-neutral-400 text-[11px] leading-relaxed font-sans mb-3">
                En el canal de Discord escribe el comando <code>/verificar_fc</code> con tu nickname para sincronizar tu nivel y roles.
              </p>
              <span className="text-emerald-400 font-bold block text-[10px]">
                Sincronización automática
              </span>
            </div>

            <div className="p-5 bg-[#141414] border-2 border-[#262626] relative">
              <span className="text-3xl font-black text-[#FF5500] block mb-2 font-mono">03</span>
              <h4 className="text-sm font-bold text-white uppercase mb-2">Recarga tu Saldo</h4>
              <p className="text-neutral-400 text-[11px] leading-relaxed font-sans mb-3">
                Entra al apartado de Login / Billetera y recarga saldo en Soles con Yape o Tarjeta a través de la pasarela Culqi.
              </p>
              <button
                type="button"
                onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
                className="text-[#A855F7] hover:underline font-bold text-[11px] cursor-pointer"
              >
                Ir a Recarga Culqi →
              </button>
            </div>

            <div className="p-5 bg-[#141414] border-2 border-[#262626] relative">
              <span className="text-3xl font-black text-[#FF5500] block mb-2 font-mono">04</span>
              <h4 className="text-sm font-bold text-white uppercase mb-2">¡Ponte Listo y Juega!</h4>
              <p className="text-neutral-400 text-[11px] leading-relaxed font-sans mb-3">
                Usa <code>/mixton_listo</code> en Discord o entra a la sala de espera. ¡Tu capitán te elegirá en el draft!
              </p>
              <button
                type="button"
                onClick={() => setActiveView('mixton')}
                className="text-[#FF5500] hover:underline font-bold text-[11px] cursor-pointer"
              >
                Ver Lobby del Mixtón →
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 4. PRODUCTOS Y SERVICIOS DESTACADOS (CUMPLIMIENTO CULQI) */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FF5500]/15 border border-[#FF5500]/40 text-[#FF5500] text-xs font-mono font-bold uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" /> TIENDA OFICIAL
            </div>
            <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase font-mono text-white">
              SERVICIOS Y RECARGAS MACHUPEEK
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setActiveView('tienda')}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-[#FF5500] text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Ver Catálogo Completo (6 Productos)</span>
            <ArrowRight className="w-4 h-4 text-[#FF5500]" />
          </button>
        </div>

        {/* 3 Featured Products */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {INITIAL_PRODUCTS.slice(0, 3).map(product => (
            <div
              key={product.id}
              className="bg-[#121212] border-2 border-[#242424] hover:border-[#FF5500]/60 transition-all flex flex-col justify-between shadow-xl group"
            >
              <div>
                <div className="relative h-44 w-full overflow-hidden bg-[#181818]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-80" />
                  <span className="absolute top-3 left-3 px-2 py-0.5 bg-black/70 border border-neutral-700 text-neutral-300 text-[10px] font-mono uppercase">
                    {product.category}
                  </span>
                  <div className="absolute bottom-3 left-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black italic tracking-tighter text-white font-mono">
                      S/ {product.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-neutral-400 uppercase font-mono">PEN</span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-black uppercase text-white tracking-tight mb-2 group-hover:text-[#FF5500] transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-neutral-400 text-xs leading-relaxed line-clamp-2">
                    {product.description}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0 grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => onAddToCart(product)}
                  className="py-2 px-2 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333] text-white font-bold uppercase transition-all cursor-pointer"
                >
                  + Carrito
                </button>
                <button
                  type="button"
                  onClick={() => onBuyNow(product)}
                  className="py-2 px-2 bg-[#FF5500] hover:bg-[#FF7733] text-white font-black uppercase transition-all shadow-md cursor-pointer"
                >
                  Comprar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CULQI PAYMENT & COMPLIANCE BANNER */}
      <section className="bg-[#121212] border-t-2 border-[#1A1A1A] py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-black uppercase text-white font-mono">
                PAGOS Y RECARGAS 100% SEGUROS CON CULQI
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Todas las recargas y compras en MachuPeek son procesadas mediante la pasarela autorizada <strong>Culqi</strong> con soporte instantáneo para <strong>Yape</strong> y tarjetas de débito/crédito con cifrado SSL 256-bit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveView(currentUser ? 'cuenta' : 'login')}
              className="px-5 py-2.5 bg-[#742284] hover:bg-[#8B2FA0] border border-[#742284] text-white font-bold uppercase transition-all cursor-pointer"
            >
              Recargar Saldo con Yape
            </button>
            <button
              type="button"
              onClick={() => setActiveView('libro-de-reclamaciones')}
              className="px-4 py-2.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-[#333] text-cyan-300 font-bold uppercase transition-all cursor-pointer"
            >
              Libro Reclamaciones
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
