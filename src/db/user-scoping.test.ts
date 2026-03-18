import { describe, it, expect } from 'vitest'
import { jobs, cronjobs, cronjobLogs } from '@/db/schema'

describe('user scoping — userId FK on core tables', () => {
  it('jobs has userId column', () => {
    expect((jobs as any).userId).toBeDefined()
  })

  it('cronjobs has userId column', () => {
    expect((cronjobs as any).userId).toBeDefined()
  })

  it('cronjobLogs has userId column', () => {
    expect((cronjobLogs as any).userId).toBeDefined()
  })
})
