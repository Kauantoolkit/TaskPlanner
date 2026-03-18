import React from 'react';

export function KanbanProgress({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b dark:border-gray-700">
      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Progresso:</span>
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm font-medium w-10 text-right dark:text-gray-200">{percent}%</span>
    </div>
  );
}
