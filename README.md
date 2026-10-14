# Discord Faceit Hub Bot

Bot de Discord para comunidades de CS2 integradas con Faceit. Incluye verificacion de usuarios, sincronizacion de roles por nivel, anuncios de partidas, canales de voz temporales, panel web de administracion, lobby Mixton y puente con un bot de Steam para enviar invitaciones o mensajes de conexion a jugadores.

## Capacidades principales

- Vincular usuarios de Discord con perfiles de Faceit usando `/verificar_fc`.
- Sincronizar roles por nivel de Faceit y roles especiales del club.
- Recibir webhooks de Faceit para anunciar partidas, crear canales de voz y limpiar canales al finalizar.
- Panel web para admins y capitanes con OAuth de Discord.
- Lobby Mixton con jugadores listos, draft, equipos y creacion manual de partidas.
- API protegida para lanzar invitaciones de CS2 mediante el bot de Steam.
- Sistema de soporte para llamar administradores desde Discord o desde el panel.

## Requisitos

- Node.js 18 o superior.
- Bot de Discord con intents de guilds, miembros, mensajes y voz.
- Proyecto Firebase/Firestore con credenciales de service account.
- API key de Faceit.
- Credenciales de Steam si se usara el puente de CS2.

## Variables de entorno importantes

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID=
ADMIN_JWT_SECRET=
GLOBAL_ADMIN_DISCORD_IDS=123456789012345678
BASE_URL=http://localhost:3000
FACEIT_API_KEY=
FACEIT_HUB_ID=
FACEIT_LEADERBOARD_ID=
FACEIT_WEBHOOK_SECRET=
STEAM_BOT_API_KEY=
STEAM_USERNAME=
STEAM_PASSWORD=
STEAM_SHARED_SECRET=
MIXTON_SERVER_IP=127.0.0.1:27015
PORT=3000
```

`STEAM_BOT_API_KEY` es obligatoria para usar `/api/matchmaking/*`. Si no existe, la API queda deshabilitada con HTTP 503.

## Uso local

```bash
npm install
npm start
```

El bot principal levanta Discord, Express, panel web, webhooks, lobby y puente Steam desde `index.js`.

Para ejecutar solo la API independiente del Steam bot:

```bash
node server.js
```

## Endpoints utiles

- `GET /health`: estado basico del proceso y conexion de Discord.
- `POST /webhook/faceit`: receptor de eventos de Faceit.
- `GET /api/matchmaking/status`: estado del bot de Steam, protegido por API key.
- `POST /api/matchmaking/launch`: lanza invitaciones para 10 SteamID64 unicos, protegido por API key.
- `GET /admin`: panel web de administracion.

## Seguridad operativa

- Usa un `ADMIN_JWT_SECRET` largo y unico en produccion.
- Activa `webhookValidation` y configura `FACEIT_WEBHOOK_SECRET` para rechazar webhooks no autorizados.
- No uses la cuenta personal principal de Steam para automatizacion.
- Revisa permisos del bot en Discord: necesita gestionar roles, canales y mover miembros si usaras voz automatica.

## Limitacion actual del puente CS2

`steamBot.js` no crea un lobby oficial real de CS2. Genera un identificador interno, actualiza rich presence y envia mensajes a los SteamID64 indicados con el comando `connect`. Para matchmaking real habria que integrar un servicio de servidor CS2/MatchZy, RCON o una capa dedicada de orchestration.

