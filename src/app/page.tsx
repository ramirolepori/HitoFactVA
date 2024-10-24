"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X } from "lucide-react";

export default function Component() {
  const [isOpen, setIsOpen] = useState(false);
  const [response, setResponse] = useState([
    { text: "¡Hola! ¿En qué puedo ayudarte?", isBot: true }
  ]);
  const [prompt, setPrompt] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;
  
    setIsLoading(true);
  
    // Añadir el mensaje del usuario al chat
    setResponse(prev => [...prev, { text: prompt, isBot: false }]);
    const userPrompt = prompt;
    setPrompt(''); // Limpiar el input
  
    // Añadir la animación de "escribiendo..." del asistente
    setResponse(prev => [...prev, { text: "Escribiendo...", isBot: true, isTyping: true }]);
  
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userPrompt }),
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let botMessage = '';
  
      // Manejar el streaming de la respuesta del asistente
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
  
        if (value) {
          let chunkValue = decoder.decode(value);
  
          // Limpiar caracteres especiales no deseados
          chunkValue = chunkValue.replace(/【\d+:\d+†source】/g, '');
  
          botMessage += chunkValue;
  
          // Actualizar el último mensaje del bot en tiempo real
          setResponse(prev => {
            const updated = [...prev];
            const lastIndex = updated.findIndex(msg => msg.isBot && msg.isTyping);
            if (lastIndex !== -1) {
              updated[lastIndex] = { text: botMessage, isBot: true, isTyping: true };
            }
            return updated;
          });
        }
      }
  
      // Marcar el mensaje como finalizado y quitar la etiqueta "escribiendo"
      setResponse(prev => {
        const updated = [...prev];
        const lastIndex = updated.findIndex(msg => msg.isBot && msg.isTyping);
        if (lastIndex !== -1) {
          updated[lastIndex] = { text: botMessage, isBot: true, final: true };
        }
        return updated;
      });
  
      setIsLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setResponse(prev => [...prev, { text: "Error al recibir respuesta.", isBot: true }]);
      setIsLoading(false);
    }
  };
  

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <h1 
        className={`text-4xl font-bold mb-8 text-center transition-opacity duration-1000 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        Chatbot HITO{' '}
        <span className="relative inline-flex items-center justify-center ml-2">
          <svg className="absolute w-full h-full" viewBox="0 0 100 40">
            <defs>
              <linearGradient id="capsuleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#333333" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <rect width="100" height="40" rx="20" ry="20" fill="url(#capsuleGradient)" filter="url(#glow)" className="animate-pulse" />
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
      <div className={`fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ease-in-out border-2 border-[#363636] ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <div className="bg-[#363636] p-2 text-center font-bold text-white border-b-2 border-[#363636]">
          Chat HITO
        </div>
        <ScrollArea className="h-[300px] p-4">
          {response.map((message, index) => (
            <div key={index} className={`mb-4 ${message.isBot ? 'text-left' : 'text-right'}`}>
              <span className={`inline-block p-2 rounded-lg border border-[#363636] ${message.isBot ? 'bg-gray-100 text-[#363636]' : 'bg-white text-[#363636]'}`}>
                {message.isTyping ? <em>{message.text}</em> : message.text}
              </span>
            </div>
          ))}
        </ScrollArea>
        <div className="p-2 bg-[#363636] flex border-t-2 border-[#363636]">
          <Input
            type="text"
            placeholder="Escribe un mensaje..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown} // Añadir el manejador de evento onKeyDown
            className="flex-grow mr-2 bg-white text-[#363636] border-[#363636]"
            disabled={isLoading}
          />
          <Button onClick={handleSubmit} size="sm" className="bg-white text-[#363636] hover:bg-gray-200 border border-[#363636]" disabled={isLoading}>
            {isLoading ? "Cargando..." : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
