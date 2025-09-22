import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { File, Image, Video, Music, FileText, Download, ExternalLink } from 'lucide-react';

interface AttachedFileProps {
  url: string;
  name: string;
  type: string;
  size?: number;
  className?: string;
}

export const AttachedFile = ({ url, name, type, size, className }: AttachedFileProps) => {
  const getFileIcon = () => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback to opening in new tab
      window.open(url, '_blank');
    }
  };

  const handlePreview = () => {
    window.open(url, '_blank');
  };

  return (
    <Card className={`p-3 max-w-sm ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 text-muted-foreground">
          {getFileIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={name}>
            {name}
          </p>
          {size && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(size)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {type.startsWith('image/') && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handlePreview}
              title="Просмотр"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={handleDownload}
            title="Скачать"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Image preview for small images */}
      {type.startsWith('image/') && (
        <div className="mt-2">
          <img
            src={url}
            alt={name}
            className="max-w-full max-h-32 rounded cursor-pointer object-cover"
            onClick={handlePreview}
            onError={(e) => {
              // Hide image if it fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}
    </Card>
  );
};