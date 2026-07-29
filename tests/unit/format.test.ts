import { describe, expect, it } from 'vitest'
import { formatDuration } from '@/lib/format'

describe('formatDuration', () => {
  it('rounds to the nearest second', () => {
    expect(formatDuration(0.81)).toBe('0:01')
    expect(formatDuration(1.28)).toBe('0:01')
    expect(formatDuration(7.18)).toBe('0:07')
    expect(formatDuration(7.62)).toBe('0:08')
  })

  it('pads seconds to two digits', () => {
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(42)).toBe('0:42')
  })

  it('splits minutes and seconds', () => {
    expect(formatDuration(60)).toBe('1:00')
    expect(formatDuration(95)).toBe('1:35')
    expect(formatDuration(3600)).toBe('60:00')
  })

  it('clamps negative input to zero', () => {
    expect(formatDuration(-3)).toBe('0:00')
  })
})
