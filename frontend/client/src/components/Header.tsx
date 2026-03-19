import { Box, Text } from "@chakra-ui/react";

const Header: React.FC = () => {
  return (
    <Box
      h="60px"
      borderBottom="1px solid"
      borderColor="gray.100"
      // 1. Padding responsivo: 0 en móvil, 6 en desktop
      px={{ base: 0, md: 6 }}
      display="flex"
      alignItems="center"
      // 2. Justificación responsiva: centrado en móvil, a la izquierda en desktop
      justifyContent={{ base: "center", md: "flex-start" }}
      bg="white"
      w="100%" // Asegura que ocupe todo el ancho disponible
    >
      <Text fontSize="xl" fontWeight="700" letterSpacing="-0.025em">
        Valdiv
        <Text
          as="span"
          color="green.400"
          fontWeight="extrabold"
          display="inline-block"
          _hover={{ transform: "scale(1.1)", transition: "0.2s ease" }}
        >
          IA
        </Text>
      </Text>
    </Box>
  );
};

export default Header;