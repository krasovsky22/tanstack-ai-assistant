import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useAppSession } from '@/services/session'
import { useState } from 'react'
import { Box, Button, Flex, Heading, Input, Text, VStack } from '@chakra-ui/react'

const loginFn = createServerFn({ method: 'POST' })
  .validator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    const { db } = await import('@/db')
    const { users } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    const bcrypt = await import('bcryptjs')

    const user = await db.select().from(users).where(eq(users.username, data.username)).limit(1).then(r => r[0] ?? null)
    if (!user) return { error: 'Invalid credentials' }

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) return { error: 'Invalid credentials' }

    const session = await useAppSession()
    await session.update({ userId: user.id, username: user.username })
    throw redirect({ to: '/' })
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  await session.clear()
  throw redirect({ to: '/login' })
})

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await loginFn({ data: { username, password } })
      if (result?.error) {
        setError(result.error)
      } else {
        router.invalidate()
      }
    } catch {
      // redirect throws — swallow it
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex minH="100vh" align="center" justify="center" bg="bg.page">
      <Box w="360px" p="8" borderWidth="1px" borderRadius="lg" bg="bg.surface">
        <VStack gap="6">
          <Heading size="lg" color="text.primary">Sign in to Orin</Heading>
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack gap="4">
              <Box w="100%">
                <Text mb="1" fontSize="sm" color="text.secondary">Username</Text>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  autoFocus
                  required
                />
              </Box>
              <Box w="100%">
                <Text mb="1" fontSize="sm" color="text.secondary">Password</Text>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  required
                />
              </Box>
              {error && <Text color="red.400" fontSize="sm">{error}</Text>}
              <Button type="submit" w="100%" loading={loading} colorPalette="blue">
                Sign in
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Flex>
  )
}
