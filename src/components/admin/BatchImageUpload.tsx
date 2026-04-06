import { useRef, useState } from 'react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseStorage } from '@/integrations/firebase/client';
import { adminSetQuestionImageUrlsFirebase } from '@/integrations/firebase/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, ImagePlus, Loader2, Check, X, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImageFile {
  file: File;
  preview: string;
  questionNumber: number | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface BatchImageUploadProps {
  examId: string;
  questionCount: number;
  onUploadComplete: () => void;
}

export default function BatchImageUpload({ examId, questionCount, onUploadComplete }: BatchImageUploadProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const newImages: ImageFile[] = files.map((file) => {
      const match = file.name.match(/(?:q(?:uestion)?[_-]?)?(\d+)/i);
      const extractedNumber = match ? parseInt(match[1], 10) : null;

      return {
        file,
        preview: URL.createObjectURL(file),
        questionNumber: extractedNumber && extractedNumber <= questionCount ? extractedNumber : null,
        status: 'pending',
      };
    });

    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateQuestionNumber = (index: number, value: string) => {
    const num = value ? parseInt(value, 10) : null;
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, questionNumber: num } : img)));
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const uploadImages = async () => {
    const pendingIndexes = images
      .map((img, idx) => ({ img, idx }))
      .filter(({ img }) => img.questionNumber && img.status === 'pending');

    if (pendingIndexes.length === 0) {
      toast({
        title: 'No images to upload',
        description: 'Please assign question numbers to images before uploading.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    const storage = getFirebaseStorage();
    const updates: Array<{ question_number: number; image_url: string }> = [];
    let successCount = 0;
    let errorCount = 0;

    for (const { img, idx } of pendingIndexes) {
      const questionNumber = img.questionNumber;
      if (!questionNumber) continue;

      setImages((prev) => prev.map((item, i) => (i === idx ? { ...item, status: 'uploading' } : item)));

      try {
        const fileExt = img.file.name.split('.').pop() || 'jpg';
        const filePath = `question-images/${examId}/q${questionNumber}-${Date.now()}.${fileExt}`;
        const fileRef = ref(storage, filePath);
        await uploadBytes(fileRef, img.file);
        const publicUrl = await getDownloadURL(fileRef);

        updates.push({ question_number: questionNumber, image_url: publicUrl });
        successCount += 1;
        setImages((prev) => prev.map((item, i) => (i === idx ? { ...item, status: 'success' } : item)));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        errorCount += 1;
        setImages((prev) =>
          prev.map((item, i) => (i === idx ? { ...item, status: 'error', error: message } : item))
        );
      }
    }

    if (updates.length > 0) {
      try {
        const result = await adminSetQuestionImageUrlsFirebase(examId, updates);
        if (Array.isArray(result.missing) && result.missing.length > 0) {
          for (const number of result.missing) {
            setImages((prev) =>
              prev.map((item) =>
                item.questionNumber === number && item.status === 'success'
                  ? { ...item, status: 'error', error: `Question ${number} not found in this exam` }
                  : item
              )
            );
          }
          successCount -= result.missing.length;
          errorCount += result.missing.length;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update questions with uploaded images';
        toast({
          title: 'Upload failed',
          description: message,
          variant: 'destructive',
        });
        setUploading(false);
        return;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast({
        title: 'Upload complete',
        description: `${successCount} image(s) uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
      });
      onUploadComplete();
      return;
    }

    toast({
      title: 'Upload failed',
      description: 'No images were uploaded successfully.',
      variant: 'destructive',
    });
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  const handleClose = () => {
    clearAll();
    setOpen(false);
  };

  const questionNumbers = Array.from({ length: questionCount }, (_, i) => i + 1);
  const assignedNumbers = images.map((img) => img.questionNumber).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ImagePlus className="h-4 w-4 mr-2" />
          Batch Upload Images
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Batch Upload Question Images</DialogTitle>
          <DialogDescription>
            Upload multiple images and assign them to questions. Name files like &quot;q5.png&quot; for auto-detection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="flex-1"
            />
            {images.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>

          {images.length > 0 && (
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-4">
                {images.map((img, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border rounded-lg bg-card">
                    <img src={img.preview} alt={`Preview ${index}`} className="w-20 h-20 object-cover rounded border" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{img.file.name}</p>
                      <p className="text-xs text-muted-foreground">{(img.file.size / 1024).toFixed(1)} KB</p>
                      {img.error && <p className="text-xs text-destructive mt-1">{img.error}</p>}
                    </div>

                    <div className="w-32">
                      <Label className="text-xs text-muted-foreground">Question #</Label>
                      <Select
                        value={img.questionNumber?.toString() || ''}
                        onValueChange={(val) => updateQuestionNumber(index, val)}
                        disabled={img.status !== 'pending'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {questionNumbers.map((num) => (
                            <SelectItem
                              key={num}
                              value={num.toString()}
                              disabled={assignedNumbers.includes(num) && img.questionNumber !== num}
                            >
                              Q{num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-10 flex justify-center">
                      {img.status === 'pending' && (
                        <Button variant="ghost" size="icon" onClick={() => removeImage(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {img.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                      {img.status === 'success' && <Check className="h-5 w-5 text-green-500" />}
                      {img.status === 'error' && <X className="h-5 w-5 text-destructive" />}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={uploadImages}
              disabled={uploading || images.filter((img) => img.questionNumber && img.status === 'pending').length === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {images.filter((img) => img.questionNumber && img.status === 'pending').length} Images
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
