import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { NotFoundPage } from '@/components/NotFoundPage'

export const Route = createFileRoute('/_protected')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
})
