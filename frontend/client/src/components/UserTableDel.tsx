import { 
  Dialog,
  Table, 
  Button, 
  Spinner, 
  Box, 
  HStack, 
  VStack, 
  Text,
  Input,
  InputGroup,
  List,
} from "@chakra-ui/react";
import { toaster } from "./ui/toaster"; 
import { useState, useEffect, useMemo, useRef } from "react";
import { FiCheck, FiX, FiSearch, FiTrash2 } from "react-icons/fi";

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
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

    useEffect(() => {
    if (!selectedUser) {
      setIsDeleteOpen(false);
    }
  }, [selectedUser]);

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

  const handleDeleteUser = async (userId: number) => {
    try {
      setDeleting(true);

      const res = await fetch(`${API_URL}/api/users_admin/${userId}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });

      if (!res.ok) throw new Error("Error al eliminar usuario");

      setUserList(prev => prev.filter(u => u.id !== userId));
      setSelectedUserId(null);
      setPendingChanges(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });

      setIsDeleteOpen(false);

      toaster.create({
        title: "Usuario eliminado",
        description: "El usuario fue eliminado correctamente.",
        type: "success",
        duration: 3000,
        closable: true,
      });
    } catch (err) {
      console.error(err);

      toaster.create({
        title: "Error",
        description: "No se pudo eliminar el usuario.",
        type: "error",
        duration: 4000,
        closable: true,
      });
    } finally {
      setDeleting(false);
    }
  };

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

      if (!res.ok) {
        throw new Error("Error al guardar cambios");
      }

      setPendingChanges({});
    } catch (err) {
      console.error(err);
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
                <Table.ColumnHeader w="1fr">Acción</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
              <Table.Body>
                {filteredUsers.map(user => (
                  <Table.Row key={user.id}>
                    <Table.Cell>{user.name}</Table.Cell>
                    <Table.Cell>{user.email}</Table.Cell>
                    <Table.Cell>
                      <Button
                        w="full"
                        colorScheme="red"
                        variant="outline"
                        leftIcon={<FiTrash2 />}
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setIsDeleteOpen(true);
                        }}
                      >
                        Eliminar
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
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
                  leftIcon={<FiTrash2 />}
                  colorScheme="red"
                  variant="outline"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  Eliminar usuario
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
      <Dialog.Root open={isDeleteOpen} onOpenChange={(e) => setIsDeleteOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Text fontSize="lg" fontWeight="bold">
                Confirmar eliminación
              </Text>
            </Dialog.Header>

            <Dialog.Body>
              ¿Seguro que deseas eliminar a{" "}
              <Box as="span" fontWeight="bold">
                {selectedUser?.name}
              </Box>
              ?
              <Text fontSize="sm" color="red.500" mt={2}>
                Esta acción no se puede deshacer.
              </Text>
            </Dialog.Body>

            <Dialog.Footer>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                isLoading={deleting}
                isDisabled={!selectedUser}
                onClick={() => selectedUser && handleDeleteUser(selectedUser.id)}
              >
                Eliminar
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>    
    </VStack>
  );
};

export default UserTable;
