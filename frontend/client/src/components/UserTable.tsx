import { 
  Table, 
  Button, 
  Spinner, 
  Box, 
  HStack, 
  VStack, 
  Text,
  Input,
  InputGroup,
  InputElement,
  List,
  ListItem,
} from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";
import { FiCheck, FiX, FiSearch} from "react-icons/fi";
import { toaster } from "./ui/toaster"; 


type User = {
  id: number;
  name: string;
  email: string;
  colaborador: boolean;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4005";

const UserTable = () => {
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const getAdminHeaders = () => {
  const token = localStorage.getItem("admin_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users_admin`, {
          headers: getAdminHeaders(),
        });

        if (!res.ok) {
          throw new Error("Error al cargar usuarios");
        }

        const data = await res.json();
        setUserList(data.users);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const selectedUser = useMemo(
    () => userList.find(u => u.id === selectedUserId) || null,
    [userList, selectedUserId]
  );

  const normalized = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const suggestions = useMemo(() => {
    const q = normalized(search.trim());
    if (!q) return [];
    return userList
      .filter(u => normalized(u.name).includes(q))
      .slice(0, 8); // máximo 8 sugerencias
  }, [search, userList]);

  const filteredUsers = useMemo(() => {
    const q = normalized(search.trim());
    if (!q) return userList;
    return userList.filter(u => normalized(u.name).includes(q));
  }, [search, userList]);

  const handleSelectUser = (id: number) => {
    setSelectedUserId(id);
  };

  const setAsColaborador = (id: number) => {
    setUserList(prev =>
      prev.map(u => (u.id === id ? { ...u, colaborador: true } : u))
    );
    setPendingChanges(prev => ({ ...prev, [id]: true }));
  };

  const setAsUsuario = (id: number) => {
    setUserList(prev =>
      prev.map(u => (u.id === id ? { ...u, colaborador: false } : u))
    );
    setPendingChanges(prev => ({ ...prev, [id]: false }));
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleSaveChanges = async () => {
    if (!hasChanges) return;

    const changes = Object.entries(pendingChanges).map(([id, colaborador]) => ({
      id: Number(id),
      colaborador,
    }));

    try {
      setSaving(true);

      const res = await fetch(`${API_URL}/api/users_admin/colaborador-batch`, {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ changes }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Error al guardar cambios");

      setPendingChanges({});

      toaster.create({
        title: "Cambios guardados",
        description: "Se actualizó el rol de los usuarios.",
        type: "success",
        duration: 3000,
        closable: true,
      });
    } catch (err: any) {
      toaster.create({
        title: "Error",
        description: err?.message ?? "No se pudieron guardar los cambios.",
        type: "error",
        duration: 4000,
        closable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box h="80vh" w="80vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner />
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Box w="80vh" position="relative">
        <InputGroup
          startElement={<FiSearch />}
        >
          <Input
            placeholder="Buscar usuario por nombre..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsSuggestOpen(true);
            }}
            onFocus={() => setIsSuggestOpen(true)}
            onBlur={() => setTimeout(() => setIsSuggestOpen(false), 120)}
            ps="2.5rem" // deja espacio al icono
          />
        </InputGroup>

        {isSuggestOpen && suggestions.length > 0 && (
          <Box
            position="absolute"
            top="44px"
            left={0}
            right={0}
            borderWidth="1px"
            borderRadius="md"
            bg="white"
            shadow="md"
            zIndex={10}
            maxH="240px"
            overflowY="auto"
          >
            <List.Root>
              {suggestions.map((u) => (
                <List.Item
                  key={u.id}
                  px={3}
                  py={2}
                  _hover={{ bg: "gray.100" }}
                  cursor="pointer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearch(u.name);
                    handleSelectUser(u.id);
                    setIsSuggestOpen(false);
                  }}
                >
                  <Text fontWeight="semibold">{u.name}</Text>
                  <Text fontSize="xs" color="gray.500">{u.email}</Text>
                </List.Item>
              ))}
            </List.Root>
          </Box>
        )}
      </Box>
      <HStack align="flex-start" spacing={4}>
        {/* Tabla */}
        <Table.ScrollArea
          h="80vh"
          w="80vh"
          borderWidth="6px"
          shadow="md"
          borderRadius="md"
        >
          <Table.Root size="sm" w="full" showColumnBorder borderRadius="md">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader w="2fr">Usuario</Table.ColumnHeader>
                <Table.ColumnHeader w="2fr">Correo</Table.ColumnHeader>
                <Table.ColumnHeader w="1fr">Tipo de usuario</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {filteredUsers.map(user => {
                const isColab = user.colaborador;
                const isSelected = user.id === selectedUserId;

                return (
                  <Table.Row key={user.id}>
                    <Table.Cell>{user.name}</Table.Cell>
                    <Table.Cell>{user.email}</Table.Cell>
                    <Table.Cell>
                      <Button
                        w="full"
                        shadow="md"
                        onClick={() => handleSelectUser(user.id)}
                        bg={isColab ? "green.400" : "gray.100"}
                        color={isColab ? "white" : "black"}
                        _hover={{
                          bg: isColab ? "green.500" : "gray.200",
                        }}
                        variant={isSelected ? "outline" : "solid"}
                        borderColor={isSelected ? "green.500" : "transparent"}
                      >
                        {isColab ? "Colaborador" : "Usuario"}
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>

        {/* Panel derecho */}
        <Box
          w="260px"
          minH="200px"
          borderWidth="1px"
          borderRadius="md"
          shadow="md"
          p={4}
          bg="gray.50"
        >
          {selectedUser ? (
            <VStack align="stretch" spacing={3}>
              <Text fontWeight="bold" fontSize="lg">
                Editar rol
              </Text>
              <Text fontSize="sm" color="gray.600">
                {selectedUser.name} <br />
                <Box as="span" color="gray.500">
                  {selectedUser.email}
                </Box>
              </Text>

              <Text fontSize="sm" mt={2}>
                Estado actual:{" "}
                <Box
                  as="span"
                  fontWeight="bold"
                  color={selectedUser.colaborador ? "green.500" : "gray.600"}
                >
                  {selectedUser.colaborador ? "Colaborador" : "Usuario"}
                </Box>
              </Text>

              <HStack spacing={3} mt={2}>
                <Button
                  leftIcon={<FiCheck />}
                  colorScheme="green"
                  variant={selectedUser.colaborador ? "solid" : "outline"}
                  isDisabled={selectedUser.colaborador}   // deshabilitar si ya es colaborador
                  onClick={() => setAsColaborador(selectedUser.id)}
                >
                  Colaborador
                </Button>
                <Button
                  leftIcon={<FiX />}
                  colorScheme="red"
                  variant={!selectedUser.colaborador ? "solid" : "outline"}
                  isDisabled={!selectedUser.colaborador}  // deshabilitar si ya es usuario
                  onClick={() => setAsUsuario(selectedUser.id)}
                >
                  Usuario
                </Button>
              </HStack>

              {pendingChanges[selectedUser.id] !== undefined && (
                <Text fontSize="xs" color="orange.500">
                  Cambios pendientes sin guardar.
                </Text>
              )}
            </VStack>
          ) : (
            <Text fontSize="sm" color="gray.500">
              Selecciona un usuario en la tabla para editar su rol.
            </Text>
          )}
        </Box>
      </HStack>

      {/* Botón Guardar Cambios */}
      <Box textAlign="bottom">
        <Button
          colorScheme="green"
          onClick={handleSaveChanges}
          isDisabled={!hasChanges || saving}
          isLoading={saving}
        >
          Guardar cambios
        </Button>
      </Box>
    </VStack>
  );
};

export default UserTable;
