import React, { useState, useCallback } from 'react';

interface AuditResult {
  id: string;
  category: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  element?: string;
  helpUrl?: string;
}

interface AxeViolationNode {
  target?: string[];
  html?: string;
  failureSummary?: string;
}

interface AxeViolation {
  id: string;
  impact?: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeViolationNode[];
}

interface AxeRunResult {
  violations: AxeViolation[];
  passes: { id: string; description: string }[];
  incomplete: AxeViolation[];
}

interface AxeRunner {
  run: (
    context: Element,
    options?: Record<string, unknown>,
  ) => Promise<AxeRunResult>;
}

// Fallback demo results keep the dashboard useful in environments where
// axe-core cannot execute (SSR, restricted sandboxes, etc.). These mirror
// the WCAG 2.1 AA success criteria the dashboard reports on.
const fallbackResults: AuditResult[] = [
  { id: '1', category: 'Contrast', status: 'passed', message: 'All text meets WCAG AA 4.5:1 ratio.' },
  { id: '2', category: 'ARIA Labels', status: 'warning', message: 'Some interactive elements might need descriptive aria-labels.', element: 'button.close-btn' },
  { id: '3', category: 'Keyboard Nav', status: 'passed', message: 'No keyboard traps detected. Tab order is logical.' },
  { id: '4', category: 'Alt Text', status: 'warning', message: 'Ensure all newly uploaded course images include alt text.', element: 'img.course-thumbnail' },
  { id: '5', category: 'Screen Reader', status: 'passed', message: 'Live regions and ARIA landmarks are properly configured.' },
];

/**
 * Translate an axe-core `impact` level into the dashboard's status vocabulary.
 */
const impactToStatus = (
  impact: AxeViolation['impact'],
): AuditResult['status'] => {
  if (impact === 'critical' || impact === 'serious') return 'failed';
  if (impact === 'moderate') return 'warning';
  return 'warning';
};

/**
 * Best-effort human-readable category derived from the axe rule id.
 * Falls back to the rule id when the prefix is unfamiliar.
 */
const categoryFor = (id: string): string => {
  const lower = id.toLowerCase();
  if (lower.includes('contrast')) return 'Contrast';
  if (lower.includes('label') || lower.includes('aria')) return 'ARIA Labels';
  if (lower.includes('keyboard') || lower.includes('focus')) return 'Keyboard Nav';
  if (lower.includes('image') || lower.includes('alt')) return 'Alt Text';
  if (lower.startsWith('region') || lower.includes('landmark')) return 'ARIA Landmarks';
  if (lower.includes('live') || lower.includes('status')) return 'Screen Reader';
  return id;
};

/**
 * Load axe-core incrementally so it doesn't bloat the SSR bundle or the
 * initial JS payload. Returns `null` if it fails to load.
 *
 * NOTE: axe-core lives in `dependencies` (not `devDependencies`) on purpose
 * because this is a dynamic *runtime* import. Do not move it back to
 * devDependencies — production builds need it resolvable.
 */
const loadAxe = async (): Promise<AxeRunner | null> => {
  try {
    const mod = await import('axe-core');
    return (mod as unknown as { default?: AxeRunner } & AxeRunner).default ??
      (mod as unknown as AxeRunner);
  } catch {
    return null;
  }
};

export const AccessibilityDashboard: React.FC = () => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runAudit = useCallback(async () => {
    setIsAuditing(true);
    setErrorMessage(null);

    const axe = await loadAxe();

    if (!axe || typeof document === 'undefined') {
      // SSR or axe unavailable — show the existing green/warning demo so the
      // dashboard renders meaningfully in tests / previews.
      setResults(fallbackResults);
      setUsedFallback(true);
      setIsAuditing(false);
      return;
    }

    // Narrow catch: axe-core rejects with Errors that carry a `name` of
    // 'TypeError', 'InvalidStateError' or its own message prefix.
    // Any other error is propagated so it doesn't silently mask real bugs.
    try {
      const run = await axe.run(document.documentElement, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        resultTypes: ['violations', 'passes', 'incomplete'],
      });

      const mappedViolations: AuditResult[] = run.violations.map((v, index) => ({
        id: `v-${index}-${v.id}`,
        category: categoryFor(v.id),
        status: impactToStatus(v.impact ?? null),
        message: `${v.help} — ${v.nodes.length} element${v.nodes.length === 1 ? '' : 's'} affected`,
        element: v.nodes[0]?.target?.join(' ') ?? v.nodes[0]?.html,
        helpUrl: v.helpUrl,
      }));

      const passedSummary: AuditResult[] = run.passes.slice(0, 3).map((p, index) => ({
        id: `p-${index}-${p.id}`,
        category: 'Passed',
        status: 'passed',
        message: p.description,
      }));

      setResults([...mappedViolations, ...passedSummary]);
      setUsedFallback(false);
    } catch (err) {
      const isAxeError =
        err instanceof Error &&
        (err.name === 'TypeError' ||
          err.name === 'InvalidStateError' ||
          /axe/i.test(err.message));
      if (!isAxeError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown audit error';
      setErrorMessage(message);
      setResults(fallbackResults);
      setUsedFallback(true);
    } finally {
      setIsAuditing(false);
    }
  }, []);

  return (
    <div
      className="p-6 max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md"
      role="region"
      aria-label="Accessibility Audit Dashboard"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Accessibility Audit Dashboard</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Scans the current page against WCAG 2.1 A &amp; AA rules using axe-core.
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={isAuditing}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 transition-all min-h-[44px] min-w-[44px]"
          aria-busy={isAuditing}
        >
          {isAuditing ? 'Running Audit...' : 'Run WCAG Audit'}
        </button>
      </div>

      {usedFallback && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200"
        >
          {errorMessage
            ? `axe-core could not run: ${errorMessage}. Showing sample WCAG checks instead.`
            : 'axe-core was not available in this environment. Showing sample WCAG checks instead.'}
        </div>
      )}

      <div className="space-y-4" aria-live="polite">
        {results.length === 0 && !isAuditing && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No audit results yet. Click &quot;Run WCAG Audit&quot; to scan the interface.
          </p>
        )}

        {results.map(result => (
          <div
            key={result.id}
            className={`p-4 rounded-lg border-l-4 ${
              result.status === 'passed'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : result.status === 'failed'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                  {result.category} — {result.status}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{result.message}</p>
                {result.element && (
                  <code className="mt-2 block text-sm bg-black/10 dark:bg-white/10 p-2 rounded text-gray-800 dark:text-gray-200 break-words">
                    Selector: {result.element}
                  </code>
                )}
                {result.helpUrl && (
                  <a
                    href={result.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-blue-700 dark:text-blue-300 underline focus-visible:outline-2 focus-visible:outline-blue-500"
                  >
                    Why this matters →
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccessibilityDashboard;
