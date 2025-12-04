import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Exam = Database['public']['Tables']['exams']['Row'];

interface ExamEditDialogProps {
  exam: Exam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function ExamEditDialog({ exam, open, onOpenChange, onSaved }: ExamEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    level: 'PLE' as 'PLE' | 'UCE' | 'UACE',
    year: new Date().getFullYear(),
    time_limit: 60,
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    type: 'Past Paper' as 'Past Paper' | 'Practice Paper',
    is_free: true,
    description: '',
  });

  useEffect(() => {
    if (exam) {
      setFormData({
        title: exam.title,
        subject: exam.subject,
        level: exam.level,
        year: exam.year,
        time_limit: exam.time_limit,
        difficulty: exam.difficulty,
        type: exam.type,
        is_free: exam.is_free,
        description: exam.description || '',
      });
    } else {
      setFormData({
        title: '',
        subject: '',
        level: 'PLE',
        year: new Date().getFullYear(),
        time_limit: 60,
        difficulty: 'Medium',
        type: 'Past Paper',
        is_free: true,
        description: '',
      });
    }
  }, [exam, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (exam) {
        // Update existing exam
        const { error } = await supabase
          .from('exams')
          .update({
            title: formData.title,
            subject: formData.subject,
            level: formData.level,
            year: formData.year,
            time_limit: formData.time_limit,
            difficulty: formData.difficulty,
            type: formData.type,
            is_free: formData.is_free,
            description: formData.description || null,
          })
          .eq('id', exam.id);

        if (error) throw error;
        toast({ title: 'Exam updated successfully' });
      } else {
        // Create new exam
        const { error } = await supabase
          .from('exams')
          .insert({
            title: formData.title,
            subject: formData.subject,
            level: formData.level,
            year: formData.year,
            time_limit: formData.time_limit,
            difficulty: formData.difficulty,
            type: formData.type,
            is_free: formData.is_free,
            description: formData.description || null,
          });

        if (error) throw error;
        toast({ title: 'Exam created successfully' });
      }

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exam ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., PLE Mathematics 2024"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g., Mathematics"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                min={2000}
                max={2030}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value: 'PLE' | 'UCE' | 'UACE') => 
                  setFormData(prev => ({ ...prev, level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLE">PLE</SelectItem>
                  <SelectItem value="UCE">UCE</SelectItem>
                  <SelectItem value="UACE">UACE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value: 'Easy' | 'Medium' | 'Hard') => 
                  setFormData(prev => ({ ...prev, difficulty: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'Past Paper' | 'Practice Paper') => 
                  setFormData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Past Paper">Past Paper</SelectItem>
                  <SelectItem value="Practice Paper">Practice Paper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_limit">Time Limit (minutes)</Label>
              <Input
                id="time_limit"
                type="number"
                value={formData.time_limit}
                onChange={(e) => setFormData(prev => ({ ...prev, time_limit: parseInt(e.target.value) }))}
                min={10}
                max={300}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the exam..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_free">Free Access</Label>
            <Switch
              id="is_free"
              checked={formData.is_free}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_free: checked }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : exam ? 'Update Exam' : 'Create Exam'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}