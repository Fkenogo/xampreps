import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  MessageSquare,
  Pin,
  Lock,
  Trash2,
  MoreVertical,
  Plus,
  Edit,
  Loader2,
  Search,
} from 'lucide-react';

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
  created_at: string;
  author?: { name: string };
  category?: { name: string };
  replies_count?: number;
}

export default function AdminForumModeration() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ForumCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('MessageSquare');
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch categories
    const { data: categoriesData } = await supabase
      .from('forum_categories')
      .select('*')
      .order('name');
    
    if (categoriesData) setCategories(categoriesData);

    // Fetch posts with author and category
    const { data: postsData } = await supabase
      .from('forum_posts')
      .select('*, author:profiles!forum_posts_author_id_fkey(name), category:forum_categories!forum_posts_category_id_fkey(name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (postsData) {
      // Fetch reply counts
      const postIds = postsData.map(p => p.id);
      const { data: replyCounts } = await supabase
        .from('forum_replies')
        .select('post_id')
        .in('post_id', postIds);
      
      const counts: Record<string, number> = {};
      replyCounts?.forEach(r => {
        counts[r.post_id] = (counts[r.post_id] || 0) + 1;
      });

      setPosts(postsData.map(p => ({
        ...p,
        author: p.author as { name: string } | undefined,
        category: p.category as { name: string } | undefined,
        replies_count: counts[p.id] || 0,
      })));
    }

    setLoading(false);
  };

  const handleOpenCategoryDialog = (category?: ForumCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryDescription(category.description || '');
      setCategoryIcon(category.icon || 'MessageSquare');
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
      setCategoryIcon('MessageSquare');
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    setSavingCategory(true);

    if (editingCategory) {
      const { error } = await supabase
        .from('forum_categories')
        .update({
          name: categoryName.trim(),
          description: categoryDescription.trim() || null,
          icon: categoryIcon,
        })
        .eq('id', editingCategory.id);

      if (error) {
        toast.error('Failed to update category');
      } else {
        toast.success('Category updated');
        setCategoryDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('forum_categories')
        .insert({
          name: categoryName.trim(),
          description: categoryDescription.trim() || null,
          icon: categoryIcon,
        });

      if (error) {
        toast.error('Failed to create category');
      } else {
        toast.success('Category created');
        setCategoryDialogOpen(false);
        fetchData();
      }
    }

    setSavingCategory(false);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure? This will delete all posts in this category.')) return;

    const { error } = await supabase
      .from('forum_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      toast.error('Failed to delete category');
    } else {
      toast.success('Category deleted');
      fetchData();
    }
  };

  const handleTogglePin = async (post: ForumPost) => {
    const { error } = await supabase
      .from('forum_posts')
      .update({ is_pinned: !post.is_pinned })
      .eq('id', post.id);

    if (error) {
      toast.error('Failed to update post');
    } else {
      toast.success(post.is_pinned ? 'Post unpinned' : 'Post pinned');
      fetchData();
    }
  };

  const handleToggleLock = async (post: ForumPost) => {
    const { error } = await supabase
      .from('forum_posts')
      .update({ is_locked: !post.is_locked })
      .eq('id', post.id);

    if (error) {
      toast.error('Failed to update post');
    } else {
      toast.success(post.is_locked ? 'Post unlocked' : 'Post locked');
      fetchData();
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      toast.error('Failed to delete post');
    } else {
      toast.success('Post deleted');
      fetchData();
    }
  };

  const filteredPosts = posts.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.author?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const iconOptions = ['MessageSquare', 'Lightbulb', 'HelpCircle', 'BookOpen', 'Megaphone'];

  return (
    <div className="space-y-6">
      {/* Categories Section */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Forum Categories</h3>
            <Button size="sm" className="gap-2" onClick={() => handleOpenCategoryDialog()}>
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No categories yet</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{cat.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {cat.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenCategoryDialog(cat)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Posts Section */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="font-semibold text-foreground">All Posts ({posts.length})</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No forum posts yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-center">Replies</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {post.is_pinned && <Pin className="w-4 h-4 text-primary shrink-0" />}
                      <span className="font-medium text-foreground truncate max-w-[200px]">
                        {post.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {post.category?.name || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {post.author?.name || 'Anonymous'}
                  </TableCell>
                  <TableCell className="text-center">{post.replies_count || 0}</TableCell>
                  <TableCell>
                    {post.is_locked ? (
                      <Badge variant="secondary" className="text-amber-600">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-emerald-600">
                        Open
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(post.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">Actions</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTogglePin(post)}>
                          <Pin className="w-4 h-4 mr-2" />
                          {post.is_pinned ? 'Unpin' : 'Pin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleLock(post)}>
                          <Lock className="w-4 h-4 mr-2" />
                          {post.is_locked ? 'Unlock' : 'Lock'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeletePost(post.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Category name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Input
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Optional description"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Icon</label>
              <div className="flex gap-2 mt-1">
                {iconOptions.map((icon) => (
                  <Button
                    key={icon}
                    type="button"
                    variant={categoryIcon === icon ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setCategoryIcon(icon)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={savingCategory}>
              {savingCategory && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCategory ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
