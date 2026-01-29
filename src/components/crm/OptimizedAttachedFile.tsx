import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { File, Image, Video, Music, FileText, Download, ExternalLink, Play, Pause, Volume2, VolumeX, Maximize2, Loader2, FileAudio, MessageSquareText } from 'lucide-react';
import { useState, useRef, useEffect, memo, lazy, Suspense, useCallback } from 'react';
import { useWhatsAppFile } from '@/hooks/useWhatsAppFile';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { LazyImage } from './LazyImage';
import { ImageLightbox } from './ImageLightbox';

// Lazy load PDF viewer - it's heavy
const PDFViewer = lazy(() => import('@/components/PDFViewer').then(m => ({ default: m.PDFViewer })));

interface OptimizedAttachedFileProps {
  url: string;
  name: string;
  type: string;
  size?: number;
  className?: string;
  chatId?: string;
  messageId?: string;
}

/**
 * Optimized version of AttachedFile with:
 * - Lazy loading for images using IntersectionObserver
 * - Lazy loading for PDF viewer component
 * - Thumbnail preview for images (max 200px)
 * - Progressive loading with placeholders
 * - Memoization for better performance
 */
export const OptimizedAttachedFile = memo(({ 
  url, 
  name, 
  type, 
  size, 
  className, 
  chatId, 
  messageId 
}: OptimizedAttachedFileProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [realUrl, setRealUrl] = useState<string>(url);
  const [urlError, setUrlError] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [showTranscription, setShowTranscription] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { downloadFile, loading: downloadLoading } = useWhatsAppFile();
  const { transcribeAudio, loading: transcriptionLoading } = useAudioTranscription();

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

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    try {
      let downloadUrl = realUrl;
      
      if ((urlError || !realUrl) && chatId && messageId) {
        const freshUrl = await downloadFile(chatId, messageId);
        if (freshUrl) {
          downloadUrl = freshUrl;
          setRealUrl(freshUrl);
          setUrlError(false);
        }
      }

      if (downloadUrl) {
        const response = await fetch(downloadUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      if (realUrl) {
        window.open(realUrl, '_blank');
      }
    }
  };

  const handleMediaError = async () => {
    console.log('Media error, trying to refresh URL...');
    setUrlError(true);
    
    if (chatId && messageId) {
      const freshUrl = await downloadFile(chatId, messageId);
      if (freshUrl) {
        setRealUrl(freshUrl);
        setUrlError(false);
      }
    }
  };

  const handleTranscribe = async () => {
    if (transcription) {
      setShowTranscription(!showTranscription);
      return;
    }

    let audioUrl = realUrl;
    
    if ((urlError || !realUrl) && chatId && messageId) {
      const freshUrl = await downloadFile(chatId, messageId);
      if (freshUrl) {
        audioUrl = freshUrl;
        setRealUrl(freshUrl);
        setUrlError(false);
      }
    }

    if (audioUrl) {
      const text = await transcribeAudio(audioUrl);
      if (text) {
        setTranscription(text);
        setShowTranscription(true);
      }
    }
  };

  const toggleAudioPlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  useEffect(() => {
    const media = audioRef.current || videoRef.current;
    if (!media) return;

    const updateTime = () => {
      setCurrentTime(media.currentTime);
      setProgress((media.currentTime / media.duration) * 100);
    };

    const updateDuration = () => {
      setDuration(media.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    media.addEventListener('timeupdate', updateTime);
    media.addEventListener('loadedmetadata', updateDuration);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('ended', handleEnded);

    return () => {
      media.removeEventListener('timeupdate', updateTime);
      media.removeEventListener('loadedmetadata', updateDuration);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('ended', handleEnded);
    };
  }, []);

  // PDF files with lazy loaded viewer
  if (type.includes('pdf')) {
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
            <Suspense fallback={<Loader2 className="h-3 w-3 animate-spin" />}>
              <PDFViewer 
                url={realUrl} 
                fileName={name}
                trigger={
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    title="Открыть PDF"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                }
              />
            </Suspense>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleDownload}
              title="Скачать"
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Optimized image with lazy loading and mobile-friendly lightbox
  if (type.startsWith('image/')) {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    
    const handleOpenLightbox = useCallback(() => {
      setIsLightboxOpen(true);
    }, []);
    
    const handleCloseLightbox = useCallback(() => {
      setIsLightboxOpen(false);
    }, []);

    return (
      <>
        <Card className={`p-3 max-w-sm ${className}`}>
          <div className="flex items-center gap-3 mb-2">
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
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Увеличить"
                onClick={handleOpenLightbox}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleDownload}
                title="Скачать"
                disabled={downloadLoading}
              >
                {downloadLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Optimized thumbnail with lazy loading */}
          <div className="mt-2">
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity active:opacity-60"
              onClick={handleOpenLightbox}
            >
              <LazyImage
                src={realUrl}
                alt={name}
                className="max-w-full max-h-32 rounded"
                onError={handleMediaError}
              />
            </div>
          </div>
        </Card>
        
        {/* Mobile-friendly fullscreen lightbox */}
        <ImageLightbox
          src={realUrl}
          alt={name}
          isOpen={isLightboxOpen}
          onClose={handleCloseLightbox}
          onDownload={handleDownload}
          downloadLoading={downloadLoading}
        />
      </>
    );
  }

  // Voice message (ogg/opus)
  if (type.startsWith('audio/')) {
    const isVoiceMessage = type.includes('ogg') || type.includes('opus') || name === 'Голосовое сообщение';
    
    if (isVoiceMessage) {
      return (
        <Card className={`p-2 max-w-xs ${className}`}>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded bg-green-100 hover:bg-green-200"
              onClick={toggleAudioPlayback}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-green-600" />
              ) : (
                <Play className="h-4 w-4 text-green-600" />
              )}
            </Button>
            
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                <div className="flex space-x-1">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded transition-all duration-75 ${
                        isPlaying && i < (progress / 5) 
                          ? 'bg-green-500 h-4' 
                          : 'bg-gray-300 h-2'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {duration > 0 ? formatTime(isPlaying ? currentTime : duration) : '0:00'}
              </div>
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleDownload}
              title="Скачать"
            >
              <Download className="h-3 w-3" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleTranscribe}
              disabled={transcriptionLoading}
              title={transcription ? (showTranscription ? "Скрыть текст" : "Показать текст") : "Распознать речь"}
            >
              {transcriptionLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <MessageSquareText className="h-3 w-3" />
              )}
            </Button>
          </div>
          
          {transcription && showTranscription && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-muted-foreground text-left leading-relaxed">
                {transcription}
              </p>
            </div>
          )}
          
          <audio ref={audioRef} src={realUrl} preload="metadata" onError={handleMediaError} />
        </Card>
      );
    }

    // Regular audio player
    return (
      <Card className={`p-3 max-w-sm ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0 text-muted-foreground">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" title={name}>
              {name || 'Аудиофайл'}
            </p>
            {size && (
              <p className="text-xs text-muted-foreground">
                {formatFileSize(size)}
              </p>
            )}
          </div>
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
        
        <div className="space-y-2">
          <audio ref={audioRef} src={realUrl} preload="metadata" onError={handleMediaError} />
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={toggleAudioPlayback}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="100"
                value={progress || 0}
                onChange={handleProgressChange}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(currentTime)}
            </span>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Video with lazy loading
  if (type.startsWith('video/')) {
    return (
      <Card className={`p-3 max-w-md ${className}`}>
        <div className="flex items-center gap-3 mb-2">
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
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={handleDownload}
            title="Скачать"
            disabled={downloadLoading}
          >
            {downloadLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
          </Button>
        </div>
        
        <div className="relative aspect-video bg-black rounded overflow-hidden">
          <video
            ref={videoRef}
            src={realUrl}
            className="w-full h-full object-contain"
            preload="metadata"
            playsInline
            onError={handleMediaError}
          />
          
          {/* Video controls overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onClick={toggleVideoPlayback}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress || 0}
                  onChange={handleProgressChange}
                  className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <span className="text-xs text-white w-10">
                {formatTime(currentTime)}
              </span>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Default file display
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
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={handleDownload}
          title="Скачать"
          disabled={downloadLoading}
        >
          {downloadLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
        </Button>
      </div>
    </Card>
  );
});

OptimizedAttachedFile.displayName = 'OptimizedAttachedFile';

export default OptimizedAttachedFile;
