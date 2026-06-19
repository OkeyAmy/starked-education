import { RefObject, useEffect, useRef } from 'react';

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'details > summary:first-of-type',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type KeyHandler = (event: KeyboardEvent) => void;

export interface KeyboardNavigationOptions {
  onEnter?: KeyHandler;
  onEscape?: KeyHandler;
  onArrowUp?: KeyHandler;
  onArrowDown?: KeyHandler;
  onArrowLeft?: KeyHandler;
  onArrowRight?: KeyHandler;
  onHome?: KeyHandler;
  onEnd?: KeyHandler;
  onSpace?: KeyHandler;
  target?: RefObject<HTMLElement> | null;
}

export const useKeyboardNavigation = (
  options: KeyboardNavigationOptions,
  isActive = true
) => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!isActive) return;

    const target = optionsRef.current.target?.current ?? document;
    const handleKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      const handlers: Record<string, KeyHandler | undefined> = {
        Enter: optionsRef.current.onEnter,
        Escape: optionsRef.current.onEscape,
        ArrowUp: optionsRef.current.onArrowUp,
        ArrowDown: optionsRef.current.onArrowDown,
        ArrowLeft: optionsRef.current.onArrowLeft,
        ArrowRight: optionsRef.current.onArrowRight,
        Home: optionsRef.current.onHome,
        End: optionsRef.current.onEnd,
        ' ': optionsRef.current.onSpace,
      };

      handlers[keyboardEvent.key]?.(keyboardEvent);
    };

    target.addEventListener('keydown', handleKeyDown);
    return () => target.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
};

export interface FocusTrapOptions {
  onEscape?: () => void;
  initialFocusRef?: RefObject<HTMLElement>;
  restoreFocus?: boolean;
}

export const useFocusTrap = <T extends HTMLElement = HTMLDivElement>(
  isActive: boolean,
  options: FocusTrapOptions = {}
) => {
  const containerRef = useRef<T>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusableElements = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) =>
          !element.hasAttribute('disabled') &&
          element.getAttribute('aria-hidden') !== 'true' &&
          element.getClientRects().length > 0
      );

    const focusInitialElement = () => {
      const requestedElement = optionsRef.current.initialFocusRef?.current;
      const firstElement = getFocusableElements()[0];
      (requestedElement ?? firstElement ?? container).focus();
    };

    const frame = window.requestAnimationFrame(focusInitialElement);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && optionsRef.current.onEscape) {
        event.preventDefault();
        optionsRef.current.onEscape();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      container.removeEventListener('keydown', handleKeyDown);
      if (optionsRef.current.restoreFocus !== false && previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [isActive]);

  return containerRef;
};
