import { describe, it, expect } from 'vitest'
// @ts-expect-error — report-issue.ts does not exist yet (RED phase)
import { buildReportPrompt, parseTicketResponse } from '@/lib/report-issue'

describe('buildReportPrompt', () => {
  it('contains ONLY valid JSON instruction', () => {
    const prompt = buildReportPrompt('Login broken', 'Cannot log in', 'https://app.example.com/login')
    expect(prompt).toMatch(/ONLY valid JSON/i)
  })

  it('contains the title', () => {
    const prompt = buildReportPrompt('Login broken', 'Cannot log in', 'https://app.example.com/login')
    expect(prompt).toContain('Login broken')
  })

  it('contains the description', () => {
    const prompt = buildReportPrompt('Login broken', 'Cannot log in', 'https://app.example.com/login')
    expect(prompt).toContain('Cannot log in')
  })

  it('contains the pageUrl', () => {
    const prompt = buildReportPrompt('Login broken', 'Cannot log in', 'https://app.example.com/login')
    expect(prompt).toContain('https://app.example.com/login')
  })

  it('maps categories to Jira issue types in the prompt', () => {
    const prompt = buildReportPrompt('title', 'desc', 'https://example.com')
    // Bug → Bug, Feature → Story, Other → Task
    expect(prompt).toMatch(/Bug.*Bug|Bug.*Story|Bug.*Task/i)
  })

  it('instructs LLM to respond with category, ticketKey, ticketUrl fields', () => {
    const prompt = buildReportPrompt('title', 'desc', 'https://example.com')
    expect(prompt).toContain('category')
    expect(prompt).toContain('ticketKey')
    expect(prompt).toContain('ticketUrl')
  })
})

describe('parseTicketResponse', () => {
  it('returns success shape for valid JSON string', () => {
    const raw = JSON.stringify({ category: 'Bug', ticketKey: 'PROJ-42', ticketUrl: 'https://jira.example.com/browse/PROJ-42' })
    const result = parseTicketResponse(raw)
    expect(result).toEqual({
      success: true,
      category: 'Bug',
      ticketKey: 'PROJ-42',
      ticketUrl: 'https://jira.example.com/browse/PROJ-42',
    })
  })

  it('strips json markdown code fences and parses successfully', () => {
    const raw = '```json\n{"category":"Feature","ticketKey":"PROJ-10","ticketUrl":"https://jira.example.com/browse/PROJ-10"}\n```'
    const result = parseTicketResponse(raw)
    expect(result).toEqual({
      success: true,
      category: 'Feature',
      ticketKey: 'PROJ-10',
      ticketUrl: 'https://jira.example.com/browse/PROJ-10',
    })
  })

  it('strips plain code fences and parses successfully', () => {
    const raw = '```\n{"category":"Other","ticketKey":"PROJ-99","ticketUrl":""}\n```'
    const result = parseTicketResponse(raw)
    expect(result).toEqual({
      success: true,
      category: 'Other',
      ticketKey: 'PROJ-99',
      ticketUrl: '',
    })
  })

  it('returns error shape for unparseable prose input', () => {
    const result = parseTicketResponse('I could not create a Jira ticket for you')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(typeof result.error).toBe('string')
      expect(result.error.length).toBeGreaterThan(0)
    }
  })

  it('returns error shape for empty string', () => {
    const result = parseTicketResponse('')
    expect(result.success).toBe(false)
  })

  it('returns error shape when required fields are missing', () => {
    const raw = JSON.stringify({ category: 'Bug' }) // missing ticketKey and ticketUrl
    const result = parseTicketResponse(raw)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(typeof result.error).toBe('string')
    }
  })

  it('ticketUrl may be empty string and still succeed', () => {
    const raw = JSON.stringify({ category: 'Bug', ticketKey: 'PROJ-1', ticketUrl: '' })
    const result = parseTicketResponse(raw)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.ticketUrl).toBe('')
    }
  })
})
