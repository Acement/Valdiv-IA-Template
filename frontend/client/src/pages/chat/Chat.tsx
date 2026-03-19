import React, { useState, useRef, useEffect } from "react";
import {
  Flex,
  VStack,
  Button,
  useBreakpointValue,
  Box,
  useDisclosure,
} from "@chakra-ui/react";
import { Toaster } from "../../components/ui/toaster";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import MessageList from "../../components/MessageList";
import MessageInput from "../../components/MessageInput";
import { FiMenu } from "react-icons/fi"; // Icono para el botón
import { useNavigate } from "react-router-dom";
import FeedbackModal from "../../components/FeedbackModal";

type ChatMsg = { 
  role: "user" | "assistant"; 
  content: string;
  fuentes?: string[];
  _id?: string;          // Nuevo campo opcional
  feedback?: "like" | "dislike"; // Nuevo campo opcional
  audioUrl?: string;
  durationSec?: number;
};

// Definimos un tipo simple para la sesión
type ChatSession = {
  session_id: string;
  updated_at: string;
  messages: ChatMsg[];
  [key: string]: any; // Para otras propiedades como user_id, etc.
};

const MAX_CONTEXT_MESSAGES = 10; // Número máximo de mensajes a enviar como contexto
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4005";
const MAX_CHARS = parseInt(import.meta.env.VITE_MAX_CHARS || "5000");
const WELCOME_MESSAGE: ChatMsg = {
  role: "assistant",
  content: "¡Hola! 👋 Soy tu asistente, ¿en qué puedo ayudarte hoy?",
};

const Chat: React.FC = () => {
  // Estado de los mensajes de la sesión ACTIVA
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME_MESSAGE]);
  // Estado de TODAS las sesiones del usuario
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  // ID de la sesión activa. 'null' significa "Nuevo Chat"
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isColaborador, setIsColaborador] = useState<boolean | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Estado del Sidebar (inicia abierto en desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Hook para detectar móvil
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Efecto para cerrar el sidebar por defecto en la carga inicial de móvil
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    if (initialLoad && isMobile) {
      setIsSidebarOpen(false);
      setInitialLoad(false);
    }
  }, [isMobile, initialLoad]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const token = localStorage.getItem("token");

  const navigate = useNavigate()
  
  // --- 🔹 Obtener email del usuario
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserEmail(user?.email || null);
        setIsColaborador(user?.colaborador ?? false);


      } catch (error) {
        console.error("Error parseando 'user' de localStorage:", error);
      }
    }
  }, []);

  // --- 🔹 Scroll automático
  useEffect(() => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          const parent = messagesEndRef.current?.parentElement;
          if (parent) parent.scrollTop = parent.scrollHeight;
        }, 50);
      }
    }, 100);
  }, [messages]);

  // --- 🔹 Cargar historial de SESIONES
  useEffect(() => {
    if (!userEmail) return;

    const fetchSessions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/chats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Error al cargar sesiones");

        const data = await res.json();

        const chatSessions: ChatSession[] = data.conversations || [];
        setSessions(chatSessions);

        setCurrentSessionId(null);
        setMessages([WELCOME_MESSAGE]);
      } catch (err) {
        console.error("Error al cargar chats:", err);
        setMessages([
          {
            role: "assistant",
            content: "⚠️ Error al cargar el historial de chats.",
          },
        ]);
      }
    };

    fetchSessions();
  }, [userEmail, token]); // Depende de userEmail y token

    // --- 🔹 Enviar mensaje

