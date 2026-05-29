import { getCategoryColor } from '../lib/colors';
import { cn } from '../lib/utils';

interface Props {
  category: string;
  className?: string;
}

export function CategoryBadge({ category, className }: Props) {
  return (
    <span className={cn('text-xs font-bold px-3 py-1 rounded-lg', getCategoryColor(category), className)}>
      {category}
    </span>
  );
}
