import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

// Inicializamos el cliente de Steam
const client = new SteamUser();

// Configuración de credenciales y parámetros
const STEAM_USERNAME = process.env.STEAM_USERNAME;
const STEAM_PASSWORD = process.env.STEAM_PASSWORD;
const STEAM_SHARED_SECRET = process.env.STEAM_SHARED_SECRET;

// Objeto para almacenar la información de los lobbies activos creados por el bot
const activeLobbies = new Map();

/**
 * Inicia la sesión del bot en Steam
 */
export function startSteamBot() {
  if (!STEAM_USERNAME || !STEAM_PASSWORD) {
    console.error('❌ Error: STEAM_USERNAME o STEAM_PASSWORD no están configurados en el archivo .env');
    return;
  }

  const logOnDetails = {
    accountName: STEAM_USERNAME,
    password: STEAM_PASSWORD
  };

  // Si se provee shared_secret, generamos el código Steam Guard de doble factor (2FA) automáticamente
  if (STEAM_SHARED_SECRET && STEAM_SHARED_SECRET !== 'your_steam_shared_secret_here_if_applicable') {
    try {
      logOnDetails.twoFactorCode = SteamTotp.generateAuthCode(STEAM_SHARED_SECRET);
      console.log('🔑 Código de Steam Guard generado automáticamente.');
    } catch (err) {
      console.error('⚠️ Error al generar el código 2FA:', err.message);
    }
  }

  console.log(`🤖 Iniciando sesión en Steam como: ${STEAM_USERNAME}...`);
  client.logOn(logOnDetails);
}

// Evento: Sesión iniciada correctamente
client.on('loggedOn', (details) => {
  console.log('✅ Bot de Steam: Sesión iniciada con éxito en Steam.');
  
  // Ponemos al bot Online
  client.setPersona(SteamUser.EPersonaState.Online);
  
  // Ponemos al bot "jugando" a CS2 (AppID: 730)
  console.log('🎮 Estableciendo estado: Jugando a Counter-Strike 2 (AppID 730)');
  client.gamesPlayed([730]);
});

// Evento: Error al iniciar sesión
client.on('error', (err) => {
  console.error('\n❌ [Steam Login Error] Ocurrió un error en el cliente de Steam:');
  console.error(`  - Mensaje: ${err.message}`);
  if (err.eresult) {
    console.error(`  - EResult Code: ${err.eresult}`);
    
    // Mapeo de EResult comunes para facilitar el diagnóstico del usuario
    switch(err.eresult) {
      case 5: // InvalidPassword
        console.error('  - Diagnóstico: Contraseña incorrecta. Revisa tu STEAM_PASSWORD en el archivo .env.');
        break;
      case 6: // AlreadyLoggedIn
        console.error('  - Diagnóstico: La cuenta ya tiene una sesión activa en otro dispositivo.');
        break;
      case 63: // AccountLogonDenied (Debería disparar steamGuard, pero si falla aquí es que fue bloqueado o expiró)
        console.error('  - Diagnóstico: Inicio de sesión denegado. Steam requiere verificación por correo, pero no se pudo completar.');
        break;
      case 84: // RateLimitExceeded
        console.error('  - Diagnóstico: Límite de intentos excedido (Rate Limit). Steam ha bloqueado temporalmente las peticiones de login de tu IP. Espera entre 30 minutos y 2 horas.');
        break;
      case 85: // AccountLoginDeniedNeedTwoFactor
        console.error('  - Diagnóstico: Se requiere autenticador móvil de Steam Guard (2FA). Revisa tu STEAM_SHARED_SECRET o ingresa el código.');
        break;
      case 88: // TwoFactorCodeMismatch
        console.error('  - Diagnóstico: El código 2FA ingresado o auto-generado es incorrecto.');
        break;
      default:
        console.error('  - Diagnóstico: Revisa el código EResult en la documentación de Steamworks para más detalles.');
    }
  }
  console.error('  - Pila de llamada:', err.stack || err);
});

let steamGuardCallback = null;

export function resolveSteamGuard(code) {
  if (steamGuardCallback) {
    console.log(`🔑 Procesando código de Steam Guard recibido externamente: ${code}`);
    steamGuardCallback(code.trim());
    steamGuardCallback = null;
    return true;
  }
  return false;
}