const handleSend = async (prompt?: string) => {
    if (isTranscribing) return;
    if (!userEmail) {
      alert("Error: no se ha identificado el usuario.");
      return;
    }

    const text = (prompt ?? input).trim();
    if (!text || isSending) return;

    // si viene desde teclado/textarea, limpiamos input
    if (prompt === undefined) setInput("");

    setIsSending(true);
    setIsLoading(true);

    const isNewSession = currentSessionId === null;
    const sessionIdToUse = currentSessionId || `${userEmail}-${Date.now()}`;

    // 1. UI OPTIMISTA: Agregamos mensaje de usuario (Aún sin ID)
    const userMessage: ChatMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // ---------------------------------------------------------
      // PASO 1: Guardar mensaje del usuario en DB y RECUPERAR ID
      // ---------------------------------------------------------
      const saveUserResp = await fetch(`${API_URL}/api/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionIdToUse,
          role: "user",
          content: text,
        }),
      });

      const savedUserData = await saveUserResp.json();
      
      // ✅ CRÍTICO: Actualizamos el mensaje del usuario en el estado con su nuevo _id
      if (savedUserData?.data?._id) {
          setMessages((prev) => {
              const newMsgs = [...prev];
              // Buscamos el último mensaje de usuario y le pegamos el ID
              const lastUserMsgIndex = newMsgs.map(m => m.role).lastIndexOf('user');
              if (lastUserMsgIndex !== -1) {
                  newMsgs[lastUserMsgIndex] = { 
                      ...newMsgs[lastUserMsgIndex], 
                      _id: savedUserData.data._id 
                  };
              }
              return newMsgs;
          });
      }

      // ---------------------------------------------------------
      // PASO 2: Obtener respuesta del LLM
      // ---------------------------------------------------------
      const contextMessages = [...messages, userMessage].slice(-MAX_CONTEXT_MESSAGES);
      console.log(contextMessages)
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          message: text, 
          history: contextMessages 
        }),
      });

      const payloadText = await res.text();
      const data = payloadText ? JSON.parse(payloadText) : null;

      if (!res.ok || data?.status === "error") {
        navigate('/login'); // O manejar error
      }
      
      const assistantContent = (!res.ok || data?.status === "error") 
          ? `⚠️ ${data?.error || "Error desconocido"}` 
          : (data?.reply || "(sin respuesta)");

      const assistantMessage: ChatMsg = { 
          role: "assistant", 
          content: assistantContent,
          fuentes: data?.sources  || [] 
          // Nota: Aquí aún no tenemos el ID de la BDD para el asistente
      };
      
      setMessages((prev) => [...prev, assistantMessage]);

      // ---------------------------------------------------------
      // PASO 3: Guardar respuesta del asistente en DB y RECUPERAR ID
      // ---------------------------------------------------------
      const saveAsstResp = await fetch(`${API_URL}/api/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionIdToUse,
          role: "assistant",
          content: assistantMessage.content,
        }),
      });

      const savedAsstData = await saveAsstResp.json();

      // ✅ CRÍTICO: Actualizamos el mensaje del asistente con su _id
      if (savedAsstData?.data?._id) {
          setMessages((prev) => {
              const newMsgs = [...prev];
              // El último mensaje es el del asistente que acabamos de agregar
              const lastIndex = newMsgs.length - 1;
              if (lastIndex >= 0 && newMsgs[lastIndex].role === 'assistant') {
                  newMsgs[lastIndex] = { 
                      ...newMsgs[lastIndex], 
                      _id: savedAsstData.data._id 
                  };
              }
              return newMsgs;
          });
      }

      // ---------------------------------------------------------
      // Actualizar sesiones (Sidebar)
      // ---------------------------------------------------------
      if (isNewSession) {
        // Al crear sesión nueva, aseguramos que los mensajes tengan sus IDs si es posible
        // (Aunque para el sidebar solo importa el session_id y el preview)
        const newSession: ChatSession = {
          session_id: sessionIdToUse,
          updated_at: new Date().toISOString(),
          messages: [
              { ...userMessage, _id: savedUserData?.data?._id }, 
              { ...assistantMessage, _id: savedAsstData?.data?._id }
          ],
          user_id: userEmail,
        };
        setSessions((prev) => [newSession, ...prev]);
        setCurrentSessionId(sessionIdToUse);
      } else {
        setSessions((prev) => {
          const updatedSession = prev.find((s) => s.session_id === sessionIdToUse);
          if (updatedSession) {
            updatedSession.messages.push(userMessage, assistantMessage);
            updatedSession.updated_at = new Date().toISOString();
          }
          // Reordenar para que la actual suba al inicio
          const otherSessions = prev.filter((s) => s.session_id !== sessionIdToUse);
          return updatedSession ? [updatedSession, ...otherSessions] : prev;
        });
      }

    } catch (e) {
      console.error(e);
      const errorMsg: ChatMsg = {
        role: "assistant",
        content: "⚠️ No se pudo conectar con el servidor.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
      setIsLoading(false);
    }
  };

  const handleVoiceResult = async (r: { text: string; audioUrl?: string; durationSec?: number }) => {
  if (!userEmail || !token) return;
  if (isSending) return;

  const sessionIdToUse = currentSessionId || `${userEmail}-${Date.now()}`;
  const isNewSession = currentSessionId === null;

  // 1) UI: mostramos el mensaje de usuario con audio
  const userMsg: ChatMsg = {
    role: "user",
    content: (r.text || "(audio)").trim(),
    audioUrl: r.audioUrl,
    durationSec: r.durationSec,
  };

  setMessages((prev) => [...prev, userMsg]);
  setIsSending(true);
  setIsLoading(true);

  try {
    // 2) Guardar mensaje usuario en DB (incluye audio si tu backend lo soporta)
    const saveUserResp = await fetch(`${API_URL}/api/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        session_id: sessionIdToUse,
        role: "user",
        content: userMsg.content,
        audioUrl: userMsg.audioUrl,
        durationSec: userMsg.durationSec,
      }),
    });

    const savedUserData = await saveUserResp.json();

    // 3) pegar _id al último user msg
    if (savedUserData?.data?._id) {
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastUserMsgIndex = newMsgs.map(m => m.role).lastIndexOf("user");
        if (lastUserMsgIndex !== -1) {
          newMsgs[lastUserMsgIndex] = { ...newMsgs[lastUserMsgIndex], _id: savedUserData.data._id };
        }
        return newMsgs;
      });
    }

    // 4) pedir respuesta al LLM con contexto
    // OJO: usa una versión segura del historial (evita el estado "messages" stale)
    const historyForContext = (prev: ChatMsg[]) => [...prev].slice(-MAX_CONTEXT_MESSAGES);

    // Leemos el estado más reciente con callback:
    let contextMessages: ChatMsg[] = [];
    setMessages((prev) => {
      contextMessages = historyForContext(prev);
      return prev;
    });

    const res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message: userMsg.content,
        history: contextMessages,
      }),
    });

    const payloadText = await res.text();
    const data = payloadText ? JSON.parse(payloadText) : null;

    if (!res.ok || data?.status === "error") {
      navigate("/login");
      return;
    }

    const assistantMessage: ChatMsg = {
      role: "assistant",
      content: data?.reply || "(sin respuesta)",
      fuentes: data?.sources || [],
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // 5) guardar asistente
    const saveAsstResp = await fetch(`${API_URL}/api/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        session_id: sessionIdToUse,
        role: "assistant",
        content: assistantMessage.content,
      }),
    });

    const savedAsstData = await saveAsstResp.json();

    if (savedAsstData?.data?._id) {
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastIndex = newMsgs.length - 1;
        if (lastIndex >= 0 && newMsgs[lastIndex].role === "assistant") {
          newMsgs[lastIndex] = { ...newMsgs[lastIndex], _id: savedAsstData.data._id };
        }
        return newMsgs;
      });
    }

    // 6) sesiones sidebar
    if (isNewSession) {
      const newSession: ChatSession = {
        session_id: sessionIdToUse,
        updated_at: new Date().toISOString(),
        messages: [
          { ...userMsg, _id: savedUserData?.data?._id },
          { ...assistantMessage, _id: savedAsstData?.data?._id },
        ],
        user_id: userEmail,
      };
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(sessionIdToUse);
    } else {
      setSessions((prev) => {
        const updatedSession = prev.find((s) => s.session_id === sessionIdToUse);
        if (updatedSession) {
          updatedSession.messages.push(userMsg, assistantMessage);
          updatedSession.updated_at = new Date().toISOString();
        }
        const others = prev.filter((s) => s.session_id !== sessionIdToUse);
        return updatedSession ? [updatedSession, ...others] : prev;
      });
    }
  } catch (e) {
    console.error(e);
    setMessages((p) => [...p, { role: "assistant", content: "⚠️ No se pudo conectar con el servidor." }]);
  } finally {
    setIsSending(false);
    setIsLoading(false);
  }
};





  // --- 🔹 Enviar con Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isTranscribing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending) handleSend();
    }
  };

  // --- 🔹 Handlers para el Sidebar
  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([WELCOME_MESSAGE]);
    // AÑADIDO: Cierra el sidebar en móvil
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.session_id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages || []);
      // AÑADIDO: Cierra el sidebar en móvil
      if (isMobile) {
        setIsSidebarOpen(false);
      }
    }
  };

  const { 
    open: isDislikeOpen,
    onOpen: onDislikeOpen, 
    onClose: onDislikeClose 
  } = useDisclosure();
  
  // Guardamos el índice o ID del mensaje que se está evaluando
  const [targetDislikeIndex, setTargetDislikeIndex] = useState<number | null>(null);

  // --- Lógica Principal de Feedback ---
  const handleFeedback = (index: number, type: "like" | "dislike") => {
    const msg = messages[index];
    if (!msg._id) return; // Validación de seguridad

    if (type === "like") {
      // SI ES LIKE: Enviamos directo (comportamiento rápido)
      updateFeedbackState(index, "like");
      sendFeedbackAPI(msg._id, "like");
    } else {
      // SI ES DISLIKE: Abrimos el modal y esperamos confirmación
      setTargetDislikeIndex(index);
      onDislikeOpen();
    }
  };

  // --- Función auxiliar para llamar a la API ---
  const sendFeedbackAPI = async (
    msgId: string, 
    rating: "like" | "dislike", 
    details?: { reason: string; comment: string }
  ) => {
    try {
      await fetch(`${API_URL}/api/messages/${msgId}/feedback`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          rating,
          ...details // Esparce reason y comment si existen
        }),
      });
    } catch (error) {
      console.error("Error enviando feedback:", error);
    }
  };

  // --- Función auxiliar para actualizar UI (Optimistic) ---
  const updateFeedbackState = (index: number, type: "like" | "dislike") => {
    setMessages((prev) => {
      const newMsgs = [...prev];
      newMsgs[index] = { ...newMsgs[index], feedback: type };
      return newMsgs;
    });
  };

  // --- Handler cuando el usuario confirma el Dislike en el Modal ---
  const handleSubmitDislike = (reason: string, comment: string) => {
    if (targetDislikeIndex === null) return;

    const msg = messages[targetDislikeIndex];
    
    // 1. Actualizamos UI visualmente a "Dislike"
    updateFeedbackState(targetDislikeIndex, "dislike");

    // 2. Enviamos a la API con los detalles
    if (msg._id) {
      sendFeedbackAPI(msg._id, "dislike", { reason, comment });
    }

    // 3. Cerramos modal y limpiamos selección
    onDislikeClose();
    setTargetDislikeIndex(null);
  };

  // --- 🔹 NUEVA FUNCIÓN: Reintentar Respuesta
