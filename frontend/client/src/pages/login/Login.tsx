import React, { useState } from 'react'
import {
  Box,
  Flex,
  Heading,
  Input,
  Button,
  Stack,
  Text,
  Container,
  Center,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import Navbar from '../../components/Navbar'
import loboMarino from '../../assets/lobo-saludando.png'
import { Link, useNavigate } from 'react-router-dom'

const MotionBox = motion.create(Box)

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [alert, setAlert] = useState({ message: '', status: '' })

  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleLogin = async () => {
    const { email, password } = formData

    // Validaciones básicas
    if (!email || !password) {
      setAlert({ message: 'Por favor, completa todos los campos.', status: 'warning' })
      return
    }
    if (!validateEmail(email)) {
      setAlert({ message: 'Introduce un correo electrónico válido.', status: 'error' })
      return
    }

    try {
      setIsLoading(true)
      setAlert({ message: '', status: '' })

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales inválidas.')
      }

      // Guardar token y usuario
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      setAlert({
        message: `Inicio de sesión exitoso. Bienvenido, ${data.user.email}.`,
        status: 'success',
      })

      // Redirigir tras breve delay
      setTimeout(() => navigate('/chat'), 1500)
    } catch (error) {
      console.error('Error en el login:', error)
      setAlert({
        message:
          error.message === 'Failed to fetch'
            ? 'Error al conectar con el servidor. Inténtalo más tarde.'
            : 'Credenciales incorrectas o usuario desactivado.',
        status: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

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
          {/* LEFT SIDE: LOGIN FORM */}
          <Flex
            flex={1}
            bg={'white'}
            borderRadius={'2xl'}
            boxShadow={'2xl'}
            p={{ base: 8, md: 12 }}
            direction={'column'}
            justify={'center'}
            align={'center'}
          >
            <Heading
              mb={6}
              fontWeight={700}
              fontSize={{ base: '3xl', md: '4xl' }}
              color={'green.500'}
            >
              Inicia sesión
            </Heading>

            <Text color={'gray.500'} mb={8} textAlign="center">
              Accede a tu cuenta para explorar Valdivia al instante.
            </Text>

            <Stack spacing={4} w={'100%'} maxW={'md'}>
              <Input
                placeholder="correo@ejemplo.com"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                variant="filled"
                bg="gray.100"
                _focus={{ bg: 'gray.200' }}
              />
              <Input
                placeholder="**********"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                variant="filled"
                bg="gray.100"
                _focus={{ bg: 'gray.200' }}
              />
              <Button
                colorScheme="green"
                bg="green.400"
                size="lg"
                rounded="full"
                _hover={{ bg: 'green.500' }}
                onClick={handleLogin}
                isLoading={isLoading}
                loadingText="Entrando..."
              >
                Entrar
              </Button>

              {alert.message && (
                <Text
                  mt={4}
                  color={
                    alert.status === 'error'
                      ? 'red.500'
                      : alert.status === 'success'
                      ? 'green.500'
                      : 'yellow.500'
                  }
                  fontWeight="semibold"
                  textAlign="center"
                >
                  {alert.message}
                </Text>
              )}
            </Stack>

            <Text mt={6} fontSize="sm" color="gray.500">
              ¿No tienes una cuenta?{' '}
              <Button as={Link} variant="link" colorScheme="green" size="sm" to="/register">
                Regístrate
              </Button>
            </Text>
          </Flex>

          {/* RIGHT SIDE: ANIMATED LOBO MARINO */}
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
                y: [0, -15, 0],
                rotate: [0, 2, -2, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
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
