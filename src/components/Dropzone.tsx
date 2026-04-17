// @ts-nocheck
import React, { useCallback, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FileUpload {
  name: string;
  type: string;
  data: string;
}

interface DropzoneProps {
  onFilesChange: (files: FileUpload[]) => void;
  files: FileUpload[];
}

export function Dropzone({ onFilesChange, files }: DropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        onFilesChange([
          ...files,
          {
            name: file.name,
            type: file.type,
            data: reader.result as string
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, [files, onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/svg+xml': ['.svg']
    } as any
  });

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed border-line p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "bg-ink text-bg" : "hover:bg-ink/5"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 mx-auto mb-4 opacity-50" />
        <p className="text-sm font-medium">Arrastra archivos aquí o haz clic para subir</p>
        <p className="text-xs opacity-50 mt-1">PDF, DOCX, JPG, PNG, SVG (Bocetos o Documentos)</p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-line rounded bg-white/50">
              <div className="flex items-center gap-3">
                {file.type.includes('image') ? (
                  <ImageIcon className="w-5 h-5 text-ink/70" />
                ) : (
                  <FileText className="w-5 h-5 text-ink/70" />
                )}
                <span className="text-xs font-mono truncate max-w-[200px]">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="h-8 w-8 text-ink/50 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
