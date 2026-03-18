import { useSession } from '@tanstack/react-start/server'

type SessionData = {
  userId: string
  username: string
}

export function useAppSession() {
  return useSession<SessionData>({
    password: process.env.SESSION_SECRET!,
    name: 'orin-session',
    cookie: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    },
  })
}
