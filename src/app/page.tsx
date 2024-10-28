"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Component() {
  const [isOpen, setIsOpen] = useState(false);
  const [response, setResponse] = useState<
    { text: string; isBot: boolean; isTyping?: boolean; final?: boolean }[]
  >([{ text: "¡Hola! ¿En qué puedo ayudarte?", isBot: true }]);
  const [prompt, setPrompt] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  // Referencia para el auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Efecto para el autoscroll
  useEffect(() => {
    if (isAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [response, isAutoScroll]);

  // Función para manejar el scroll del usuario
  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;

      // Si el usuario está cerca del final, activamos el autoscroll
      if (scrollHeight - scrollTop - clientHeight < 30) {
        setIsAutoScroll(true);
      } else {
        setIsAutoScroll(false);
      }
    }
  };

  const handleSubmit = async (
    e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e) {
      e.preventDefault();
    }
    if (!prompt.trim()) return;

    setIsLoading(true);

    // Añadir el mensaje del usuario al chat
    setResponse((prev) => [...prev, { text: prompt, isBot: false }]);
    const userPrompt = prompt;
    setPrompt(""); // Limpiar el input

    // Añadir la animación de "escribiendo..." del asistente
    setResponse((prev) => [
      ...prev,
      { text: "Escribiendo...", isBot: true, isTyping: true },
    ]);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let botMessage = "";

      // Manejar el streaming de la respuesta del asistente
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          let chunkValue = decoder.decode(value);

          // Limpiar caracteres especiales no deseados
          chunkValue = chunkValue.replace(/【\d+:\d+†source】/g, "");

          botMessage += chunkValue;

          // Actualizar el último mensaje del bot en tiempo real
          setResponse((prev) => {
            const updated = [...prev];
            const lastIndex = updated.findIndex(
              (msg) => msg.isBot && msg.isTyping
            );
            if (lastIndex !== -1) {
              updated[lastIndex] = {
                text: botMessage,
                isBot: true,
                isTyping: true,
              };
            }
            return updated;
          });
        }
      }

      // Marcar el mensaje como finalizado y quitar la etiqueta "escribiendo"
      setResponse((prev) => {
        const updated = [...prev];
        const lastIndex = updated.findIndex((msg) => msg.isBot && msg.isTyping);
        if (lastIndex !== -1) {
          updated[lastIndex] = {
            text: botMessage,
            isBot: true,
            final: true,
          };
        }
        return updated;
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setResponse((prev) => [
        ...prev,
        { text: "Error al recibir respuesta.", isBot: true },
      ]);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <h1
        className={`text-4xl font-bold mb-8 text-center transition-opacity duration-1000 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        Chatbot HITO{" "}
        <span className="relative inline-flex items-center justify-center ml-2">
          <svg className="absolute w-full h-full" viewBox="0 0 100 40">
            <defs>
              <linearGradient
                id="capsuleGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#333333" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect
              width="100"
              height="40"
              rx="20"
              ry="20"
              fill="url(#capsuleGradient)"
              filter="url(#glow)"
              className="animate-pulse"
            />
          </svg>
          <span className="relative z-10 px-4 py-1 text-sm">alpha</span>
        </span>
      </h1>

      {/* Icono flotante del chatbot */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-white text-[#363636] rounded-full p-4 shadow-lg hover:bg-gray-200 transition-colors border-2 border-[#363636]"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Ventana del chat */}
      <div
        className={`fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ease-in-out border-2 border-[#363636] ${
          isOpen
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="bg-[#363636] p-2 text-center font-bold text-white border-b-2 border-[#363636]">
          Chat HITO
        </div>
        <ScrollArea
          className="h-[300px] p-4"
          onScroll={handleScroll}
          ref={scrollAreaRef}
        >
          {/* Mensajes */}
          {response.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${message.isBot ? "text-left" : "text-right"}`}
            >
              {message.isBot ? (
                <div
                  className={`inline-block p-2 rounded-lg border border-[#363636] bg-gray-100 text-[#363636]`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      ul: (props) => (
                        <ul className="list-disc list-inside" {...props} />
                      ),
                      ol: (props) => (
                        <ol className="list-decimal list-inside" {...props} />
                      ),
                      li: (props) => (
                        <li className="my-1" {...props} />
                      ),
                      h3: (props) => (
                        <h3 className="font-bold mt-2" {...props} />
                      ),
                      strong: (props) => (
                        <strong className="font-bold" {...props} />
                      ),
                    }}
                  >
                    {message.isTyping ? `*${message.text}*` : message.text}
                  </ReactMarkdown>
                </div>
              ) : (
                <span
                  className={`inline-block p-2 rounded-lg border border-[#363636] bg-white text-[#363636]`}
                >
                  {message.text}
                </span>
              )}
            </div>
          ))}
          {/* Referencia para el auto-scroll */}
          <div ref={messagesEndRef} />
        </ScrollArea>
        <div className="p-2 bg-[#363636] flex border-t-2 border-[#363636]">
          <Input
            type="text"
            placeholder="Escribe un mensaje..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow mr-2 bg-white text-[#363636] border-[#363636]"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSubmit()}
            size="sm"
            className="bg-white text-[#363636] hover:bg-gray-200 border border-[#363636]"
            disabled={isLoading}
          >
            {isLoading ? "Cargando..." : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
