import React, { useState } from 'react';
import { 
  Users, 
  Crown, 
  Flame, 
  Map, 
  Server, 
  CheckCircle2, 
  Radio, 
  ArrowRight, 
  Copy, 
  ExternalLink, 
  HelpCircle,
  Sparkles,
  Zap
} from 'lucide-react';
import { LobbyState, CurrentUser } from '../types';

interface MixtonLiveStepperProps {
  lobbyState: LobbyState;
  totalReadyCount: number;
  requiredPlayers?: number;
  currentUser: CurrentUser | null;
  onOpenGuide?: () => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const MixtonLiveStepper: React.FC<MixtonLiveStepperProps> = ({
  lobbyState,
  totalReadyCount,
  requiredPlayers = 10,
  currentUser,
  onOpenGuide,
  showToast
}) => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Compute Current Phase (1 to 5)
  // Phase 1: Convocatoria / Cola (draft not started, waiting for ready players)
  // Phase 2: Capitanes & Orden (captains assigned or pick order ready/randomizing)
  // Phase 3: Draft en Vivo (draftStarted && !draftFinished)
  // Phase 4: Veto de Mapas CS2 (mapVeto active or completed)
  // Phase 5: Combate / Servidor Live (match created / live)
  const isVetoActive = Boolean(lobbyState.mapVeto && (lobbyState.mapVeto.active || lobbyState.mapVeto.completed));
  const isDraftActive = Boolean(lobbyState.draftStarted && !lobbyState.draftFinished);
  const isDraftFinished = Boolean(lobbyState.draftFinished);
  const hasCaptains = Boolean(lobbyState.teams && lobbyState.teams.length >= 2 && lobbyState.teams.every(t => Boolean(t.captain)));
  const isMatchLive = Boolean(isDraftFinished && (isVetoActive || lobbyState.mapVeto?.completed));

  let currentPhase = 1;
  if (isVetoActive) {
    currentPhase = 4;
  } else if (isDraftActive) {
    currentPhase = 3;
  } else if (hasCaptains || isDraftFinished) {
    currentPhase = isDraftFinished ? 4 : 2;
  } else {
    currentPhase = 1;
  }

  // Active Team & Turn Info for Draft
  const currentTeamId = lobbyState.pickSequence?.[lobbyState.currentPickIndex] || lobbyState.pickOrder?.[lobbyState.currentPickIndex % (lobbyState.pickOrder.length || 1)];
  const currentTeam = lobbyState.teams?.find(t => t.id === currentTeamId);
  const isMyTurn = Boolean(currentTeam?.captain && currentUser && currentTeam.captain.discordId === currentUser.userId);

  const copyDiscordCommand = () => {
    navigator.clipboard.writeText('/mixton_listo');
    if (showToast) {
      showToast('Comando "/mixton_listo" copiado al portapapeles', 'success');
    }
  };

  const steps = [
    {
      num: 1,
      title: 'Convocatoria',
      subtitle: `${totalReadyCount}/${requiredPlayers} Listos`,
      icon: Users,
      isCompleted: totalReadyCount >= requiredPlayers || isDraftActive || isDraftFinished,
      isActive: currentPhase === 1,
    },
    {
      num: 2,
      title: 'Capitanes',
      subtitle: hasCaptains ? 'Asignados' : 'Por Definir',
      icon: Crown,
      isCompleted: hasCaptains || isDraftActive || isDraftFinished,
      isActive: currentPhase === 2,
    },
    {
      num: 3,
      title: 'Draft en Vivo',
      subtitle: isDraftActive ? (isMyTurn ? '¡Tu Turno!' : 'En Selección') : isDraftFinished ? 'Completado' : 'Pendiente',
      icon: Flame,
      isCompleted: isDraftFinished,
      isActive: currentPhase === 3,
    },
    {
      num: 4,
      title: 'Veto de Mapas',
      subtitle: isVetoActive ? (lobbyState.mapVeto?.chosenMap ? `Map: ${lobbyState.mapVeto.chosenMap.name}` : 'Baneando') : 'Al terminar draft',
      icon: Map,
      isCompleted: Boolean(lobbyState.mapVeto?.completed),
      isActive: currentPhase === 4,
    },
    {
      num: 5,
      title: 'Servidor CS2',
      subtitle: isMatchLive ? 'Partida en Curso' : 'Esperando Veto',
      icon: Server,
      isCompleted: false,
      isActive: currentPhase === 5,
    },
  ];

