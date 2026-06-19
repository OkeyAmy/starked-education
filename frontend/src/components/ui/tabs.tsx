'use client';

import * as React from 'react';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({ value: '', onValueChange: () => {} });

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, value, onValueChange, children, ...props }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const contextValue = {
    value: value ?? internalValue,
    onValueChange: onValueChange ?? setInternalValue,
  };
  return (
    <TabsContext.Provider value={contextValue}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-700 ${className}`}
      {...props}
    />
  )
);
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className = '', value, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = React.useContext(TabsContext);
    const isActive = selectedValue === value;
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${isActive ? 'bg-white text-gray-950 shadow-sm' : ''} ${className}`}
        onClick={() => onValueChange(value)}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const tabs = Array.from(
            event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []
          );
          const currentIndex = tabs.indexOf(event.currentTarget);
          const nextIndex =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
              ? tabs.length - 1
              : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
                tabs.length;
          tabs[nextIndex]?.focus();
          tabs[nextIndex]?.click();
        }}
        data-state={isActive ? 'active' : 'inactive'}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className = '', value, ...props }, ref) => {
    const { value: selectedValue } = React.useContext(TabsContext);
    if (selectedValue !== value) return null;
    return (
      <div
        ref={ref}
        role="tabpanel"
        tabIndex={0}
        className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${className}`}
        data-state={selectedValue === value ? 'active' : 'inactive'}
        {...props}
      />
    );
  }
);
TabsContent.displayName = 'TabsContent';
