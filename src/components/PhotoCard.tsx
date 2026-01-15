import { useState, useMemo } from 'react';
import { 
  MapPin, Calendar, FileText, CheckCircle, AlertCircle, Clock, 
  Edit2, X, Check, Trash2, ZoomIn, MoreVertical, FolderOpen, Copy, Wand2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import type { PhotoData } from '@/types/photo';
import { formatDate, getOCRPreview, parseOCRForLocalServico } from '@/utils/helpers';

interface PhotoCardProps {
  photo: PhotoData;
  onUpdate: (id: string, updates: Partial<PhotoData>) => void;
  onDelete?: (id: string) => void;
  onApplyToAll?: (field: 'local' | 'servico', value: string) => void;
  onApplyToSimilar?: (field: 'local' | 'servico', value: string) => void;
}

export function PhotoCard({ photo, onUpdate, onDelete, onApplyToAll, onApplyToSimilar }: PhotoCardProps) {
  const [editingLocal, setEditingLocal] = useState(false);
  const [editingServico, setEditingServico] = useState(false);
  const [editingOcr, setEditingOcr] = useState(false);
  const [localValue, setLocalValue] = useState(photo.local);
  const [servicoValue, setServicoValue] = useState(photo.servico);
  const [ocrValue, setOcrValue] = useState(photo.ocrText);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Parse OCR para extrair sugestões de local/serviço
  const ocrSuggestion = useMemo(() => {
    return parseOCRForLocalServico(photo.ocrText);
  }, [photo.ocrText]);

  const hasOcrSuggestion = ocrSuggestion.local || ocrSuggestion.servico;
  const needsUpdate = 
    (photo.local === 'LOCAL_NAO_INFORMADO' || !photo.local) ||
    (photo.servico === 'SERVICO_NAO_IDENTIFICADO' || !photo.servico);

  const handleApplyFromOCR = () => {
    const updates: Partial<PhotoData> = {};
    if (ocrSuggestion.local) {
      updates.local = ocrSuggestion.local;
      setLocalValue(ocrSuggestion.local);
    }
    if (ocrSuggestion.servico) {
      updates.servico = ocrSuggestion.servico;
      setServicoValue(ocrSuggestion.servico);
    }
    if (Object.keys(updates).length > 0) {
      onUpdate(photo.id, updates);
    }
  };

  const handleSaveLocal = () => {
    onUpdate(photo.id, { local: localValue });
    setEditingLocal(false);
  };

  const handleSaveServico = () => {
    onUpdate(photo.id, { servico: servicoValue });
    setEditingServico(false);
  };

  const handleSaveOcr = () => {
    onUpdate(photo.id, { ocrText: ocrValue });
    setEditingOcr(false);
  };

  const handleCancelLocal = () => {
    setLocalValue(photo.local);
    setEditingLocal(false);
  };

  const handleCancelServico = () => {
    setServicoValue(photo.servico);
    setEditingServico(false);
  };

  const handleCancelOcr = () => {
    setOcrValue(photo.ocrText);
    setEditingOcr(false);
  };

  const handleDelete = () => {
    onDelete?.(photo.id);
    setShowDeleteDialog(false);
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
    <>
      <div className="card-industrial p-4 animate-fade-in hover:shadow-industrial-lg transition-shadow duration-300">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Thumbnail - clicável para zoom */}
          <div className="flex-shrink-0 relative group">
            <img
              src={photo.thumbnailUrl}
              alt={photo.filename}
              className="w-full sm:w-24 h-32 sm:h-24 object-cover rounded-lg border border-border cursor-pointer transition-transform hover:scale-105"
              onClick={() => setShowLightbox(true)}
            />
            <div 
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
              onClick={() => setShowLightbox(true)}
            >
              <ZoomIn className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate" title={photo.filename}>
                  {photo.filename}
                </h3>
                {photo.folderPath && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <FolderOpen className="w-3 h-3" />
                    <span className="truncate">{photo.folderPath}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge />
                {/* Menu de ações */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1 rounded hover:bg-muted transition-colors">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowLightbox(true)}>
                      <ZoomIn className="w-4 h-4 mr-2" />
                      Visualizar foto
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditingOcr(true)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar legenda/OCR
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir foto
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* OCR Preview / Edição */}
            {editingOcr ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Texto OCR / Legenda</label>
                <Textarea
                  value={ocrValue}
                  onChange={(e) => setOcrValue(e.target.value)}
                  className="text-sm min-h-[80px]"
                  placeholder="Digite o texto da legenda..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveOcr} className="btn-accent text-xs px-3 py-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Salvar
                  </button>
                  <button onClick={handleCancelOcr} className="btn-industrial text-xs px-3 py-1 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="p-3 bg-muted/50 rounded-lg border border-border/50 cursor-pointer group hover:bg-muted/80 transition-colors"
                onClick={() => setEditingOcr(true)}
                title="Clique para editar"
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Texto OCR</span>
                      <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {photo.ocrText ? (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                        {getOCRPreview(photo.ocrText, 4)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhum texto extraído - clique para adicionar
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Botão Aplicar do OCR - mostra quando há sugestão e campos pendentes */}
            {hasOcrSuggestion && needsUpdate && (
              <div className="flex items-center gap-2 p-2 bg-accent/10 border border-accent/30 rounded-lg">
                <Wand2 className="w-4 h-4 text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Sugestão do OCR:</p>
                  <p className="text-sm text-foreground truncate">
                    {ocrSuggestion.local && <span><strong>Local:</strong> {ocrSuggestion.local}</span>}
                    {ocrSuggestion.local && ocrSuggestion.servico && <span className="mx-1">•</span>}
                    {ocrSuggestion.servico && <span><strong>Serviço:</strong> {ocrSuggestion.servico}</span>}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyFromOCR();
                  }}
                  className="btn-accent h-7 px-3 text-xs"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Aplicar
                </Button>
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
              <div className={`space-y-1 p-2 rounded-lg transition-colors ${
                photo.local === 'LOCAL_NAO_INFORMADO' || !photo.local 
                  ? 'bg-warning/10 border-2 border-warning/50 border-dashed' 
                  : ''
              }`}>
                <label className={`text-xs font-medium ${
                  photo.local === 'LOCAL_NAO_INFORMADO' || !photo.local 
                    ? 'text-warning' 
                    : 'text-muted-foreground'
                }`}>
                  Local {(photo.local === 'LOCAL_NAO_INFORMADO' || !photo.local) && '⚠️'}
                </label>
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
                  <div className="flex items-center gap-2">
                    <div 
                      className="flex items-center gap-2 cursor-pointer group flex-1 min-w-0"
                      onClick={() => setEditingLocal(true)}
                    >
                      <span className={`text-sm truncate ${
                        photo.local === 'LOCAL_NAO_INFORMADO' || !photo.local 
                          ? 'text-warning font-medium' 
                          : 'text-foreground'
                      }`}>
                        {photo.local || 'Clique para definir'}
                      </span>
                      <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    {photo.local && photo.local !== 'LOCAL_NAO_INFORMADO' && onApplyToAll && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onApplyToAll('local', photo.local!)}
                        className="h-6 px-2 text-xs text-accent hover:text-accent hover:bg-accent/10"
                        title="Aplicar este local em todas as fotos"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Aplicar em todas
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Serviço */}
              <div className={`space-y-1 p-2 rounded-lg transition-colors ${
                photo.servico === 'SERVICO_NAO_IDENTIFICADO' || !photo.servico 
                  ? 'bg-warning/10 border-2 border-warning/50 border-dashed' 
                  : ''
              }`}>
                <label className={`text-xs font-medium ${
                  photo.servico === 'SERVICO_NAO_IDENTIFICADO' || !photo.servico 
                    ? 'text-warning' 
                    : 'text-muted-foreground'
                }`}>
                  Serviço {(photo.servico === 'SERVICO_NAO_IDENTIFICADO' || !photo.servico) && '⚠️'}
                </label>
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
                  <div className="flex items-center gap-2">
                    <div 
                      className="flex items-center gap-2 cursor-pointer group flex-1 min-w-0"
                      onClick={() => setEditingServico(true)}
                    >
                      <span className={`text-sm truncate ${
                        photo.servico === 'SERVICO_NAO_IDENTIFICADO' || !photo.servico 
                          ? 'text-warning font-medium' 
                          : 'text-foreground'
                      }`}>
                        {photo.servico || 'Clique para definir'}
                      </span>
                      <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    {photo.servico && photo.servico !== 'SERVICO_NAO_IDENTIFICADO' && onApplyToAll && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onApplyToAll('servico', photo.servico!)}
                        className="h-6 px-2 text-xs text-accent hover:text-accent hover:bg-accent/10"
                        title="Aplicar este serviço em todas as fotos"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Aplicar em todas
                      </Button>
                    )}
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

      {/* Lightbox */}
      <PhotoLightbox
        imageUrl={photo.thumbnailUrl}
        filename={photo.filename}
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{photo.filename}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