// Evento: Manejo de solicitudes de Steam Guard en tiempo real
client.on('steamGuard', (domain, callback) => {
  console.log(`\n🔒 [Steam Guard] Se requiere código de verificación (${domain ? `Correo: ${domain}` : '2FA App'}).`);
  
  steamGuardCallback = callback;

  console.log('👉 Puedes introducir el código visitando: /api/steam/guard?code=TU_CODIGO');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('👉 Introduce el código de Steam Guard aquí: ', (code) => {
    rl.close();
    if (steamGuardCallback) {
      callback(code.trim()); // Envía el código ingresado para continuar con el inicio de sesión
      steamGuardCallback = null;
    }
  });
});

// Evento: Auto-aceptar solicitudes de amistad
client.on('friendRelationship', (steamID, relationship) => {
  const steamID64 = steamID.getSteamID64();
  
  if (relationship === SteamUser.EFriendRelationship.RequestRecipient) {
    console.log(`👥 Recibida solicitud de amistad de: ${steamID64}. Aceptando automáticamente...`);
    
    client.addFriend(steamID, (err, name) => {
      if (err) {
        console.error(`❌ Error al aceptar solicitud de amistad de ${steamID64}:`, err.message);
      } else {
        console.log(`✅ Ahora somos amigos de ${name || steamID64}.`);
      }
    });
  }
});

/**
 * Crea un lobby de matchmaking privado y envía invitaciones a los jugadores especificados.
 * 
 * @param {string[]} arrayJugadores - Array con los SteamID64 de los 10 jugadores.
 * @param {string} ipServidor - Dirección IP:PUERTO del servidor de CS2 al que conectarse.
 * @returns {Promise<object>} Datos del lobby creado.
 */
export async function crearLobbyMatchmaking(arrayJugadores, ipServidor) {
  if (!client.steamID) {
    throw new Error('El bot de Steam no tiene una sesion activa en este momento.');
  }

  if (!Array.isArray(arrayJugadores) || arrayJugadores.length === 0) {
    throw new Error('No hay SteamID64 validos para invitar.');
  }

  const lobbyId = '109775' + Math.floor(100000000000 + Math.random() * 900000000000);
  console.log(`Creando lobby privado de CS2. ID generado: ${lobbyId}`);
  console.log(`Inyectando metadata del lobby: connect = "${ipServidor}"`);

  const lobbyData = {
    lobbyId,
    appId: 730,
    maxPlayers: 10,
    metadata: {
      connect: ipServidor,
      game: 'cs2',
      type: 'private_matchmaking'
    },
    playersInvited: arrayJugadores,
    createdAt: new Date().toISOString()
  };

  activeLobbies.set(lobbyId, lobbyData);

  client.setRichPresence(730, {
    status: `Custom Match: ${ipServidor}`,
    connect: ipServidor,
    lobbyid: lobbyId
  });

  console.log(`Iniciando el envio de invitaciones a ${arrayJugadores.length} jugadores...`);
  const inviteMessage = `Tu partida de CS2 esta lista. Conectate al servidor usando este comando en tu consola:\nconnect ${ipServidor}`;

  const results = await Promise.allSettled(arrayJugadores.map(async (playerSteamID64) => {
    const friendSteamID = new SteamUser.SteamID(playerSteamID64);
    await client.chat.sendFriendMessage(friendSteamID, inviteMessage);
    return playerSteamID64;
  }));

  const sent = [];
  const failed = [];
  results.forEach((result, index) => {
    const steamId = arrayJugadores[index];
    if (result.status === 'fulfilled') {
      sent.push(steamId);
      console.log(`Invitacion enviada con exito a: ${steamId}`);
    } else {
      failed.push({ steamId, error: result.reason?.message || String(result.reason) });
      console.warn(`No se pudo enviar mensaje directo a ${steamId}. Puede que no sea amigo del bot: ${result.reason?.message || result.reason}`);
    }
  });

  lobbyData.inviteSummary = {
    sent: sent.length,
    failed: failed.length,
    failedPlayers: failed
  };

  console.log(`Invitaciones Steam finalizadas. Enviadas: ${sent.length}, fallidas: ${failed.length}.`);
  return lobbyData;
}

// Exportamos el cliente para que la API pueda verificar su estado si es necesario
export { client as steamClient };

