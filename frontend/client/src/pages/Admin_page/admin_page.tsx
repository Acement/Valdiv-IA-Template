import { Center, SegmentGroup,AbsoluteCenter, Grid, GridItem, HStack, Box} from "@chakra-ui/react"
import { useState } from "react"
import Header from "../../components/Header"
import UserTable from "../../components/UserTable";
import UserTableDel from "../../components/UserTableDel";
import LocalUpload from "../../components/LocalUpload";
import LocalTableDel from "../../components/LocalTableDel";
import LocalTableMod from "../../components/LocalTableMod";
import LocalTableVer from "../../components/LocalTableVer";
import  { Toaster } from "../../components/ui/toaster";

import { FiUserCheck, FiUserX, FiUsers, FiFilePlus, FiFileMinus, FiFileText, FiCheckCircle, FiTool} from "react-icons/fi";


const Admin_page = () => {
  const [value, setValue] = useState<string|null>("React")

  return (
    <>
      <Grid templateAreas={`"header header admin"
                            "nav main main"`}
            templateColumns="250px 6fr 1fr" 
            templateRows="60px 1fr"
            height="100vh"
            >
        <GridItem area="header">
          <Header/>
        </GridItem>
        <GridItem area="admin" borderBottom="1px solid" borderColor="gray.100" display="flex" alignItems="center">
          <HStack><FiTool/>Administrador</HStack>
        </GridItem>
        <GridItem area="nav" background="gray.100">
            <SegmentGroup.Root defaultValue="React" 
                css={{

                  "& [data-state='checked']": {
                  backgroundColor: "#4ade80",
                  color: "white"
                }}}
                orientation="vertical"
                width="full"
                height="full"
                shadow="md"
                value={value}
                onValueChange={(e) => setValue(e.value)}
            >
              <SegmentGroup.Indicator />
              {frameworks.map((frame)=> 
                <SegmentGroup.Item key={frame.label} value={frame.value}>
                  <SegmentGroup.ItemText>
                    {frame.label}
                  </SegmentGroup.ItemText>
                  <SegmentGroup.ItemHiddenInput/>
                </SegmentGroup.Item>
              )}
            </SegmentGroup.Root>

        </GridItem>
        <GridItem area="main" borderBlockColor="gray.100">
          <Box position="relative" h="full" w="full" flex="1">
            <AbsoluteCenter>
                {value && components[value]?.()}
            </AbsoluteCenter>
          </Box>
        </GridItem>
      </Grid>
      <Toaster/>
    </>
  )
}

const frameworks =
  [
    { label: <HStack><FiUserCheck/>Permisos de usuarios</HStack>, value: "per_user"},
    { label: <HStack><FiUserX/>Eliminar de usuarios</HStack>, value: "del_user"},
    { label: <HStack><FiFilePlus/>Agregar Local</HStack>, value: "add_local"},
    { label: <HStack><FiFileText/>Modificar local</HStack>, value: "local_mod"},
  ]

const components = {
  per_user: () => <UserTable/>,
  del_user: () => <UserTableDel/>,
  add_local: () => <LocalUpload/>,
  local_mod: () => <LocalTableMod/>,
}

export default Admin_page;