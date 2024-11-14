"use client";

export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import Vapi from "@vapi-ai/web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiMinimize2,
  FiMaximize2,
  FiPhoneIncoming,
  FiPhoneOff,
  FiUser,
} from "react-icons/fi";

export default function Component() {
  // Variables de estado

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [response, setResponse] = useState<
    { text: string; isBot: boolean; isTyping?: boolean; final?: boolean }[]
  >([{ text: "¡Hola! ¿En qué puedo ayudarte?", isBot: true }]);
  const [prompt, setPrompt] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isVoiceActive, setisVoiceActive] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  useEffect(() => {
    vapiRef.current = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY || "");

    return () => {
      // Limpieza al desmontar el componente
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }
    };
  }, []);

  // Referencias y efectos

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (isAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [response, isAutoScroll]);

  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
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
    setPrompt("");

    // Añadir el indicador de escritura
    setResponse((prev) => [...prev, { text: "", isBot: true, isTyping: true }]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.statusText}`);
      }

      if (!res.body) {
        throw new Error("Response body is null");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let botMessage = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          let chunkValue = decoder.decode(value);
          chunkValue = chunkValue.replace(/【\d+:\d+†source】/g, "");
          botMessage += chunkValue;

          // Actualizar el mensaje del bot en tiempo real
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

      // Finalizar el mensaje del bot
      setResponse((prev) => {
        const updated = [...prev];
        const lastIndex = updated.findIndex((msg) => msg.isBot && msg.isTyping);
        if (lastIndex !== -1) {
          updated[lastIndex] = {
            text: botMessage,
            isBot: true,
            final: true,
            isTyping: false,
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

  const toggleCall = () => {
    if (isVoiceActive) {
      // Si ya está activa, finaliza la llamada
      setisVoiceActive(false);
    } else {
      // Iniciar una nueva llamada
      setisVoiceActive(true);
    }
  };

  const StartCall = async () => {
    try {
      console.log("Iniciando llamada...");
      if (vapiRef.current) {
        await vapiRef.current.start("79158522-54ac-469a-ac1b-2fcfc6163d34");
      }
      console.log("Llamada iniciada.");
      setIsInCall(true);
    } catch (error) {
      console.error("Error al iniciar la llamada:", error);
    }
  };

  const StopCall = async () => {
    try {
      console.log("Intentando detener la llamada...");
      const result = vapiRef.current ? await vapiRef.current.stop() : null;
      console.log("Resultado de vapi.stop():", result);
      console.log("Llamada detenida correctamente.");
      setIsInCall(false);
    } catch (error) {
      console.error("Error al detener la llamada:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 overflow-hidden">
      <h1
        className={`text-4xl font-bold mb-8 text-center transition-opacity duration-1000 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        Chatbot HITO{" "}
        <span className="relative inline-flex items-center justify-center ml-2">
          <svg className="absolute w-full h-full" viewBox="0 -5 100 50">
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
              height="48"
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

      {/* Botón de Chat */}
      <div
        className={`fixed ${
          isChatOpen
            ? "inset-0 sm:inset-auto sm:right-4 sm:bottom-4"
            : "bottom-4 right-4"
        } z-50 transition-all duration-300 ease-in-out`}
      >
        {!isChatOpen && (
          <Button
            onClick={() => setIsChatOpen(true)}
            className="bg-[#2e2e32] hover:bg-[#3e3e42] text-white font-bold rounded-full p-3 shadow-lg w-12 h-12 md:w-14 md:h-14 flex items-center justify-center"
            aria-label="Abrir chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 md:h-6 md:w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </Button>
        )}

        {isChatOpen && (
          <div
            className={`bg-[#0f0f0f] flex flex-col rounded-3xl shadow-xl overflow-hidden
            w-full max-w-[100vw] h-full max-h-[100vh] sm:max-w-md sm:h-[80vh]
            ${isExpanded ? "sm:w-[32rem] sm:h-[90vh]" : ""}
            m-4`}
            role="dialog"
            aria-label="Ventana de chat"
          >
            <div className="flex justify-between items-center p-4 bg-[#1e1e21] border-b border-[#2e2e32]">
              <div className="flex items-center space-x-2">
                {/* Botón de llamada */}
                <Button
                  onClick={toggleCall}
                  className={`text-white font-bold rounded-full p-2 w-10 h-10 flex items-center justify-center relative overflow-hidden`}
                  style={{
                    backgroundColor: isVoiceActive ? "#000000" : undefined,
                    backgroundImage: isVoiceActive
                      ? undefined
                      : "linear-gradient(45deg, #4CAF50, #8BC34A)",
                    backgroundSize: isVoiceActive ? undefined : "200% 200%",
                    animation: isVoiceActive
                      ? "none"
                      : "gradient 5s ease infinite",
                  }}
                  aria-label={
                    isVoiceActive ? "Finalizar llamada" : "Iniciar llamada"
                  }
                >
                  {isVoiceActive ? (
                    // Icono de finalizar llamada
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  ) : (
                    // Icono de iniciar llamada
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  )}
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="bg-[#2e2e32] hover:bg-[#3e3e42] text-white rounded-full p-2 w-8 h-8 flex items-center justify-center md:flex hidden"
                  aria-label={isExpanded ? "Contraer chat" : "Expandir chat"}
                >
                  {isExpanded ? (
                    <FiMinimize2 className="h-5 w-5" />
                  ) : (
                    <FiMaximize2 className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  onClick={() => setIsChatOpen(false)}
                  className="bg-[#2e2e32] hover:bg-[#3e3e42] text-white rounded-full p-2 w-8 h-8 flex items-center justify-center"
                  aria-label="Cerrar chat"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </div>
            </div>

            <div className="flex-1 flex flex-col relative overflow-y-auto max-h-[calc(100vh-150px)]">
              {!isVoiceActive ? (
                <>
                  {/* Vista de chat */}
                  <ScrollArea
                    className="flex-1 p-4 overflow-y-auto"
                    onScroll={handleScroll}
                    ref={scrollAreaRef}
                  >
                    <div role="log" aria-label="Mensajes del chat">
                      {response.map((message, index) => (
                        <div key={index} className="mb-4">
                          {message.isTyping ? (
                            // Animación de escritura
                            <div className="flex items-end mb-4">
                              <Image
                                src="/images/logo_hito_blanco_sin_fondo.webp"
                                alt="Avatar del bot"
                                className="w-6 h-6 rounded-full mr-2"
                                width={24} // Ajusta el tamaño según lo que necesites
                                height={24} // Ajusta el tamaño según lo que necesites
                              />
                              <div className="bg-[#1e1e21] text-gray-300 px-4 py-2 rounded-2xl rounded-bl-md inline-block">
                                <div
                                  className="typing"
                                  role="status"
                                  aria-label="El bot está escribiendo"
                                >
                                  <span>.</span>
                                  <span>.</span>
                                  <span>.</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Mensaje normal
                            <div
                              className={`flex items-end ${
                                message.isBot ? "" : " flex-row-reverse"
                              }`}
                            >
                              <div
                                className={`flex flex-col space-y-2 text-sm max-w-[75%] mx-2${
                                  message.isBot
                                    ? " order-2 items-start"
                                    : " order-1 items-end"
                                }`}
                              >
                                <div>
                                  <span
                                    className={`px-4 py-3 rounded-2xl inline-block${
                                      message.isBot
                                        ? " rounded-bl-md bg-[#1e1e21] text-gray-300"
                                        : " rounded-br-md bg-[#2e2e32] text-white"
                                    }`}
                                    role="message"
                                    aria-label={`${
                                      message.isBot
                                        ? "Mensaje del bot"
                                        : "Mensaje del usuario"
                                    }`}
                                  >
                                    {message.isBot ? (
                                      <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                          ul: (props) => (
                                            <ul
                                              className="list-disc list-inside"
                                              {...props}
                                            />
                                          ),
                                          ol: (props) => (
                                            <ol
                                              className="list-decimal list-inside"
                                              {...props}
                                            />
                                          ),
                                          li: (props) => (
                                            <li className="my-1" {...props} />
                                          ),
                                          h3: (props) => (
                                            <h3
                                              className="font-bold mt-2"
                                              {...props}
                                            />
                                          ),
                                          strong: (props) => (
                                            <strong
                                              className="font-bold"
                                              {...props}
                                            />
                                          ),
                                        }}
                                      >
                                        {message.text}
                                      </ReactMarkdown>
                                    ) : (
                                      message.text
                                    )}
                                  </span>
                                </div>
                              </div>
                              {message.isBot ? (
                                <Image
                                  src="/images/logo_hito_blanco_sin_fondo.webp"
                                  alt="Avatar del bot"
                                  width={24} // Ajusta el tamaño según lo que necesites
                                  height={24} // Ajusta el tamaño según lo que necesites
                                  className="w-6 h-6 rounded-full mr-2"
                                />
                              ) : (
                                <FiUser className="w-6 h-6 text-white" />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Referencia para el auto-scroll */}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="border-t border-[#2e2e32] p-4 bg-[#0f0f0f] sticky bottom-0">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit();
                      }}
                      className="relative flex"
                    >
                      <Input
                        type="text"
                        placeholder="Escribe un mensaje..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full focus:outline-none focus:placeholder-gray-400 text-gray-300 placeholder-gray-500 pl-5 pr-16 bg-[#1e1e21] border-2 border-[#2e2e32] focus:border-[#2e2e32] rounded-2xl py-2"
                        disabled={isLoading}
                        aria-label="Entrada de mensaje"
                      />
                      <Button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full h-8 w-8 transition duration-200  ease-in-out text-white bg-[#2e2e32] hover:bg-[#3e3e42] focus:outline-none absolute right-1 top-1/2 transform -translate-y-1/2"
                        disabled={isLoading}
                        aria-label="Enviar mensaje"
                      >
                        {isLoading ? (
                          <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"
                            ></path>
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-6 w-6 transform rotate-90"
                          >
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                        )}
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                // Vista de llamada
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0f0f]">
                  <div className="w-48 h-48 mb-8">
                    <Image
                      unoptimized
                      width={192} // Ajusta el tamaño según lo que necesites
                      height={192} // Ajusta el tamaño según lo que necesites
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logoai5-ocWAosmdTdIcRPgGaUerEL7vUuWab5.gif"
                      alt="Audio waveform"
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                  <div className="w-full max-w-md mt-4">
                    <div id="vapi-button-container">
                      {!isInCall ? (
                        <Button
                          onClick={StartCall}
                          id="vapi-start-button"
                          style={{
                            backgroundColor: "#4CAF50",
                            fontSize: "24px",
                            color: "#FFFFFF",
                            borderRadius: "50%",
                            padding: "10px",
                            margin: "10px",
                            width: "60px",
                            height: "60px",
                            alignItems: "center",
                            justifyContent: "center",
                            display: "flex",
                          }}
                          aria-label="Iniciar llamada"
                        >
                          <FiPhoneIncoming />
                        </Button>
                      ) : (
                        <Button
                          onClick={StopCall}
                          id="vapi-stop-button"
                          style={{
                            backgroundColor: "#e61010",
                            fontSize: "24px",
                            color: "#FFFFFF",
                            borderRadius: "50%",
                            padding: "10px",
                            margin: "10px",
                            width: "60px",
                            height: "60px",
                            alignItems: "center",
                            justifyContent: "center",
                            display: "flex",
                          }}
                          aria-label="Finalizar llamada"
                        >
                          <FiPhoneOff />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .chat-container {
            width: 100vw;
            height: 100vh;
            border-radius: 0;
            margin: 0;
          }
        }
        .typing span {
          font-size: 1.25rem;
          line-height: 0.5;
          animation-name: blink;
          animation-duration: 1.4s;
          animation-iteration-count: infinite;
          animation-fill-mode: both;
        }
        .typing span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}
