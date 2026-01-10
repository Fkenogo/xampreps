import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ForumCategory {
  id: string;
  name: string;
}

interface NewPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ForumCategory[];
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  tags: string;
  onTagsChange: (tags: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export default function NewPostModal({
  open,
  onOpenChange,
  categories,
  title,
  onTitleChange,
  content,
  onContentChange,
  category,
  onCategoryChange,
  tags,
  onTagsChange,
  onSubmit,
  submitting,
}: NewPostModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="post-title">Title *</Label>
            <Input
              id="post-title"
              placeholder="Enter post title..."
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-category">Category *</Label>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-content">Content *</Label>
            <Textarea
              id="post-content"
              placeholder="Write your post content... (Markdown supported)"
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-tags">Tags (comma-separated)</Label>
            <Input
              id="post-tags"
              placeholder="e.g. PLE, Math, Tips"
              value={tags}
              onChange={(e) => onTagsChange(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
