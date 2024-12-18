// src/app/api/assistant/route.ts

import OpenAI from "openai";
import { EventEmitter } from "events";

const openai = new OpenAI();

export async function POST(req: Request) {
  const { prompt } = await req.json();
  console.log("Prompt recibido:", prompt);

  const encoder = new TextEncoder();

  // Variable para acumular la respuesta del asistente
  let assistantResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Crear un thread para la conversación
        const thread = await openai.beta.threads.create();
        console.log("Thread creado:", thread.id);

        // Agregar el mensaje del usuario
        await openai.beta.threads.messages.create(thread.id, {
          role: "user",
          content: prompt,
        });

        // Iniciar el proceso de streaming de la respuesta
        const run = openai.beta.threads.runs.stream(thread.id, {
          assistant_id: "asst_UJULGrXySHIgZE42X5bpjuMb",
        });

        // Manejar eventos del stream
        run.on("textCreated", () => {
          const chunk = encoder.encode(""); //assistant >
          controller.enqueue(chunk);
        });

        run.on("textDelta", (textDelta) => {
          // Acumular el texto de la respuesta del asistente
          assistantResponse += textDelta.value;

          const chunk = encoder.encode(textDelta.value);
          controller.enqueue(chunk);
        });

        run.on("error", (err) => {
          console.error("Error en el stream:", err);
          controller.error(err);
        });

        // Escuchar el evento 'end' para saber cuándo ha terminado el streaming
        (run as unknown as EventEmitter).on("end", () => {
          const chunk = encoder.encode(""); //assistant >
          controller.enqueue(chunk);
          console.log(assistantResponse);
          controller.close();
          console.log(assistantResponse);

          // Imprimir la respuesta completa del asistente en consola
          console.log("Respuesta del asistente:", assistantResponse);
        });
      } catch (error) {
        console.error("Error en la API:", error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
    },
  });
}
