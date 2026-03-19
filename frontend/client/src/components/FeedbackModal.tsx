import React, { useState } from "react";
import {
  DialogRoot,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Portal,
  Button,
  VStack,
  Text,
  Textarea,
} from "@chakra-ui/react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, comment: string) => void;
}

const REASONS = [
  { value: "not_helpful", label: "No es lo que pedí" },
  { value: "hallucination", label: "Información falsa" },
  { value: "slow", label: "Demoró mucho" },
  { value: "other", label: "Otro motivo" },
];

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState("not_helpful");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    onSubmit(reason, comment);
    setTimeout(() => {
        setIsSubmitting(false);
        setComment("");
        setReason("not_helpful");
    }, 200);
  };

  return (
    <DialogRoot 
      open={isOpen} 
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
    >
      {/* Usamos <Portal> para sacar el contenido al body del documento */}
      <Portal>
        <DialogBackdrop />
        <DialogContent
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={1400} 
        >
          <DialogHeader>
            <DialogTitle>¿Qué salió mal? 👎</DialogTitle>
          </DialogHeader>
          
          <DialogBody>
            <VStack align="start" gap={4}>
              <Text fontSize="sm" color="gray.500">
                Ayúdanos a mejorar seleccionando un problema:
              </Text>
              
              <VStack align="start" gap={2} w="full">
                {REASONS.map((r) => (
                  <label key={r.value} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input 
                      type="radio" 
                      name="feedback_reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      style={{ accentColor: "red" }} 
                    />
                    <Text fontSize="sm">{r.label}</Text>
                  </label>
                ))}
              </VStack>

              <Textarea
                placeholder="Cuéntanos más (opcional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                size="sm"
                borderRadius="md"
                resize="none"
              />
            </VStack>
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" mr={3} onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              colorPalette="red" 
              onClick={handleSubmit} 
              loading={isSubmitting} 
            >
              Enviar Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
};

export default FeedbackModal;