import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../Sidebar'
import { vi, describe, it, expect } from 'vitest'
import React from 'react'

describe('Sidebar Component', () => {
  it('renders all navigation items in the correct order', () => {
    const setActiveSection = vi.fn()
    render(<Sidebar activeSection="meetings" setActiveSection={setActiveSection} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
    
    // Order: Meetings, Upload, Organisation, Users, ChatBot
    expect(buttons[0]).toHaveAttribute('title', 'Meetings')
    expect(buttons[1]).toHaveAttribute('title', 'Upload')
    expect(buttons[2]).toHaveAttribute('title', 'Organisation')
    expect(buttons[3]).toHaveAttribute('title', 'Utilisateurs & Permissions')
    expect(buttons[4]).toHaveAttribute('title', 'Agent Conversationnel')
  })

  it('calls setActiveSection when an item is clicked', () => {
    const setActiveSection = vi.fn()
    render(<Sidebar activeSection="meetings" setActiveSection={setActiveSection} />)

    const uploadButton = screen.getByTitle('Upload')
    fireEvent.click(uploadButton)
    
    expect(setActiveSection).toHaveBeenCalledWith('upload')
  })

  it('highlights the active section', () => {
    render(<Sidebar activeSection="upload" setActiveSection={vi.fn()} />)
    
    const uploadButton = screen.getByTitle('Upload')
    expect(uploadButton).toHaveClass('bg-blue-600/10')
    expect(uploadButton).toHaveClass('text-blue-700')
    
    const meetingsButton = screen.getByTitle('Meetings')
    expect(meetingsButton).toHaveClass('text-slate-400')
  })
})
