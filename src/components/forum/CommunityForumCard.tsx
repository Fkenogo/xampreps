import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommunityForumCardProps {
  onNewPost?: () => void;
}

export default function CommunityForumCard({ onNewPost }: CommunityForumCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Parent Community</h3>
            <p className="text-sm text-muted-foreground">Connect with other parents</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Share tips, ask questions, and get support from other parents in our community forum.
      </p>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1 gap-2"
          onClick={() => navigate('/forum')}
        >
          <ArrowRight className="w-4 h-4" />
          View Forum
        </Button>
        <Button 
          className="flex-1 gap-2"
          onClick={onNewPost}
        >
          <Plus className="w-4 h-4" />
          New Post
        </Button>
      </div>
    </div>
  );
}
