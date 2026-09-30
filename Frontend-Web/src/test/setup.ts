import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import React from 'react'

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver

// Mock IntersectionObserver
class IntersectionObserverMock {
  root = null;
  rootMargin = '';
  thresholds = [];
  takeRecords() { return []; }
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = IntersectionObserverMock as any

// Mock ScrollTo
window.scrollTo = vi.fn()

// Mock Meeting Context
vi.mock('../context/MeetingContext', () => ({
  useMeeting: () => ({
    darkMode: false,
    language: 'FR',
    setCurrentMeeting: vi.fn(),
    setCurrentMeetingId: vi.fn(),
    sidebarWidth: 260,
    navbarHeight: 64,
  }),
}))