// --- 🔹 Reintentar Respuesta (Retry logic)
  const handleRetry = async (index: number) => {
    // 1. Validaciones de seguridad
    if (isSending || !userEmail || !token) return;
    
    // Solo podemos reintentar mensajes del asistente
    const msgToRetry = messages[index];
    if (!msgToRetry || msgToRetry.role !== 'assistant') return;

    // El mensaje del usuario que provocó esta respuesta es el inmediatamente anterior
    const userMsgIndex = index - 1;
    if (userMsgIndex < 0) return; // No hay mensaje de usuario previo

    const originalUserMsg = messages[userMsgIndex];
    
    // 2. Preparar el estado UI (Optimistic Update)
    // "Rebobinamos" el historial: Mantenemos todo HASTA el mensaje del usuario incluido.
    // Borramos el mensaje del asistente que vamos a reintentar (y cualquier cosa posterior si la hubiera).
    const historyForContext = messages.slice(0, userMsgIndex + 1);
    
    // Actualizamos la UI inmediatamente para mostrar que estamos pensando de nuevo
    setMessages(historyForContext); 
    setIsLoading(true);
    setIsSending(true);

    const sessionIdToUse = currentSessionId || `${userEmail}-${Date.now()}`;

    try {
      // 3. Obtener respuesta del LLM (Reenvío)
      // Usamos el contenido del mensaje del usuario original
      const contextToSend = historyForContext.slice(-MAX_CONTEXT_MESSAGES);
      
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          message: originalUserMsg.content, // Reenviamos el texto original
          history: contextToSend 
        }),
      });

      const payloadText = await res.text();
      const data = payloadText ? JSON.parse(payloadText) : null;

      if (!res.ok || data?.status === "error") {
        throw new Error(data?.error || "Error en reintento");
      }

      const assistantContent = data?.reply || "(sin respuesta)";

      const newAssistantMessage: ChatMsg = { 
        role: "assistant", 
        content: assistantContent 
      };

      // Agregamos la nueva respuesta correcta a la UI
      setMessages((prev) => [...prev, newAssistantMessage]);

      // 4. Guardar SOLO la nueva respuesta correcta en la BDD
      // Nota: No guardamos de nuevo el mensaje del usuario porque ya se guardó en el primer intento.
      const saveAsstResp = await fetch(`${API_URL}/api/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionIdToUse,
          role: "assistant",
          content: assistantContent,
        }),
      });

      const savedAsstData = await saveAsstResp.json();

      // 5. Actualizar el ID del mensaje en el estado (para que funcione el feedback después)
      if (savedAsstData?.data?._id) {
        setMessages((prev) => {
          const newMsgs = [...prev];
          const lastIndex = newMsgs.length - 1;
          if (lastIndex >= 0 && newMsgs[lastIndex].role === 'assistant') {
            newMsgs[lastIndex] = { 
              ...newMsgs[lastIndex], 
              _id: savedAsstData.data._id 
            };
          }
          return newMsgs;
        });
      }

      // 6. Actualizar la sesión en el Sidebar
      setSessions((prev) => {
        const updatedSession = prev.find((s) => s.session_id === sessionIdToUse);
        if (updatedSession) {
          // Reemplazamos el último mensaje (el fallido) por el nuevo
          // O más seguro: reconstruimos los mensajes de la sesión
          const updatedMessages = [...historyForContext, newAssistantMessage];
          updatedSession.messages = updatedMessages;
          updatedSession.updated_at = new Date().toISOString();
        }
        return [...prev]; // Forzamos re-render
      });

    } catch (e) {
      console.error("Error en retry:", e);
      const errorMsg: ChatMsg = {
        role: "assistant",
        content: "⚠️ Error al reintentar. Por favor verifica tu conexión.",
      };
      // Si falla el reintento, mostramos el error visualmente, 
      // pero NO lo enviamos a la API de guardado (/api/chats), 
      // cumpliendo tu requisito de no ensuciar la BDD con errores.
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
      setIsLoading(false);
    }
  };

return (
    <Flex direction="row" h="100vh" position="relative" bg="white">
      {isMobile && !isSidebarOpen && (
        <Button onClick={() => setIsSidebarOpen(true)} position="absolute" top={4} left={4} zIndex={1050} variant="outline" bg="white" boxShadow="md" borderRadius="full" p={0} w="44px" h="44px">
          <FiMenu size={22} />
        </Button>
      )}

      {isMobile && isSidebarOpen && (
        <Box position="absolute" top={0} left={0} right={0} bottom={0} bg="blackAlpha.500" zIndex={900} onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        isMobile={isMobile}
      />

      <Flex direction="column" flex="1" bg="white" w="100%" h="100%">
        <Toaster />
        <Header />

        {/* 2. Contenedor del Chat */}
        <VStack
          w={{ base: "100%", md: "70%" }}
          mx="auto"
          h="100%"
          flex="1"
          align="stretch"
          spacing={0}
          overflow="hidden"
        >
          <MessageList
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
            onFeedback={handleFeedback}
            onRetry={handleRetry}
          />

          {/* ❌ ELIMINADO DE AQUÍ: El modal estorbaba el flujo flex */}

          <MessageInput
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            handleKeyDown={handleKeyDown}
            isSending={isSending}
            maxChars={MAX_CHARS}
            onVoiceResult={handleVoiceResult}
            isTranscribing={isTranscribing}
            onTranscribeStart={() => setIsTranscribing(true)}
            onTranscribeEnd={() => setIsTranscribing(false)}
          />
        </VStack>
      </Flex>

      <FeedbackModal
        isOpen={isDislikeOpen}
        onClose={() => {
          onDislikeClose();
          setTargetDislikeIndex(null);
        }}
        onSubmit={handleSubmitDislike}
      />
      
    </Flex>
  );
};

export default Chat;