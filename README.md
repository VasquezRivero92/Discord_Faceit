# Discord Faceit Hub Bot

Bot de Discord para comunidades de CS2 integradas con Faceit. Incluye verificacion de usuarios, sincronizacion de roles por nivel, anuncios de partidas, canales de voz temporales, panel web de administracion, lobby Mixton y puente con un bot de Steam para enviar invitaciones o mensajes de conexion a jugadores.

## Capacidades principales

- Vincular usuarios de Discord con perfiles de Faceit usando `/verificar_fc`.
- Sincronizar roles por nivel de Faceit y roles especiales del club.
- Recibir webhooks de Faceit para anunciar partidas, crear canales de voz y limpiar canales al finalizar.
- Panel web para admins y capitanes con OAuth de Discord.
- Lobby Mixton con jugadores listos, draft, equipos y creación de partidas por FACEIT o Steam.
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
YAPE_WEBHOOK_SECRET=
YAPE_AUDIT_SECRET=
STEAM_BOT_API_KEY=
STEAM_USERNAME=
STEAM_PASSWORD=
STEAM_SHARED_SECRET=
MIXTON_SERVER_IP=127.0.0.1:27015
CS2_PRIVATE_MATCHMAKING_CODE=
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
- `POST /webhook/yape-transaction`: evento firmado desde el escáner Yape; acredita una reserva pendiente sin sondear Firestore.
- `GET /api/matchmaking/status`: estado del bot de Steam, protegido por API key.
- `POST /api/matchmaking/launch`: lanza invitaciones para 10 SteamID64 unicos, protegido por API key.
- `GET /admin`: panel web de administracion.

## Seguridad operativa

- Usa un `ADMIN_JWT_SECRET` largo y unico en produccion.
- Activa `webhookValidation` y configura `FACEIT_WEBHOOK_SECRET` para rechazar webhooks no autorizados.
- Configura `YAPE_WEBHOOK_SECRET` con un valor aleatorio de al menos 32 caracteres, tanto en el bot como en el servidor del escáner. Nunca lo expongas al panel web ni a Discord.
- Mantén las reglas de `firestore.rules` desplegadas: bloquean toda lectura y escritura desde clientes. Solo procesos con Firebase Admin pueden tocar saldos o transacciones.
- Las recargas Yape tienen límites por cuenta/IP, una reserva atómica por código y auditoría con huellas HMAC; ningún código ni IP se guarda en claro en el log de auditoría.
- No uses la cuenta personal principal de Steam para automatizacion.
- Revisa permisos del bot en Discord: necesita gestionar roles, canales y mover miembros si usaras voz automatica.

## Limitacion actual del puente CS2

`steamBot.js` no crea un lobby oficial real de CS2. Genera un identificador interno, actualiza rich presence y envia mensajes a los SteamID64 indicados con el comando `connect`. Para matchmaking real habria que integrar un servicio de servidor CS2/MatchZy, RCON o una capa dedicada de orchestration.

## Mixton por Steam

Al lanzar un Mixton, el panel permite elegir **FACEIT** o **STEAM**. En modo Steam no se comparte IP ni puerto y no se usa una cola de FACEIT:

1. Configura `CS2_PRIVATE_MATCHMAKING_CODE` en `.env`. El código se envía por DM únicamente a los capitanes.
2. Ambos capitanes deben tener su SteamID64 vinculado y agregar al bot de Steam.
3. Cada capitán crea su party de CS2, usa el código de matchmaking privado e invita al bot.
4. El bot recibe el ID del lobby real, construye el enlace `steam://joinlobby/730/...` y lo envía por DM solo a los cinco integrantes de ese equipo.

El bot no entra al lobby ni ocupa un cupo. La invitación vence después de 30 minutos o al cerrar/abandonar la party del capitán.

## Integración segura del escáner Yape

Después de escribir exitosamente `yape_transacciones/{numero_operacion}` con Firebase Admin, el escáner debe notificar al bot. El webhook no acepta montos ni IDs de usuario: el bot vuelve a leer Firestore y solo acredita una reserva existente.

```js
const crypto = require('crypto');

async function notifyYapeTransaction(operationNumber) {
  const body = JSON.stringify({ numero_operacion: String(operationNumber) });
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(24).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.YAPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${nonce}.`)
    .update(body)
    .digest('hex');

  await fetch(`${process.env.BOT_BASE_URL}/webhook/yape-transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Yape-Timestamp': timestamp,
      'X-Yape-Nonce': nonce,
      'X-Yape-Signature': signature
    },
    body
  });
}
```

El endpoint exige HTTPS, firma HMAC, marca de tiempo máxima de cinco minutos y un nonce de un solo uso. Una repetición no puede acreditar dos veces porque el saldo se modifica mediante una transacción de Firestore.

