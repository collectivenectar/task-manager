'use client'

import { useState } from 'react'
import Modal from '../../common/Modal'
import { SmartTaskResponse } from '@/app/actions'
import { TaskFormData } from '@/lib/schemas/task'

interface InputViewProps {
  additionalContext: string
  setAdditionalContext: (value: string) => void
  shouldBreakdown: boolean
  setShouldBreakdown: (value: boolean) => void
  onClose: () => void
  onRetry: () => Promise<void>
}

interface SmartTaskModalProps {
  isOpen: boolean
  onClose: () => void
  initialData: Partial<TaskFormData>
  onConfirm: (data: TaskFormData, createMultiple: boolean) => void
  onRetry: (additionalContext: string, shouldBreakdown: boolean) => Promise<SmartTaskResponse>
}

const InputView = ({ 
  additionalContext, 
  setAdditionalContext, 
  shouldBreakdown, 
  setShouldBreakdown,
  onClose,
  onRetry 
}: InputViewProps) => (
  <div className="space-y-4">
    <p className="text-primary-muted">
      Need help making your task more specific and actionable? 
      Add any additional context that might help:
    </p>
    <textarea
      value={additionalContext}
      onChange={(e) => setAdditionalContext(e.target.value)}
      placeholder="e.g., This task is part of the Q1 goals..."
      className="w-full rounded-lg bg-surface border border-white/10
               px-3 py-2 text-primary placeholder:text-primary-muted
               focus:outline-none focus:ring-2 focus:ring-white/20
               transition-all duration-200"
      rows={3}
    />
    <label className="flex items-center gap-2 text-primary-muted">
      <input
        type="checkbox"
        checked={shouldBreakdown}
        onChange={(e) => setShouldBreakdown(e.target.checked)}
        className="rounded border-white/10 bg-surface"
      />
      Help me break this into multiple tasks
    </label>
    <div className="flex justify-end space-x-2">
      <button 
        onClick={onClose}
        className="px-4 py-2 bg-surface border border-white/10 text-primary-muted 
                 rounded-lg hover:text-primary hover:border-white/20
                 transition-all"
      >
        Cancel
      </button>
      <button 
        onClick={onRetry}
        disabled={!additionalContext.trim()}
        className="px-4 py-2 bg-white/90 text-black rounded-lg
                 hover:bg-white/75 transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Get Suggestions
      </button>
    </div>
  </div>
)

export function SmartTaskModal({ 
  isOpen, 
  onClose, 
  initialData,
  onConfirm,
  onRetry
}: SmartTaskModalProps) {
  const [additionalContext, setAdditionalContext] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<SmartTaskResponse | null>(null)
  const [shouldBreakdown, setShouldBreakdown] = useState(false)

  const resetState = () => {
    setAdditionalContext('')
    setSuggestion(null)
    setShouldBreakdown(false)
    setIsLoading(false)
  }

  const handleRetry = async () => {
    setIsLoading(true)
    try {
      const newSuggestion = await onRetry(additionalContext, shouldBreakdown)
      setSuggestion(newSuggestion)
    } catch (error) {
      void error;
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!suggestion) return

    onConfirm({
      title: suggestion.title,
      description: suggestion.description,
      status: initialData.status || 'TODO',
      categoryId: initialData.categoryId || '',
      dueDate: suggestion.suggestedDueDate ? new Date(suggestion.suggestedDueDate) : undefined,
    }, shouldBreakdown)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const LoadingView = () => (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      <span className="ml-2 text-primary-muted">Getting suggestions...</span>
    </div>
  )

  const ComparisonView = () => {
    if (!suggestion) return null

    try {
      return (
        <div className="space-y-4">
          {/* Title Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-2">
              <h3 className="font-semibold text-primary">Original Title:</h3>
              <p className="text-primary-muted bg-surface/50 p-3 rounded-lg min-h-[3rem]">
                {initialData.title || 'None provided'}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-primary-muted">Improved Title:</h3>
              <p className="bg-white/5 p-3 rounded-lg min-h-[3rem] border border-white/10">
                {suggestion?.title}
              </p>
            </div>
          </div>

          {/* Description Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold text-primary">Original Description:</h3>
              <p className="text-primary-muted bg-surface/50 p-3 rounded-lg min-h-[6rem] whitespace-pre-wrap">
                {initialData.description || 'None provided'}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-primary">Improved Description:</h3>
              <p className="text-primary-muted bg-white/5 p-3 rounded-lg min-h-[6rem] whitespace-pre-wrap border border-white/10">
                {suggestion?.description}
              </p>
            </div>
          </div>

          {/* Success Criteria */}
          {suggestion?.measurementCriteria && (
            <div className="space-y-2">
              <h3 className="font-semibold text-primary">Success Criteria:</h3>
              <ul className="list-disc pl-5 text-primary-muted">
                {suggestion.measurementCriteria.map((criterion, index) => (
                  <li key={index}>{criterion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Add Suggested Category */}
          {suggestion?.suggestedCategory && (
            <div className="space-y-2">
              <h3 className="font-semibold text-primary">Suggested Category:</h3>
              <p className="text-primary-muted bg-white/5 p-3 rounded-lg border border-white/10">
                {suggestion.suggestedCategory}
              </p>
            </div>
          )}

          {/* Related Tasks Section */}
          {shouldBreakdown && suggestion?.subtasks && (
            <div className="space-y-4 border-t border-white/10 pt-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-primary">Tasks to Create:</h3>
                <span className="text-lg">
                  {suggestion.subtasks.length} tasks
                </span>
              </div>
              <div className="space-y-2 pr-2">
                {suggestion.subtasks.map((task, index) => (
                  <div key={index} className="bg-surface/50 p-3 rounded-lg">
                    <p className="font-medium text-primary">{task.title}</p>
                    <p className="text-sm text-primary-muted mt-1">{task.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <button 
              onClick={handleClose}
              className="px-4 py-2 bg-surface border border-white/10 text-primary-muted 
                       rounded-lg hover:text-primary hover:border-white/20
                       transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-surface border border-white/10 text-primary-muted 
                       rounded-lg hover:text-primary hover:border-white/20
                       transition-all"
            >
              Try Again
            </button>
            <button 
              onClick={handleConfirm}
              className="px-4 py-2 bg-white/90 text-black rounded-lg
                       hover:bg-white/75 transition-colors"
            >
              {shouldBreakdown ? 'Create All Tasks' : 'Use Suggestion'}
            </button>
          </div>
        </div>
      )
    } catch (error) {
      void error;
      return (
        <div className="text-red-400 p-4">
          Failed to display suggestion. Please try again.
        </div>
      )
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Smart Task Assistant">
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
        {isLoading ? (
          <LoadingView />
        ) : suggestion ? (
          <ComparisonView />
        ) : (
          <InputView 
            additionalContext={additionalContext}
            setAdditionalContext={setAdditionalContext}
            shouldBreakdown={shouldBreakdown}
            setShouldBreakdown={setShouldBreakdown}
            onClose={handleClose}
            onRetry={() => handleRetry()}
          />
        )}
      </div>
    </Modal>
  )
} 