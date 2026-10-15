import React, { useState } from 'react';
import { 
  User, 
  Wallet, 
  Coins, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  KeyRound, 
  Gamepad2, 
  LogOut, 
  ArrowRight, 
  Zap, 
  Smartphone, 
  Lock, 
  Trophy,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { CurrentUser, ActiveView } from '../types';

interface UserWalletViewProps {
  currentUser: CurrentUser | null;
  onRefreshUser: () => Promise<void>;
  setActiveView: (view: ActiveView) => void;
  onOpenDemoLogin: () => void;
  onLogout: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 50, 100];

export const UserWalletView: React.FC<UserWalletViewProps> = ({
  currentUser,
  onRefreshUser,
  setActiveView,
  onOpenDemoLogin,
  onLogout,
  showToast
}) => {
  // Recharge form states
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>(currentUser?.phoneNumber || '');
  const [otp, setOtp] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(null);

  const effectiveAmount = isCustom ? (parseFloat(customAmount) || 0) : selectedAmount;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshUser();
      showToast('Saldo actualizado correctamente', 'info');
    } catch {
      showToast('Error al actualizar saldo', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLastSuccessMessage(null);

    if (effectiveAmount < 1) {
      showToast('El monto mínimo de recarga es S/ 1.00', 'error');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const hasExistingPhone = currentUser?.hasSavedPhone && cleanPhone.length === 0;

    if (!hasExistingPhone && cleanPhone.length !== 9) {
      showToast('Ingresa un número de celular de 9 dígitos válido para Yape', 'error');
      return;
    }

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      showToast('El código de aprobación de Yape debe tener exactamente 6 dígitos', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/lobby/wallet/recharge-yape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: effectiveAmount,
          phoneNumber: cleanPhone.length === 9 ? cleanPhone : undefined,
          otp: cleanOtp
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la recarga con Yape');
      }

      setLastSuccessMessage(data.message || `¡Recarga de S/ ${effectiveAmount.toFixed(2)} completada con éxito!`);
      showToast(`¡Recarga de S/ ${effectiveAmount.toFixed(2)} exitosa!`, 'success');
      setOtp('');
      await onRefreshUser();
    } catch (err: any) {
      showToast(err.message || 'Error al conectar con la pasarela de pagos', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // VISTA NO AUTENTICADO: LOGIN REQUERIDO
  // ----------------------------------------------------
  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 font-mono">
        <div className="bg-[#121212] border-4 border-[#1F1F1F] p-6 sm:p-12 shadow-2xl relative">
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-[#FF5500] to-purple-600" />

          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <img 
                src="/logo-machupeek.png" 
                alt="MachuPeek Esports" 
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </div>
            
            <div className="inline-block bg-[#1F1F1F] text-neutral-400 border border-[#333] px-3 py-1 text-[10px] uppercase font-bold tracking-widest mb-3">
              PORTAL DE JUGADORES // AUTENTICACIÓN
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase text-white mb-3">
              INICIA SESIÓN EN <span className="text-[#FF5500]">MACHUPEEK</span>
            </h1>
            
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
              Para recargar saldo con <strong>Yape</strong>, consultar tu historial de transacciones y unirte a los lobbies competitivos de CS2, conecta tu cuenta de Discord.
            </p>
          </div>

          {/* Action Login Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-10">
            {/* Discord Login Option */}
            <div className="bg-[#181818] border-2 border-[#2E2E2E] hover:border-[#5865F2] p-6 flex flex-col justify-between transition-all group">
              <div>
                <div className="w-12 h-12 bg-[#5865F2]/20 border border-[#5865F2] flex items-center justify-center text-[#5865F2] mb-4 group-hover:scale-105 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black uppercase text-white mb-1">
                  Jugadores de la Comunidad
                </h3>
                <p className="text-[11px] text-neutral-400 font-sans leading-relaxed mb-6">
                  Conexión directa mediante OAuth2 de Discord. Vincula automáticamente tu rol, ELO y estadísticas en los servidores de MachuPeek.
                </p>
              </div>

              <a
                href="/auth/discord"
                className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] border border-[#5865F2] text-white text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>Conectar con Discord</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Demo Login Option */}
            <div className="bg-[#181818] border-2 border-[#2E2E2E] hover:border-[#FF5500] p-6 flex flex-col justify-between transition-all group">
              <div>
                <div className="w-12 h-12 bg-[#FF5500]/20 border border-[#FF5500] flex items-center justify-center text-[#FF5500] mb-4 group-hover:scale-105 transition-transform">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black uppercase text-white mb-1">
                  Acceso de Prueba (Demo)
                </h3>
                <p className="text-[11px] text-neutral-400 font-sans leading-relaxed mb-6">
                  Credenciales de demostración de prueba para la verificación técnica y revisión de funcionalidades.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenDemoLogin}
                className="w-full py-3 bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-white text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>Acceso Auditor / Demo</span>
                <KeyRound className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Value Props */}
          <div className="border-t border-[#222] pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-[#161616] border border-[#262626]">
              <Coins className="w-5 h-5 text-[#FF5500] mx-auto mb-1.5" />
              <div className="text-[11px] font-bold text-white uppercase">Recargas Inmediatas</div>
              <div className="text-[10px] text-neutral-400 font-sans">Acreditación instantánea en Soles (PEN) con Yape</div>
            </div>
            <div className="p-3 bg-[#161616] border border-[#262626]">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              <div className="text-[11px] font-bold text-white uppercase">Plataforma Segura</div>
              <div className="text-[10px] text-neutral-400 font-sans">Transacciones protegidas con cifrado SSL 256-Bit</div>
            </div>
            <div className="p-3 bg-[#161616] border border-[#262626]">
              <Gamepad2 className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
              <div className="text-[11px] font-bold text-white uppercase">CS2 128 Tickrate</div>
              <div className="text-[10px] text-neutral-400 font-sans">Servidores en Lima con anticheat oficial FACEIT</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VISTA AUTENTICADO: BILLETERA GAMER & RECARGA CULQI
  // ----------------------------------------------------
  const userBalance = currentUser.balance || 0;
  const userTier = currentUser.tier || (currentUser.skillLevel ? (currentUser.skillLevel >= 10 ? 'S' : currentUser.skillLevel >= 8 ? 'A' : currentUser.skillLevel >= 5 ? 'B' : 'C') : 'B');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 font-mono">
      
      {/* Breadcrumb / Top Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#222]">
        <div>
          <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
            MACHUPEEK ESPORTS // PANEL DEL JUGADOR
          </div>
          <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
            MI CUENTA & <span className="text-[#FF5500]">BILLETERA GAMER</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('mixton')}
            className="px-3.5 py-1.5 bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Ir al Mixtón</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-red-900/40 border border-[#333] hover:border-red-500 text-neutral-300 hover:text-red-300 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Column (Profile & Balance) | Right Column (Recharge Module) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Player Stats & Balance Card */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Profile Card */}
          <div className="bg-[#141414] border-2 border-[#242424] p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-4 mb-5">
              {currentUser.avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${currentUser.userId}/${currentUser.avatar}.png?size=128`}
                  alt={currentUser.username}
                  className="w-16 h-16 border-2 border-white object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-[#252525] border-2 border-white flex items-center justify-center text-xl font-black text-white">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <div className="inline-block px-2 py-0.5 bg-[#1E1E1E] text-neutral-400 border border-[#333] text-[9px] font-bold uppercase mb-1">
                  {currentUser.isAdmin ? '🛡️ ADMINISTRADOR' : '🎮 JUGADOR VERIFICADO'}
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none mb-1">
                  {currentUser.username}
                </h2>
                <p className="text-[11px] text-neutral-400 font-sans">
                  Discord ID: <span className="font-mono text-neutral-300">{currentUser.userId}</span>
                </p>
              </div>
            </div>

            {/* Game Stats Mini Grid */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#222] text-center">
              <div className="bg-[#0E0E0E] p-2.5 border border-[#1E1E1E]">
                <div className="text-[9px] text-neutral-500 uppercase font-bold">FACEIT NICK</div>
                <div className="text-xs font-black text-[#FF5500] truncate">
                  {currentUser.faceit_nickname || 'Vinculado'}
                </div>
              </div>
              <div className="bg-[#0E0E0E] p-2.5 border border-[#1E1E1E]">
                <div className="text-[9px] text-neutral-500 uppercase font-bold">TIER CS2</div>
                <div className="text-xs font-black text-emerald-400">
                  TIER {userTier}
                </div>
              </div>
              <div className="bg-[#0E0E0E] p-2.5 border border-[#1E1E1E]">
                <div className="text-[9px] text-neutral-500 uppercase font-bold">NIVEL / ELO</div>
                <div className="text-xs font-black text-cyan-400">
                  {currentUser.elo ? `${currentUser.elo} ELO` : (currentUser.skillLevel ? `LVL ${currentUser.skillLevel}` : 'LVL 10')}
                </div>
              </div>
            </div>
          </div>

          {/* Big Balance Card */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#121212] border-2 border-[#FF5500] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#FF5500]">
                <Coins className="w-4 h-4" />
                <span>SALDO DISPONIBLE EN BILLETERA</span>
              </div>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer"
                title="Actualizar saldo"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-2 flex items-baseline gap-2">
              <span className="text-[#FF5500] text-2xl font-bold">S/</span>
              <span>{userBalance.toFixed(2)}</span>
              <span className="text-xs text-neutral-400 font-mono">PEN</span>
            </div>

            <p className="text-[11px] text-neutral-400 font-sans leading-relaxed mb-4">
              Tu saldo se descuenta automáticamente al confirmar apuestas en los mixtones o puede utilizarse para pases de temporada y torneos oficiales.
            </p>

            <div className="flex items-center gap-2 pt-3 border-t border-[#262626] text-[10px] text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Garantía de custodia segura y liquidación automática</span>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-[#121212] border border-[#222] p-4 text-[11px] text-neutral-400 font-sans space-y-2">
            <div className="font-mono text-xs font-bold text-white uppercase flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Reglas de Billetera MachuPeek</span>
            </div>
            <p>
              • Las recargas con Yape se procesan en tiempo real de forma inmediata.
            </p>
            <p>
              • Toda recarga mínima es de <strong>S/ 1.00</strong>. No cobramos comisión por depósito de saldo.
            </p>
            <p>
              • Si ganas una partida mixtón o torneo, el pozo acumulado se acredita inmediatamente a este mismo balance.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Yape Recharge Form */}
        <div className="lg:col-span-7">
          <div className="bg-[#141414] border-2 border-[#742284] p-6 sm:p-8 shadow-2xl relative">
            
            {/* Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-4 border-b border-[#2D2033]">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#742284]/20 border border-[#742284] text-[#A855F7] text-[10px] font-bold uppercase mb-1">
                  <Zap className="w-3 h-3" /> ACREDITACIÓN EN TIEMPO REAL // AUTOMÁTICA
                </div>
                <h3 className="text-lg sm:text-xl font-black italic tracking-tighter uppercase text-white">
                  RECARGAR SALDO CON <span className="text-[#A855F7]">YAPE</span>
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-sans border border-[#333] px-2 py-1">
                Moneda: <strong>Soles (PEN)</strong>
              </span>
            </div>

            {/* Success Message Banner */}
            {lastSuccessMessage && (
              <div className="mb-6 p-4 bg-emerald-950/60 border-2 border-emerald-500 text-emerald-200 text-xs flex items-start gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold uppercase tracking-wider mb-0.5">Operación Aprobada</div>
                  <div>{lastSuccessMessage}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleRechargeSubmit} className="space-y-6">
              
              {/* 1. Seleccionar Monto */}
              <div>
                <label className="text-xs font-bold text-neutral-300 uppercase block mb-2">
                  1. Selecciona el monto a recargar (Soles PEN):
                </label>
                
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                  {PRESET_AMOUNTS.map((amt) => {
                    const isSelected = !isCustom && selectedAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(amt);
                          setIsCustom(false);
                        }}
                        className={`py-3 px-2 border text-center font-black text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#742284] border-[#A855F7] text-white shadow-md'
                            : 'bg-[#1C1C1C] border-[#333] text-neutral-300 hover:border-neutral-500 hover:text-white'
                        }`}
                      >
                        S/ {amt}.00
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCustom(true)}
                    className={`text-[11px] font-bold uppercase underline cursor-pointer ${
                      isCustom ? 'text-[#A855F7]' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Ingresar otro monto personalizado
                  </button>

                  {isCustom && (
                    <div className="flex-1 flex items-center bg-[#111] border border-[#742284] px-3 py-1.5">
                      <span className="text-xs font-bold text-[#A855F7] mr-2">S/</span>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        placeholder="Ej: 15.00"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full bg-transparent text-sm text-white focus:outline-none"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Número de Celular Yape */}
              <div>
                <label className="text-xs font-bold text-neutral-300 uppercase block mb-1">
                  2. Número de celular afiliado a Yape:
                </label>
                
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    maxLength={9}
                    placeholder="Ej: 987654321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#742284]"
                    required={!currentUser?.hasSavedPhone}
                  />
                </div>
                
                <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                  {currentUser?.hasSavedPhone 
                    ? '🔒 Ya tienes un número registrado. Puedes dejarlo tal como está o ingresar uno nuevo.'
                    : 'Ingresa tu número de 9 dígitos. La transacción es 100% segura con cifrado SSL 256-Bit.'}
                </p>
              </div>

              {/* 3. Código de Aprobación Yape (OTP) */}
              <div>
                <label className="text-xs font-bold text-neutral-300 uppercase block mb-1">
                  3. Código de aprobación de Yape (6 dígitos):
                </label>

                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#111] border-2 border-[#742284] pl-9 pr-3 py-2.5 text-lg font-mono font-black text-white tracking-[0.3em] focus:outline-none focus:border-[#A855F7]"
                    required
                  />
                </div>

                {/* Yape Instruction Callout */}
                <div className="mt-2.5 p-3 bg-[#24132B] border border-[#742284]/50 text-[11px] text-purple-200 font-sans leading-relaxed">
                  <strong className="text-white block font-mono uppercase text-[10px] mb-1">
                    📱 ¿Dónde encontrar este código en tu celular?
                  </strong>
                  Abre la app de <strong>Yape</strong> &gt; Toca el ícono de Menú o campana &gt; Selecciona <strong>"Código de aprobación"</strong> y copia los 6 dígitos temporales generados.
                </div>
              </div>

              {/* Summary and Submit Button */}
              <div className="pt-4 border-t border-[#262626]">
                <div className="flex items-center justify-between text-xs mb-4">
                  <span className="text-neutral-400 uppercase">Total a debitar de Yape:</span>
                  <span className="text-lg font-black text-[#A855F7]">
                    S/ {effectiveAmount > 0 ? effectiveAmount.toFixed(2) : '0.00'} PEN
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || effectiveAmount < 1 || otp.length !== 6}
                  className={`w-full py-4 text-xs font-black uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
                    isSubmitting || effectiveAmount < 1 || otp.length !== 6
                      ? 'bg-neutral-800 border border-neutral-700 text-neutral-500 cursor-not-allowed opacity-60'
                      : 'bg-[#742284] hover:bg-[#8B2FA0] border-2 border-[#A855F7] text-white shadow-purple-900/30'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Procesando recarga con Yape...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Confirmar y Recargar S/ {effectiveAmount.toFixed(2)} PEN</span>
                    </>
                  )}
                </button>
              </div>

              {/* Security Guarantee */}
              <div className="text-center pt-2">
                <p className="text-[10px] text-neutral-500 font-sans flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Transacciones 100% seguras con cifrado bancario SSL 256-Bit.</span>
                </p>
              </div>

            </form>
          </div>
        </div>

      </div>

    </div>
  );
};
