import React, { useState } from 'react';
import { X, KeyRound, ShieldCheck, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { CurrentUser } from '../types';

interface DemoLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: CurrentUser) => void;
}

export const DemoLoginModal: React.FC<DemoLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [username, setUsername] = useState('demo@machupeek.com');
  const [password, setPassword] = useState('DemoMixton2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Credenciales inválidas.');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión de prueba.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-[#121212] border-2 border-[#FF5500] text-white w-full max-w-md shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-[#222] bg-[#181818] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#FF5500]" />
            <h3 className="text-sm font-mono font-black uppercase text-white tracking-wider">
              CREDENCIALES DE PRUEBA // ACCESO DEMO
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 font-mono text-xs">
          <div className="bg-[#1E140C] border border-[#FF5500]/40 p-3 text-[11px] text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-white">
              <ShieldCheck className="w-4 h-4 text-[#FF5500]" />
              <span>ENTORNO DE PRUEBAS Y REVISIÓN</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              Estas credenciales permiten revisar y auditar el entorno completo de la plataforma, billetera de jugador y sala de torneos.
            </p>
          </div>

          {/* Preset Credentials Box */}
          <div className="bg-[#181818] border border-[#333] p-4 space-y-2">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
              Credenciales de Acceso Asignadas:
            </span>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">Usuario / Correo:</span>
              <strong className="text-white font-mono bg-[#111] px-2 py-0.5 border border-[#333]">
                demo@machupeek.com
              </strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">Contraseña:</span>
              <strong className="text-[#FF5500] font-mono bg-[#111] px-2 py-0.5 border border-[#333]">
                DemoMixton2026
              </strong>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                Usuario
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#181818] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#FF5500]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#181818] border border-[#333] px-3 py-1.5 text-white focus:outline-none focus:border-[#FF5500]"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-red-950/80 border border-red-500 text-red-200 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#FF5500]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <span>Ingresar a Cuenta Demo (1 Clic)</span>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[#222]">
            <span className="text-[10px] text-neutral-500 block mb-2">O si prefieres acceder con cuenta real de Discord:</span>
            <a
              href="/auth/discord"
              className="inline-block text-[11px] text-[#5865F2] hover:underline font-bold"
            >
              Iniciar sesión con Discord OAuth2 →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
