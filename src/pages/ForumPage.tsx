import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Plus, 
  Pin, 
  Lock, 
  ChevronRight,
  Search,
  Users,
  Loader2,
  Clock,
  ThumbsUp,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ForumCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  category_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  author?: { name: string };
  replies_count?: number;
}

interface ForumReply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { name: string };
}

export default function ForumPage() {
  const { user, profile, role } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New post modal
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('');
  const [newPostTags, setNewPostTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Reply state
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('forum_categories')
      .select('*')
      .order('name');
    
    if (data) setCategories(data);
  };

  const fetchPosts = async (categoryId?: string) => {
    setLoading(true);
    let query = supabase
      .from('forum_posts')
      .select('*, author:profiles!forum_posts_author_id_fkey(name)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    const { data, error } = await query;
    
    if (data) {
      // Fetch reply counts
      const postIds = data.map(p => p.id);
      const { data: replyCounts } = await supabase
        .from('forum_replies')
        .select('post_id')
        .in('post_id', postIds);
      
      const counts: Record<string, number> = {};
      replyCounts?.forEach(r => {
        counts[r.post_id] = (counts[r.post_id] || 0) + 1;
      });
      
      setPosts(data.map(p => ({
        ...p,
        author: p.author as { name: string } | undefined,
        replies_count: counts[p.id] || 0,
      })));
    }
    setLoading(false);
  };

  const fetchReplies = async (postId: string) => {
    const { data } = await supabase
      .from('forum_replies')
      .select('*, author:profiles!forum_replies_author_id_fkey(name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setReplies(data.map(r => ({
        ...r,
        author: r.author as { name: string } | undefined,
      })));
    }
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setSelectedPost(null);
    fetchPosts(categoryId || undefined);
  };

  const handlePostSelect = (post: ForumPost) => {
    setSelectedPost(post);
    fetchReplies(post.id);
  };

  const handleCreatePost = async () => {
    if (!user || !newPostTitle.trim() || !newPostContent.trim() || !newPostCategory) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('forum_posts').insert({
      title: newPostTitle.trim(),
      content: newPostContent.trim(),
      category_id: newPostCategory,
      author_id: user.id,
      tags: newPostTags.split(',').map(t => t.trim()).filter(Boolean),
    });

    if (error) {
      toast.error('Failed to create post');
      console.error(error);
    } else {
      toast.success('Post created successfully!');
      setShowNewPostModal(false);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('');
      setNewPostTags('');
      fetchPosts(selectedCategory || undefined);
    }
    setSubmitting(false);
  };

  const handleSubmitReply = async () => {
    if (!user || !selectedPost || !replyContent.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    if (selectedPost.is_locked) {
      toast.error('This post is locked');
      return;
    }

    setSubmittingReply(true);
    const { error } = await supabase.from('forum_replies').insert({
      post_id: selectedPost.id,
      author_id: user.id,
      content: replyContent.trim(),
    });

    if (error) {
      toast.error('Failed to post reply');
      console.error(error);
    } else {
      toast.success('Reply posted!');
      setReplyContent('');
      fetchReplies(selectedPost.id);
    }
    setSubmittingReply(false);
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(query) ||
      post.content.toLowerCase().includes(query) ||
      post.tags?.some(t => t.toLowerCase().includes(query))
    );
  });

  const getCategoryIcon = (iconName: string | null) => {
    // Default to MessageSquare
    return MessageSquare;
  };

  const isParent = role === 'parent';
  const isAdmin = role === 'admin';
  const canPost = isParent || isAdmin;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Parent Community 💬
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect with other parents, share tips, and get support
            </p>
          </div>
          
          {canPost && (
            <Button className="gap-2" onClick={() => setShowNewPostModal(true)}>
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3">Categories</h3>
              <div className="space-y-1">
                <button
                  onClick={() => handleCategorySelect(null)}
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
                  const Icon = getCategoryIcon(cat.icon);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
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
          </div>

          {/* Posts / Post Detail */}
          <div className="lg:col-span-3">
            {selectedPost ? (
              // Post Detail View
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPost(null)}
                  className="gap-1"
                >
                  ← Back to posts
                </Button>

                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {selectedPost.is_pinned && (
                          <Badge variant="secondary" className="text-xs">
                            <Pin className="w-3 h-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                        {selectedPost.is_locked && (
                          <Badge variant="secondary" className="text-xs text-amber-600">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-foreground mb-2">
                        {selectedPost.title}
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{selectedPost.author?.name || 'Anonymous'}</span>
                        <span>•</span>
                        <span>{format(new Date(selectedPost.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none text-foreground">
                    {selectedPost.content}
                  </div>

                  {selectedPost.tags && selectedPost.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedPost.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Replies */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">
                    Replies ({replies.length})
                  </h3>

                  {replies.map((reply) => (
                    <div key={reply.id} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {reply.author?.name || 'Anonymous'}
                        </span>
                        <span>•</span>
                        <span>{format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      <p className="text-foreground">{reply.content}</p>
                    </div>
                  ))}

                  {/* Reply Form */}
                  {canPost && !selectedPost.is_locked && (
                    <div className="bg-card rounded-xl border border-border p-4">
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="mb-3"
                        rows={3}
                      />
                      <Button
                        onClick={handleSubmitReply}
                        disabled={submittingReply || !replyContent.trim()}
                      >
                        {submittingReply && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Post Reply
                      </Button>
                    </div>
                  )}

                  {selectedPost.is_locked && (
                    <div className="bg-muted rounded-xl p-4 text-center text-muted-foreground">
                      <Lock className="w-5 h-5 mx-auto mb-2" />
                      This post is locked and no longer accepting replies
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Posts List
              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="bg-card rounded-xl border border-border p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No posts yet</h3>
                    <p className="text-muted-foreground mb-4">
                      {canPost
                        ? 'Be the first to start a conversation!'
                        : 'Check back later for community discussions'}
                    </p>
                    {canPost && (
                      <Button onClick={() => setShowNewPostModal(true)}>
                        Create First Post
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => handlePostSelect(post)}
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
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* New Post Modal */}
        <Dialog open={showNewPostModal} onOpenChange={setShowNewPostModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Category *
                </label>
                <Select value={newPostCategory} onValueChange={setNewPostCategory}>
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
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Title *
                </label>
                <Input
                  placeholder="Enter a descriptive title"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Content *
                </label>
                <Textarea
                  placeholder="Share your thoughts, questions, or tips..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={5}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Tags (comma-separated)
                </label>
                <Input
                  placeholder="e.g., study tips, PLE, homework"
                  value={newPostTags}
                  onChange={(e) => setNewPostTags(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewPostModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePost} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
