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
  ExternalLink,
  Sparkles,
  Edit3,
  Link2,
  Check,
  Flame
} from 'lucide-react';
import { CurrentUser, ActiveView } from '../types';

interface UserWalletViewProps {
  currentUser: CurrentUser | null;
  onRefreshUser: () => Promise<void>;
  setActiveView: (view: ActiveView) => void;
  onLogout: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 50, 100];

const getFaceitLevelBadge = (level: number | null | undefined) => {
  if (!level) return null;
  const levelColors: Record<number, string> = {
    1: 'bg-neutral-600 text-white',
    2: 'bg-emerald-600 text-white',
    3: 'bg-emerald-500 text-white',
    4: 'bg-yellow-500 text-black',
    5: 'bg-yellow-600 text-black',
    6: 'bg-amber-600 text-white',
    7: 'bg-orange-600 text-white',
    8: 'bg-orange-700 text-white',
    9: 'bg-red-600 text-white',
    10: 'bg-red-700 text-white font-black shadow-[0_0_12px_rgba(239,68,68,0.5)]'
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-mono text-xs font-bold ${levelColors[level] || 'bg-[#FF5500] text-white'}`}>
      {level}
    </span>
  );
};

export const UserWalletView: React.FC<UserWalletViewProps> = ({
  currentUser,
  onRefreshUser,
  setActiveView,
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

  // Faceit linking states
  const [faceitNickInput, setFaceitNickInput] = useState<string>('');
  const [isLinkingFaceit, setIsLinkingFaceit] = useState<boolean>(false);
  const [showFaceitEdit, setShowFaceitEdit] = useState<boolean>(false);

  // Steam & Faceit linking states
  const [isLinkingSteam, setIsLinkingSteam] = useState<boolean>(false);
  const [isSyncingFaceitFromSteam, setIsSyncingFaceitFromSteam] = useState<boolean>(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('steam_connected') === 'true') {
      if (params.get('faceit_linked') === 'true') {
        showToast('¡Steam autenticado y cuenta de FACEIT vinculada automáticamente!', 'success');
      } else if (params.get('faceit_conflict') === 'true') {
        showToast('Steam conectado, pero tu cuenta de FACEIT ya está vinculada a otro Discord', 'error');
      } else if (params.get('faceit_not_found') === 'true') {
        showToast('¡Steam conectado! No se detectó cuenta de FACEIT vinculada a este Steam', 'info');
      } else {
        showToast('¡Cuenta de Steam autenticada y vinculada exitosamente!', 'success');
      }
      onRefreshUser();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error') === 'steam_validation_failed') {
      showToast('No se pudo validar la autenticación con Steam', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error') === 'auth_required') {
      showToast('Debes iniciar sesión con Discord primero', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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

  const handleVerifyFaceit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nick = faceitNickInput.trim();
    if (!nick) {
      showToast('Ingresa tu nickname exacto de FACEIT', 'error');
      return;
    }

    setIsLinkingFaceit(true);
    try {
      const res = await fetch('/api/lobby/verify-faceit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nick })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al verificar perfil de FACEIT');
      }

      showToast(data.message || `¡Cuenta de FACEIT "${nick}" vinculada exitosamente!`, 'success');
      setFaceitNickInput('');
      setShowFaceitEdit(false);
      await onRefreshUser();
    } catch (err: any) {
      showToast(err.message || 'Error al verificar con la API de FACEIT', 'error');
    } finally {
      setIsLinkingFaceit(false);
    }
  };

  const handleLinkSteam = async (customVal?: string) => {
    const val = (customVal || 'detect_faceit').trim();

    setIsLinkingSteam(true);
    try {
      const res = await fetch('/api/lobby/link-steam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamInput: val })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al conectar cuenta de Steam');
      }

      showToast(data.message || '¡Cuenta de Steam sincronizada exitosamente!', 'success');
      await onRefreshUser();
    } catch (err: any) {
      showToast(err.message || 'Error al conectar cuenta de Steam', 'error');
    } finally {
      setIsLinkingSteam(false);
    }
  };

  const handleSyncFaceitFromSteam = async () => {
    setIsSyncingFaceitFromSteam(true);
    try {
      const res = await fetch('/api/lobby/sync-faceit-from-steam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al sincronizar FACEIT desde Steam');
      }
      showToast(data.message || '¡FACEIT detectado y vinculado exitosamente desde Steam!', 'success');
      setShowFaceitEdit(false);
      await onRefreshUser();
    } catch (err: any) {
      showToast(err.message || 'No se pudo vincular FACEIT desde Steam', 'error');
    } finally {
      setIsSyncingFaceitFromSteam(false);
    }
  };

  // ----------------------------------------------------
  // VISTA NO AUTENTICADO: LOGIN REQUERIDO
  // ----------------------------------------------------
  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 font-mono">
        <div className="rounded-2xl bg-[#0E1017]/85 border border-white/[0.08] backdrop-blur-xl p-6 sm:p-12 shadow-[0_16px_50px_rgba(0,0,0,0.7)] relative overflow-hidden">
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-[#FF5500] to-purple-600" />

          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="w-20 h-20 mx-auto mb-5 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#FF5500] to-purple-600 rounded-full blur opacity-30 group-hover:opacity-75 transition-opacity" />
              <img 
                src="/logo-machupeek.png" 
                alt="MachuPeek Esports" 
                className="relative w-full h-full object-contain drop-shadow-xl"
              />
            </div>
            
            <div className="inline-block bg-white/[0.04] text-neutral-300 border border-white/[0.1] px-3.5 py-1 rounded-full text-xs uppercase font-bold tracking-widest mb-4">
              PORTAL DE JUGADORES // AUTENTICACIÓN
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight uppercase text-white mb-3">
              INICIA SESIÓN EN <span className="text-[#FF5500]">MACHUPEEK</span>
            </h1>
            
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
              Para vincular tu cuenta de <strong className="text-[#FF5500]">FACEIT</strong>, conectar tu cuenta de <strong className="text-[#0088FF]">Steam</strong>, recargar saldo con <strong className="text-[#C084FC]">Yape</strong> y participar en los lobbies competitivos de CS2, conecta tu cuenta de Discord.
            </p>
          </div>

          {/* Action Login: Discord OAuth2 */}
          <div className="max-w-md mx-auto mb-10">
            <div className="rounded-xl bg-neutral-900/60 border border-white/[0.08] hover:border-[#5865F2]/60 p-8 flex flex-col justify-between transition-all duration-300 shadow-xl group">
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2] mb-5 mx-auto group-hover:scale-105 transition-transform">
                  <User className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black uppercase text-white mb-2">
                  Jugadores de la Comunidad
                </h3>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed mb-6">
                  Conexión segura mediante OAuth2 oficial de Discord. Vincula tu cuenta para verificar tu perfil de FACEIT, conectar tu SteamID64 para el Bot y recargar saldo en MachuPeek.
                </p>
              </div>

              <a
                href="/auth/discord"
                className="w-full py-3.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(88,101,242,0.35)] transition-all cursor-pointer active:scale-[0.98]"
              >
                <span>Conectar con Discord</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Value Props */}
          <div className="border-t border-white/[0.08] pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.06]">
              <Coins className="w-6 h-6 text-[#FF5500] mx-auto mb-2" />
              <div className="text-xs font-bold text-white uppercase mb-1">Recargas Inmediatas</div>
              <div className="text-xs text-neutral-400 font-sans">Acreditación instantánea en Soles (PEN) con Yape</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.06]">
              <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-white uppercase mb-1">Plataforma Segura</div>
              <div className="text-xs text-neutral-400 font-sans">Transacciones protegidas con cifrado SSL 256-Bit</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/[0.06]">
              <Gamepad2 className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-white uppercase mb-1">Servidores FACEIT</div>
              <div className="text-xs text-neutral-400 font-sans">Partidas con anticheat oficial obligatorio de FACEIT</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VISTA AUTENTICADO: BILLETERA GAMER & RECARGA YAPE
  // ----------------------------------------------------
  const userBalance = currentUser.balance || 0;
  const userTier = currentUser.tier || (currentUser.skillLevel ? (currentUser.skillLevel >= 10 ? 'S' : currentUser.skillLevel >= 8 ? 'A' : currentUser.skillLevel >= 5 ? 'B' : 'C') : 'B');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 font-mono">
      
      {/* Breadcrumb / Top Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="text-xs text-neutral-400 uppercase tracking-widest font-bold">
            MACHUPEEK ESPORTS // PANEL DEL JUGADOR
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase text-white flex items-center gap-2 mt-1">
            MI CUENTA & <span className="text-[#FF5500]">BILLETERA GAMER</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveView('mixton')}
            className="px-4 py-2 rounded-lg bg-[#FF5500] hover:bg-[#FF661A] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(255,85,0,0.3)] transition-all active:scale-[0.98]"
          >
            <Trophy className="w-4 h-4" />
            <span>Ir al Mixtón</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-red-950/40 border border-white/[0.1] hover:border-red-500/60 text-neutral-300 hover:text-red-300 text-xs font-bold uppercase flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Column (Profile & Balance) | Right Column (Recharge Module) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Player Stats & Balance Card */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Profile Card */}
          <div className="rounded-xl bg-neutral-900/60 border border-white/[0.08] p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center gap-4 mb-5">
              {currentUser.avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${currentUser.userId}/${currentUser.avatar}.png?size=128`}
                  alt={currentUser.username}
                  className="w-16 h-16 rounded-xl border border-[#FF5500]/60 object-cover shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-neutral-800 border border-white/20 flex items-center justify-center text-xl font-black text-white">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/[0.05] text-neutral-300 border border-white/[0.1] text-[10px] font-bold uppercase mb-1.5">
                  {currentUser.isAdmin ? '🛡️ ADMINISTRADOR' : '🎮 JUGADOR VERIFICADO'}
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none mb-1">
                  {currentUser.username}
                </h2>
                <p className="text-xs text-neutral-400 font-sans">
                  Discord ID: <span className="font-mono text-neutral-300">{currentUser.userId}</span>
                </p>
              </div>
            </div>

            {/* Game Stats Mini Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-white/[0.08] text-center">
              <div className="rounded-lg bg-black/40 p-2.5 border border-white/[0.05]">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">FACEIT NICK</div>
                <div className="text-xs font-black text-[#FF5500] truncate mt-0.5">
                  {currentUser.faceit_nickname || 'Sin Vincular'}
                </div>
              </div>
              <div className="rounded-lg bg-black/40 p-2.5 border border-white/[0.05]">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">TIER CS2</div>
                <div className="text-xs font-black text-emerald-400 mt-0.5">
                  TIER {userTier}
                </div>
              </div>
              <div className="rounded-lg bg-black/40 p-2.5 border border-white/[0.05]">
                <div className="text-[10px] text-neutral-400 uppercase font-bold">NIVEL / ELO</div>
                <div className="text-xs font-black text-cyan-400 mt-0.5">
                  {currentUser.elo ? `${currentUser.elo} ELO` : (currentUser.skillLevel ? `LVL ${currentUser.skillLevel}` : '-')}
                </div>
              </div>
            </div>
          </div>

          {/* FACEIT Account Card */}
          <div className="rounded-xl bg-neutral-900/60 border border-white/[0.08] p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500]">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">CUENTA DE FACEIT</h3>
                  <div className="text-[10px] text-neutral-400 font-sans">Nivel y ELO oficial de CS2</div>
                </div>
              </div>

              {currentUser.faceit_nickname ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase">
                  <CheckCircle2 className="w-3 h-3" /> Vinculado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase">
                  <AlertCircle className="w-3 h-3" /> No Vinculado
                </span>
              )}
            </div>

            {currentUser.faceit_nickname && !showFaceitEdit ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    {currentUser.faceit_avatar ? (
                      <img 
                        src={currentUser.faceit_avatar} 
                        alt={currentUser.faceit_nickname} 
                        className="w-10 h-10 rounded-lg object-cover border border-[#FF5500]/40" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#FF5500]/20 border border-[#FF5500]/40 flex items-center justify-center text-sm font-black text-[#FF5500]">
                        {currentUser.faceit_nickname.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <a
                        href={`https://www.faceit.com/en/players/${currentUser.faceit_nickname}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-black text-white hover:text-[#FF5500] transition-colors flex items-center gap-1.5 group"
                      >
                        <span>{currentUser.faceit_nickname}</span>
                        <ExternalLink className="w-3 h-3 text-neutral-400 group-hover:text-[#FF5500]" />
                      </a>
                      <div className="text-[10px] text-neutral-400 font-sans">
                        {currentUser.elo ? `${currentUser.elo} ELO` : 'Estadísticas CS2'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getFaceitLevelBadge(currentUser.skillLevel)}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowFaceitEdit(true)}
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Cambiar o re-verificar nickname</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Opción 1: Si ya tiene Steam conectado, botón prioritario para jalar Faceit en 1 clic */}
                {currentUser.steam_id_64 ? (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0088FF]/15 via-[#FF5500]/15 to-transparent border border-[#0088FF]/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-300 font-sans flex items-center gap-1.5 font-bold">
                        <Gamepad2 className="w-4 h-4 text-[#0088FF]" />
                        <span>Steam Conectado:</span>
                      </span>
                      <span className="font-mono text-[#0088FF] text-[11px] font-bold">
                        {currentUser.steam_id_64}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSyncFaceitFromSteam}
                      disabled={isSyncingFaceitFromSteam}
                      className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-[#FF5500] to-[#FF661A] hover:brightness-110 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(255,85,0,0.35)] cursor-pointer transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      {isSyncingFaceitFromSteam ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 fill-current" />
                      )}
                      <span>{isSyncingFaceitFromSteam ? 'Detectando en FACEIT...' : '⚡ Jalar y Vincular FACEIT desde mi Steam'}</span>
                    </button>

                    <div className="text-[10px] text-neutral-400 font-sans text-center">
                      Consulta la API oficial de FACEIT usando tu Steam sin escribir nada.
                    </div>
                  </div>
                ) : (
                  <a
                    href="/auth/steam"
                    className="p-3 rounded-xl bg-gradient-to-r from-[#171a21] to-[#203247] border border-[#0088FF]/30 hover:border-[#0088FF] text-white flex items-center justify-between group cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#0088FF]/20 flex items-center justify-center text-[#0088FF]">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-tight text-white group-hover:text-[#0088FF] transition-colors">
                          Autenticar con Steam para jalar FACEIT
                        </div>
                        <div className="text-[10px] text-neutral-400 font-sans">
                          Inicia sesión con Steam y jalará tu FACEIT en 1 clic
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#0088FF] transition-colors" />
                  </a>
                )}

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-white/[0.08]"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-neutral-500 uppercase tracking-widest font-bold">O ingresar nickname manual</span>
                  <div className="flex-grow border-t border-white/[0.08]"></div>
                </div>

                <form onSubmit={handleVerifyFaceit} className="space-y-3">
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                    Si tu Steam no tiene perfil público o prefieres buscar por nombre, escribe tu nickname exacto de FACEIT:
                  </p>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={faceitNickInput}
                        onChange={(e) => setFaceitNickInput(e.target.value)}
                        placeholder="Ej: s1mple"
                        disabled={isLinkingFaceit}
                        className="w-full bg-black/50 border border-white/[0.12] focus:border-[#FF5500] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 font-mono outline-none transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLinkingFaceit || !faceitNickInput.trim()}
                      className="px-4 py-2 rounded-lg bg-[#FF5500] hover:bg-[#FF661A] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_2px_10px_rgba(255,85,0,0.3)] cursor-pointer"
                    >
                      {isLinkingFaceit ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>{isLinkingFaceit ? 'Verificando...' : 'Vincular'}</span>
                    </button>
                  </div>

                  {showFaceitEdit && (
                    <button
                      type="button"
                      onClick={() => setShowFaceitEdit(false)}
                      className="text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>

          {/* STEAM Account Card */}
          <div className="rounded-xl bg-neutral-900/60 border border-white/[0.08] p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0088FF]/10 border border-[#0088FF]/30 flex items-center justify-center text-[#0088FF]">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">CUENTA DE STEAM (CS2)</h3>
                  <div className="text-[10px] text-neutral-400 font-sans">Invitaciones automáticas del Bot</div>
                </div>
              </div>

              {currentUser.steam_id_64 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase">
                  <CheckCircle2 className="w-3 h-3" /> Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase">
                  <AlertCircle className="w-3 h-3" /> Sin Conectar
                </span>
              )}
            </div>

            {currentUser.steam_id_64 ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase font-bold">STEAMID64 VINCULADO</div>
                    <a
                      href={`https://steamcommunity.com/profiles/${currentUser.steam_id_64}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono font-bold text-[#0088FF] hover:underline flex items-center gap-1.5 mt-0.5"
                    >
                      <span>{currentUser.steam_id_64}</span>
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </a>
                    {currentUser.steam_nickname && (
                      <div className="text-[10px] text-neutral-400 font-sans mt-0.5">
                        Alias: <span className="text-neutral-200 font-semibold">{currentUser.steam_nickname}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      BOT LISTO
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-emerald-400 font-sans flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Conectado con la API de Steam</span>
                  </span>
                  <a
                    href="/auth/steam"
                    className="text-[11px] text-neutral-400 hover:text-[#0088FF] flex items-center gap-1 transition-colors cursor-pointer font-sans"
                    title="Volver a autenticar con otra cuenta de Steam"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-autenticar con Steam</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  Conecta tu cuenta de Steam para que el Steam Bot de MachuPeek consulte la API y te invite de forma automática a los lobbies de CS2 sin que tengas que escribir nada.
                </p>

                {/* Botón 1: Autenticación Oficial con Steam OpenID */}
                <a
                  href="/auth/steam"
                  className="w-full py-3 px-4 rounded-xl bg-[#171a21] hover:bg-[#203247] border border-[#0088FF]/40 hover:border-[#0088FF] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-[0_4px_15px_rgba(0,136,255,0.25)] cursor-pointer active:scale-[0.98]"
                >
                  <Gamepad2 className="w-4 h-4 text-[#0088FF]" />
                  <span>Conectar e Iniciar Sesión con Steam</span>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                </a>

                {/* Botón 2: Consultar API y Sincronizar desde Faceit */}
                {currentUser.faceit_nickname && (
                  <button
                    type="button"
                    onClick={() => handleLinkSteam('detect_faceit')}
                    disabled={isLinkingSteam}
                    className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-[#FF5500]/15 to-[#0088FF]/15 hover:from-[#FF5500]/25 hover:to-[#0088FF]/25 border border-white/[0.1] hover:border-[#0088FF]/50 text-xs font-bold text-neutral-200 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLinkingSteam ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0088FF]" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-[#0088FF]" />
                    )}
                    <span>⚡ Consultar API y Sincronizar desde FACEIT</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Wallet Balance & Yape Recharge */}
        <div className="lg:col-span-7 space-y-6">

          {/* Big Balance Card with Radiant Accent */}
          <div className="rounded-xl bg-gradient-to-br from-neutral-900/90 via-neutral-900/70 to-black border border-[#FF5500]/50 p-6 shadow-[0_8px_30px_rgba(255,85,0,0.15)] relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#FF5500]">
                <Coins className="w-4 h-4" />
                <span>SALDO DISPONIBLE EN BILLETERA</span>
              </div>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-white/[0.05] transition-colors cursor-pointer"
                title="Actualizar saldo"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#FF5500]' : ''}`} />
              </button>
            </div>

            <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2 flex items-baseline gap-2">
              <span className="text-[#FF5500] text-2xl font-bold">S/</span>
              <span>{userBalance.toFixed(2)}</span>
              <span className="text-xs text-neutral-400 font-mono">PEN</span>
            </div>

            <p className="text-xs text-neutral-400 font-sans leading-relaxed mb-4">
              Tu saldo se descuenta automáticamente al confirmar apuestas en los mixtones o puede utilizarse para pases de temporada y torneos oficiales.
            </p>

            <div className="flex items-center gap-2 pt-3 border-t border-white/[0.08] text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Garantía de custodia segura y liquidación automática</span>
            </div>
          </div>
          <div className="rounded-xl bg-[#0E1017]/90 border border-[#A855F7]/40 p-6 sm:p-8 shadow-[0_8px_30px_rgba(168,85,247,0.12)] relative backdrop-blur-md">
            
            {/* Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/[0.08]">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#742284]/20 border border-[#A855F7]/40 text-[#C084FC] text-[10px] font-bold uppercase mb-1.5">
                  <Zap className="w-3 h-3" /> ACREDITACIÓN EN TIEMPO REAL // AUTOMÁTICA
                </div>
                <h3 className="text-xl sm:text-2xl font-black italic tracking-tight uppercase text-white">
                  RECARGAR SALDO CON <span className="text-[#C084FC]">YAPE</span>
                </h3>
              </div>
              <span className="text-xs text-neutral-400 font-sans border border-white/[0.1] rounded px-2.5 py-1">
                Moneda: <strong className="text-white">Soles (PEN)</strong>
              </span>
            </div>

            {/* Success Message Banner */}
            {lastSuccessMessage && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-xs flex items-start gap-3">
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
                <label className="text-xs font-bold text-neutral-300 uppercase block mb-2.5">
                  1. Selecciona el monto a recargar (Soles PEN):
                </label>
                
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-3">
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
                        className={`py-3 px-2 rounded-lg border text-center font-black text-xs transition-all cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? 'bg-[#742284] border-[#C084FC] text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                            : 'bg-neutral-900/60 border-white/[0.08] text-neutral-300 hover:border-white/[0.2] hover:text-white'
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
                    className={`text-xs font-bold uppercase underline cursor-pointer transition-colors ${
                      isCustom ? 'text-[#C084FC]' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Ingresar otro monto personalizado
                  </button>

                  {isCustom && (
                    <div className="flex-1 flex items-center bg-black/50 border border-[#A855F7] rounded-lg px-3 py-1.5 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                      <span className="text-xs font-bold text-[#C084FC] mr-2">S/</span>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        placeholder="Ej: 15.00"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full bg-transparent text-sm text-white focus:outline-none font-bold"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Número de Celular Yape */}
              <div>
                <label className="text-xs font-bold text-neutral-300 uppercase block mb-1.5">
                  2. Número de celular afiliado a Yape:
                </label>
                
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    maxLength={9}
                    placeholder="Ej: 987654321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.1] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C084FC] focus:ring-1 focus:ring-[#C084FC] transition-colors"
                    required={!currentUser?.hasSavedPhone}
                  />
                </div>
                
                <p className="text-xs text-neutral-400 mt-1.5 font-sans">
                  {currentUser?.hasSavedPhone 
                    ? '🔒 Ya tienes un número registrado. Puedes dejarlo tal como está o ingresar uno nuevo.'
                    : 'Ingresa tu número de 9 dígitos. La transacción es 100% segura con cifrado SSL 256-Bit.'}
                </p>
              </div>

              {/* 3. Código de Aprobación Yape (OTP) */}
              <div>
                <label className="text-xs font-bold text-neutral-300 uppercase block mb-1.5">
                  3. Código de aprobación de Yape (6 dígitos):
                </label>

                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/50 border-2 border-[#A855F7]/80 rounded-lg pl-9 pr-3 py-3 text-lg font-mono font-black text-white tracking-[0.3em] focus:outline-none focus:border-[#C084FC] focus:shadow-[0_0_15px_rgba(192,132,252,0.3)] transition-all"
                    required
                  />
                </div>

                {/* Yape Instruction Callout */}
                <div className="mt-3 p-3.5 rounded-xl bg-purple-950/30 border border-[#A855F7]/30 text-xs text-purple-200 font-sans leading-relaxed">
                  <strong className="text-white block font-mono uppercase text-xs mb-1">
                    📱 ¿Dónde encontrar este código en tu celular?
                  </strong>
                  Abre la app de <strong>Yape</strong> &gt; Toca el ícono de Menú o campana &gt; Selecciona <strong>"Código de aprobación"</strong> y copia los 6 dígitos temporales generados.
                </div>
              </div>

              {/* Summary and Submit Button */}
              <div className="pt-4 border-t border-white/[0.08]">
                <div className="flex items-center justify-between text-xs mb-4">
                  <span className="text-neutral-400 uppercase">Total a debitar de Yape:</span>
                  <span className="text-xl font-black text-[#C084FC]">
                    S/ {effectiveAmount > 0 ? effectiveAmount.toFixed(2) : '0.00'} PEN
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || effectiveAmount < 1 || otp.length !== 6}
                  className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                    isSubmitting || effectiveAmount < 1 || otp.length !== 6
                      ? 'bg-neutral-800 border border-neutral-700 text-neutral-500 cursor-not-allowed opacity-60'
                      : 'bg-[#742284] hover:bg-[#8B2FA0] border border-[#C084FC]/60 text-white shadow-[0_4px_25px_rgba(168,85,247,0.35)]'
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
              <div className="text-center pt-1">
                <p className="text-xs text-neutral-400 font-sans flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Transacciones 100% seguras con cifrado bancario SSL 256-Bit.</span>
                </p>
              </div>

            </form>
          </div>

          {/* Quick Info Box */}
          <div className="rounded-xl bg-neutral-900/40 border border-white/[0.06] p-4 text-xs text-neutral-400 font-sans space-y-2">
            <div className="font-mono text-xs font-bold text-white uppercase flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#FF5500]" />
              <span>Reglas de Billetera & Cuentas MachuPeek</span>
            </div>
            <p>
              • Las recargas con Yape se procesan en tiempo real de forma inmediata.
            </p>
            <p>
              • Toda recarga mínima es de <strong>S/ 1.00</strong>. No cobramos comisión por depósito de saldo.
            </p>
            <p>
              • Al vincular tu cuenta de FACEIT y Steam, el Steam Bot podrá invitarte automáticamente a los lobbies y partidas sin demoras.
            </p>
            <p>
              • Si ganas una partida mixtón o torneo, el pozo acumulado se acredita inmediatamente a este mismo balance.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
