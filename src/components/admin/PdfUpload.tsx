import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Upload, X, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PdfUploadProps {
  currentPdfUrl: string | null;
  onPdfChange: (url: string | null) => void;
  examId: string;
}

export default function PdfUpload({ currentPdfUrl, onPdfChange, examId }: PdfUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);

    try {
      const fileName = `${examId}-explanation-${Date.now()}.pdf`;
      const filePath = `explanations/${fileName}`;

      // Delete old file if exists
      if (currentPdfUrl) {
        const oldPath = currentPdfUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('explanation-pdfs').remove([oldPath]);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('explanation-pdfs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('explanation-pdfs')
        .getPublicUrl(filePath);

      onPdfChange(publicUrl);
      toast.success('PDF uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentPdfUrl) return;

    try {
      const path = currentPdfUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('explanation-pdfs').remove([path]);
      onPdfChange(null);
      toast.success('PDF removed');
    } catch (error: any) {
      toast.error('Failed to remove PDF');
    }
  };

  return (
    <div className="space-y-3">
      <Label>Explanation PDF</Label>
      
      {currentPdfUrl ? (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <FileText className="w-8 h-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Explanation PDF uploaded
            </p>
            <a
              href={currentPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View PDF <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
          <Input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload explanation PDF
                </span>
                <span className="text-xs text-muted-foreground/70">
                  PDF up to 10MB
                </span>
              </>
            )}
          </label>
        </div>
      )}
    </div>
  );
}
