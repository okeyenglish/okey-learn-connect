import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface PDFViewerProps {
  url: string;
  fileName: string;
  trigger?: React.ReactNode;
  className?: string;
}

export const PDFViewer = ({ url, fileName, trigger, className }: PDFViewerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const defaultTrigger = (
    <Button variant="outline" size="sm" className={className}>
      <FileText className="h-4 w-4 mr-2" />
      {fileName}
    </Button>
  );

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openInNewTab = () => {
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {fileName}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPDF}
                title="Скачать PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                title="Открыть в новой вкладке"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
          <div className="px-6 pb-6 flex-1">
          <div className="bg-muted rounded-lg overflow-hidden" style={{ height: '70vh' }}>
            <iframe
              src={`${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&page=1`}
              width="100%"
              height="100%"
              title={fileName}
              className="border-0"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};