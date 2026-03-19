import { Box, Heading, Container, Text, Button, Stack, Center } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import Navbar from '../../components/Navbar'
import loboMarino from '../../assets/lobo-home.png'
import { Link } from 'react-router-dom'

const MotionBox = motion.create(Box)

export default function HeroChatbot() {
  return (
    <>
      <Navbar />
      <Container maxW={'6xl'} py={{ base: 12, md: 24 }}>
        <Stack
          spacing={{ base: 10, md: 16 }}
          direction={{ base: 'column', md: 'row' }}
          align={'center'}
          justify={'space-between'}
        >
          {/* LEFT SIDE: TEXT + CTA */}
          <Box flex={1} textAlign={{ base: 'center', md: 'left' }}>
            <Heading
              fontWeight={700}
              fontSize={{ base: '3xl', md: '5xl', lg: '6xl' }}
              lineHeight={'110%'}
              mb={6}
            >
              Descubre <br />
              <Text as={'span'} color={'green.400'}>
                Valdivia al instante
              </Text>
            </Heading>
            <Text fontSize={{ base: 'md', md: 'lg' }} color={'gray.500'} mb={8}>
              Tu asistente virtual para obtener información sobre Valdivia al instante: trámites de la municipalidad, locales y más.
              Conoce a nuestra mascota y guía, el lobo marino, que hará tu experiencia más divertida.
            </Text>
            <Stack
              direction={{ base: 'column', sm: 'row' }}
              spacing={4}
              justify={{ base: 'center', md: 'flex-start' }}
            >
              <Button
                as={Link}
                colorScheme={'green'}
                bg={'green.400'}
                rounded={'full'}
                px={8}
                to='/chat'
                _hover={{ bg: 'green.500' }}
              >
                Comenzar
              </Button>
              <Button as={Link} to='/us' variant={'link'} colorScheme={'blue'}>
                Saber más
              </Button>
              <Button as={Link} to='/admin' variant={'link'} colorScheme={'blue'}>
                Admin
              </Button>
            </Stack>
          </Box>

          {/* RIGHT SIDE: LOBO MARINO ANIMADO */}
          <Center flex={1}>
            <MotionBox
              w={{ base: '250px', md: '350px' }}
              h={{ base: '250px', md: '350px' }}
              borderRadius={'full'}
              overflow="hidden"
              bgGradient="radial(circle at center, #38A169, #2F855A)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="2xl"
              animate={{
                y: [0, -15, 0],      // flotación vertical
                rotate: [0, 2, -2, 0] // leve rotación
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut'
              }}
            >
              <Box
                as="img"
                src={loboMarino}
                alt="Mascota lobo marino"
                w="100%"
                h="100%"
                objectFit="contain"
              />
            </MotionBox>
          </Center>
        </Stack>
      </Container>
    </>
  )
}
