import {
  Box,
  VStack,
  Button,
  Text,
  HStack,
  Flex,
  IconButton,
  Tooltip, // En v3, esto es un Namespace, no un componente
} from "@chakra-ui/react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiHome,
  FiArrowLeft,
  FiSearch,
  FiSettings,
  FiMessageSquare,
  FiLogOut,
  FiHash,
  FiEdit3,
} from "react-icons/fi";
import { useState } from "react";

import GeneralFeedbackModal from "./GeneralFeedbackModal"; 

type ChatMsg = { role: "user" | "assistant"; content: string };
type ChatSession = {
  session_id: string;
  updated_at: string;
  messages: ChatMsg[];
  [key: string]: any;
};

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  isMobile,
}) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const bg = "white";
  const textColor = "gray.800";
  const hoverBg = "green.50";
  const selectedBg = "green.100";
  const borderColor = "gray.200";

  const isNewChatActive = currentSessionId === null;

  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;
  const userEmail = user?.email || "user@example.com";
  const userInitial = userEmail.charAt(0).toUpperCase();

  const token = localStorage.getItem("token"); 
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4005";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleSendGeneralFeedback = async (comment: string) => {
    try {
      const response = await fetch(`${API_URL}/api/users_admin/feedback/general`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // Header de Auth
        },
        body: JSON.stringify({ comment }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar sugerencia");
      }

    } catch (error: any) {
      console.error("Error enviando feedback:", error);
    }
  };

  return (
    <>
      <Box
        as="nav"
        position={isMobile ? "absolute" : "static"}
        w={isMobile ? "285px" : isOpen ? "285px" : "72px"}
        h="100vh"
        transform={
          isMobile ? (isOpen ? "translateX(0)" : "translateX(-100%)") : "none"
        }
        transition={isMobile ? "transform 0.3s ease" : "width 0.3s ease"}
        zIndex={isMobile ? 1000 : 1}
        boxShadow={isMobile && isOpen ? "xl" : "none"}
        bg={bg}
        color={textColor}
        overflow="hidden"
        p={3}
        borderRight="1px solid"
        borderColor={borderColor}
        display="flex"
        flexDirection="column"
      >
        <Flex direction="column" h="100%">
          {/* --- Header --- */}
          <Box
            display="flex"
            justifyContent={isOpen ? "space-between" : "center"}
            alignItems="center"
            mb={3}
          >
            {isOpen && (
              <Button
                as={Link}
                to="/"
                variant="ghost"
                p={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
                _hover={{ bg: hoverBg }}
              >
                <Box as={FiHome} w={6} h={6} color="green" />
              </Button>
            )}

            <Button
              onClick={toggleSidebar}
              variant="ghost"
              p={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              _hover={{ bg: hoverBg }}
            >
              <Box as={isOpen ? FiArrowLeft : FiMenu} w={6} h={6} color={textColor} />
            </Button>
          </Box>

          {/* --- Acciones --- */}
          <Button
            size="sm"
            variant="ghost"
            bg={isNewChatActive ? selectedBg : "transparent"}
            _hover={{ bg: hoverBg }}
            display="flex"
            alignItems="center"
            justifyContent={isOpen ? "flex-start" : "center"}
            onClick={onNewChat}
          >
            <Box as={FiMessageSquare} w={4} h={4} mr={isOpen ? 2 : 0} />
            {isOpen && "Nueva conversación"}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            _hover={{ bg: hoverBg }}
            display="flex"
            alignItems="center"
            justifyContent={isOpen ? "flex-start" : "center"}
          >
            <Box as={FiSearch} w={4} h={4} mr={isOpen ? 2 : 0} />
            {isOpen ? "Buscar conversación" : null}
          </Button>

          {isOpen && (
            <Text fontSize="xs" fontWeight="bold" color="gray.500" mt={4} mb={1} pl={2}>
              Historial
            </Text>
          )}

          {/* --- Lista de Sesiones --- */}
          <VStack flex="1" overflowY="auto" align="stretch" spacing={1}>
            {sessions.map((session) => {
              const title = session.messages[0]?.content || session.session_id;
              const isActive = session.session_id === currentSessionId;

              return (<>
              {isOpen && (
                <Button
                  key={session.session_id}
                  size="sm"
                  variant="ghost"
                  bg={isActive ? selectedBg : "transparent"}
                  _hover={{ bg: hoverBg }}
                  display="flex"
                  alignItems="center"
                  justifyContent={isOpen ? "flex-start" : "center"}
                  onClick={() => onSelectSession(session.session_id)}
                  pl={isOpen ? 4 : 0}
                >
                  {isOpen && (
                    <Text noOfLines={1} title={title} fontSize="sm" fontWeight="normal">
                      {title.substring(0, 20) + (title.length > 20 ? "..." : "")}
                    </Text>
                  )}
                </Button>
                )}
                </>
              );
            })}
          </VStack>

          {/* --- Footer --- */}
          <Box mt="auto" pt={3} borderTop="1px solid" borderColor={borderColor}>
            <Flex align="center" justify={isOpen ? "space-between" : "center"} gap={1}>
              
              <Button
                variant="ghost"
                flex="1"
                onClick={() => setShowUserMenu(!showUserMenu)}
                display="flex"
                alignItems="center"
                justifyContent={isOpen ? "flex-start" : "center"}
                _hover={{ bg: hoverBg }}
                px={isOpen ? 2 : 0}
                overflow="hidden"
              >
                <HStack spacing={isOpen ? 3 : 0} w="100%">
                  <Box
                    w="32px" h="32px" minW="32px" borderRadius="full"
                    bg="green.400" display="flex" alignItems="center"
                    justifyContent="center" color="white" fontWeight="bold" fontSize="sm"
                  >
                    {userInitial}
                  </Box>
                  {isOpen && (
                    <Box textAlign="left" overflow="hidden">
                      <Text fontSize="sm" noOfLines={1}>{userEmail}</Text>
                      {user?.colaborador && (
                        <Text fontSize="xs" color="green.500" fontWeight="bold">Colaborador</Text>
                      )}
                    </Box>
                  )}
                </HStack>
              </Button>

              {isOpen && (
                /* 👇👇👇 CORRECCIÓN TÁCTICA PARA CHAKRA V3 👇👇👇
                   Usamos la sintaxis de composición: Root -> Trigger -> Positioner -> Content
                */
                <Tooltip.Root openDelay={300} closeDelay={100}>
                  <Tooltip.Trigger asChild>
                    <IconButton
                      aria-label="Enviar sugerencia"
                      size="sm"
                      variant="ghost"
                      color="gray.500"
                      _hover={{ bg: "green.100", color: "green.600" }}
                      onClick={() => setIsFeedbackOpen(true)}
                    >
                      <FiEdit3 size={16} />
                    </IconButton>
                  </Tooltip.Trigger>
                  
                  {/* El Positioner es obligatorio en v3 para que el popup sepa dónde flotar */}
                  <Tooltip.Positioner>
                    <Tooltip.Content zIndex={2000} bg="gray.800" color="white" px={2} py={1} borderRadius="sm" fontSize="xs">
                       Enviar sugerencia
                       <Tooltip.Arrow /> {/* Opcional: la flechita */}
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              )}
            </Flex>

            {showUserMenu && (
              <VStack
                align="stretch" bg="white" mt={1} border="1px solid"
                borderColor="gray.200" borderRadius="md" shadow="md"
                spacing={0} overflow="hidden"
              >
                <Button
                  variant="ghost" justifyContent="flex-start" size="sm"
                  _hover={{ bg: hoverBg }}
                >
                   {/* Composición manual de icono para evitar fallos de props obsoletas */}
                   <HStack gap={2}>
                      <FiSettings />
                      <Text>Configuración</Text>
                   </HStack>
                </Button>
                <Button
                  variant="ghost" justifyContent="flex-start" size="sm"
                  _hover={{ bg: hoverBg }}
                  onClick={handleLogout}
                >
                   <HStack gap={2}>
                      <FiLogOut />
                      <Text>Cerrar sesión</Text>
                   </HStack>
                </Button>
              </VStack>
            )}
          </Box>
        </Flex>
      </Box>

      <GeneralFeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        onSubmit={handleSendGeneralFeedback}
      />
    </>
  );
};

export default Sidebar;