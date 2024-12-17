import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import TaskForm from '../TaskForm'
import { Task } from '@prisma/client'

describe('TaskForm', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders empty form correctly', () => {
    render(<TaskForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

    expect(screen.getByLabelText(/task title/i)).toHaveValue('')
    expect(screen.getByLabelText(/description/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('renders form with initial data', () => {
    const initialData: Task = {
      id: '1',
      title: 'Test Task',
      description: 'Test Description',
      status: 'TODO',
      position: 1000,
      userId: 'user1',
      categoryId: 'category1',
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: null
    }

    render(
      <TaskForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
        initialData={initialData} 
      />
    )

    expect(screen.getByLabelText(/task title/i)).toHaveValue('Test Task')
    expect(screen.getByLabelText(/description/i)).toHaveValue('Test Description')
  })

  it('handles input changes correctly', () => {
    render(<TaskForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

    const titleInput = screen.getByLabelText(/task title/i)
    const descriptionInput = screen.getByLabelText(/description/i)

    fireEvent.change(titleInput, { target: { value: 'New Task' } })
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } })

    expect(titleInput).toHaveValue('New Task')
    expect(descriptionInput).toHaveValue('New Description')
  })

  it('submits form with correct data', () => {
    render(<TaskForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

    fireEvent.change(screen.getByLabelText(/task title/i), { target: { value: 'New Task' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New Description' } })
    fireEvent.click(screen.getByRole('button', { name: /add task/i }))

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'New Task',
      description: 'New Description'
    })
  })

  it('prevents submission with empty title', () => {
    render(<TaskForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New Description' } })
    fireEvent.click(screen.getByRole('button', { name: /add task/i }))

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('handles cancel button click', () => {
    render(<TaskForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('clears form after successful submission', () => {
    render(<TaskForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

    const titleInput = screen.getByLabelText(/task title/i)
    const descriptionInput = screen.getByLabelText(/description/i)

    fireEvent.change(titleInput, { target: { value: 'New Task' } })
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } })
    fireEvent.click(screen.getByRole('button', { name: /add task/i }))

    expect(titleInput).toHaveValue('')
    expect(descriptionInput).toHaveValue('')
  })

  it('trims whitespace from inputs before submission', () => {
    render(<TaskForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

    fireEvent.change(screen.getByLabelText(/task title/i), { target: { value: '  New Task  ' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: '  New Description  ' } })
    fireEvent.click(screen.getByRole('button', { name: /add task/i }))

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'New Task',
      description: 'New Description'
    })
  })

  it('handles empty description correctly', () => {
    render(<TaskForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

    fireEvent.change(screen.getByLabelText(/task title/i), { target: { value: 'New Task' } })
    // Leave description empty
    fireEvent.click(screen.getByRole('button', { name: /add task/i }))

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'New Task',
      description: undefined  // Ensure undefined is passed, not empty string
    })
  })

  it('handles whitespace-only description as undefined', () => {
    render(<TaskForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

    fireEvent.change(screen.getByLabelText(/task title/i), { target: { value: 'New Task' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /add task/i }))

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'New Task',
      description: undefined
    })
  })

  it('updates input value immediately after typing', () => {
    render(<TaskForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
    
    const titleInput = screen.getByLabelText(/task title/i)
    
    fireEvent.change(titleInput, { target: { value: 'T' } })
    expect(titleInput).toHaveValue('T')
    
    fireEvent.change(titleInput, { target: { value: 'Te' } })
    expect(titleInput).toHaveValue('Te')
    
    fireEvent.change(titleInput, { target: { value: 'Test' } })
    expect(titleInput).toHaveValue('Test')
  })
}) 