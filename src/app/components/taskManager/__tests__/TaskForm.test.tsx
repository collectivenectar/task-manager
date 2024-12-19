import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import TaskForm from '../TaskForm'
import { Task, Category } from '@prisma/client'

describe('TaskForm', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()
  const mockOnCategoryCreate = jest.fn()
  const mockCategories = [{
    id: 'default-category',
    name: 'Default',
    isDefault: true,
    position: 0,
    userId: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date()
  }]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderForm = (props = {}) => {
    return renderWithProviders(
      <TaskForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel}
        onCategoryCreate={mockOnCategoryCreate}
        categories={mockCategories}
        userId="test-user"
        {...props} 
      />
    )
  }

  it('renders empty form correctly', () => {
    renderForm()

    expect(screen.getByTestId('task-title-input')).toHaveValue('')
    expect(screen.getByTestId('task-description-input')).toHaveValue('')
    expect(screen.getByTestId('task-submit-button')).toBeInTheDocument()
    expect(screen.getByTestId('task-cancel-button')).toBeInTheDocument()
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

    renderForm({ initialData })

    expect(screen.getByTestId('task-title-input')).toHaveValue('Test Task')
    expect(screen.getByTestId('task-description-input')).toHaveValue('Test Description')
    expect(screen.getByTestId('task-delete-button')).toBeInTheDocument()
  })

  it('handles input changes correctly', () => {
    renderForm()

    const titleInput = screen.getByTestId('task-title-input')
    const descriptionInput = screen.getByTestId('task-description-input')

    fireEvent.change(titleInput, { target: { value: 'New Task' } })
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } })

    expect(titleInput).toHaveValue('New Task')
    expect(descriptionInput).toHaveValue('New Description')
  })

  it('submits form with correct data', () => {
    renderForm()

    fireEvent.change(screen.getByTestId('task-title-input'), { 
      target: { value: 'New Task' } 
    })
    fireEvent.change(screen.getByTestId('task-description-input'), { 
      target: { value: 'New Description' } 
    })
    
    const submitButton = screen.getByTestId('task-submit-button')
    fireEvent.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'New Task',
      description: 'New Description',
      status: 'TODO',
      categoryId: 'default-category',
      dueDate: null
    })
  })

  it('prevents submission with empty title', () => {
    renderForm()

    fireEvent.change(screen.getByTestId('task-description-input'), { 
      target: { value: 'New Description' } 
    })
    
    const submitButton = screen.getByTestId('task-submit-button')
    fireEvent.click(submitButton)

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('handles cancel button click', () => {
    renderForm()

    fireEvent.click(screen.getByTestId('task-cancel-button'))

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('clears form after successful submission', async () => {
    const onSubmit = jest.fn().mockResolvedValue({})
    
    render(
      <TaskForm
        onSubmit={onSubmit}
        onCancel={() => {}}
        onCategoryCreate={async () => ({ id: '1', name: 'Test' } as Category)}
        categories={mockCategories}
        userId="test-user"
      />
    )

    const titleInput = screen.getByTestId('task-title-input')
    const descriptionInput = screen.getByTestId('task-description-input')

    // Fill form
    fireEvent.change(titleInput, { target: { value: 'New Task' } })
    fireEvent.change(descriptionInput, { target: { value: 'Description' } })

    // Submit form
    fireEvent.click(screen.getByTestId('task-submit-button'))

    // Wait for async operations
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })

    // Verify form is cleared
    expect(titleInput).toHaveValue('')
    expect(descriptionInput).toHaveValue('')
  })

  it('trims whitespace from inputs before submission', () => {
    renderForm()

    fireEvent.change(screen.getByTestId('task-title-input'), { 
      target: { value: '  New Task  ' } 
    })
    fireEvent.change(screen.getByTestId('task-description-input'), { 
      target: { value: '  New Description  ' } 
    })
    
    const submitButton = screen.getByTestId('task-submit-button')
    fireEvent.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'New Task',
      description: 'New Description',
      status: 'TODO',
      categoryId: 'default-category',
      dueDate: null
    })
  })

  it('handles empty description correctly', () => {
    renderForm()

    fireEvent.change(screen.getByTestId('task-title-input'), { 
      target: { value: 'New Task' } 
    })
    // Leave description empty
    const submitButton = screen.getByTestId('task-submit-button')
    fireEvent.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'New Task',
      description: undefined,
      status: 'TODO',
      categoryId: 'default-category',
      dueDate: null
    })
  })

  it('handles whitespace-only description as undefined', () => {
    renderForm()

    fireEvent.change(screen.getByTestId('task-title-input'), { 
      target: { value: 'New Task' } 
    })
    fireEvent.change(screen.getByTestId('task-description-input'), { 
      target: { value: '   ' } 
    })
    
    const submitButton = screen.getByTestId('task-submit-button')
    fireEvent.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'New Task',
      description: undefined,
      status: 'TODO',
      categoryId: 'default-category',
      dueDate: null
    })
  })

  it('updates input value immediately after typing', () => {
    renderForm()
    
    const titleInput = screen.getByTestId('task-title-input')
    
    fireEvent.change(titleInput, { target: { value: 'T' } })
    expect(titleInput).toHaveValue('T')
    
    fireEvent.change(titleInput, { target: { value: 'Te' } })
    expect(titleInput).toHaveValue('Te')
    
    fireEvent.change(titleInput, { target: { value: 'Test' } })
    expect(titleInput).toHaveValue('Test')
  })
}) 