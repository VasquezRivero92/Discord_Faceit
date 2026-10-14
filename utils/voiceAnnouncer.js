import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus,
  entersState
} from '@discordjs/voice';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { queues } from '../commands/cs2_play.js';
import { logger } from './logger.js';
import fs from 'fs';
import path from 'path';

/**
 * Genera un anuncio de voz con IA, se conecta al canal de voz indicado,
 * reproduce el anuncio (cuenta regresiva) y se desconecta tras finalizar.
 * 
 * @param {Guild} guild - Instancia del servidor de Discord.
 * @param {string} channelId - ID del canal de voz al que conectarse.
 * @param {string} text - Mensaje a ser leído por la IA en español.
 */
export async function playTTSCountdown(guild, channelId, text) {
  let tempDir = null;
  let audioFilePath = null;
  let connection = null;
  let player = null;

  try {
    logger.info(`Iniciando generación de TTS con IA para el guild ${guild.id}: "${text}"`);

    // 1. Purgar directorios TTS huérfanos de ejecuciones anteriores (mayores a 10 minutos)
    const scratchBase = path.join(process.cwd(), 'scratch');
    try {
      if (fs.existsSync(scratchBase)) {
        const TEN_MINUTES = 10 * 60 * 1000;
        const now = Date.now();
        for (const entry of fs.readdirSync(scratchBase)) {
          if (!entry.startsWith('tts_')) continue;
          const entryPath = path.join(scratchBase, entry);
          try {
            const stat = fs.statSync(entryPath);
            if (now - stat.mtimeMs > TEN_MINUTES) {
              fs.rmSync(entryPath, { recursive: true, force: true });
              logger.info(`[TTS] Directorio huérfano eliminado: ${entryPath}`);
            }
          } catch (statErr) {
            logger.warn(`[TTS] No se pudo inspeccionar entrada huérfana ${entryPath}:`, statErr);
          }
        }
      }
    } catch (purgeErr) {
      logger.warn('[TTS] Error durante la purga de directorios huérfanos:', purgeErr);
    }

    // 2. Crear directorio temporal para el audio
    tempDir = path.join(scratchBase, `tts_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
    try {
      fs.mkdirSync(tempDir, { recursive: true });
    } catch (mkdirErr) {
      if (mkdirErr.code === 'ENOSPC') {
        logger.error('[TTS] Sin espacio en disco al crear directorio temporal. Abortando TTS.');
        return;
      }
      throw mkdirErr;
    }

    // 3. Generar el archivo de audio usando MsEdgeTTS
    const tts = new MsEdgeTTS();
    await tts.setMetadata('es-MX-JorgeNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const generationResult = await tts.toFile(tempDir, text);
    audioFilePath = generationResult.audioFilePath;

    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`El archivo de audio no fue creado en: ${audioFilePath}`);
    }

    // 4. Detener y limpiar la reproducción de música activa si existe en este servidor
    const activeQueue = queues.get(guild.id);
    if (activeQueue) {
      logger.info(`Deteniendo cola de música activa en guild ${guild.id} para evitar conflictos de voz.`);
      activeQueue.stopping = true;
      if (activeQueue.connection && activeQueue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        activeQueue.connection.destroy();
      }
      // Pequeña espera para asegurar que la conexión anterior se libere correctamente
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // 5. Conectarse al canal de voz de destino
    logger.info(`Conectando al canal de voz ${channelId} en el guild ${guild.id}`);
    connection = joinVoiceChannel({
      channelId: channelId,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    // Esperar a que la conexión esté lista
    await entersState(connection, VoiceConnectionStatus.Ready, 10000);

    // 6. Crear el reproductor de audio y reproducir el archivo
    player = createAudioPlayer();
    connection.subscribe(player);

    const resource = createAudioResource(audioFilePath);
    player.play(resource);
    logger.info('Reproducción del anuncio de voz de IA iniciada.');

    // 7. Esperar a que el audio termine o alcance un timeout (máx 15 segundos)
    await new Promise((resolve) => {
      let resolved = false;
      const cleanResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      player.once(AudioPlayerStatus.Idle, () => {
        logger.info('El reproductor de voz de IA ha terminado de reproducir.');
        cleanResolve();
      });

      player.once('error', (err) => {
        logger.error('Error durante la reproducción del audio:', err);
        cleanResolve();
      });

      // Timeout de seguridad en caso de que ocurra algún bloqueo
      setTimeout(() => {
        logger.warn('Tiempo de reproducción del anuncio de voz excedido (timeout).');
        cleanResolve();
      }, 15000);
    });

  } catch (error) {
    logger.error('Error al reproducir el anuncio de voz de IA:', error);
  } finally {
    // 8. Limpieza absoluta de conexión y reproductor
    try {
      if (player) {
        player.stop();
      }
      if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
        connection.destroy();
        logger.info('Conexión de voz del anuncio destruida y bot desconectado.');
      }
    } catch (cleanupErr) {
      logger.warn('Error al limpiar la conexión de voz:', cleanupErr);
    }

    // Eliminar el directorio temporal completo (incluye audio y cualquier archivo extra de msedge-tts)
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        logger.info('Directorio temporal de audio TTS eliminado correctamente.');
      }
    } catch (fileErr) {
      logger.warn('Error al eliminar directorio temporal de voz:', fileErr);
    }
  }
}
