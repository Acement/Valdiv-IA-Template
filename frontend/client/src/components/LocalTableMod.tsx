import {
  Box,
  Button,
  Spinner,
  HStack,
  VStack,
  Text,
  Table,
  Field,
  Input,
  Textarea,
  NativeSelect,
  createToaster,
  Toaster,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiTrash2, FiUserPlus, FiX } from "react-icons/fi";

type Organization = {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
};

type CollabUser = {
  id: number;
  name: string;
  email: string;
};

type UserOption = {
  id: number;
  name: string;
  email: string;
  colaborador: boolean;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4005";

// ✅ crear una sola vez (no dentro del componente)
const toaster = createToaster({ placement: "top-end" });

export default function LocalAdminTable() {
  // Left list
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Selected org + detail
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [orgDetail, setOrgDetail] = useState<Organization | null>(null);
  const [collabs, setCollabs] = useState<CollabUser[]>([]);

  // Edit form (draft)
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftAddress, setDraftAddress] = useState("");

  // Collaborators options
  const [collabOptions, setCollabOptions] = useState<UserOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [addUserId, setAddUserId] = useState<number | "">("");

  // UX states
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingRemove, setSavingRemove] = useState<number | null>(null); // user id
  const [deletingOrg, setDeletingOrg] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ✅ búsqueda de colaboradores asociados
  const [collabSearch, setCollabSearch] = useState("");

  const filteredCollabs = useMemo(() => {
    const q = collabSearch.trim().toLowerCase();
    if (!q) return collabs;
    return collabs.filter((c) =>
      `${c.name} ${c.email}`.toLowerCase().includes(q)
    );
  }, [collabs, collabSearch]);

  const getAdminHeaders = () => {
    const token = localStorage.getItem("admin_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // --- Load organizations list
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingOrgs(true);
        setError(null);

        const res = await fetch(`${API_URL}/api/users_admin/organizations`, {
          headers: getAdminHeaders(),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) throw new Error(data?.error || "No pude cargar locales");
        setOrgs(data.organizations ?? []);
      } catch (e: any) {
        const msg = e?.message ?? "Error cargando locales";
        setError(msg);
        toaster.create({ title: "Error", description: msg, type: "error" });
      } finally {
        setLoadingOrgs(false);
      }
    };
    run();
  }, []);

  // --- Load collaborators options (users who are colaborador=true)
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingOptions(true);
        const res = await fetch(`${API_URL}/api/users_admin/get-collabs?colaborador=true`, {
          headers: getAdminHeaders(),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "No pude cargar colaboradores");
        setCollabOptions(data.users ?? []);
      } catch (e: any) {
        const msg = e?.message ?? "Error cargando lista de colaboradores";
        setError(msg);
        toaster.create({ title: "Error", description: msg, type: "error" });
      } finally {
        setLoadingOptions(false);
      }
    };
    run();
  }, []);

  const hasDraftChanges = useMemo(() => {
    if (!orgDetail) return false;
    const n = draftName.trim();
    const d = draftDescription.trim();
    const a = draftAddress.trim();
    return (
      n !== (orgDetail.name ?? "") ||
      d !== (orgDetail.description ?? "") ||
      a !== (orgDetail.address ?? "")
    );
  }, [orgDetail, draftName, draftDescription, draftAddress]);

  const nameError = draftName.trim().length < 2 ? "Nombre requerido" : "";

  // --- Load org detail when selected
  useEffect(() => {
    if (!selectedOrgId) {
      setOrgDetail(null);
      setCollabs([]);
      setCollabSearch("");
      return;
    }

    const run = async () => {
      try {
        setLoadingDetail(true);
        setError(null);

        const res = await fetch(`${API_URL}/api/users_admin/organizations/${selectedOrgId}`, {
          headers: getAdminHeaders(),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "No pude cargar detalle del local");

        const org: Organization = data.organization;
        setOrgDetail(org);
        setCollabs(data.collaborators ?? []);

        // initialize draft
        setDraftName(org.name ?? "");
        setDraftDescription(org.description ?? "");
        setDraftAddress(org.address ?? "");
        setAddUserId("");
        setCollabSearch("");
      } catch (e: any) {
        const msg = e?.message ?? "Error cargando detalle";
        setError(msg);
        toaster.create({ title: "Error", description: msg, type: "error" });
      } finally {
        setLoadingDetail(false);
      }
    };

    run();
  }, [selectedOrgId]);

  // --- Actions
  const refreshList = async () => {
    const res = await fetch(`${API_URL}/api/users_admin/organizations`, { headers: getAdminHeaders() });
    const data = await res.json().catch(() => null);
    if (res.ok) setOrgs(data.organizations ?? []);
  };

  const refreshDetail = async () => {
    if (!selectedOrgId) return;
    const res = await fetch(`${API_URL}/api/users_admin/organizations/${selectedOrgId}`, { headers: getAdminHeaders() });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setOrgDetail(data.organization);
      setCollabs(data.collaborators ?? []);
    }
  };

  const saveOrgInfo = async () => {
    if (!orgDetail || !!nameError) return;

    try {
      setSavingInfo(true);
      setError(null);

      const res = await fetch(
        `${API_URL}/api/users_admin/organizations/${orgDetail.id}`,
        {
          method: "PATCH",
          headers: getAdminHeaders(),
          body: JSON.stringify({
            name: draftName.trim(),
            description: draftDescription.trim() || null,
            address: draftAddress.trim() || null,
          }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar");

      setOrgDetail(data.organization);
      toaster.create({ title: "Información actualizada", type: "success" });
      await refreshList();
    } catch (e: any) {
      const msg = e?.message ?? "Error guardando";
      setError(msg);
      toaster.create({ title: "Error guardando", description: msg, type: "error" });
    } finally {
      setSavingInfo(false);
    }
  };

  const addCollaborator = async () => {
    if (!orgDetail || addUserId === "") return;

    try {
      setSavingAdd(true);
      setError(null);

      const res = await fetch(
        `${API_URL}/api/users_admin/organizations/${orgDetail.id}/collaborators`,
        {
          method: "POST",
          headers: getAdminHeaders(),
          body: JSON.stringify({ user_id: addUserId }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "No se pudo agregar colaborador");

      toaster.create({ title: "Colaborador agregado", type: "success" });
      setAddUserId("");
      await refreshDetail();
    } catch (e: any) {
      const msg = e?.message ?? "Error agregando colaborador";
      setError(msg);
      toaster.create({
        title: "Error agregando colaborador",
        description: msg,
        type: "error",
      });
    } finally {
      setSavingAdd(false);
    }
  };

  // ✅ confirmar quitar colaborador + toaster
  const removeCollaborator = async (userId: number) => {
    if (!orgDetail) return;

    const target = collabs.find((c) => c.id === userId);
    const ok = window.confirm(
      `¿Quitar a ${target?.name ?? "este colaborador"} del local "${orgDetail.name}"?`
    );
    if (!ok) return;

    try {
      setSavingRemove(userId);
      setError(null);

      const res = await fetch(
        `${API_URL}/api/users_admin/organizations/${orgDetail.id}/collaborators/${userId}`,
        { method: "DELETE",
          headers: getAdminHeaders(),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "No se pudo quitar");

      toaster.create({ title: "Colaborador removido", type: "success" });
      await refreshDetail();
    } catch (e: any) {
      const msg = e?.message ?? "Error removiendo colaborador";
      setError(msg);
      toaster.create({
        title: "Error removiendo colaborador",
        description: msg,
        type: "error",
      });
    } finally {
      setSavingRemove(null);
    }
  };

  // ✅ confirmar eliminar local + toaster
  const deleteOrganization = async () => {
    if (!orgDetail) return;

    const ok = window.confirm(
      `¿Eliminar el local "${orgDetail.name}"?\n\nEsto eliminará también sus asignaciones de colaboradores.`
    );
    if (!ok) return;

    try {
      setDeletingOrg(true);
      setError(null);

      const res = await fetch(
        `${API_URL}/api/users_admin/organizations/${orgDetail.id}`,
        { method: "DELETE",
          headers: getAdminHeaders(),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "No se pudo eliminar el local");

      toaster.create({ title: "Local eliminado", type: "success" });

      setSelectedOrgId(null);
      setOrgDetail(null);
      setCollabs([]);
      await refreshList();
    } catch (e: any) {
      const msg = e?.message ?? "Error eliminando local";
      setError(msg);
      toaster.create({
        title: "Error eliminando local",
        description: msg,
        type: "error",
      });
    } finally {
      setDeletingOrg(false);
    }
  };

  if (loadingOrgs) {
    return (
      <Box h="70vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner />
      </Box>
    );
  }

  return (
    <>
      <VStack align="stretch" spacing={4}>
        <HStack align="flex-start" spacing={4}>
          {/* Left: organizations table */}
          <Table.ScrollArea
            h="80vh"
            w="80vh"
            borderWidth="1px"
            shadow="md"
            borderRadius="md"
          >
            <Table.Root size="sm" w="full" showColumnBorder>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader w="3fr">Local</Table.ColumnHeader>
                  <Table.ColumnHeader w="3fr">Dirección</Table.ColumnHeader>
                  <Table.ColumnHeader w="1fr">Acción</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {orgs.map((org) => {
                  const isSelected = org.id === selectedOrgId;
                  return (
                    <Table.Row key={org.id}>
                      <Table.Cell>{org.name}</Table.Cell>
                      <Table.Cell>{org.address ?? "-"}</Table.Cell>
                      <Table.Cell>
                        <Button
                          w="full"
                          onClick={() => setSelectedOrgId(org.id)}
                          variant={isSelected ? "outline" : "solid"}
                          borderColor={isSelected ? "green.500" : "transparent"}
                        >
                          Editar
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>

          {/* Right: detail panel */}
          <Box
            w="360px"
            minH="80vh"
            borderWidth="1px"
            borderRadius="md"
            shadow="md"
            p={4}
            bg="gray.50"
          >
            {!selectedOrgId ? (
              <Text fontSize="sm" color="gray.500">
                Selecciona un local para editar.
              </Text>
            ) : loadingDetail ? (
              <Box
                h="60vh"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Spinner />
              </Box>
            ) : orgDetail ? (
              <VStack align="stretch" spacing={4}>
                <Text fontWeight="bold" fontSize="lg">
                  Editar Local
                </Text>

                {/* Fallback visual (opcional) */}
                {error && (
                  <Box p={3} bg="red.50" borderRadius="md">
                    <Text color="red.600" fontSize="sm">
                      {error}
                    </Text>
                  </Box>
                )}

                {/* Org info */}
                <Field.Root invalid={!!nameError}>
                  <Field.Label>Nombre</Field.Label>
                  <Input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                  />
                  {nameError && <Field.ErrorText>{nameError}</Field.ErrorText>}
                </Field.Root>

                <Field.Root>
                  <Field.Label>Dirección</Field.Label>
                  <Input
                    value={draftAddress}
                    onChange={(e) => setDraftAddress(e.target.value)}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Descripción</Field.Label>
                  <Textarea
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    placeholder="Opcional"
                  />
                </Field.Root>

                <HStack justify="space-between">
                  <Button
                    onClick={saveOrgInfo}
                    bg="green.400"
                    color="white"
                    _hover={{ bg: "green.500" }}
                    isDisabled={!hasDraftChanges || !!nameError || savingInfo}
                    isLoading={savingInfo}
                  >
                    Guardar info
                  </Button>

                  <Button
                    onClick={() => {
                      setDraftName(orgDetail.name ?? "");
                      setDraftDescription(orgDetail.description ?? "");
                      setDraftAddress(orgDetail.address ?? "");
                      toaster.create({ title: "Cambios descartados", type: "info" });
                    }}
                    variant="outline"
                    isDisabled={!hasDraftChanges}
                  >
                    Descartar
                  </Button>
                </HStack>

                {/* Collaborators */}
                <Box borderTopWidth="1px" pt={3}>
                  <Text fontWeight="semibold">Colaboradores</Text>

                  {/* ✅ buscar colaboradores asociados */}
                  <Field.Root mt={2}>
                    <Field.Label>Buscar colaborador</Field.Label>
                    <Input
                      value={collabSearch}
                      onChange={(e) => setCollabSearch(e.target.value)}
                      placeholder="Busca por nombre o correo…"
                    />
                  </Field.Root>

                  <VStack align="stretch" spacing={2} mt={2}>
                    {filteredCollabs.length === 0 ? (
                      <Text fontSize="sm" color="gray.500">
                        {collabs.length === 0
                          ? "Este local no tiene colaboradores asignados."
                          : "No hay resultados para tu búsqueda."}
                      </Text>
                    ) : (
                      filteredCollabs.map((u) => (
                        <HStack key={u.id} justify="space-between">
                          <Box>
                            <Text fontSize="sm" fontWeight="medium">
                              {u.name}
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                              {u.email}
                            </Text>
                          </Box>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeCollaborator(u.id)}
                            isLoading={savingRemove === u.id}
                            leftIcon={<FiX />}
                          >
                            Quitar
                          </Button>
                        </HStack>
                      ))
                    )}
                  </VStack>

                  {/* Add collaborator */}
                  <Box mt={3}>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      Agregar colaborador
                    </Text>

                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={addUserId}
                        onChange={(e) =>
                          setAddUserId(e.target.value ? Number(e.target.value) : "")
                        }
                        disabled={loadingOptions}
                      >
                        <option value="">
                          {loadingOptions
                            ? "Cargando..."
                            : "Selecciona un colaborador"}
                        </option>
                        {collabOptions.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.email}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>

                    <Button
                      mt={2}
                      w="full"
                      onClick={addCollaborator}
                      isDisabled={addUserId === "" || savingAdd}
                      isLoading={savingAdd}
                      leftIcon={<FiUserPlus />}
                    >
                      Agregar
                    </Button>
                  </Box>
                </Box>

                {/* Danger zone */}
                <Box borderTopWidth="1px" pt={3}>
                  <Text fontWeight="semibold" color="red.600">
                    Zona de peligro
                  </Text>
                  <Button
                    mt={2}
                    w="full"
                    variant="outline"
                    borderColor="red.300"
                    color="red.700"
                    onClick={deleteOrganization}
                    isLoading={deletingOrg}
                    leftIcon={<FiTrash2 />}
                  >
                    Eliminar local
                  </Button>
                </Box>
              </VStack>
            ) : (
              <Text fontSize="sm" color="gray.500">
                No se pudo cargar el local.
              </Text>
            )}
          </Box>
        </HStack>
      </VStack>
    </>
  );
}
