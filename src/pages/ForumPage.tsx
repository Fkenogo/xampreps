import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  createForumPostFirebase,
  createForumReplyFirebase,
  listForumCategoriesFirebase,
  listForumPostsFirebase,
  listForumRepliesFirebase,
} from '@/integrations/firebase/forum';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Search, MessageSquare, Loader2 } from 'lucide-react';

import {
  ForumCategoryList,
  ForumPostCard,
  ForumPostDetail,
  NewPostModal,
} from '@/components/forum';

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
  const [searchParams] = useSearchParams();
  const { user, role } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New post modal
  const [showNewPostModal, setShowNewPostModal] = useState(searchParams.get('new') === 'true');
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
    try {
      const result = await listForumCategoriesFirebase();
      if (result.ok) {
        setCategories(result.items);
      }
    } catch (error) {
      console.error('Error fetching Firebase forum categories:', error);
    }
  };

  const fetchPosts = async (categoryId?: string) => {
    setLoading(true);
    try {
      const result = await listForumPostsFirebase(categoryId);
      if (result.ok) {
        setPosts(result.items);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching Firebase forum posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (postId: string) => {
    try {
      const result = await listForumRepliesFirebase(postId);
      if (result.ok) {
        setReplies(result.items);
      } else {
        setReplies([]);
      }
    } catch (error) {
      console.error('Error fetching Firebase forum replies:', error);
      setReplies([]);
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
    try {
      const result = await createForumPostFirebase({
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        categoryId: newPostCategory,
        tags: newPostTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      if (!result.ok) {
        toast.error('Failed to create post');
        setSubmitting(false);
        return;
      }
    } catch (error) {
      toast.error('Failed to create post');
      console.error(error);
      setSubmitting(false);
      return;
    }

    toast.success('Post created successfully!');
    setShowNewPostModal(false);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostCategory('');
    setNewPostTags('');
    fetchPosts(selectedCategory || undefined);
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
    try {
      const result = await createForumReplyFirebase({
        postId: selectedPost.id,
        content: replyContent.trim(),
      });
      if (!result.ok) {
        toast.error('Failed to post reply');
        setSubmittingReply(false);
        return;
      }
    } catch (error) {
      toast.error('Failed to post reply');
      console.error(error);
      setSubmittingReply(false);
      return;
    }
    toast.success('Reply posted!');
    setReplyContent('');
    fetchReplies(selectedPost.id);
    setSubmittingReply(false);
  };

  const filteredPosts = posts.filter((post) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(query) ||
      post.content.toLowerCase().includes(query) ||
      post.tags?.some((t) => t.toLowerCase().includes(query))
    );
  });

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
            <ForumCategoryList
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
            />
          </div>

          {/* Posts / Post Detail */}
          <div className="lg:col-span-3">
            {selectedPost ? (
              <ForumPostDetail
                post={selectedPost}
                replies={replies}
                canPost={canPost}
                replyContent={replyContent}
                onReplyContentChange={setReplyContent}
                onSubmitReply={handleSubmitReply}
                submittingReply={submittingReply}
                onBack={() => setSelectedPost(null)}
              />
            ) : (
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
                    <ForumPostCard
                      key={post.id}
                      post={post}
                      onClick={() => handlePostSelect(post)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* New Post Modal */}
        <NewPostModal
          open={showNewPostModal}
          onOpenChange={setShowNewPostModal}
          categories={categories}
          title={newPostTitle}
          onTitleChange={setNewPostTitle}
          content={newPostContent}
          onContentChange={setNewPostContent}
          category={newPostCategory}
          onCategoryChange={setNewPostCategory}
          tags={newPostTags}
          onTagsChange={setNewPostTags}
          onSubmit={handleCreatePost}
          submitting={submitting}
        />
      </div>
    </DashboardLayout>
  );
}
