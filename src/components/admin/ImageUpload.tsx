import { useState, useRef } from 'react';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseStorage } from '@/integrations/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image, X, Loader2, Link } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface ImageUploadProps {
  currentImageUrl: string | null;
  onImageChange: (url: string | null) => void;
  questionId?: string;
}

export default function ImageUpload({ currentImageUrl, onImageChange, questionId }: ImageUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(currentImageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, GIF, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const storage = getFirebaseStorage();
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${questionId || 'temp'}-${Date.now()}.${fileExt}`;
      const filePath = `question-images/questions/${fileName}`;

      const fileRef = ref(storage, filePath);
      await uploadBytes(fileRef, file);
      const publicUrl = await getDownloadURL(fileRef);

      onImageChange(publicUrl);
      setUrlInput(publicUrl);
      toast({ title: 'Image uploaded successfully' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: 'Upload failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlChange = () => {
    if (urlInput.trim()) {
      onImageChange(urlInput.trim());
      toast({ title: 'Image URL updated' });
    } else {
      onImageChange(null);
    }
  };

  const handleRemoveImage = async () => {
    if (currentImageUrl?.includes('firebasestorage.googleapis.com') || currentImageUrl?.startsWith('gs://')) {
      try {
        const storage = getFirebaseStorage();
        await deleteObject(ref(storage, currentImageUrl));
      } catch (error: unknown) {
        console.error('Error deleting image:', error);
      }
    }
    onImageChange(null);
    setUrlInput('');
  };

  return (
    <div className="space-y-3">
      <Label>Question Image (optional)</Label>
      
      {currentImageUrl ? (
        <div className="relative inline-block">
          <img
            src={currentImageUrl}
            alt="Question image"
            className="max-w-xs max-h-48 rounded-lg border border-border object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleRemoveImage}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="gap-2">
            <Link className="h-4 w-4" />
            URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="flex-1"
            />
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <p className="text-xs text-muted-foreground">
            Max file size: 5MB. Supported: PNG, JPG, GIF, WebP
          </p>
        </TabsContent>

        <TabsContent value="url" className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.png"
              className="flex-1"
            />
            <Button onClick={handleUrlChange} variant="secondary" size="sm">
              Apply
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a direct URL to an image
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
