// components/MessageList.tsx
import {
  VStack,
  Flex,
  Box,
  Text,
  Spinner,
  Image,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { MutableRefObject } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import loboMarino from "../assets/lobo-marino-cara.png";
import sealSound from "../assets/seal-sound.mp3";
import { FiRefreshCw, FiThumbsUp, FiThumbsDown } from "react-icons/fi";

export type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  _id?: string;
  feedback?: "like" | "dislike";
};

interface MessageListProps {
  messages: ChatMsg[];
  isLoading: boolean;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  onFeedback: (index: number, type: "like" | "dislike") => void;
  onRetry: (index: number) => void;
}

const MotionBox = motion.create(Box);
const MotionImage = motion.create(Image);

const audio = new Audio(sealSound);
const playSound = () => {
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

/* =========================
   MARKDOWN RENDERING LOGIC
   ========================= */

const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        ul: ({ children }) => (
          <VStack align="stretch" spacing={4} mt={2}>
            {children}
          </VStack>
        ),

        li: ({ children, node }) => {
          const isTopLevel = node?.position?.start?.column === 1;

          // Primer nivel → TARJETA
          if (isTopLevel) {
            return (
              <Box
                bg="white"
                borderRadius="16px"
                border="1px solid rgba(0,0,0,0.08)"
                boxShadow="0 4px 12px rgba(0,0,0,0.08)"
                px={4}
                py={3}
              >
                <VStack align="stretch" spacing={1}>
                  {children}
                </VStack>
              </Box>
            );
          }

          // Segundo nivel → contenido interno
          return (
            <Text fontSize="14px" color="gray.700" ml={2}>
              • {children}
            </Text>
          );
        },

        strong: ({ children }) => (
          <Text fontWeight="700" fontSize="15px">
            {children}
          </Text>
        ),

        p: ({ children }) => (
          <Text fontSize="15px" lineHeight="1.6">
            {children}
          </Text>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

/* =========================
   MAIN COMPONENT
   ========================= */

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  messagesEndRef,
  onFeedback,
  onRetry,
}) => {
  return (
    <VStack
      align="stretch"
      spacing={6}
      flex="1"
      px={{ base: 4, md: 6 }}
      py={{ base: 4, md: 8 }}
      overflowY="auto"
      pb="100px"
    >
      {messages.map((msg, idx) => (
        <Flex
          key={msg._id ?? idx}
          justify={msg.role === "user" ? "flex-end" : "flex-start"}
          align="flex-end"
          gap={3}
        >
          {msg.role === "assistant" && (
            <MotionBox
              w="40px"
              h="40px"
              borderRadius="full"
              overflow="hidden"
              bgGradient="radial(circle at center, #38A169, #2F855A)"
              whileHover={{ scale: 1.15 }}
              cursor="pointer"
              onClick={playSound}
            >
              <MotionImage
                src={loboMarino}
                alt="Asistente"
                w="100%"
                h="100%"
                objectFit="contain"
              />
            </MotionBox>
          )}

          {msg.role === "assistant" ? (
            <Flex direction="column" gap={2} maxW="75%">
              <MotionBox
                bg="gray.50"
                borderRadius="18px 18px 18px 4px"
                px={4}
                py={3}
                border="1px solid rgba(0,0,0,0.05)"
              >
                <MarkdownRenderer content={msg.content} />
              </MotionBox>

              <Flex gap={2} pl={2}>
                <ActionButton onClick={() => onRetry(idx)}>
                  <FiRefreshCw size={14} />
                </ActionButton>

                <ActionButton
                  active={msg.feedback === "like"}
                  color="green"
                  onClick={() => onFeedback(idx, "like")}
                >
                  <FiThumbsUp size={14} />
                </ActionButton>

                <ActionButton
                  active={msg.feedback === "dislike"}
                  color="red"
                  onClick={() => onFeedback(idx, "dislike")}
                >
                  <FiThumbsDown size={14} />
                </ActionButton>
              </Flex>
            </Flex>
          ) : (
            <MotionBox
              bg="green.400"
              color="white"
              borderRadius="18px 18px 4px 18px"
              px={4}
              py={3}
              maxW="75%"
            >
              <Text>{msg.content}</Text>
            </MotionBox>
          )}
        </Flex>
      ))}

      {isLoading && (
        <Flex align="center" gap={2}>
          <Spinner size="sm" color="green.400" />
          <Text fontSize="14px" color="gray.500">
            Pensando...
          </Text>
        </Flex>
      )}

      <div ref={messagesEndRef} />
    </VStack>
  );
};

/* =========================
   REUSABLE BUTTON
   ========================= */

const ActionButton = ({
  children,
  onClick,
  active,
  color,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  color?: "green" | "red";
}) => (
  <MotionBox
    w="28px"
    h="28px"
    borderRadius="full"
    display="flex"
    alignItems="center"
    justifyContent="center"
    bg={
      active
        ? color === "green"
          ? "green.100"
          : "red.100"
        : "gray.100"
    }
    cursor="pointer"
    whileHover={{ scale: 1.15 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
  >
    {children}
  </MotionBox>
);

export default MessageList;
