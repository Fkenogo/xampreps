import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { User, Mail, GraduationCap, School, Save } from 'lucide-react';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    level: (profile?.level || 'PLE') as 'PLE' | 'UCE' | 'UACE',
    school: profile?.school || '',
    phone: profile?.phone || '',
  });

  const handleSave = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name: formData.name,
        level: formData.level as 'PLE' | 'UCE' | 'UACE',
        school: formData.school || null,
        phone: formData.phone || null,
      })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully');
      refreshProfile?.();
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account preferences</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
          <h2 className="text-xl font-semibold text-foreground">Profile Information</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Education Level
              </Label>
            <Select
                value={formData.level}
                onValueChange={(value: 'PLE' | 'UCE' | 'UACE') => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLE">PLE - Primary</SelectItem>
                  <SelectItem value="UCE">UCE - O-Level</SelectItem>
                  <SelectItem value="UACE">UACE - A-Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school" className="flex items-center gap-2">
                <School className="w-4 h-4" />
                School (Optional)
              </Label>
              <Input
                id="school"
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                placeholder="Enter your school name"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="gap-2">
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
