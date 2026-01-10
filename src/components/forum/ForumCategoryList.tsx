import { MessageSquare, Lightbulb, HelpCircle, BookOpen, Megaphone, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForumCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface ForumCategoryListProps {
  categories: ForumCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const iconMap: Record<string, LucideIcon> = {
  MessageSquare,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Megaphone,
};

export default function ForumCategoryList({
  categories,
  selectedCategory,
  onSelectCategory,
}: ForumCategoryListProps) {
  const getIcon = (iconName: string | null): LucideIcon => {
    if (iconName && iconMap[iconName]) {
      return iconMap[iconName];
    }
    return MessageSquare;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-semibold text-foreground mb-3">Categories</h3>
      <div className="space-y-1">
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            !selectedCategory
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <MessageSquare className="w-4 h-4" />
          All Posts
        </button>
        {categories.map((cat) => {
          const Icon = getIcon(cat.icon);
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
