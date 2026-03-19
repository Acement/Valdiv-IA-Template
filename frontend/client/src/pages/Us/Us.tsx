import React from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Grid,
  GridItem,
  Image,
  Stack,
  Center,
  VStack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import Navbar from "../../components/Navbar";

// Importa las imágenes del equipo y cliente
import gabriel from "../../assets/gabriel.png";
import martin from "../../assets/martin.png";
import esperanza from "../../assets/esperanza.png";
import pablo from "../../assets/pablo.png";
import rudy from "../../assets/rudy.png";
import matthieu from "../../assets/matthieu.png";

const MotionBox = motion.create(Box);

interface TeamMember {
  name: string;
  role: string;
  img: string;
}

const teamMembers: TeamMember[] = [
  { name: "Gabriel Asenjo", role: "Product Owner", img: gabriel },
  { name: "Martín Maza", role: "Scrum Master", img: martin },
  { name: "Esperanza Tejeda", role: "Desarrollador UX/UI", img: esperanza },
  { name: "Pablo Cisterna", role: "Desarrollador Backend", img: pablo },
  { name: "Rudy Richter", role: "Control de calidad", img: rudy },
];

const client: TeamMember = { name: "Matthieu Vernier", role: "Cliente", img: matthieu };

export default function Us() {
  return (
    <>
      <Navbar />
      <Container maxW="7xl" py={{ base: 12, md: 24 }}>
        <VStack spacing={8} textAlign="center" mb={16}>
          <Heading
            fontSize={{ base: "3xl", md: "4xl" }}
            fontWeight="bold"
            lineHeight="110%"
          >
            Conoce al{' '}
            <Text as="span" color="green.400">
              equipo
            </Text>{' '}
            detrás del proyecto
          </Heading>
          <Text fontSize={{ base: "md", md: "lg" }} color="gray.500">
            Este es nuestro equipo dedicado y nuestro cliente que nos inspira a crear soluciones
            innovadoras y de calidad.
          </Text>
        </VStack>


        {/* Cliente */}
        <Box textAlign="center">
          <Heading fontSize="2xl" mb={6}>
            Nuestro cliente
          </Heading>
          <Center>
            <MotionBox whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 250 }}>
              <Image
                src={client.img}
                alt={client.name}
                borderRadius="full"
                boxSize={{ base: "140px", md: "180px" }}
                objectFit="cover"
                boxShadow="2xl"
              />
              <Text mt={4} fontWeight="bold" fontSize="lg">
                {client.name}
              </Text>
              <Text color="gray.500">{client.role}</Text>
            </MotionBox>
          </Center>
        </Box>
        {/* Grid del equipo */}
        <Grid
          templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(5, 1fr)" }}
          gap={8}
          mb={16}
        >
          {teamMembers.map((member, idx) => (
            <MotionBox
              key={idx}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 250 }}
              textAlign="center"
            >
              <Center>
                <Image
                  src={member.img}
                  alt={member.name}
                  borderRadius="full"
                  boxSize={{ base: "120px", md: "150px" }}
                  objectFit="cover"
                  boxShadow="lg"
                />
              </Center>
              <Text mt={4} fontWeight="bold" fontSize="lg">
                {member.name}
              </Text>
              <Text color="gray.500">{member.role}</Text>
            </MotionBox>
          ))}
        </Grid>
      </Container>
    </>
  );
}
