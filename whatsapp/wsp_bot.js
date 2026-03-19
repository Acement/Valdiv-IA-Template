import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API_URL = process.env.VITE_API_URL || "http://localhost:4005";

// Para obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function chatgpt_response(message_in) {
    try {
        const res = await fetch(`${API_URL}/chat_wsp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message_in}),
        });
        const data = await res.json();
        console.log(data)
        return data.reply; // Ajusta según tu API

    }
    catch (error){
        console.log("Error de chatgpt")
        console.error(error)
    }
};


async function transcribeAudio(media) {
  try {
    // 1) Limpiar base64 si viene con prefijo
    const b64 = media.data.includes(',') ? media.data.split(',')[1] : media.data;
    const buffer = Buffer.from(b64, 'base64');

    // 2) Deducir extensión
    let ext = '.ogg';
    if (media.mimetype?.includes('mpeg')) ext = '.mp3';
    else if (media.mimetype?.includes('mp4')) ext = '.m4a'; // mejor que .mp4 para audio/mp4
    else if (media.mimetype?.includes('webm')) ext = '.webm';

    // 3) FormData nativo (undici)
    const form = new FormData();
    const blob = new Blob([buffer], { type: media.mimetype || 'audio/ogg' });
    form.append('audio', blob, 'audio_${Date.now()}${ext}');

    // 4) NO pongas headers manualmente; undici los arma
    const response = await fetch(`${API_URL}/audio`, {
      method: 'POST',
      body: form
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('API ${response.status}: ${errorText}');
    }

    const result = await response.json();
    return result.text || 'No se pudo transcribir el audio';
  } catch (e) {
    console.error('❌ Error transcribir:', e);
    throw e;
  }
}

// Crear cliente con almacenamiento local
const client = new Client({
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-features=site-per-process',
      '--disable-extensions'
    ]
  },
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth'
  })
});

// Mostrar el QR para vincular el número de WhatsApp
client.on('qr', qr => {
    console.log('Escanea este QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Confirmar conexión
client.on('ready', () => {
    console.log('✅ Bot de WhatsApp está listo!');
});

// Escuchar mensajes entrantes
client.on('message',async message => {

    let response_gpt = message.body;
    let send_msg = "";
    if(message.hasMedia && message.type === 'ptt'){
        console.log(`🔊 Mensaje de audio de ${message.from}`);
        try {
            const media = await message.downloadMedia();
            if (media){
                const transcription = await transcribeAudio(media);
                console.log(`📝 Transcripción: ${transcription}`);
                send_msg = transcription;
            }
            else {
                message.reply("No se pudo descargar mensaje");
            }
        }
        catch(err){
            console.error(err);
        }
    }
    else if (message.type !== 'chat'){
        message.reply("Lo siento, no puedo ver imagenes o stickers, pero puedes escribir la pregunta que tengas.")
        return;
    }
    else {
        console.log(`📩 Mensaje de texto de ${message.from}: ${message.body}`);
        send_msg = message.body;
    }

    //Enviar y recibir respuesta de chatgpt
    const chat = await message.getChat()
    await chat.sendStateTyping()
    const keepTyping = setInterval(() => {
    chat.sendStateTyping();
    }, 20000);
    response_gpt = await chatgpt_response(send_msg)
    chat.sendMessage(`${response_gpt}`)
    clearInterval(keepTyping);

    console.log("✅ Respuesta enviada")

});



process.on('SIGINT', () => {
    console.log('🔌 Cerrando bot de WhatsApp...');
    client.destroy(); // Cierra sesión y libera recursos
    process.exit();
});


// Iniciar cliente
client.initialize();