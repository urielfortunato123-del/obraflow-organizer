import { useCallback, useRef } from 'react';
import { Upload, ImagePlus, FolderOpen } from 'lucide-react';

interface PhotoUploaderProps {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
}

export function PhotoUploader({ onFilesSelected, disabled }: PhotoUploaderProps) {
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Filtra apenas imagens
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        const dt = new DataTransfer();
        imageFiles.forEach(f => dt.items.add(f));
        onFilesSelected(dt.files);
      }
    }
  }, [onFilesSelected, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Filtra apenas imagens (importante para pastas)
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        const dt = new DataTransfer();
        imageFiles.forEach(f => dt.items.add(f));
        onFilesSelected(dt.files);
      }
    }
    // Reset input para permitir selecionar os mesmos arquivos novamente
    e.target.value = '';
  }, [onFilesSelected]);

  const handleFolderClick = () => {
    folderInputRef.current?.click();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`
        card-industrial p-8 md:p-12 
        border-2 border-dashed border-primary/30 
        hover:border-accent/50 hover:bg-accent/5
        transition-all duration-300
        flex flex-col items-center justify-center gap-4
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="p-4 rounded-full bg-accent/10">
        <ImagePlus className="w-10 h-10 text-accent" />
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Selecionar fotos
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Arraste e solte ou clique para selecionar
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Botão para arquivos individuais */}
          <label className={`btn-accent inline-flex items-center gap-2 cursor-pointer ${disabled ? 'pointer-events-none' : ''}`}>
            <Upload className="w-4 h-4" />
            Arquivos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              disabled={disabled}
              className="hidden"
            />
          </label>

          {/* Botão para pasta completa */}
          <button
            type="button"
            onClick={handleFolderClick}
            disabled={disabled}
            className={`btn-industrial inline-flex items-center gap-2 ${disabled ? 'pointer-events-none opacity-50' : ''}`}
          >
            <FolderOpen className="w-4 h-4" />
            Pasta
          </button>
          
          {/* Input oculto para seleção de pasta */}
          <input
            ref={folderInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            disabled={disabled}
            className="hidden"
            {...{ webkitdirectory: '', directory: '' } as any}
          />
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        Suporta JPG, PNG e outros formatos de imagem
      </p>
    </div>
  );
}
