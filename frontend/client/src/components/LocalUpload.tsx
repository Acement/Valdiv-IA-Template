import {
  Box,
  Button,
  Field,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  Text,
  NativeSelect 
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  colaborador: boolean;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4005";

const LocalUpload = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getAdminHeaders = () => {
    const token = localStorage.getItem("admin_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // ✅ 1) Cargar colaboradores desde tu ruta nueva
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingUsers(true);
        setError(null);

        const res = await fetch(
          `${API_URL}/api/users_admin/get-collabs?colaborador=true`,
          {
            headers: getAdminHeaders(),
          }
        );
        if (!res.ok) throw new Error("No pude cargar colaboradores");

        const data = await res.json(); // { users: [...] }
        setUsers(data.users ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Error cargando colaboradores");
      } finally {
        setLoadingUsers(false);
      }
    };
    run();
  }, []);

  // Por si acaso, reforzamos en frontend también
  const collaboratorOptions = useMemo(
    () => users.filter((u) => u.colaborador),
    [users]
  );

  const nameError = name.trim().length < 2 ? "Nombre requerido" : "";
  const collaboratorError =
    selectedUserId === "" ? "Debes asignar un colaborador" : "";

  const canSubmit = !nameError && !collaboratorError && !saving;

  // ✅ 2) Crear local + asignar colaborador (una sola request)
  const handleCreate = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(
        `${API_URL}/api/users_admin/organizations-with-collaborator`,
        {
          method: "POST",
          headers: getAdminHeaders(),
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            address: address.trim() || null,
            user_id: selectedUserId,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo crear el local");
      }

      setSuccess(
        `Local creado: "${data.organization?.name}" (colaborador asignado: ${data.assigned_user_id}) ✅`
      );

      // Reset form
      setName("");
      setDescription("");
      setAddress("");
      setSelectedUserId("");
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box w="full" maxW="720px" p={6} bg="white" borderRadius="md" shadow="md">
      <VStack align="stretch" spacing={4}>
        <Text fontSize="xl" fontWeight="bold">
          Crear Local (Organización)
        </Text>

        <Field.Root invalid={!!nameError}>
        <Field.Label>Nombre del local</Field.Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        {nameError && <Field.ErrorText>{nameError}</Field.ErrorText>}
        </Field.Root>

        <Field.Root>
        <Field.Label>Descripción</Field.Label>
        <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
        />
        </Field.Root>

        <Field.Root>
        <Field.Label>Dirección</Field.Label>
        <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Opcional"
        />
        </Field.Root>

        <Field.Root invalid={!!collaboratorError}>
        <Field.Label>Asignar colaborador (obligatorio)</Field.Label>
        <NativeSelect.Root>
        <NativeSelect.Field
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : "")}
            disabled={loadingUsers}
        >
            <option value="">
            {loadingUsers ? "Cargando..." : "Selecciona un colaborador"}
            </option>
            {collaboratorOptions.map((u) => (
            <option key={u.id} value={u.id}>
                {u.name} — {u.email}
            </option>
            ))}
        </NativeSelect.Field>
        </NativeSelect.Root>
        {collaboratorError && (
            <Field.ErrorText>{collaboratorError}</Field.ErrorText>
        )}
        </Field.Root>

        {error && (
          <Box p={3} bg="red.50" borderRadius="md">
            <Text color="red.600">{error}</Text>
          </Box>
        )}

        {success && (
          <Box p={3} bg="green.50" borderRadius="md">
            <Text color="green.700">{success}</Text>
          </Box>
        )}

        <HStack justify="flex-end">
          <Button
            onClick={handleCreate}
            isLoading={saving}
            loadingText="Creando..."
            bg="green.400"
            color="white"
            _hover={{ bg: "green.500" }}
            isDisabled={!canSubmit}
          >
            Crear local
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default LocalUpload;
