const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace localStorage states with simple states initialized to empty/initial data
content = content.replace(/const \[users, setUsers\] = useState<LinkedUser\[\]>\(\(\) => \{[\s\S]*?\}\);/, 'const [users, setUsers] = useState<LinkedUser[]>([]);');
content = content.replace(/const \[matches, setMatches\] = useState<LiveMatch\[\]>\(\(\) => \{[\s\S]*?\}\);/, 'const [matches, setMatches] = useState<LiveMatch[]>([]);');
content = content.replace(/const \[logs, setLogs\] = useState<SystemLog\[\]>\(\(\) => \{[\s\S]*?\}\);/, 'const [logs, setLogs] = useState<SystemLog[]>([]);');
content = content.replace(/const \[featureFlags, setFeatureFlags\] = useState<FeatureFlag\[\]>\(\(\) => \{[\s\S]*?\}\);/, 'const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);');
content = content.replace(/const \[config, setConfig\] = useState<BotConfig>\(\(\) => \{[\s\S]*?\}\);/, 'const [config, setConfig] = useState<BotConfig>(initialConfig);\n  const [leaderboard, setLeaderboard] = useState<any[]>([]);');

// Strip Persist States helper
content = content.replace(/\/\/ Persist States helper[\s\S]*?\/\/ Simulate Auto-Logging/g, '// Simulate Auto-Logging');

// Remove simulate auto-logging block entirely since we'll fetch real logs
content = content.replace(/\/\/ Simulate Auto-Logging in Background every 12 seconds[\s\S]*?return \(\) => clearInterval\(interval\);\s*\}, \[\]\);/g, '');

// Update handleLogin
content = content.replace(/const handleLogin = \(\) => \{[\s\S]*?showToast\('¡Sesión iniciada correctamente!', 'success'\);\s*\};/g, 
`const handleLogin = async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('nexus_is_logged_in', 'true');
        setIsLoggedIn(true);
        setCurrentUser({
          username: data.user?.username || 'Admin',
          email: '',
          avatar: data.user?.avatar ? \`https://cdn.discordapp.com/avatars/\${data.user.id}/\${data.user.avatar}.png\` : ''
        });
        showToast('¡Sesión validada correctamente!', 'success');
      } else {
        window.location.href = '/auth/discord';
      }
    } catch(e) {
      window.location.href = '/auth/discord';
    }
  };`);

// Add loadData useEffect right after config declaration
const loadDataEffect = `
  useEffect(() => {
    if (!isLoggedIn) return;
    const loadData = async () => {
      try {
        const [usersRes, matchesRes, logsRes, settingsRes, leaderboardRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/matches'),
          fetch('/api/admin/logs'),
          fetch('/api/admin/settings'),
          fetch('/api/admin/leaderboard')
        ]);
        if (usersRes.ok) setUsers((await usersRes.json()).users || []);
        if (matchesRes.ok) setMatches((await matchesRes.json()).matches || []);
        if (logsRes.ok) setLogs((await logsRes.json()).logs || []);
        if (settingsRes.ok) {
          const s = (await settingsRes.json()).settings || {};
          setConfig(s);
          const features = [
            { key: 'autoWelcomeDm', name: 'Welcome DM', desc: 'Enviar mensaje de bienvenida', enabled: s.autoWelcomeDm === true },
            { key: 'autoRoleSync', name: 'Role Sync', desc: 'Sincronizar roles', enabled: s.autoRoleSync === true },
            { key: 'autoNickSync', name: 'Nick Sync', desc: 'Sincronizar apodos al iniciar partida', enabled: s.autoNickSync !== false },
            { key: 'autoVoiceChannels', name: 'Voice Channels', desc: 'Crear canales de voz', enabled: s.autoVoiceChannels === true },
            { key: 'autoMovePlayers', name: 'Auto Move', desc: 'Mover jugadores', enabled: s.autoMovePlayers === true },
            { key: 'matchAnnouncements', name: 'Match Announcements', desc: 'Anunciar partidas', enabled: s.matchAnnouncements === true },
            { key: 'liveMatchPanel', name: 'Live Panel', desc: 'Panel en vivo', enabled: s.liveMatchPanel === true },
            { key: 'command_verificar', name: 'Cmd /verificar_fc', desc: 'Comando verificar', enabled: s.command_verificar !== false },
            { key: 'command_desvincular', name: 'Cmd /desvincular_fc', desc: 'Comando desvincular', enabled: s.command_desvincular !== false },
            { key: 'command_leaderboard', name: 'Cmd /leaderboard', desc: 'Comando leaderboard', enabled: s.command_leaderboard !== false },
            { key: 'command_stats', name: 'Cmd /stats', desc: 'Comando stats', enabled: s.command_stats !== false },
            { key: 'command_info', name: 'Cmd /info', desc: 'Comando info', enabled: s.command_info !== false }
          ];
          setFeatureFlags(features);
        }
        if (leaderboardRes.ok) setLeaderboard((await leaderboardRes.json()).leaderboard || []);
      } catch (e) {
        console.error('Error loading initial data', e);
      }
    };
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);
`;

