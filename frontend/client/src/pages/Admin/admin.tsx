import { VStack, Text, Box, Field, Input, AbsoluteCenter, Button } from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4005"; // ajusta si tu backend usa otro puerto

const Admin = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/users_admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      // Guarda token admin
      localStorage.setItem("admin_token", data.token);

      // Navega al panel
      navigate("/admin_page");
    } catch (e) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AbsoluteCenter>
      <Box
        h="80vh"
        w="80vh"
        borderRadius="md"
        display="flex"
        alignItems="center"
        shadow="md"
        backgroundColor="gray.100"
      >
        <VStack padding={10} align="center" justify="center" w="full">
          <Text fontSize="10vh" fontWeight="700" letterSpacing="-0.025em">
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

          <Text fontSize="3vh" fontWeight="550">
            Administrador
          </Text>

          <Field.Root padding={5}>
            <Field.Label>Nombre de cuenta</Field.Label>
            <Input
              placeholder="admin"
              backgroundColor="gray.50"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </Field.Root>

          <Field.Root paddingBottom={5} paddingX={5}>
            <Field.Label>Contraseña</Field.Label>
            <Input
            type="password"
            placeholder="••••••••"
            bg="gray.50"
            color="gray.900"
            sx={{
                "::placeholder": { color: "gray.500", opacity: 1 },
            }}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </Field.Root>

          {error ? (
            <Text color="red.500" fontSize="sm">
              {error}
            </Text>
          ) : null}

          <Button
            onClick={handleLogin}
            isLoading={loading}
            loadingText="Ingresando..."
            backgroundColor="green.400"
            color="white"
            w="full"
          >
            Ingresar
          </Button>
        </VStack>
      </Box>
    </AbsoluteCenter>
  );
};

export default Admin;
