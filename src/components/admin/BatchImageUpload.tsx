import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
    
    const newImages: ImageFile[] = files.map((file, index) => {
      // Try to extract question number from filename (e.g., "q5.png", "question_5.jpg", "5.png")
      const match = file.name.match(/(?:q(?:uestion)?[_-]?)?(\d+)/i);
      const extractedNumber = match ? parseInt(match[1]) : null;
      
      return {
        file,
        preview: URL.createObjectURL(file),
        questionNumber: extractedNumber && extractedNumber <= questionCount ? extractedNumber : null,
        status: 'pending' as const,
      };
    });

    setImages(prev => [...prev, ...newImages]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateQuestionNumber = (index: number, value: string) => {
    const num = value ? parseInt(value) : null;
    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, questionNumber: num } : img
    ));
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const uploadImages = async () => {
    const imagesToUpload = images.filter(img => img.questionNumber && img.status === 'pending');
    
    if (imagesToUpload.length === 0) {
      toast({
        title: 'No images to upload',
        description: 'Please assign question numbers to images before uploading.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.questionNumber || img.status !== 'pending') continue;

      // Update status to uploading
      setImages(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'uploading' } : item
      ));

      try {
        // Get the question ID for this question number
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select('id')
          .eq('exam_id', examId)
          .eq('question_number', img.questionNumber)
          .single();

        if (questionError || !questionData) {
          throw new Error(`Question ${img.questionNumber} not found`);
        }

        // Upload image to storage
        const fileExt = img.file.name.split('.').pop();
        const fileName = `${examId}/q${img.questionNumber}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(fileName, img.file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('question-images')
          .getPublicUrl(fileName);

        // Update question with image URL
        const { error: updateError } = await supabase
          .from('questions')
          .update({ image_url: urlData.publicUrl })
          .eq('id', questionData.id);

        if (updateError) throw updateError;

        // Update status to success
        setImages(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'success' } : item
        ));
      } catch (error: any) {
        // Update status to error
        setImages(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'error', error: error.message } : item
        ));
      }
    }

    setUploading(false);
    
    const successCount = images.filter(img => img.status === 'success').length;
    const errorCount = images.filter(img => img.status === 'error').length;
    
    if (successCount > 0) {
      toast({
        title: 'Upload complete',
        description: `${successCount} image(s) uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
      });
      onUploadComplete();
    }
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  const handleClose = () => {
    clearAll();
    setOpen(false);
  };

  const questionNumbers = Array.from({ length: questionCount }, (_, i) => i + 1);
  const assignedNumbers = images.map(img => img.questionNumber).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
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
            Upload multiple images and assign them to questions. Name files like "q5.png" for auto-detection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
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

          {/* Image List */}
          {images.length > 0 && (
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-4">
                {images.map((img, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-4 p-3 border rounded-lg bg-card"
                  >
                    {/* Preview */}
                    <img 
                      src={img.preview} 
                      alt={`Preview ${index}`}
                      className="w-20 h-20 object-cover rounded border"
                    />

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{img.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(img.file.size / 1024).toFixed(1)} KB
                      </p>
                      {img.error && (
                        <p className="text-xs text-destructive mt-1">{img.error}</p>
                      )}
                    </div>

                    {/* Question Number Select */}
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
                          {questionNumbers.map(num => (
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

                    {/* Status / Actions */}
                    <div className="w-10 flex justify-center">
                      {img.status === 'pending' && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {img.status === 'uploading' && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                      {img.status === 'success' && (
                        <Check className="h-5 w-5 text-green-500" />
                      )}
                      {img.status === 'error' && (
                        <X className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={uploadImages} 
              disabled={uploading || images.filter(img => img.questionNumber && img.status === 'pending').length === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {images.filter(img => img.questionNumber && img.status === 'pending').length} Images
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
