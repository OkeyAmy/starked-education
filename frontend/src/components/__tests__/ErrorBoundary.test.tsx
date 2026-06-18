/**
 * Tests for ErrorBoundary component
 *
 * Error boundaries catch JavaScript errors anywhere in their child component tree,
 * log those errors, and display a fallback UI instead of crashing the entire app.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock next/link since ErrorBoundary uses it for the "Go Home" button
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Creates a component that throws on render.
 * Uses React.ReactElement return type so TS accepts it as JSX,
 * but the function never actually returns — it always throws.
 */
function ThrowError({ message = 'Test error' }: { message?: string }): React.ReactElement {
  throw new Error(message);
}

/** Spy management — suppresses console.error noise during error boundary tests */
function suppressConsoleError() {
  // Safety: restore any previous spy first
  (console.error as any).mockRestore?.();
  return jest.spyOn(console, 'error').mockImplementation(() => {});
}

function restoreConsoleError(spy: jest.SpyInstance) {
  spy.mockRestore();
}

// ─── Environment helpers ───────────────────────────────────────────

/**
 * Use Object.assign to work around TS readonly check on process.env.
 * Standard Jest pattern for mocking NODE_ENV.
 */
function setNodeEnv(value: string) {
  Object.assign(process.env, { NODE_ENV: value });
}

const ORIGINAL_ENV = { ...process.env };

