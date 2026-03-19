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

interface GeneralFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
}

const GeneralFeedbackModal: React.FC<GeneralFeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    onSubmit(comment);
    
    setTimeout(() => {
      setIsSubmitting(false);
      setComment("");
      onClose();
    }, 500);
  };

  return (
    <DialogRoot 
      open={isOpen} 
      onOpenChange={(e) => { if (!e.open) onClose(); }}
      placement="center"
    >
      {/* ✅ Usamos Portal para sacar el modal del flujo del Sidebar */}
      <Portal>
        <DialogBackdrop />
        <DialogContent
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={1500}
          w={{ base: "90%", md: "500px" }}
          bg="white"
          borderRadius="lg"
          boxShadow="2xl"
          p={0}
        >
          <DialogHeader borderBottom="1px solid" borderColor="gray.100" py={4}>
            <DialogTitle fontSize="lg" fontWeight="bold">
              📬 Buzón de Sugerencias
            </DialogTitle>
          </DialogHeader>
          
          <DialogBody py={6}>
            <VStack align="start" gap={3}>
              <Text fontSize="sm" color="gray.600">
                ¿Tienes alguna idea para mejorar la aplicación o encontraste un error general? Cuéntanos:
              </Text>
              
              <Textarea
                placeholder="Escribe tu sugerencia aquí..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                minH="120px"
                borderRadius="md"
                borderColor="green.400"
                resize="none"
              />
            </VStack>
          </DialogBody>

          <DialogFooter borderTop="1px solid" borderColor="gray.100" py={4}>
            <Button variant="ghost" mr={3} onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              colorPalette="green"
              onClick={handleSubmit} 
              loading={isSubmitting}
              disabled={!comment.trim()}
            >
              Enviar Sugerencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
};

export default GeneralFeedbackModal;