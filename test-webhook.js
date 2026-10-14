import dotenv from 'dotenv';
import { db } from './database.js';

dotenv.config();

// Determinar puerto y URL dinámicamente
const PORT = process.env.PORT || 15633;
const URL = process.env.BASE_URL 
  ? `${process.env.BASE_URL}/webhook/faceit` 
  : `http://localhost:${PORT}/webhook/faceit`;

const MOCK_MATCH_ID = "1-mock-match-id-12345";

// Mock de configuring (Lobby Creado)
const getMockMatchConfiguring = (clubId, queueId = null, matchId = MOCK_MATCH_ID) => ({
  event: "match_status_configuring",
  entity: {
    id: queueId || clubId,
    type: "hub"
  },
  payload: {
    id: matchId,
    competition_id: clubId,
    queue_id: queueId,
    entity_custom_name: queueId ? `Club Test (${queueId})` : "Club de Prueba Latam",
    game: "cs2",
    teams: {
      faction1: { name: "Team_Alegria", roster: [] },
      faction2: { name: "Team_Tristeza", roster: [] }
    }
  }
});

// Mock de starting (Partida Iniciada)
const getMockMatchStarting = (clubId, queueId = null, matchId = MOCK_MATCH_ID) => ({
  event: "match_status_starting",
  entity: {
    id: queueId || clubId,
    type: "hub"
  },
  payload: {
    id: matchId,
    competition_id: clubId,
    queue_id: queueId,
    entity_custom_name: queueId ? `Club Test (${queueId})` : "Club de Prueba Latam",
    game: "cs2",
    voting: {
      map: {
        pick: ["de_mirage"]
      },
      location: {
        pick: ["santiago"]
      }
    },
    teams: {
      faction1: {
        name: "Team_Alegria",
        roster: [
          { id: "faceit_id_1", nickname: "Eloiky" },
          { id: "faceit_id_2", nickname: "PlayerTwo" }
        ]
      },
      faction2: {
        name: "Team_Tristeza",
        roster: [
          { id: "faceit_id_3", nickname: "JohanArtts" },
          { id: "faceit_id_4", nickname: "PlayerFour" }
        ]
      }
    }
  }
});

// Mock de finished (Partida Finalizada)
const getMockMatchFinished = (clubId, queueId = null, matchId = MOCK_MATCH_ID) => ({
  event: "match_status_finished",
  entity: {
    id: queueId || clubId,
    type: "hub"
  },
  payload: {
    id: matchId,
    competition_id: clubId,
    queue_id: queueId,
    entity_custom_name: queueId ? `Club Test (${queueId})` : "Club de Prueba Latam",
    game: "cs2",
    voting: {
      map: {
        pick: ["de_mirage"]
      },
      location: {
        pick: ["santiago"]
      }
    },
    teams: {
      faction1: {
        name: "Team_Alegria",
        roster: [
          { id: "faceit_id_1", nickname: "Eloiky" },
          { id: "faceit_id_2", nickname: "PlayerTwo" }
        ]
      },
      faction2: {
        name: "Team_Tristeza",
        roster: [
          { id: "faceit_id_3", nickname: "JohanArtts" },
          { id: "faceit_id_4", nickname: "PlayerFour" }
        ]
      }
    },
    results: {
      winner: "faction1",
      score: {
        faction1: 13,
        faction2: 8
      }
    }
  }
});

async function sendMockWebhook(payload, type) {
  console.log(`🚀 Enviando evento mock: ${type}...`);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.FACEIT_WEBHOOK_SECRET) {
      headers['x-faceit-signature'] = process.env.FACEIT_WEBHOOK_SECRET;
      headers['x-webhook-signature'] = process.env.FACEIT_WEBHOOK_SECRET;
    }

    const response = await fetch(URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log(`   ✅ Evento ${type} procesado. Status: ${response.status}`);
    } else {
      console.error(`   ❌ Error. Status: ${response.status}`);
      const text = await response.text();
      console.error(`   Detalle: ${text}`);
    }
  } catch (error) {
    console.error('❌ Error de conexión al servidor Express:', error.message);
  }
}

async function runTestForServer(guildId, faceitHubId) {
  console.log(`\n======================================================`);
  console.log(`🏁 Iniciando pruebas para Server: ${guildId} (Hub ID: ${faceitHubId})`);
  console.log(`======================================================\n`);

  const mockConfiguring = getMockMatchConfiguring(faceitHubId);
  const mockStarting = getMockMatchStarting(faceitHubId);
  const mockFinished = getMockMatchFinished(faceitHubId);

  // Paso 1: Configurando
  await sendMockWebhook(mockConfiguring, '1. LOBBY CREADO (CONFIGURANDO)');
  
  console.log('\n--- Esperando 10 segundos (Capitanes eligiendo...) ---\n');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Paso 2: Iniciada (Edita el mensaje anterior)
  await sendMockWebhook(mockStarting, '2. PARTIDA INICIADA (STARTING)');
  
  console.log('\n--- Esperando 15 segundos (Jugando partida...) ---\n');
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Paso 3: Finalizada (Envía mensaje nuevo y limpia canales)
  await sendMockWebhook(mockFinished, '3. PARTIDA FINALIZADA (FINISHED)');
}

async function start() {
  console.log(`📡 URL del bot: ${URL}`);
  
  let servers = [];
  try {
    const snapshot = await db._firestore.collection('guild_settings').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.faceitHubId) {
        servers.push({
          guildId: doc.id,
          faceitHubId: data.faceitHubId
        });
      }
    });
  } catch (error) {
    console.warn('⚠️ No se pudieron obtener los servidores desde Firestore:', error.message);
  }

  // Si no se encuentra ningún servidor, usar fallback del .env
  if (servers.length === 0) {
    const fallbackHubId = process.env.FACEIT_HUB_ID || "e72c25e6-74e5-415b-97da-e541296ff1db";
    console.log(`⚠️ No hay servidores en la BD. Usando fallback de HUB ID: ${fallbackHubId}`);
    servers.push({
      guildId: 'FALLBACK_LOCAL',
      faceitHubId: fallbackHubId
    });
  }

  console.log(`📋 Servidores a probar:`, servers);

  for (const server of servers) {
    await runTestForServer(server.guildId, server.faceitHubId);
  }

  console.log('\n✨ Todas las pruebas han finalizado.');
  process.exit(0);
}

start();