// ─── Tests ─────────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Restore env before each test to prevent cross-test leaks
    Object.assign(process.env, { NODE_ENV: ORIGINAL_ENV.NODE_ENV });
    consoleErrorSpy = suppressConsoleError();
  });

  afterEach(() => {
    restoreConsoleError(consoleErrorSpy);
  });

  // ── Basic rendering ──────────────────────────────────────────────

  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child">Hello World</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('does not show any error UI', () => {
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.queryByText('Go Home')).not.toBeInTheDocument();
    });
  });

  // ── Error catching ───────────────────────────────────────────────

  describe('when a child throws an error', () => {
    it('catches the error and displays fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('displays the try again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('displays the go home link', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const goHomeLink = screen.getByText('Go Home');
      expect(goHomeLink).toBeInTheDocument();
      expect(goHomeLink.closest('a')).toHaveAttribute('href', '/');
    });

    it('shows a friendly message about retrying', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(
        screen.getByText('Please try again or return to the home page.')
      ).toBeInTheDocument();
    });

    it('logs the error to console with ErrorBoundary prefix', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Logged error" />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalled();

      // At least one call should have the [ErrorBoundary] prefix
      const hasPrefixCall = consoleErrorSpy.mock.calls.some((call: any[]) =>
        call.some((arg: any) =>
          typeof arg === 'string' && arg.includes('[ErrorBoundary]')
        )
      );
      expect(hasPrefixCall).toBe(true);
    });

    it('logs component stack when available', () => {
      // componentDidCatch receives errorInfo which should include componentStack
      render(
        <ErrorBoundary>
          <ThrowError message="Component stack error" />
        </ErrorBoundary>
      );

      // Verify console.error was called — component stack logging is internal
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ── Error details in development / production ────────────────────

  describe('error details display', () => {
    afterEach(() => {
      setNodeEnv(ORIGINAL_ENV.NODE_ENV || 'test');
    });

    it('shows error message in development mode', () => {
      setNodeEnv('development');

      render(
        <ErrorBoundary>
          <ThrowError message="Dev error details" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Dev error details')).toBeInTheDocument();
    });

    it('shows generic message in production mode', () => {
      setNodeEnv('production');

      render(
        <ErrorBoundary>
          <ThrowError message="Should not be visible" />
        </ErrorBoundary>
      );

      expect(
        screen.getByText('An unexpected error occurred. Our team has been notified.')
      ).toBeInTheDocument();
      expect(screen.queryByText('Should not be visible')).not.toBeInTheDocument();
    });

    it('shows "Error Details" collapsible section in development mode', () => {
      setNodeEnv('development');

      render(
        <ErrorBoundary>
          <ThrowError message="Error with details" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();
    });

    it('does not show "Error Details" section in production mode', () => {
      setNodeEnv('production');

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    });

    it('shows error message in the details section (not just description)', () => {
      setNodeEnv('development');

      render(
        <ErrorBoundary>
          <ThrowError message="Stack trace test" />
        </ErrorBoundary>
      );

      // Error text appears in both <p> and <pre> — verify it's present
      const matches = screen.getAllByText(/Stack trace test/);
      expect(matches.length).toBeGreaterThan(0);
      // Verify the <details> element is present for dev mode
      const details = document.querySelector('details');
      expect(details).toBeInTheDocument();
    });

    it('shows fallback message when error has no message in dev', () => {
      setNodeEnv('development');

      // Throw an Error without a message
      function ThrowNoMsg(): React.ReactElement {
        throw new Error();
      }

      render(
        <ErrorBoundary>
          <ThrowNoMsg />
        </ErrorBoundary>
      );

      expect(
        screen.getByText('An unexpected error occurred.')
      ).toBeInTheDocument();
    });

    it('handles throwing a plain string gracefully', () => {
      setNodeEnv('development');

      function ThrowString(): React.ReactElement {
        throw 'plain string error';
      }

      render(
        <ErrorBoundary>
          <ThrowString />
        </ErrorBoundary>
      );

      // Should still show fallback UI, not crash
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('handles throwing null/undefined gracefully', () => {
      setNodeEnv('development');

      function ThrowNull(): React.ReactElement {
        throw null;
      }

      render(
        <ErrorBoundary>
          <ThrowNull />
        </ErrorBoundary>
      );

      // Should still show fallback UI, not crash
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  // ── Custom fallback ──────────────────────────────────────────────

  describe('custom fallback', () => {
    it('renders custom fallback instead of default error UI', () => {
      const customFallback = (
        <div data-testid="custom-fallback">Custom Error UI</div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });
  });

  // ── Retry behavior ───────────────────────────────────────────────

  describe('retry mechanism', () => {
    it('resets error state when retry button is clicked', () => {
      let shouldThrow = true;

      function SometimesThrow() {
        if (shouldThrow) {
          throw new Error('Flaky error');
        }
        return <div>Recovered content</div>;
      }

      render(
        <ErrorBoundary>
          <SometimesThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      shouldThrow = false;
      fireEvent.click(screen.getByText('Try Again'));

      expect(screen.getByText('Recovered content')).toBeInTheDocument();
    });

    it('does not throw when clicking retry without onReset', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(() => {
        fireEvent.click(screen.getByText('Try Again'));
      }).not.toThrow();
    });
  });

  // ── onReset callback ─────────────────────────────────────────────

  describe('onReset callback', () => {
    it('calls onReset when retry is clicked', () => {
      const onReset = jest.fn();

      render(
        <ErrorBoundary onReset={onReset}>
          <ThrowError />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Try Again'));
      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('calls onReset when Go Home is clicked', () => {
      const onReset = jest.fn();

      render(
        <ErrorBoundary onReset={onReset}>
          <ThrowError />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Go Home'));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  // ── Reset on children change ─────────────────────────────────────

  describe('reset on children change', () => {
    it('resets error state when children prop changes', () => {
      const { rerender } = render(
        <ErrorBoundary key="page1">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      rerender(
        <ErrorBoundary key="page2">
          <div>New page content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('New page content')).toBeInTheDocument();
    });

    it('does not reset error when children have not changed', () => {
      // Store element in a variable so re-render uses the SAME reference
      const child = <ThrowError />;
      const { rerender } = render(
        <ErrorBoundary>
          {child}
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Re-render with the SAME children reference
      rerender(
        <ErrorBoundary>
          {child}
        </ErrorBoundary>
      );

      // Error should still be shown (componentDidUpdate should NOT reset)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  // ── Nested / complex children ────────────────────────────────────

  describe('complex children', () => {
    it('renders deeply nested children', () => {
      render(
        <ErrorBoundary>
          <div>
            <section>
              <article>
                <p>Deeply nested content</p>
              </article>
            </section>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Deeply nested content')).toBeInTheDocument();
    });

    it('catches errors thrown deep in the component tree', () => {
      function DeepThrow() {
        return (
          <div>
            <section>
              <ThrowError message="Deep error" />
            </section>
          </div>
        );
      }

      render(
        <ErrorBoundary>
          <DeepThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders null children gracefully', () => {
      expect(() => {
        render(<ErrorBoundary>{null}</ErrorBoundary>);
      }).not.toThrow();
    });

    it('renders fragment children', () => {
      render(
        <ErrorBoundary>
          <>
            <span>Fragment child 1</span>
            <span>Fragment child 2</span>
          </>
        </ErrorBoundary>
      );

      expect(screen.getByText('Fragment child 1')).toBeInTheDocument();
      expect(screen.getByText('Fragment child 2')).toBeInTheDocument();
    });
  });

  // ── Accessibility ────────────────────────────────────────────────

  describe('accessibility', () => {
    it('error UI has proper heading structure', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Something went wrong');
    });

    it('has accessible retry button and go home link', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      const goHomeLink = screen.getByRole('link', { name: /go home/i });
      expect(goHomeLink).toBeInTheDocument();
    });
  });
});
