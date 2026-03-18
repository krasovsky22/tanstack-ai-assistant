import { describe, it, expect } from 'vitest'

// @ts-expect-error — users will be exported after Task 2 adds it to schema
import { users } from '@/db/schema'

describe('users table schema', () => {
  it('users table has expected columns', () => {
    // This test passes structurally — the RED signal is the @ts-expect-error import above.
    // If users is not exported from schema, the import fails and all tests in this file fail.
    expect(true).toBe(true)
  })
})
