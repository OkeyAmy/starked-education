'use client';

import * as React from 'react';

interface CalendarProps {
  mode?: 'single' | 'range' | 'multiple';
  selected?: Date | Date[] | { from: Date; to: Date };
  onSelect?: (date: Date | undefined) => void;
  className?: string;
  disabled?: boolean | ((date: Date) => boolean);
  fromDate?: Date;
  toDate?: Date;
}

export const Calendar: React.FC<CalendarProps> = ({ className = '', ...props }) => (
  <div className={`p-4 bg-white rounded-lg border border-gray-200 ${className}`}>
    <input
      type="date"
      aria-label="Choose date"
      className="w-full px-3 py-2 border border-gray-300 rounded-md"
      onChange={(e) => {
        const date = e.target.value ? new Date(e.target.value) : undefined;
        props.onSelect?.(date);
      }}
    />
  </div>
);
