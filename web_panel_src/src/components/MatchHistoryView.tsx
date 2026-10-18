import React, { useMemo } from 'react';
import { CalendarDays, ChevronRight, Clock3, ExternalLink, MapPinned, Swords, Trophy, Users, X } from 'lucide-react';

interface MatchHistoryViewProps {
  history: any[];
  isLoading: boolean;
  selectedMatch: { history: any; stats: any | null } | null;
  isLoadingDetail: boolean;
  onSelectMatch: (matchId: string) => void;
  onCloseDetail: () => void;
}

const formatDate = (value: any) => {
  if (!value) return 'Fecha no disponible';
  const date = value.toDate ? value.toDate() : new Date(value._seconds ? value._seconds * 1000 : value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const formatValue = (value: unknown, suffix = '') => value === null || value === undefined || value === '' ? '—' : `${value}${suffix}`;

export const MatchHistoryView: React.FC<MatchHistoryViewProps> = ({
  history,
  isLoading,
  selectedMatch,
  isLoadingDetail,
  onSelectMatch,
  onCloseDetail
}) => {
  const detailTeams = useMemo(() => selectedMatch?.stats?.teams || [], [selectedMatch]);

  return (
    <section className="relative z-10 flex-1 bg-[#090A0E] px-4 py-8 sm:px-6 lg:py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border-b border-white/[0.09] pb-6 sm:flex sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 border border-[#FF5500]/40 bg-[#FF5500]/10 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-[#FF7733]">
              <Trophy className="h-3.5 w-3.5" /> ARCHIVO COMPETITIVO
            </div>
            <h1 className="font-mono text-3xl font-black italic tracking-tighter sm:text-4xl">HISTORIAL DE PARTIDAS</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
              Resultados terminados del Mixtón. Las estadísticas detalladas se obtienen de FACEIT al finalizar cada encuentro y se abren solo cuando las necesitas.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-2 font-mono text-xs text-neutral-500 sm:mt-0">
            <Users className="h-4 w-4 text-[#FF5500]" /> {history.length} partidas recientes
          </div>
        </div>

        {isLoading ? (
          <div className="border border-dashed border-neutral-700 py-16 text-center font-mono text-xs uppercase tracking-widest text-neutral-500">
            Cargando historial…
          </div>
        ) : history.length === 0 ? (
          <div className="border border-dashed border-neutral-700 bg-white/[0.015] py-16 text-center">
            <Trophy className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-500">Aún no hay partidas terminadas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {history.map(match => {
              const finished = (match.status || '').toLowerCase() === 'finished';
              const team1Won = match.winner === 'faction1';
              const team2Won = match.winner === 'faction2';
              return (
                <article key={match.id} className="group border border-white/[0.09] bg-[#101116] p-5 shadow-[8px_8px_0_rgba(0,0,0,0.28)] transition-colors hover:border-[#FF5500]/60">
                  <div className="mb-4 flex items-center justify-between border-b border-white/[0.07] pb-3 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                    <span className="flex items-center gap-1.5"><MapPinned className="h-3.5 w-3.5 text-[#FF5500]" /> {match.map || 'Mapa pendiente'}</span>
                    <span className={finished ? 'text-emerald-400' : 'text-amber-400'}>{finished ? 'Finalizada' : match.status || 'Registrada'}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="min-w-0 text-right">
                      <p className={`truncate text-sm font-black ${team1Won ? 'text-white' : 'text-neutral-400'}`}>{team1Won && '🏆 '}{match.faction1_name || 'Equipo A'}</p>
                      <p className="mt-1 text-[10px] text-neutral-600">{match.faction1_roster?.length || 0} jugadores</p>
                    </div>
                    <div className="text-center font-mono">
                      <div className="flex items-center gap-2 text-3xl font-black"><span className={team1Won ? 'text-[#FF5500]' : 'text-white'}>{match.faction1_score ?? 0}</span><span className="text-xs text-neutral-600">VS</span><span className={team2Won ? 'text-[#FF5500]' : 'text-white'}>{match.faction2_score ?? 0}</span></div>
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-black ${team2Won ? 'text-white' : 'text-neutral-400'}`}>{team2Won && '🏆 '}{match.faction2_name || 'Equipo B'}</p>
                      <p className="mt-1 text-[10px] text-neutral-600">{match.faction2_roster?.length || 0} jugadores</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-3">
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-500"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(match.createdAt)}</span>
                    <button onClick={() => onSelectMatch(match.id)} className="flex items-center gap-1 border border-[#FF5500]/50 px-2.5 py-1.5 font-mono text-[10px] font-black uppercase tracking-wider text-[#FF7733] transition-colors hover:bg-[#FF5500] hover:text-white">
                      Ver detalle <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selectedMatch && (
        <div className="fixed inset-0 z-[1000] overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-8" onClick={onCloseDetail}>
          <div className="mx-auto max-w-6xl border border-white/[0.14] bg-[#101116] shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.1] p-5 sm:p-7">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF5500]">Partida terminada</p>
                <h2 className="mt-1 text-xl font-black italic sm:text-2xl">{selectedMatch.history.faction1_name} <span className="text-neutral-600">VS</span> {selectedMatch.history.faction2_name}</h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-neutral-400">
                  <span className="flex items-center gap-1"><MapPinned className="h-3.5 w-3.5 text-[#FF5500]" /> {selectedMatch.stats?.map || selectedMatch.history.map || 'Mapa no disponible'}</span>
                  {selectedMatch.stats?.duration && <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-[#FF5500]" /> {selectedMatch.stats.duration}</span>}
                  <span>{formatDate(selectedMatch.history.createdAt)}</span>
                </div>
              </div>
              <button onClick={onCloseDetail} className="p-1 text-neutral-400 transition-colors hover:text-white" aria-label="Cerrar detalle"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-5 sm:p-7">
              {isLoadingDetail ? (
                <p className="py-16 text-center font-mono text-xs uppercase tracking-widest text-neutral-500">Cargando estadísticas de FACEIT…</p>
              ) : detailTeams.length === 0 ? (
                <div className="border border-dashed border-neutral-700 p-10 text-center">
                  <Swords className="mx-auto mb-3 h-7 w-7 text-neutral-600" />
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-400">FACEIT aún no publicó estadísticas detalladas para esta partida.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {detailTeams.map((team: any, index: number) => (
                    <div key={`${team.name}-${index}`} className="overflow-x-auto border border-white/[0.09]">
                      <div className="flex items-center justify-between bg-[#181A20] px-4 py-3">
                        <h3 className="font-mono text-sm font-black uppercase"><span className="mr-2 text-[#FF5500]">{index === 0 ? '◆' : '◇'}</span>{team.name}</h3>
                        <span className="font-mono text-lg font-black text-white">{formatValue(team.score)}</span>
                      </div>
                      <table className="w-full min-w-[620px] text-left font-mono text-xs">
                        <thead className="border-y border-white/[0.08] bg-black/20 text-[10px] uppercase tracking-wider text-neutral-500">
                          <tr><th className="px-4 py-3">Jugador</th><th className="px-3 py-3 text-center">K</th><th className="px-3 py-3 text-center">A</th><th className="px-3 py-3 text-center">D</th><th className="px-3 py-3 text-center">K/D</th><th className="px-3 py-3 text-center">HS%</th><th className="px-3 py-3 text-center">MVP</th></tr>
                        </thead>
                        <tbody>{team.players?.map((player: any, playerIndex: number) => (
                          <tr key={`${player.playerId}-${playerIndex}`} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]">
                            <td className="px-4 py-3 font-bold text-white">{player.nickname}</td><td className="px-3 py-3 text-center">{formatValue(player.kills)}</td><td className="px-3 py-3 text-center text-neutral-400">{formatValue(player.assists)}</td><td className="px-3 py-3 text-center text-neutral-400">{formatValue(player.deaths)}</td><td className="px-3 py-3 text-center text-[#FF7733]">{formatValue(player.kd)}</td><td className="px-3 py-3 text-center text-neutral-300">{formatValue(player.headshots, player.headshots === null || player.headshots === undefined ? '' : '%')}</td><td className="px-3 py-3 text-center text-amber-400">{formatValue(player.mvps)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ))}
                  <a href={`https://www.faceit.com/en/cs2/room/${selectedMatch.history.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-white/20 px-3 py-2 font-mono text-xs font-bold text-neutral-300 transition-colors hover:border-[#FF5500] hover:text-white">Abrir en FACEIT <ExternalLink className="h-3.5 w-3.5 text-[#FF5500]" /></a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