content = content.replace(/const \[activeTab, setActiveTab\] = useState<string>\('dashboard'\);/, loadDataEffect + '\n  const [activeTab, setActiveTab] = useState<string>(\'dashboard\');');

// Update player search
content = content.replace(/const handlePlayerSearch = \(e: React\.FormEvent\) => \{[\s\S]*?setStatsSearch\(''\);\s*\};/, 
`const handlePlayerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statsSearch) return;
    try {
      const res = await fetch(\`/api/admin/stats/\${statsSearch}\`);
      if (res.ok) {
        const data = await res.json();
        setActivePlayer({
          nickname: data.player.nickname,
          country: data.player.country || 'un',
          avatar: data.player.avatar || '',
          elo: data.player.games.cs2?.faceit_elo || 0,
          level: data.player.games.cs2?.skill_level || 1,
          matches: data.stats.lifetime.Matches || 0,
          winRate: data.stats.lifetime['Win Rate %'] || 0,
          kdRatio: data.stats.lifetime['Average K/D Ratio'] || 0,
          hsRate: data.stats.lifetime['Average Headshots %'] || 0,
          recentResults: data.stats.lifetime['Recent Results'] || []
        });
        showToast('Estadísticas cargadas', 'success');
      } else {
        showToast('Jugador no encontrado', 'error');
      }
    } catch(e) {
      showToast('Error de conexión', 'error');
    }
  };`);

// Replace leaderboard map with real leaderboard
content = content.replace(/\{users\.filter\(u => u\.status === 'Verificado'\)\.map\(\(u, i\) => \{[\s\S]*?\}\)\}/, 
`{leaderboard.map((u, i) => (
  <tr key={u.id} className="hover:bg-white/[0.02] border-b border-white/5 transition-colors">
    <td className="py-4 px-6 font-mono font-black text-xs text-white">
      {i === 0 ? <span className="text-yellow-500">01</span> : 
       i === 1 ? <span className="text-neutral-400">02</span> :
       i === 2 ? <span className="text-red-400">03</span> :
       String(i + 1).padStart(2, '0')}
    </td>
    <td className="py-4 px-6 text-white truncate max-w-[150px]">{u.discord_id || 'N/A'}</td>
    <td className="py-4 px-6 text-white truncate max-w-[150px]">{u.faceit_nickname}</td>
    <td className="py-4 px-6">
      <div className="flex items-center gap-2">
        <span className={\`w-2 h-2 rounded-full \${u.faceit_level >= 10 ? 'bg-red-500' : u.faceit_level >= 8 ? 'bg-yellow-500' : 'bg-neutral-500'}\`}></span>
        <span className="text-white">LVL {u.faceit_level}</span>
      </div>
    </td>
    <td className="py-4 px-6 font-bold text-white">{u.faceit_elo}</td>
  </tr>
))}`);

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx modified successfully');
