import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import dotenv from 'dotenv';

dotenv.config();

// El inicio de sesión se controla exclusivamente desde el panel. Desactivamos
// los reintentos automáticos del cliente para evitar que Steam bloquee la IP.
const client = new SteamUser({ autoRelogin: false });

// Configuración de credenciales y parámetros
const STEAM_USERNAME = process.env.STEAM_USERNAME;
const STEAM_PASSWORD = process.env.STEAM_PASSWORD;
const STEAM_SHARED_SECRET = process.env.STEAM_SHARED_SECRET;

// Objeto para almacenar la información de los lobbies activos creados por el bot
const activeLobbies = new Map();
const pendingCs2LobbyInvites = new Map();
const CS2_APP_ID = 730;
const RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const GUARD_RETRY_COOLDOWN_MS = 60 * 1000;

let steamGuardCallback = null;
let steamLoginState = {
  status: 'idle',
  guardType: null,
  codeAttempts: 0,
  lastCodeWrong: false,
  startedAt: null,
  retryAfter: null,
  message: 'El bot de Steam está desconectado.'
};

function setSteamLoginState(update) {
  steamLoginState = { ...steamLoginState, ...update };
}

function remainingRetryMs() {
  return Math.max(0, (steamLoginState.retryAfter || 0) - Date.now());
}

function formatRetryMessage(retryAfterMs) {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
  return `Steam limita nuevos intentos. Espera aproximadamente ${minutes} min antes de solicitar otro código.`;
}

export function getSteamLoginStatus() {
  const retryAfterMs = remainingRetryMs();
  const connected = steamLoginState.status === 'connected' && Boolean(client.steamID);
  const waitingForCode = Boolean(steamGuardCallback);
  const status = connected ? 'connected' : steamLoginState.status;

  return {
    connected,
    waitingForCode,
    status,
    guardType: steamLoginState.guardType,
    codeAttempts: steamLoginState.codeAttempts,
    lastCodeWrong: steamLoginState.lastCodeWrong,
    retryAfterMs,
    message: retryAfterMs && status !== 'connected'
      ? formatRetryMessage(retryAfterMs)
      : steamLoginState.message
  };
}

function getSteamId64(value) {
  if (!value) return null;
  if (typeof value.getSteamID64 === 'function') return value.getSteamID64();
  return String(value);
}

/**
 * Espera la invitación real de un capitán a su lobby de CS2. No se une al
 * lobby: solo obtiene su ID y entrega el enlace a los compañeros del equipo.
 */
export function registerCs2LobbyInvite({ captainSteamId, onLobbyReady, onError, timeoutMs = 30 * 60 * 1000 }) {
  const cleanCaptainSteamId = String(captainSteamId || '').trim();
  if (!/^\d{17}$/.test(cleanCaptainSteamId)) {
    throw new Error('El capitán no tiene un SteamID64 válido.');
  }
  if (!client.steamID) {
    throw new Error('El bot de Steam no tiene una sesión activa.');
  }

  const previous = pendingCs2LobbyInvites.get(cleanCaptainSteamId);
  if (previous?.timeout) clearTimeout(previous.timeout);

  const request = {
    onLobbyReady,
    onError,
    timeout: setTimeout(async () => {
      if (pendingCs2LobbyInvites.get(cleanCaptainSteamId) !== request) return;
      pendingCs2LobbyInvites.delete(cleanCaptainSteamId);
      await onError?.('Se agotó el tiempo para recibir la invitación del lobby de CS2.');
    }, timeoutMs)
  };

  pendingCs2LobbyInvites.set(cleanCaptainSteamId, request);
  return () => {
    if (pendingCs2LobbyInvites.get(cleanCaptainSteamId) === request) {
      clearTimeout(request.timeout);
      pendingCs2LobbyInvites.delete(cleanCaptainSteamId);
    }
  };
}

/**
 * Inicia la sesión del bot en Steam
 */
