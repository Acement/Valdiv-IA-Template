import { Box, Button, Text, Textarea, Flex, Spinner } from "@chakra-ui/react";
import { ArrowUp } from "lucide-react";
import { useRef, useEffect } from "react";
import RecorderButton from "./recorder";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4005";


interface MessageInputProps {
  input: string;
  setInput: (val: string) => void;
  handleSend: (prompt?: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isSending: boolean;
  maxChars: number;

  isTranscribing?: boolean;
  onTranscribeStart?: () => void;
  onTranscribeEnd?: () => void;

  onVoiceResult?: (r: { text: string; audioUrl?: string; durationSec?: number }) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  input,
  setInput,
  handleSend,
  handleKeyDown,
  isSending,
  maxChars,
  onVoiceResult,
  isTranscribing = false,
  onTranscribeStart,
  onTranscribeEnd,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (input === "" && textareaRef.current) {
      textareaRef.current.style.height = "60px";
      textareaRef.current.style.borderRadius = "24px";
    }
  }, [input]);

  return (
    <Box
      position="sticky"
      bottom="0"
      bg="white"
      px={4}
      py={3}
      borderTop="1px solid"
      borderColor="gray.200"
      boxShadow="0 -4px 20px rgba(0,0,0,0.04)"
      backdropFilter="blur(12px)"
      zIndex={10}
    >
      {/* ✅ Banner ARRIBA del input */}
      {isTranscribing && (
        <Flex
          mb={2}
          px={3}
          py={2}
          borderRadius="md"
          bg="yellow.50"
          border="1px solid"
          borderColor="yellow.200"
          align="center"
          gap={2}
          fontSize="sm"
        >
          <Spinner size="sm" />
          <Text>Transcribiendo audio…</Text>
        </Flex>
      )}

      <Flex align="flex-end" gap={2}>
        <Box position="relative" flex="1">
          <Textarea
            ref={textareaRef}
            placeholder="Escribe tu mensaje..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const target = e.target as HTMLTextAreaElement;

              if (target.value.length < input.length) target.style.height = "60px";

              const newHeight =
                target.value === "" ? 60 : Math.min(Math.max(target.scrollHeight, 60), 200);
              target.style.height = newHeight + "px";

              const heightRatio = (newHeight - 60) / (200 - 60);
              const currentRadius = 24 - heightRatio * 10;
              target.style.borderRadius = currentRadius + "px";
            }}
            onKeyDown={handleKeyDown}
            resize="none"
            maxLength={maxChars}
            height="60px"
            borderRadius="24px"
            px={4}
            py={4}
            pr="108px"
            border="1px solid"
            borderColor="gray.300"
            _focus={{
              borderColor: "green.400",
              boxShadow: "0 0 0 2px rgba(72,187,120,0.25)",
            }}
            _hover={{ borderColor: "gray.400" }}
            disabled={isSending || isTranscribing}
            aria-busy={isSending || isTranscribing}
            fontSize="sm"
            transition="height 0.2s ease, border-radius 0.2s ease, box-shadow 0.2s ease"
            overflowY={input.split("\n").length * 24 > 140 ? "auto" : "hidden"}
            style={{ minHeight: "60px", maxHeight: "200px" }}
            bg="gray.50"
          />

          <Flex position="absolute" right="8px" bottom="14px" align="center" gap={2} zIndex={1}>
            <RecorderButton
              uploadUrl={`${API_URL}/api/audio`}
              disabled={isSending || isTranscribing}
              onTranscribeStart={onTranscribeStart}
              onTranscribeEnd={onTranscribeEnd}
              onResult={(r) => {
                if (onVoiceResult) onVoiceResult(r);
                else setInput(r.text || "");
              }}
            />

            <Button
              onClick={() => handleSend()}
              isDisabled={isSending || isTranscribing || !input.trim() || input.length > maxChars}
              borderRadius="full"
              size="md"
              bg="green.400"
              color="white"
              minW="44px"
              h="44px"
              boxShadow="0 3px 8px rgba(72,187,120,0.25)"
              _hover={{ bg: "green.500", transform: "scale(1.05)" }}
              _active={{ bg: "green.600", transform: "scale(0.97)" }}
              _disabled={{
                bg: "gray.100",
                color: "gray.400",
                cursor: "not-allowed",
                transform: "none",
              }}
              transition="all 0.15s ease"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </Button>
          </Flex>
        </Box>
      </Flex>

      <Flex justify="flex-end" mt={1}>
        <Text
          fontSize="xs"
          color={input.length > maxChars ? "red.500" : "gray.500"}
          fontWeight="medium"
        >
          {input.length} / {maxChars}
        </Text>
      </Flex>
    </Box>
  );
};

export default MessageInput;
