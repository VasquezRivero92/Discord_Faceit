import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { fetchFaceitPlayerBySteamId, fetchCurrentHubSeason } from '../services/faceitApi.js';
import { getPlayerSkillLevel, syncMemberLevelRole, syncMemberNickname } from '../services/roles.js';
import { getEffectiveConfigForGuild } from '../config/index.js';

export function createAuthRouter(client, db, config) {
  const router = Router();

  const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_GUILD_ID,
    ADMIN_JWT_SECRET,
    BASE_URL
  } = config;

  const REDIRECT_URI = `${BASE_URL}/auth/discord/callback`;

  const sanitizeRedirectPath = (value) => {
    if (typeof value !== 'string') return '/';
    if (!value.startsWith('/') || value.startsWith('//')) return '/';
    if (value.includes('\\') || value.length > 300) return '/';

    return value;
  };

  router.get('/discord', (req, res) => {
    const redirect = sanitizeRedirectPath(req.query.redirect);
    const url = new URL('https://discord.com/oauth2/authorize');
    url.searchParams.set('client_id', DISCORD_CLIENT_ID);
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'identify');
    url.searchParams.set('state', redirect);
    url.searchParams.set('prompt', 'consent');
    res.redirect(url.toString());
  });

  router.get('/discord/callback', async (req, res) => {
    const code = req.query.code;
    const state = sanitizeRedirectPath(req.query.state);
    if (!code) {
      return res.status(400).send('Código de autorización no proporcionado.');
    }

    try {
      // Intercambiar code por access_token
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: REDIRECT_URI
        })
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        logger.error('Error intercambiando code en Discord:', err);
        return res.status(500).send('Error al intercambiar token con Discord.');
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Obtener datos del usuario
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userRes.ok) {
        return res.status(500).send('Error al obtener datos del usuario.');
      }

      const user = await userRes.json();

      // Verificar rol en la base de datos
      let rol = 'usuario';
      let servidor = null;

      const globalAdminIds = (process.env.GLOBAL_ADMIN_DISCORD_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

      if (globalAdminIds.includes(user.id)) {
        rol = 'global_admin';
        await db.setUserRoleAndGuild(user.id, 'global_admin', null);
      } else {
        const dbUser = await db.getFullUser(user.id);
        if (dbUser) {
          rol = dbUser.rol || 'usuario';
          servidor = dbUser.servidor || dbUser.mixton_guild_id || null;
        }
      }

      const isAdmin = (rol === 'global_admin' || rol === 'admin');

      // Verificar si es capitán en alguna de las salas de mixton
      let isCaptain = false;
      try {
        const lobbySnapshot = await db._firestore.collection('faceit_config').get();
        for (const doc of lobbySnapshot.docs) {
          if (doc.id.startsWith('mixton_lobby')) {
            const data = doc.data();
            if (data.teams && Array.isArray(data.teams)) {
              for (const team of data.teams) {
                if (team.captain && team.captain.discordId === user.id) {
                  isCaptain = true;
                  break;
                }
              }
            }
          }
          if (isCaptain) break;
        }
      } catch (err) {
        logger.error('Error al verificar si el usuario es capitán:', err);
      }

      // Si el usuario intentaba entrar a una ruta reservada de administración o capitanes y no cumple los requisitos:
      const targetState = String(state || '');
      const isRestrictedAdminRoute = targetState.startsWith('/admin');
      const isRestrictedCaptainRoute = targetState.startsWith('/captains');

      if ((isRestrictedAdminRoute && !isAdmin) || (isRestrictedCaptainRoute && !isAdmin && !isCaptain)) {
        logger.warn(`[AUTH] Intento de login rechazado para ${user.username} (${user.id}) hacia ruta protegida ${targetState}.`);
        return res.status(403).send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Acceso Restringido</title>
            <style>
              body {
                background-color: #0d0d0d;
                color: #e0e0e0;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
              }
              .container {
                text-align: center;
                background: #151515;
                padding: 3rem;
                border-radius: 12px;
                border: 1px solid #262626;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                max-width: 450px;
                width: 90%;
              }
              .icon {
                font-size: 3.5rem;
                margin-bottom: 1rem;
              }
              h1 {
                font-size: 1.8rem;
                color: #ff5500;
                margin-top: 0;
                margin-bottom: 1rem;
                font-weight: 700;
                letter-spacing: -0.5px;
              }
              p {
                font-size: 1rem;
                color: #a0a0a0;
                line-height: 1.6;
                margin-bottom: 2rem;
              }
              .btn {
                display: inline-block;
                background-color: #ff5500;
                color: #ffffff;
                text-decoration: none;
                padding: 0.75rem 1.5rem;
                font-weight: 600;
                border-radius: 6px;
                transition: background-color 0.2s;
              }
              .btn:hover {
                background-color: #e04b00;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">🔒</div>
              <h1>Acceso Restringido</h1>
              <p>Lo sentimos, solo los capitanes de equipo, administradores y el administrador global tienen permitido iniciar sesión en la web de Mixton.</p>
              <a href="/" class="btn">Volver al Inicio</a>
            </div>
          </body>
          </html>
        `);
      }

      // Generar JWT con flag de admin, rol y servidor
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          avatar: user.avatar,
          isAdmin: isAdmin,
          role: rol,
          servidor: servidor
        },
        ADMIN_JWT_SECRET,
        { expiresIn: '8h' }
      );

      const cookieConfig = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || BASE_URL.startsWith('https'),
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8h
        path: '/'
      };

      res.cookie('auth_token', token, cookieConfig);
      res.cookie('admin_token', token, cookieConfig);

      res.redirect(state);
    } catch (err) {
      logger.error('Error en OAuth2 callback:', err);
      res.status(500).send('Error interno durante la autenticación.');
    }
  });

  // --- Steam OpenID Authentication / Linking ---
  router.get('/steam', (req, res) => {
    const token = req.cookies?.auth_token;
    if (!token) {
      return res.redirect('/auth/discord?redirect=/auth/steam');
    }
    try {
      jwt.verify(token, ADMIN_JWT_SECRET);
    } catch {
      return res.redirect('/auth/discord?redirect=/auth/steam');
    }

    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : (BASE_URL.startsWith('https') ? 'https' : 'http'));
    const effectiveBaseUrl = host ? `${proto}://${host}` : BASE_URL;

    const returnTo = `${effectiveBaseUrl}/auth/steam/callback`;
    const realm = `${effectiveBaseUrl}/`;

    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': realm,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });

    res.redirect(`https://steamcommunity.com/openid/login?${params.toString()}`);
  });

  router.get('/steam/callback', async (req, res) => {
    try {
      const token = req.cookies?.auth_token;
      if (!token) {
        return res.redirect('/cuenta?error=auth_required');
      }

      let decodedUser;
      try {
        decodedUser = jwt.verify(token, ADMIN_JWT_SECRET);
      } catch {
        return res.redirect('/cuenta?error=invalid_session');
      }

      const params = new URLSearchParams(req.query);
      params.set('openid.mode', 'check_authentication');

      const checkRes = await fetch('https://steamcommunity.com/openid/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const checkText = await checkRes.text();
      const isValid = checkText.includes('is_valid:true');

      if (!isValid) {
        logger.warn('[STEAM AUTH] Validación de OpenID fallida desde Steam.');
        return res.redirect('/cuenta?error=steam_validation_failed');
      }

      const claimedId = req.query['openid.claimed_id'] || '';
      const match = claimedId.match(/7656119\d{10}/);
      if (!match) {
        return res.redirect('/cuenta?error=no_steamid_found');
      }

      const steamId64 = match[0];
      logger.info(`🎮 [STEAM AUTH] Usuario ${decodedUser.username} (${decodedUser.userId}) vinculó exitosamente SteamID64: ${steamId64}`);

      let steamNickname = null;
      try {
        const profileRes = await fetch(`https://steamcommunity.com/profiles/${steamId64}/?xml=1`);
        if (profileRes.ok) {
          const xml = await profileRes.text();
          const nickMatch = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/);
          if (nickMatch && nickMatch[1]) {
            steamNickname = nickMatch[1];
          }
        }
      } catch {
        // Silencioso si falla la consulta de alias
      }

      const targetGuildId = decodedUser.servidor || DISCORD_GUILD_ID || null;
      let faceitLinked = false;
      let faceitConflict = false;
      let faceitNotFound = false;

      try {
        const faceitPlayer = await fetchFaceitPlayerBySteamId(steamId64);
        if (faceitPlayer && faceitPlayer.player_id) {
          const existingDiscordId = await db.getDiscordIdByFaceitId(faceitPlayer.player_id, targetGuildId);

          if (existingDiscordId && existingDiscordId !== decodedUser.userId) {
            logger.warn(`[STEAM AUTH] Cuenta FACEIT ${faceitPlayer.nickname} ya está vinculada a otro Discord (${existingDiscordId}). Solo se vincula Steam.`);
            faceitConflict = true;
            await db.setSteamId(decodedUser.userId, steamId64, steamNickname, targetGuildId);
          } else {
            const skillLevel = getPlayerSkillLevel(faceitPlayer);
            const elo = faceitPlayer.games?.cs2?.faceit_elo || faceitPlayer.games?.csgo?.faceit_elo || 0;
            const avatar = faceitPlayer.avatar || null;

            let currentSeason = null;
            try {
              if (targetGuildId) {
                const guildConfig = await getEffectiveConfigForGuild(targetGuildId);
                currentSeason = await fetchCurrentHubSeason(guildConfig.faceitLeaderboardId || guildConfig.faceitHubId).catch(() => null);
              }
            } catch {
              // Season opcional
            }

            await db.linkAccounts(
              decodedUser.userId,
              faceitPlayer.player_id,
              faceitPlayer.nickname,
              skillLevel,
              elo,
              targetGuildId,
              currentSeason,
              null,
              steamId64,
              steamNickname,
              avatar
            );

            // Sincronizar roles y apodo en Discord si el bot está disponible
            if (targetGuildId && client) {
              const guild = client.guilds.cache.get(targetGuildId) || await client.guilds.fetch(targetGuildId).catch(() => null);
              if (guild) {
                if (skillLevel) {
                  await syncMemberLevelRole(guild, decodedUser.userId, skillLevel).catch(() => {});
                }
                await syncMemberNickname(guild, decodedUser.userId, faceitPlayer.nickname).catch(() => {});
              }
            }

            await db.addLogEntry(
              'success',
              `Usuario ${decodedUser.username} (${decodedUser.userId}) vinculó Steam ${steamId64} y detectó FACEIT: ${faceitPlayer.nickname} (Nvl ${skillLevel || '-'}, ${elo} ELO)`,
              'web_panel',
              targetGuildId
            );

            faceitLinked = true;
            logger.success(`🎮 [STEAM AUTH] Cuenta FACEIT jalada automáticamente para ${decodedUser.username}: ${faceitPlayer.nickname} (Steam: ${steamId64})`);
          }
        } else {
          faceitNotFound = true;
          await db.setSteamId(decodedUser.userId, steamId64, steamNickname, targetGuildId);
          logger.info(`🎮 [STEAM AUTH] SteamID ${steamId64} guardado para ${decodedUser.username}, pero no tiene FACEIT vinculado.`);
        }
      } catch (fErr) {
        logger.error('[STEAM AUTH] Error al consultar FACEIT con SteamID:', fErr);
        await db.setSteamId(decodedUser.userId, steamId64, steamNickname, targetGuildId);
      }

      if (faceitLinked) {
        return res.redirect('/cuenta?steam_connected=true&faceit_linked=true');
      }
      if (faceitConflict) {
        return res.redirect('/cuenta?steam_connected=true&faceit_conflict=true');
      }
      if (faceitNotFound) {
        return res.redirect('/cuenta?steam_connected=true&faceit_not_found=true');
      }
      return res.redirect('/cuenta?steam_connected=true');
    } catch (err) {
      logger.error('Error en callback de autenticación Steam:', err);
      return res.redirect('/cuenta?error=steam_error');
    }
  });

  router.post(['/demo-login', '/login'], (req, res) => {
    const { username, password } = req.body || {};
    const u = (username || '').trim().toLowerCase();
    const validUser = u === 'demo@machupeek.com' ||
                      u === 'auditor@machupeek.com' ||
                      u === 'auditor@culqi.com' || 
                      u === 'auditor' ||
                      u === 'demo';
    const validPass = (password || '').trim() === 'DemoMixton2026';

    if (!validUser || !validPass) {
      return res.status(401).json({
        error: 'Credenciales inválidas. Usuario de prueba: demo@machupeek.com | Contraseña: DemoMixton2026'
      });
    }

    const demoUser = {
      userId: 'demo_user',
      username: 'Auditor (Demo)',
      avatar: null,
      isAdmin: true,
      role: 'admin',
      servidor: null
    };

    const token = jwt.sign(demoUser, ADMIN_JWT_SECRET, { expiresIn: '8h' });

    const cookieConfig = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || BASE_URL.startsWith('https'),
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    };

    res.cookie('auth_token', token, cookieConfig);
    res.cookie('admin_token', token, cookieConfig);

    logger.success('🔑 [AUTH] Sesión administrativa iniciada con éxito.');
    return res.json({
      success: true,
      message: 'Autenticación exitosa',
      user: demoUser
    });
  });

  router.get('/logout', (req, res) => {
    res.clearCookie('auth_token', { path: '/' });
    res.clearCookie('admin_token', { path: '/' });
    res.redirect('/');
  });

  return router;
}

