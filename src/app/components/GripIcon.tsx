import { MoreVertical } from 'lucide-react';

export function GripIcon() {
  return (
    <div className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-grab active:cursor-grabbing">
      <MoreVertical className="w-3 h-3 text-gray-400" />
    </div>
  );
}
