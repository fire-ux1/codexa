import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

// A component that throws an error when a prop is true
function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test rendering error')
  }
  return <div>Component Rendered Successfully</div>
}

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    // Suppress console.error output from React's internal boundary catcher during tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Child</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('renders default fallback when a child throws an error', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Component Error')).toBeInTheDocument()
    expect(screen.getByText('Test rendering error')).toBeInTheDocument()
    expect(screen.getByText('Reset View')).toBeInTheDocument()
  })

  it('renders custom fallback ReactNode when provided', () => {
    const customFallback = <div>Custom Error Page</div>
    render(
      <ErrorBoundary fallback={customFallback}>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom Error Page')).toBeInTheDocument()
    expect(screen.queryByText('Component Error')).not.toBeInTheDocument()
  })

  it('resets error state and triggers onReset when reset button is clicked', () => {
    const handleReset = vi.fn()
    const { rerender } = render(
      <ErrorBoundary onReset={handleReset}>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    // Verify error is shown
    expect(screen.getByText('Component Error')).toBeInTheDocument()

    // Rerender with buggyComponent not throwing anymore before reset click
    rerender(
      <ErrorBoundary onReset={handleReset}>
        <BuggyComponent shouldThrow={false} />
      </ErrorBoundary>
    )

    // Click reset button
    const resetButton = screen.getByText('Reset View')
    fireEvent.click(resetButton)

    // Verify onReset was called
    expect(handleReset).toHaveBeenCalledTimes(1)

    // Verify child is rendered again
    expect(screen.getByText('Component Rendered Successfully')).toBeInTheDocument()
  })
})
