import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, Plus, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StudyReminder {
  id: string;
  subject: string;
  reminder_time: string;
  active: boolean;
}

const SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Social Studies',
  'All Subjects',
];

interface StudyRemindersCardProps {
  className?: string;
}

export default function StudyRemindersCard({ className }: StudyRemindersCardProps) {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('All Subjects');
  const [newTime, setNewTime] = useState('16:00');

  useEffect(() => {
    fetchReminders();
  }, [user?.id]);

  const fetchReminders = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('study_reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('reminder_time');

    if (!error && data) {
      setReminders(data);
    }
    setLoading(false);
  };

  const handleToggleReminder = async (reminderId: string, active: boolean) => {
    const { error } = await supabase
      .from('study_reminders')
      .update({ active })
      .eq('id', reminderId);

    if (error) {
      toast.error('Failed to update reminder');
      return;
    }

    setReminders(prev =>
      prev.map(r => (r.id === reminderId ? { ...r, active } : r))
    );

    if (active) {
      toast.success('Reminder enabled');
      // Request notification permission if supported
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } else {
      toast.success('Reminder disabled');
    }
  };

  const handleAddReminder = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('study_reminders')
      .insert({
        user_id: user.id,
        subject: newSubject,
        reminder_time: newTime,
        active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add reminder');
      return;
    }

    setReminders(prev => [...prev, data]);
    setIsDialogOpen(false);
    toast.success('Reminder added!');

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    const { error } = await supabase
      .from('study_reminders')
      .delete()
      .eq('id', reminderId);

    if (error) {
      toast.error('Failed to delete reminder');
      return;
    }

    setReminders(prev => prev.filter(r => r.id !== reminderId));
    toast.success('Reminder deleted');
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className={cn(
        "bg-card rounded-2xl border border-border p-6 animate-pulse",
        className
      )}>
        <div className="h-6 bg-muted rounded w-1/2 mb-4" />
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border p-6",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-xl">
            <Bell className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="font-semibold text-foreground">Study Reminders</h3>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Study Reminder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Select value={newSubject} onValueChange={setNewSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
              <Button onClick={handleAddReminder} className="w-full">
                Add Reminder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {reminders.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No reminders set</p>
          <p className="text-xs mt-1">Add reminders to stay on track!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map(reminder => (
            <div
              key={reminder.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all",
                reminder.active
                  ? "bg-amber-500/10 border-amber-500/20"
                  : "bg-muted/50 border-border opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "text-lg font-semibold",
                  reminder.active ? "text-amber-600" : "text-muted-foreground"
                )}>
                  {formatTime(reminder.reminder_time)}
                </div>
                <div>
                  <p className="text-sm font-medium">{reminder.subject}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={reminder.active}
                  onCheckedChange={(checked) => handleToggleReminder(reminder.id, checked)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteReminder(reminder.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {'Notification' in window && Notification.permission === 'denied' && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Enable browser notifications for reminders
        </p>
      )}
    </div>
  );
}