  return (
    <div className="w-full space-y-4 mb-2">
      {/* 1. Tactical Visual Pipeline Stepper */}
      <div className="bg-[#0D1017]/90 border border-white/10 p-3 sm:p-4 rounded-2xl backdrop-blur-md shadow-xl relative overflow-hidden">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF5500] to-transparent opacity-80" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-ping" />
            <h3 className="text-xs sm:text-sm font-black italic tracking-tighter uppercase font-mono text-white flex items-center gap-2">
              ESTADO DEL MIXTON EN TIEMPO REAL <span className="text-[#FF5500]">// MACHUPEEK ARENA</span>
            </h3>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 border border-white/10 rounded-lg"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>¿Cómo funciona el Mixtón?</span>
            </button>
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                className="text-neutral-400 hover:text-sky-400 flex items-center gap-1.5 transition-colors cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 border border-white/10 rounded-lg"
              >
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>Guía Faceit & Steam</span>
              </button>
            )}
          </div>
        </div>

        {/* 5-Step Pipeline Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 relative">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                className={`p-2.5 sm:p-3 border rounded-xl transition-all flex flex-col justify-between relative overflow-hidden ${
                  s.isActive
                    ? 'bg-[#FF5500]/15 border-[#FF5500] shadow-[0_0_15px_rgba(255,85,0,0.25)]'
                    : s.isCompleted
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-[#121620]/60 border-white/5 text-neutral-400 opacity-70'
                }`}
              >
                {/* Active Indicator Top Tag */}
                {s.isActive && (
                  <div className="absolute top-0 right-0 bg-[#FF5500] text-black font-black text-[8px] font-mono px-2 py-0.5 uppercase tracking-widest animate-pulse rounded-bl-md">
                    EN CURSO
                  </div>
                )}
                {s.isCompleted && !s.isActive && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-black font-black text-[8px] font-mono px-2 py-0.5 uppercase tracking-widest rounded-bl-md">
                    LISTO
                  </div>
                )}

                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                    s.isActive
                      ? 'bg-[#FF5500] text-black'
                      : s.isCompleted
                        ? 'bg-emerald-500 text-black'
                        : 'bg-white/10 text-neutral-400'
                  }`}>
                    {s.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider truncate ${
                    s.isActive ? 'text-white' : s.isCompleted ? 'text-emerald-300' : 'text-neutral-400'
                  }`}>
                    {s.num}. {s.title}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className={`text-[9px] font-mono uppercase tracking-wide truncate ${
                    s.isActive ? 'text-[#FF5500] font-black' : s.isCompleted ? 'text-neutral-300' : 'text-neutral-500'
                  }`}>
                    {s.subtitle}
                  </span>
                  {idx < steps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-neutral-600 hidden lg:block" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Explain collapsible box */}
        {showHowItWorks && (
          <div className="mt-3 p-3 bg-[#111622] border border-[#FF5500]/30 text-xs font-mono text-neutral-300 animate-fade-in space-y-2 rounded-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="font-bold text-white uppercase text-[11px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF5500]" /> ¿CÓMO PARTICIPAR EN EL MIXTON DE MACHUPEEK?
              </span>
              <button 
                type="button" 
                onClick={() => setShowHowItWorks(false)} 
                className="text-neutral-400 hover:text-white"
              >
                ✕ Cerrar
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px] leading-relaxed">
              <div className="p-2 bg-black/40 border border-white/5 rounded-lg">
                <strong className="text-white block mb-0.5">1. Ponte Listo:</strong>
                Escribe <code className="text-[#FF5500] bg-black px-1 rounded">/mixton_listo</code> en Discord o mantén tu perfil conectado. Se necesitan 10 jugadores.
              </div>
              <div className="p-2 bg-black/40 border border-white/5 rounded-lg">
                <strong className="text-white block mb-0.5">2. Elección / Draft:</strong>
                Dos capitanes (Tier S/A) eligen a sus 4 compañeros en vivo o el admin balancea automáticamente.
              </div>
              <div className="p-2 bg-black/40 border border-white/5 rounded-lg">
                <strong className="text-white block mb-0.5">3. Veto de Mapas:</strong>
                Los capitanes descartan mapas oficiales de CS2 (Mirage, Inferno, Nuke, etc.) hasta que quede 1 mapa.
              </div>
              <div className="p-2 bg-black/40 border border-white/5 rounded-lg">
                <strong className="text-white block mb-0.5">4. A Jugar:</strong>
                Se lanza el servidor de CS2 o la cola de Faceit. La IP de conexión se envía automáticamente por Discord.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Live Action Narrative Hero Card */}
      <div className={`p-4 border transition-all rounded-2xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg ${
        isDraftActive
          ? isMyTurn
            ? 'bg-gradient-to-r from-[#FF5500]/20 via-[#161B26] to-[#FF5500]/10 border-[#FF5500] shadow-[0_0_20px_rgba(255,85,0,0.2)]'
            : 'bg-gradient-to-r from-[#0E121B] to-[#141A26] border-white/10'
          : isVetoActive
            ? 'bg-gradient-to-r from-purple-950/20 via-[#121622] to-purple-950/10 border-purple-500/40'
            : totalReadyCount >= requiredPlayers
              ? 'bg-gradient-to-r from-emerald-950/20 via-[#121622] to-emerald-950/10 border-emerald-500/40'
              : 'bg-gradient-to-r from-[#0C0F17] to-[#121622] border-white/10'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold flex-shrink-0 shadow-md ${
            isDraftActive 
              ? 'bg-[#FF5500] text-black animate-pulse' 
              : isVetoActive 
                ? 'bg-purple-600 text-white' 
                : totalReadyCount >= requiredPlayers 
                  ? 'bg-emerald-500 text-black' 
                  : 'bg-white/10 text-white'
          }`}>
            {isDraftActive ? <Flame className="w-6 h-6" /> : isVetoActive ? <Map className="w-6 h-6" /> : <Radio className="w-6 h-6 animate-pulse" />}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 border rounded ${
                isDraftActive 
                  ? 'bg-[#FF5500]/20 border-[#FF5500] text-[#FF5500]' 
                  : isVetoActive 
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300' 
                    : totalReadyCount >= requiredPlayers 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300'
              }`}>
                {isDraftActive 
                  ? 'FASE 3: DRAFT EN VIVO' 
                  : isVetoActive 
                    ? 'FASE 4: VETO DE MAPAS' 
                    : totalReadyCount >= requiredPlayers 
                      ? 'FASE 2: LISTO PARA DRAFT' 
                      : 'FASE 1: CONVOCATORIA DE JUGADORES'}
              </span>

              {totalReadyCount < requiredPlayers && !isDraftActive && (
                <span className="text-[10px] font-mono text-neutral-400">
                  Faltan <strong className="text-white">{requiredPlayers - totalReadyCount}</strong> jugador(es)
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm font-mono text-white font-bold leading-snug">
              {isDraftActive ? (
                isMyTurn ? (
                  <span className="text-[#FF5500] animate-pulse">
                    🌟 ¡ES TU TURNO! Elige a tu próximo compañero para {currentTeam?.name.toUpperCase()} en la lista izquierda.
                  </span>
                ) : (
                  <span>
                    ⏳ Esperando elección: Turno del equipo <strong className="text-[#FF5500]">{currentTeam?.name.toUpperCase()}</strong> (Capitán: {currentTeam?.captain?.faceit_nickname || 'Desconocido'}).
                  </span>
                )
              ) : isVetoActive ? (
                <span>
                  🗺️ Los capitanes están en la fase de veto eliminando mapas de CS2 hasta definir el campo de batalla.
                </span>
              ) : totalReadyCount >= requiredPlayers ? (
                <span className="text-emerald-300">
                  ✅ Cupos completos ({totalReadyCount}/{requiredPlayers}). Los capitanes o el administrador están listos para iniciar el draft.
                </span>
              ) : (
                <span>
                  Esperando jugadores en la sala. Entra a Discord y usa <code className="text-[#FF5500] font-bold">/mixton_listo</code> para sumarte a la lista.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Action Button on the Right */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={copyDiscordCommand}
            className="px-3.5 py-2 bg-[#FF5500]/15 hover:bg-[#FF5500] text-[#FF5500] hover:text-black border border-[#FF5500]/50 hover:border-[#FF5500] font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md rounded-xl"
            title="Copiar comando de Discord"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>/mixton_listo</span>
          </button>

          <a
            href="https://discord.gg/machupeek"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#5865F2]/20 hover:bg-[#5865F2] text-white border border-[#5865F2]/60 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer rounded-xl"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Discord</span>
          </a>
        </div>
      </div>
    </div>
  );
};
