// src/app/api/assistant/route.ts

import OpenAI from 'openai';
import { EventEmitter } from 'events';

const openai = new OpenAI();

export async function POST(req: Request) {
  const { prompt } = await req.json();
  console.log('Prompt recibido:', prompt);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Crear un thread para la conversación
        const thread = await openai.beta.threads.create();
        console.log('Thread creado:', thread.id);

        // Agregar el mensaje del usuario
        await openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: prompt,
        });

        // Iniciar el proceso de streaming de la respuesta
        const run = openai.beta.threads.runs.stream(thread.id, {
          assistant_id: 'asst_vxzxcwePDC3R7a47I9fIIbD7',
        });

        // Manejar eventos del stream
        run.on('textCreated', () => {
          const chunk = encoder.encode(''); //assistant > 
          controller.enqueue(chunk);
        });

        run.on('textDelta', (textDelta) => {
          const chunk = encoder.encode(textDelta.value);
          controller.enqueue(chunk);
        });

        run.on('error', (err) => {
          console.error('Error en el stream:', err);
          controller.error(err);
        });

        // Escuchar el evento 'end' para saber cuándo ha terminado el streaming
        (run as EventEmitter).on('end', () => {
          const chunk = encoder.encode('[FIN]');
          controller.enqueue(chunk);
          controller.close();
        });

      } catch (error) {
        console.error('Error en la API:', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
