import { Cog, FolderArchive, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  photosCount: number;
  processedCount: number;
  onProcess: () => void;
  onGenerateZip: () => void;
  onDownloadCSV: () => void;
  onClear: () => void;
  isProcessing: boolean;
  isExporting: boolean;
}

export function ActionButtons({
  photosCount,
  processedCount,
  onProcess,
  onGenerateZip,
  onDownloadCSV,
  onClear,
  isProcessing,
  isExporting,
}: ActionButtonsProps) {
  const hasPhotos = photosCount > 0;
  const hasProcessed = processedCount > 0;

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={onProcess}
        disabled={!hasPhotos || isProcessing || isExporting}
        className="btn-accent flex items-center gap-2"
      >
        <Cog className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
        {isProcessing ? 'Processando...' : 'Processar OCR + IA'}
      </Button>

      <Button
        onClick={onGenerateZip}
        disabled={!hasProcessed || isProcessing || isExporting}
        className="btn-industrial flex items-center gap-2"
      >
        <FolderArchive className="w-4 h-4" />
        {isExporting ? 'Gerando...' : 'Gerar ZIP'}
      </Button>

      <Button
        onClick={onDownloadCSV}
        disabled={!hasProcessed || isProcessing || isExporting}
        variant="outline"
        className="flex items-center gap-2 border-primary/30 hover:bg-primary/5"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Baixar CSV
      </Button>

      {hasPhotos && (
        <Button
          onClick={onClear}
          disabled={isProcessing || isExporting}
          variant="ghost"
          className="flex items-center gap-2 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