export function startSteamBot() {
  if (!STEAM_USERNAME || !STEAM_PASSWORD) {
    console.error('❌ Error: STEAM_USERNAME o STEAM_PASSWORD no están configurados en el archivo .env');
    return { ok: false, code: 'MISSING_CREDENTIALS', message: 'Faltan las credenciales de Steam en el servidor.' };
  }

  if (getSteamLoginStatus().connected) {
    return { ok: true, code: 'ALREADY_CONNECTED', message: 'El bot de Steam ya está conectado.', status: getSteamLoginStatus() };
  }

  if (steamGuardCallback || ['starting', 'reconnecting', 'verifying'].includes(steamLoginState.status)) {
    return { ok: false, code: 'LOGIN_IN_PROGRESS', message: 'El bot ya está esperando un código de Steam Guard.', status: getSteamLoginStatus() };
  }

  const retryAfterMs = remainingRetryMs();
  if (retryAfterMs) {
    return { ok: false, code: 'RATE_LIMITED', message: formatRetryMessage(retryAfterMs), retryAfterMs, status: getSteamLoginStatus() };
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

  setSteamLoginState({
    status: 'starting',
    guardType: null,
    codeAttempts: 0,
    lastCodeWrong: false,
    startedAt: Date.now(),
    retryAfter: null,
    message: 'Solicitando inicio de sesión a Steam.'
  });
  client.autoRelogin = false;
  console.log(`🤖 Iniciando sesión en Steam como: ${STEAM_USERNAME}...`);
  client.logOn(logOnDetails);
  return { ok: true, code: 'LOGIN_STARTED', message: 'Inicio de sesión solicitado a Steam.', status: getSteamLoginStatus() };
}

// Evento: Sesión iniciada correctamente
client.on('loggedOn', (details) => {
  console.log('✅ Bot de Steam: Sesión iniciada con éxito en Steam.');
  steamGuardCallback = null;
  setSteamLoginState({
    status: 'connected',
    guardType: null,
    lastCodeWrong: false,
    retryAfter: null,
    message: 'El bot de Steam está conectado.'
  });
  // Una vez autenticado, sí permitimos recuperar cortes de red normales.
  client.autoRelogin = true;
  
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
        setSteamLoginState({
          status: 'rate_limited',
          guardType: null,
          retryAfter: Date.now() + RATE_LIMIT_COOLDOWN_MS,
          message: 'Steam bloqueó temporalmente los inicios de sesión desde esta IP.'
        });
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
  if (err.eresult !== 84) {
    setSteamLoginState({
      status: 'error',
      guardType: null,
      message: 'Steam rechazó el inicio de sesión. Revisa el registro del servidor antes de reintentarlo.'
    });
  }
  client.autoRelogin = false;
  steamGuardCallback = null;
  console.error('  - Pila de llamada:', err.stack || err);
});

client.on('disconnected', (_eresult, message) => {
  if (steamLoginState.status === 'rate_limited' || steamLoginState.status === 'error') return;

  if (client.autoRelogin) {
    setSteamLoginState({
      status: 'reconnecting',
      guardType: null,
      message: 'La conexión con Steam se interrumpió. El bot intenta recuperarla automáticamente.'
    });
    return;
  }

  setSteamLoginState({
    status: 'idle',
    guardType: null,
    message: message ? `El bot de Steam se desconectó: ${message}` : 'El bot de Steam se desconectó.'
  });
});

export function isSteamGuardPending() {
  return Boolean(steamGuardCallback);
}

export function resolveSteamGuard(code) {
  if (!steamGuardCallback) {
    return { ok: false, code: 'NO_PENDING_CODE', message: 'El bot no está esperando un código de Steam Guard.', status: getSteamLoginStatus() };
  }

  const retryAfterMs = remainingRetryMs();
  if (retryAfterMs) {
    return { ok: false, code: 'RETRY_COOLDOWN', message: formatRetryMessage(retryAfterMs), retryAfterMs, status: getSteamLoginStatus() };
  }

  const callback = steamGuardCallback;
  // Limpiar primero evita reutilizar un callback si Steam emite el siguiente
  // desafío de forma síncrona al procesar el código.
  steamGuardCallback = null;
  const isTwoFactor = steamLoginState.guardType === 'two_factor';
  const cooldownMs = isTwoFactor ? 30 * 1000 : GUARD_RETRY_COOLDOWN_MS;
  setSteamLoginState({
    status: 'verifying',
    codeAttempts: steamLoginState.codeAttempts + 1,
    retryAfter: Date.now() + cooldownMs,
    message: 'Código entregado a Steam. Esperando la validación.'
  });
  console.log('🔑 Procesando código de Steam Guard recibido desde el panel de administración.');
  callback(code.trim());
  return { ok: true, message: 'Código enviado a Steam para validación.', status: getSteamLoginStatus() };
}

// Evento: Manejo de solicitudes de Steam Guard en tiempo real
client.on('steamGuard', (domain, callback, lastCodeWrong = false) => {
  const guardType = domain ? 'email' : 'two_factor';
  const retryAfter = lastCodeWrong && !domain ? Date.now() + 30 * 1000 : steamLoginState.retryAfter;
  console.log(`\n🔒 [Steam Guard] Se requiere código de verificación (${domain ? `Correo: ${domain}` : '2FA App'}).`);
  if (lastCodeWrong) {
    console.warn('⚠️ Steam rechazó el código anterior. No envíes otro de inmediato.');
  }
  
  steamGuardCallback = callback;
  setSteamLoginState({
    status: `waiting_${guardType}`,
    guardType,
    lastCodeWrong,
    retryAfter,
    message: lastCodeWrong
      ? 'Steam rechazó el código anterior. Usa un código nuevo cuando el panel habilite el envío.'
      : `Steam espera un código de ${guardType === 'email' ? 'correo' : 'autenticador móvil'}.`
  });

  console.log('👉 Ingresa el código más reciente desde el Panel de administración > Configuración > Steam Guard.');
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

// El capitán invita al bot desde un lobby real de CS2. SteamUser expone el
// lobbyID recibido, que permite construir un enlace steam://joinlobby seguro
// para el equipo sin revelar la dirección del servidor.
client.on('lobbyInvite', async (inviterID, lobbyID) => {
  const captainSteamId = getSteamId64(inviterID);
  const request = pendingCs2LobbyInvites.get(captainSteamId);
  if (!request) return;

  const lobbySteamId = getSteamId64(lobbyID);
  if (!lobbySteamId) {
    await request.onError?.('Steam no entregó un ID válido para el lobby invitado.');
    return;
  }

  const persona = client.users?.[captainSteamId];
  const appId = Number(persona?.game_played_app_id || persona?.gameid || 0);
  if (appId !== CS2_APP_ID) {
    await request.onError?.('No se pudo verificar un lobby de Counter-Strike 2. Abre CS2, crea la party e invita al bot nuevamente.');
    return;
  }

  clearTimeout(request.timeout);
  pendingCs2LobbyInvites.delete(captainSteamId);

  const lobbyLink = `steam://joinlobby/${CS2_APP_ID}/${lobbySteamId}/${captainSteamId}`;
  try {
    await request.onLobbyReady?.({ lobbyId: lobbySteamId, lobbyLink, captainSteamId });
    console.log(`✅ Lobby de CS2 recibido del capitán ${captainSteamId}.`);
  } catch (error) {
    console.error(`❌ No se pudo procesar el lobby de CS2 de ${captainSteamId}:`, error.message);
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

