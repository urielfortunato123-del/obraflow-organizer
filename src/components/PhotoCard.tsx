import { useState } from 'react';
import { MapPin, Calendar, FileText, CheckCircle, AlertCircle, Clock, Edit2, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { PhotoData } from '@/types/photo';
import { formatDate, truncateText } from '@/utils/helpers';
import { getOCRPreview } from '@/utils/ocr';

interface PhotoCardProps {
  photo: PhotoData;
  onUpdate: (id: string, updates: Partial<PhotoData>) => void;
}

export function PhotoCard({ photo, onUpdate }: PhotoCardProps) {
  const [editingLocal, setEditingLocal] = useState(false);
  const [editingServico, setEditingServico] = useState(false);
  const [localValue, setLocalValue] = useState(photo.local);
  const [servicoValue, setServicoValue] = useState(photo.servico);

  const handleSaveLocal = () => {
    onUpdate(photo.id, { local: localValue });
    setEditingLocal(false);
  };

  const handleSaveServico = () => {
    onUpdate(photo.id, { servico: servicoValue });
    setEditingServico(false);
  };

  const handleCancelLocal = () => {
    setLocalValue(photo.local);
    setEditingLocal(false);
  };

  const handleCancelServico = () => {
    setServicoValue(photo.servico);
    setEditingServico(false);
  };

  const StatusBadge = () => {
    switch (photo.status) {
      case 'OK':
        return (
          <span className="status-badge status-ok">
            <CheckCircle className="w-3 h-3 mr-1" />
            OK
          </span>
        );
      case 'OCR Falhou':
        return (
          <span className="status-badge status-error">
            <AlertCircle className="w-3 h-3 mr-1" />
            OCR Falhou
          </span>
        );
      case 'IA Falhou':
        return (
          <span className="status-badge status-error">
            <AlertCircle className="w-3 h-3 mr-1" />
            IA Falhou
          </span>
        );
      default:
        return (
          <span className="status-badge status-pending">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="card-industrial p-4 animate-fade-in hover:shadow-industrial-lg transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          <img
            src={photo.thumbnailUrl}
            alt={photo.filename}
            className="w-full sm:w-24 h-32 sm:h-24 object-cover rounded-lg border border-border"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-foreground truncate max-w-[200px]" title={photo.filename}>
                {photo.filename}
              </h3>
            </div>
            <StatusBadge />
          </div>

          {/* OCR Preview */}
          {photo.ocrText && (
            <div className="flex items-start gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                {getOCRPreview(photo.ocrText, 2) || 'Sem texto detectado'}
              </p>
            </div>
          )}

          {/* Data e GPS */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-accent" />
              <span className="text-foreground">{formatDate(photo.dateIso)}</span>
            </div>
            {photo.latitude !== null && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-accent" />
                <span className="text-foreground text-xs">
                  {photo.latitude.toFixed(4)}, {photo.longitude?.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {/* Local e Serviço editáveis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Local */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Local</label>
              {editingLocal ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <button onClick={handleSaveLocal} className="p-1 text-success hover:bg-success/10 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={handleCancelLocal} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => setEditingLocal(true)}
                >
                  <span className="text-sm text-foreground truncate">
                    {photo.local || 'Não definido'}
                  </span>
                  <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>

            {/* Serviço */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Serviço</label>
              {editingServico ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={servicoValue}
                    onChange={(e) => setServicoValue(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <button onClick={handleSaveServico} className="p-1 text-success hover:bg-success/10 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={handleCancelServico} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => setEditingServico(true)}
                >
                  <span className="text-sm text-foreground truncate">
                    {photo.servico || 'Não definido'}
                  </span>
                  <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          </div>

          {/* Confiança da IA */}
          {photo.aiConfidence !== null && (
            <div className="text-xs text-muted-foreground">
              Confiança IA: {photo.aiConfidence}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
