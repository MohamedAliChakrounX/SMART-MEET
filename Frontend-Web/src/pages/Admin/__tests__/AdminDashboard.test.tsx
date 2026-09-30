import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import AdminDashboard from '../AdminDashboard'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

// Mocking sub-components
vi.mock('../components/layout/Sidebar', () => ({
  Sidebar: ({ activeSection, setActiveSection }: { activeSection: string, setActiveSection: (s: string) => void }) => (
    <div data-testid="sidebar">
      <button onClick={() => setActiveSection('users')}>Switch to Users</button>
      <button onClick={() => setActiveSection('meetings')}>Switch to Meetings</button>
      <span>Active: {activeSection}</span>
    </div>
  ),
}))

vi.mock('../../../components/Navbar/Navbar', () => ({
  default: ({ onLogoClick }: { onLogoClick: () => void }) => (
    <div data-testid="navbar">
      <button data-testid="logo-click" onClick={onLogoClick}>Logo Click</button>
    </div>
  ),
}))

vi.mock('../components/sections/OrganisationSection', () => ({
  OrganisationSection: () => <div data-testid="organisation-section">Organisation Section</div>,
}))

vi.mock('../components/sections/UsersSection', () => ({
    UsersSection: () => <div data-testid="users-section">Users Section</div>,
}))

vi.mock('../../ArchiveLibrary/ArchiveLibrary', () => ({
    default: () => <div data-testid="archive-library">Archive Library</div>,
}))

vi.mock('../../Upload/Upload', () => ({
    default: () => <div data-testid="upload-section">Upload Section</div>,
}))

describe('AdminDashboard Component', () => {
    it('resets meeting state when clicking logo', async () => {
        render(
            <MemoryRouter>
                <AdminDashboard />
            </MemoryRouter>
        )
        
        // Initial state
        expect(screen.getByTestId('sidebar')).toHaveTextContent(/Active: meetings/i)
        
        // Switch to Users
        fireEvent.click(screen.getByText(/Switch to Users/i))
        expect(screen.getByTestId('sidebar')).toHaveTextContent(/Active: users/i)
        
        // Click Logo
        fireEvent.click(screen.getByTestId('logo-click'))
        
        // Should reset to meetings
        expect(screen.getByTestId('sidebar')).toHaveTextContent(/Active: meetings/i)
    })
})
