import { render, screen, fireEvent } from '@testing-library/react'
import Navbar from '../Navbar'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { MeetingProvider } from '../../../context/MeetingContext'
import React from 'react'

// Mocking useMeeting context
vi.mock('../../../context/MeetingContext', () => ({
  useMeeting: vi.fn(() => ({
    darkMode: false,
    setDarkMode: vi.fn(),
    language: 'FR',
    setLanguage: vi.fn(),
    navbarWidth: 1200,
    navbarWidthReadonly: 1200,
    navbarHeight: 64,
    navbarHeightReadonly: 64,
  })),
  MeetingProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const navigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => navigate,
    }
})

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls onLogoClick when provided', () => {
    const onLogoClick = vi.fn()
    render(
      <MemoryRouter>
        <Navbar currentStep={0} hideSteps={true} onLogoClick={onLogoClick} />
      </MemoryRouter>
    )

    const logo = screen.getByAltText(/SFM Logo/i).closest('div')
    fireEvent.click(logo)
    
    expect(onLogoClick).toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalledWith('/archive')
  })

  it('navigates to /archive when onLogoClick is NOT provided', () => {
    render(
      <MemoryRouter>
        <Navbar currentStep={0} hideSteps={true} />
      </MemoryRouter>
    )

    const logo = screen.getByAltText(/SFM Logo/i).closest('div')
    fireEvent.click(logo)
    
    expect(navigate).toHaveBeenCalledWith('/archive')
  })
})
