import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const API_KEY =
  process.env.FACEIT_API_KEY || "906899cb-3c0e-4af7-b403-c489f81fc51d";
const CLUB_ID = "e72c25e6-74e5-415b-97da-e541296ff1db"; // ID del Hub/Club
const ORGANIZER_ID = "47b1bdc9-b644-4208-82dc-adae15c92fbd"; // ID del organizador obtenido previamente

async function runDiagnosis() {
  console.log("=== PRUEBA DE ROLES Y CREDENCIALES DEL ORGANIZADOR ===");
  console.log(`API Key: ...${API_KEY.slice(-5)}`);
  console.log(`Club/Hub ID: ${CLUB_ID}`);
  console.log(`Organizer ID: ${ORGANIZER_ID}`);

  // 1. Probar a consultar los detalles del Organizador de forma oficial
  console.log(
    "\n--- 1. Consultando Organizador por ID (`/organizers/{id}`) ---",
  );
  try {
    const res = await fetch(
      `https://open.faceit.com/data/v4/organizers/${ORGANIZER_ID}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: "application/json",
        },
      },
    );
    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      console.log("¡Éxito! Datos del Organizador:", {
        name: data.name,
        type: data.type,
        faceit_url: data.faceit_url,
      });
    } else {
      console.log("Error al consultar organizador:", data);
    }
  } catch (err) {
    console.log("Error:", err.message);
  }

  // 2. Probar a consultar los detalles del Hub para confirmar accesibilidad general
  console.log("\n--- 2. Consultando Hub por ID (`/hubs/{id}`) ---");
  try {
    const res = await fetch(`https://open.faceit.com/data/v4/hubs/${CLUB_ID}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
      },
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      console.log("¡Éxito! Datos del Hub:", {
        name: data.name,
        game_id: data.game_id,
        organizer_id: data.organizer_id,
      });
    } else {
      console.log("Error al consultar Hub:", data);
    }
  } catch (err) {
    console.log("Error:", err.message);
  }

  // 3. Probar a listar los administradores de la organización o del hub si existiera tal endpoint en la API abierta
  // Nota: Verificamos si podemos obtener cualquier otro endpoint restrictivo del hub
  console.log(
    "\n--- 3. Consultando miembros/jugadores del Hub (`/hubs/{id}/members`) ---",
  );
  try {
    const res = await fetch(
      `https://open.faceit.com/data/v4/hubs/${CLUB_ID}/members?offset=0&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: "application/json",
        },
      },
    );
    console.log(`Status de Members: ${res.status} ${res.statusText}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      console.log(
        `¡Éxito! Se obtuvieron ${data.items ? data.items.length : 0} miembros.`,
      );
    } else {
      console.log("Error al consultar miembros:", data);
    }
  } catch (err) {
    console.log("Error:", err.message);
  }
}

runDiagnosis();
