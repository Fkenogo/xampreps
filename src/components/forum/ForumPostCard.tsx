import { Pin, Lock, Clock, MessageCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface ForumPostCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    is_pinned: boolean;
    is_locked: boolean;
    created_at: string;
    author?: { name: string };
    replies_count?: number;
  };
  onClick: () => void;
}

export default function ForumPostCard({ post, onClick }: ForumPostCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl border border-border p-4 hover:shadow-lg hover:border-primary/30 transition-all text-left group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.is_pinned && (
              <Pin className="w-4 h-4 text-primary shrink-0" />
            )}
            {post.is_locked && (
              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {post.title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {post.content}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{post.author?.name || 'Anonymous'}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(post.created_at), 'MMM d')}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {post.replies_count || 0}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
    </button>
  );
}
