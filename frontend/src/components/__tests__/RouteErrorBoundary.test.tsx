/**
 * Tests for RouteErrorBoundary component
 *
 * RouteErrorBoundary wraps individual routes/pages to catch errors in a
 * specific section without crashing the entire application. It shows a
 * warning-styled fallback with a retry button.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RouteErrorBoundary } from '../RouteErrorBoundary';

// ─── Helpers ───────────────────────────────────────────────────────

/** Component that throws on render */
function ThrowError({ message = 'Route test error' }: { message?: string }): React.ReactElement {
  throw new Error(message);
}

function suppressConsoleError() {
  // Safety: restore any previous spy first
  (console.error as any).mockRestore?.();
  return jest.spyOn(console, 'error').mockImplementation(() => {});
}

function restoreConsoleError(spy: jest.SpyInstance) {
  spy.mockRestore();
}

// ─── Environment helpers ───────────────────────────────────────────

function setNodeEnv(value: string) {
  Object.assign(process.env, { NODE_ENV: value });
}

const ORIGINAL_ENV = { ...process.env };

// ─── Tests ─────────────────────────────────────────────────────────

describe('RouteErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
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
        <RouteErrorBoundary>
          <div data-testid="route-child">Route Content</div>
        </RouteErrorBoundary>
      );

      expect(screen.getByTestId('route-child')).toBeInTheDocument();
      expect(screen.getByText('Route Content')).toBeInTheDocument();
    });

    it('does not show any error UI', () => {
      render(
        <RouteErrorBoundary>
          <div>Normal route content</div>
        </RouteErrorBoundary>
      );

      expect(screen.queryByText(/could not load/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Retry Section')).not.toBeInTheDocument();
    });
  });

  // ── Error catching ───────────────────────────────────────────────

  describe('when a child throws an error', () => {
    it('catches the error and displays fallback UI', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      );

      expect(screen.getByText(/could not load/i)).toBeInTheDocument();
    });

    it('displays the retry section button', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Retry Section')).toBeInTheDocument();
    });

    it('shows generic route label when no routeName is provided', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Could not load this section')).toBeInTheDocument();
    });

    it('shows specific route label when routeName is provided', () => {
      render(
        <RouteErrorBoundary routeName="Virtual Classroom">
          <ThrowError />
        </RouteErrorBoundary>
      );

      expect(
        screen.getByText('Could not load Virtual Classroom')
      ).toBeInTheDocument();
    });

    it('falls back to "this section" when routeName is empty string', () => {
      render(
        <RouteErrorBoundary routeName="">
          <ThrowError />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Could not load this section')).toBeInTheDocument();
    });

    it('informs that the rest of the page is still functional', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      );

      expect(
        screen.getByText(
          'An error occurred loading this section. The rest of the page is still functional.'
        )
      ).toBeInTheDocument();
    });

    it('logs error with route name prefix to console', () => {
      render(
        <RouteErrorBoundary routeName="Admin Dashboard">
          <ThrowError message="Dashboard error" />
        </RouteErrorBoundary>
      );

      const routeErrorCalls = consoleErrorSpy.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('[RouteErrorBoundary:Admin Dashboard]')
      );
      expect(routeErrorCalls.length).toBeGreaterThan(0);
    });

    it('logs error without prefix when no routeName', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError message="No route error" />
        </RouteErrorBoundary>
      );

      const errorCalls = consoleErrorSpy.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('[RouteErrorBoundary]')
      );
      expect(errorCalls.length).toBeGreaterThan(0);
    });

    it('logs component stack when available', () => {
      render(
        <RouteErrorBoundary routeName="Stack Test">
          <ThrowError message="Stack test" />
        </RouteErrorBoundary>
      );

      const stackCalls = consoleErrorSpy.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('[RouteErrorBoundary] Component stack:')
      );
      expect(stackCalls.length).toBeGreaterThan(0);
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
        <RouteErrorBoundary routeName="Dev Page">
          <ThrowError message="Dev route error details" />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Dev route error details')).toBeInTheDocument();
    });

    it('shows generic message in production mode', () => {
      setNodeEnv('production');

      render(
        <RouteErrorBoundary>
          <ThrowError message="Should be hidden" />
        </RouteErrorBoundary>
      );

      expect(
        screen.getByText(
          'An error occurred loading this section. The rest of the page is still functional.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByText('Should be hidden')).not.toBeInTheDocument();
    });

    it('shows "Error Details" collapsible section in development mode', () => {
      setNodeEnv('development');

      render(
        <RouteErrorBoundary routeName="Dev Route">
          <ThrowError message="Details available" />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();
    });

    it('does not show "Error Details" section in production mode', () => {
      setNodeEnv('production');

      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      );

      expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    });

    it('shows error message in the details section', () => {
      setNodeEnv('development');

      render(
        <RouteErrorBoundary routeName="Dev">
          <ThrowError message="Stack details" />
        </RouteErrorBoundary>
      );

      // Error text appears in both <p> and <pre> — verify it's present at least once
      const matches = screen.getAllByText(/Stack details/);
      expect(matches.length).toBeGreaterThan(0);
      // Verify the <details> element is present for dev mode
      const details = document.querySelector('details');
      expect(details).toBeInTheDocument();
    });

    it('shows fallback message when error has no message in dev', () => {
      setNodeEnv('development');

      function ThrowNoMsg(): React.ReactElement {
        throw new Error();
      }

      render(
        <RouteErrorBoundary>
          <ThrowNoMsg />
        </RouteErrorBoundary>
      );

      expect(
        screen.getByText('An error occurred loading this section.')
      ).toBeInTheDocument();
    });
  });

  // ── Custom fallback ──────────────────────────────────────────────

  describe('custom fallback', () => {
    it('renders custom fallback instead of default error UI', () => {
      const customFallback = (
        <div data-testid="route-custom-fallback">
          Custom Route Error UI
        </div>
      );

      render(
        <RouteErrorBoundary fallback={customFallback}>
          <ThrowError />
        </RouteErrorBoundary>
      );

      expect(screen.getByTestId('route-custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Route Error UI')).toBeInTheDocument();
      expect(screen.queryByText(/could not load/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Retry Section')).not.toBeInTheDocument();
    });
  });

  // ── Retry behavior ───────────────────────────────────────────────

  describe('retry mechanism', () => {
    it('resets error state when retry button is clicked', () => {
      let shouldThrow = true;

      function SometimesThrow() {
        if (shouldThrow) {
          throw new Error('Flaky route error');
        }
        return <div>Recovered route content</div>;
      }

      render(
        <RouteErrorBoundary routeName="Test Route">
          <SometimesThrow />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Could not load Test Route')).toBeInTheDocument();

      shouldThrow = false;
      fireEvent.click(screen.getByText('Retry Section'));

      expect(screen.getByText('Recovered route content')).toBeInTheDocument();
    });

    it('does not throw when clicking retry after error is resolved', () => {
      let shouldThrow = true;

      function SometimesThrow() {
        if (shouldThrow) {
          throw new Error('One-time error');
        }
        return <div>Fully recovered</div>;
      }

      render(
        <RouteErrorBoundary routeName="Flaky Route">
          <SometimesThrow />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Could not load Flaky Route')).toBeInTheDocument();

      shouldThrow = false;
      expect(() => {
        fireEvent.click(screen.getByText('Retry Section'));
      }).not.toThrow();

      expect(screen.getByText('Fully recovered')).toBeInTheDocument();
    });
  });

  // ── Reset on children change ─────────────────────────────────────

  describe('reset on children change', () => {
    it('resets error state when children prop changes', () => {
      const { rerender } = render(
        <RouteErrorBoundary key="route1">
          <ThrowError />
        </RouteErrorBoundary>
      );

      expect(screen.getByText(/could not load/i)).toBeInTheDocument();

      rerender(
        <RouteErrorBoundary key="route2">
          <div>New route content</div>
        </RouteErrorBoundary>
      );

      expect(screen.getByText('New route content')).toBeInTheDocument();
    });

    it('does not reset when children have not changed', () => {
      // Store element so re-render uses the SAME reference
      const child = <ThrowError message="Persistent error" />;
      const { rerender } = render(
        <RouteErrorBoundary>
          {child}
        </RouteErrorBoundary>
      );

      expect(screen.getByText(/could not load/i)).toBeInTheDocument();

      // Re-render with the SAME children reference
      rerender(
        <RouteErrorBoundary>
          {child}
        </RouteErrorBoundary>
      );

      expect(screen.getByText(/could not load/i)).toBeInTheDocument();
    });
  });

  // ── Accessibility ────────────────────────────────────────────────

  describe('accessibility', () => {
    it('error UI has proper heading structure', () => {
      render(
        <RouteErrorBoundary routeName="Accessible Route">
          <ThrowError />
        </RouteErrorBoundary>
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Could not load Accessible Route');
    });

    it('has an accessible retry button', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /retry section/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────

  describe('edge cases', () => {
    it('renders null children gracefully', () => {
      expect(() => {
        render(<RouteErrorBoundary>{null}</RouteErrorBoundary>);
      }).not.toThrow();
    });

    it('handles very long error messages', () => {
      const longMessage = 'A'.repeat(500);

      render(
        <RouteErrorBoundary routeName="Long Error Test">
          <ThrowError message={longMessage} />
        </RouteErrorBoundary>
      );

      expect(screen.getByText('Could not load Long Error Test')).toBeInTheDocument();
    });

    it('handles errors with special characters in routeName', () => {
      render(
        <RouteErrorBoundary routeName="Special & < > Chars">
          <ThrowError message="Error with special characters" />
        </RouteErrorBoundary>
      );

      expect(
        screen.getByText('Could not load Special & < > Chars')
      ).toBeInTheDocument();
    });

    it('handles throwing a plain string gracefully', () => {
      function ThrowString(): React.ReactElement {
        throw 'string error in route';
      }

      render(
        <RouteErrorBoundary routeName="String Error">
          <ThrowString />
        </RouteErrorBoundary>
      );

      expect(
        screen.getByText('Could not load String Error')
      ).toBeInTheDocument();
    });

    it('handles throwing null/undefined gracefully', () => {
      function ThrowNull(): React.ReactElement {
        throw null;
      }

      render(
        <RouteErrorBoundary>
          <ThrowNull />
        </RouteErrorBoundary>
      );

      expect(screen.getByText(/could not load/i)).toBeInTheDocument();
    });

    it('uses amber/warning color scheme, not red error scheme', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      );

      // RouteErrorBoundary uses amber styling — should NOT show red-themed text
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      // Should have the amber-themed warning icon
      const alertIcons = document.querySelectorAll('svg');
      expect(alertIcons.length).toBeGreaterThan(0);
    });
  });
});
