'use client'

import React from 'react'
import { alerts } from '@/lib/utils/alerts'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    alerts.error('Something went wrong')
    console.error('ErrorBoundary caught an error:', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center text-primary-muted">
          Something went wrong. Please refresh the page.
        </div>
      )
    }

    return this.props.children
  }
} 