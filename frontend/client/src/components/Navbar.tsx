import {
  Box,
  Flex,
  HStack,
  Link,
  Button,
  Text,
  Heading,
} from "@chakra-ui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import React from "react";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href, children, active }) => (
  <Link
    as={RouterLink}
    to={href}
    px={{ base: 1.5, md: 3 }}
    py={{ base: 1, md: 2 }}
    fontSize={{ base: "sm", md: "md" }}
    fontWeight={active ? "semibold" : "medium"}
    borderBottom="2px solid"
    borderColor={active ? "green.400" : "transparent"}
    color={active ? "green.600" : "gray.700"}
    _hover={{
      textDecoration: "none",
      color: "green.600",
      borderColor: "green.400",
    }}
  >
    {children}
  </Link>
);

export default function Navbar() {
  const location = useLocation();

  return (
    <Box bg="white" shadow="sm" position="sticky" top={0} zIndex={50}>
      <Flex
        h={{ base: 12, md: 16 }}          // ↓ navbar más bajo en móvil
        px={{ base: 3, md: 4 }}
        alignItems="center"
        justifyContent="space-between"
        maxW="6xl"
        mx="auto"
      >
        {/* Logo compacto */}
        <Heading
          size={{ base: "sm", md: "md" }}
          fontWeight="bold"
          letterSpacing="-0.03em"
          display="flex"
          alignItems="center"
          color="green.800"
        >
          Valdiv
          <Text
            as="span"
            color="green.400"
            fontWeight="extrabold"
            ml={0.5}
          >
            IA
          </Text>
        </Heading>

        {/* Navegación */}
        <HStack spacing={{ base: 3, md: 8 }}>
          <NavLink href="/" active={location.pathname === "/"}>
            Home
          </NavLink>
          <NavLink href="/us" active={location.pathname === "/us"}>
            Nosotros
          </NavLink>
        </HStack>

        {/* Acciones compactas */}
        <HStack spacing={{ base: 2, md: 3 }}>
          <Button
            as={RouterLink}
            to="/login"
            variant="ghost"
            colorScheme="green"
            size={{ base: "xs", md: "sm" }}
          >
            Login
          </Button>
          <Button
            as={RouterLink}
            to="/register"
            colorScheme="green"
            size={{ base: "xs", md: "sm" }}
          >
            Registro
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}
