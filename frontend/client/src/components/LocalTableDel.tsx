import { 
  Table, 
  Button, 
  Spinner, 
  Box, 
  HStack, 
  VStack, 
  Text 
} from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";
import { FiCheck, FiX } from "react-icons/fi";

type User = {
  id: number;
  name: string;
  email: string;
  colaborador: boolean;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4005";

const LocalTable = () => {
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users`, {
          headers: {
            "Content-Type": "application/json",
          },
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

      const res = await fetch(`${API_URL}/api/users/colaborador-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
                <Table.ColumnHeader w="2fr">Nombre Local</Table.ColumnHeader>
                <Table.ColumnHeader w="2fr">Nombre archivo</Table.ColumnHeader>
                <Table.ColumnHeader w="1fr">Subido por</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {userList.map(user => {
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
          minH="80vh"
          borderWidth="1px"
          borderRadius="md"
          shadow="md"
          p={4}
          bg="gray.50"
        >
          {selectedUser ? (
            <VStack align="stretch" spacing={3}>
              <Text fontWeight="bold" fontSize="lg">
                ¿Desea eliminar local?
              </Text>
              <Text fontSize="sm" color="gray.600">
                {selectedUser.name} <br />
                <Box as="span" color="gray.500">
                  {selectedUser.email}
                </Box>
              </Text>

              <HStack spacing={3} mt={2}>
                <HStack spacing={3} mt={2}>
                <Button
                  leftIcon={<FiCheck />}
                  backgroundColor="#4ade80"
                  
                >
                  {/*onClick={() => /*Eliminar usuario*/}
                  Si
                </Button><Button
                  leftIcon={<FiX />}
                  backgroundColor="gray.100"
                  color="black"
                >
                  {/*onClick={() => /*Quitar selecion*/}
                  No
                </Button>
              </HStack>
              </HStack>

              {pendingChanges[selectedUser.id] !== undefined && (
                <Text fontSize="xs" color="orange.500">
                  Cambios pendientes sin guardar.
                </Text>
              )}
            </VStack>
          ) : (
            <Text fontSize="sm" color="gray.500">
              Selecciona un local en la tabla para eliminarlo.
            </Text>
          )}
        </Box>
      </HStack>

      {/* Botón Guardar Cambios */}
      <Box textAlign="bottom">
        <Button
          backgroundColor="#4ade80"
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

export default LocalTable;
