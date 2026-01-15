import { useState, useMemo } from 'react';
import { 
  MapPin, Calendar, FileText, CheckCircle, AlertCircle, Clock, 
  Edit2, X, Check, Trash2, ZoomIn, MoreVertical, FolderOpen, Copy, Wand2, AlertTriangle, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
  onApplyToAll?: (field: 'frente' | 'servico', value: string) => void;
  onApplyToSimilar?: (field: 'frente' | 'servico', value: string) => void;
}

export function PhotoCard({ photo, onUpdate, onDelete, onApplyToAll }: PhotoCardProps) {
  const [editingFrente, setEditingFrente] = useState(false);
  const [editingServico, setEditingServico] = useState(false);
  const [editingOcr, setEditingOcr] = useState(false);
  const [frenteValue, setFrenteValue] = useState(photo.frente);
  const [servicoValue, setServicoValue] = useState(photo.servico);
  const [ocrValue, setOcrValue] = useState(photo.ocrText);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Parse OCR para extrair sugestões
  const ocrSuggestion = useMemo(() => {
    return parseOCRForLocalServico(photo.ocrText);
  }, [photo.ocrText]);

  const hasOcrSuggestion = ocrSuggestion.local || ocrSuggestion.servico;
  const needsUpdate = 
    (photo.frente === 'FRENTE_NAO_INFORMADA' || !photo.frente) ||
    (photo.servico === 'SERVICO_NAO_IDENTIFICADO' || !photo.servico);

  const handleApplyFromOCR = () => {
    const updates: Partial<PhotoData> = {};
    if (ocrSuggestion.local) {
      updates.frente = ocrSuggestion.local;
      setFrenteValue(ocrSuggestion.local);
    }
    if (ocrSuggestion.servico) {
      updates.servico = ocrSuggestion.servico;
      setServicoValue(ocrSuggestion.servico);
    }
    if (Object.keys(updates).length > 0) {
      onUpdate(photo.id, updates);
    }
  };

  const handleSaveFrente = () => {
    onUpdate(photo.id, { frente: frenteValue });
    setEditingFrente(false);
  };

  const handleSaveServico = () => {
    onUpdate(photo.id, { servico: servicoValue });
    setEditingServico(false);
  };

  const handleSaveOcr = () => {
    onUpdate(photo.id, { ocrText: ocrValue });
    setEditingOcr(false);
  };

  const handleCancelFrente = () => {
    setFrenteValue(photo.frente);
    setEditingFrente(false);
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

  // Gera o caminho de destino
  const destinationPath = useMemo(() => {
    const frente = photo.frente || 'FRENTE_NAO_INFORMADA';
    const disciplina = photo.disciplina || 'DISCIPLINA_NAO_INFORMADA';
    const servico = photo.servico || 'SERVICO_NAO_INFORMADO';
    
    let mesFolder = 'SEM_DATA';
    if (photo.yearMonth) {
      const [year, month] = photo.yearMonth.split('-');
      const monthNames = ['', 'JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
      const monthNum = parseInt(month, 10);
      mesFolder = `${month}_${monthNames[monthNum] || 'MES'}_${year}`;
    }
    
    let diaFolder = 'SEM_DIA';
    if (photo.dateIso) {
      const parts = photo.dateIso.split('-');
      if (parts.length >= 3) {
        diaFolder = `${parts[2]}_${parts[1]}`;
      }
    }
    
    return `${frente}/${disciplina}/${servico}/${mesFolder}/${diaFolder}`;
  }, [photo.frente, photo.disciplina, photo.servico, photo.yearMonth, photo.dateIso]);

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
          {/* Thumbnail */}
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

            {/* Botão Aplicar do OCR - Sempre mostra quando há sugestões */}
            {hasOcrSuggestion && (
              <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                needsUpdate 
                  ? 'bg-accent/10 border-accent/30' 
                  : 'bg-muted/50 border-border'
              }`}>
                <Wand2 className={`w-4 h-4 flex-shrink-0 ${needsUpdate ? 'text-accent' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Sugestão do OCR:</p>
                  <p className="text-sm text-foreground truncate">
                    {ocrSuggestion.local && <span><strong>Frente:</strong> {ocrSuggestion.local}</span>}
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
                  className={`h-7 px-3 text-xs ${needsUpdate ? 'btn-accent' : 'bg-muted hover:bg-muted/80'}`}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Aplicar
                </Button>
              </div>
            )}

            {/* Alertas */}
            {photo.alertas && photo.alertas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photo.alertas.map((alerta, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-warning/20 text-warning text-xs rounded border border-warning/30">
                    <AlertTriangle className="w-3 h-3" />
                    {alerta}
                  </span>
                ))}
              </div>
            )}

            {/* Data, Hora e GPS */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-accent" />
                <span className="text-foreground">{formatDate(photo.dateIso)}</span>
                {photo.hora && <span className="text-muted-foreground">às {photo.hora}</span>}
              </div>
              {photo.latitude !== null && (
                <a 
                  href={`https://maps.google.com/?q=${photo.latitude},${photo.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-accent hover:underline"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs">
                    {photo.latitude.toFixed(4)}, {photo.longitude?.toFixed(4)}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Frente e Serviço editáveis */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Frente */}
              <div className={`space-y-1 p-2 rounded-lg transition-colors ${
                photo.frente === 'FRENTE_NAO_INFORMADA' || !photo.frente 
                  ? 'bg-warning/10 border-2 border-warning/50 border-dashed' 
                  : ''
              }`}>
                <label className={`text-xs font-medium ${
                  photo.frente === 'FRENTE_NAO_INFORMADA' || !photo.frente 
                    ? 'text-warning' 
                    : 'text-muted-foreground'
                }`}>
                  Frente {(photo.frente === 'FRENTE_NAO_INFORMADA' || !photo.frente) && '⚠️'}
                </label>
                {editingFrente ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={frenteValue}
                      onChange={(e) => setFrenteValue(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <button onClick={handleSaveFrente} className="p-1 text-success hover:bg-success/10 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={handleCancelFrente} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div 
                      className="flex items-center gap-2 cursor-pointer group flex-1 min-w-0"
                      onClick={() => setEditingFrente(true)}
                    >
                      <span className={`text-sm truncate font-semibold ${
                        photo.frente === 'FRENTE_NAO_INFORMADA' || !photo.frente 
                          ? 'text-warning' 
                          : 'text-foreground'
                      }`}>
                        {photo.frente || 'Clique para definir'}
                      </span>
                      <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    {photo.frente && photo.frente !== 'FRENTE_NAO_INFORMADA' && onApplyToAll && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onApplyToAll('frente', photo.frente!)}
                        className="h-6 px-2 text-xs text-accent hover:text-accent hover:bg-accent/10"
                        title="Aplicar em todas as fotos"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Disciplina (read-only) */}
              <div className="space-y-1 p-2 rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Disciplina</label>
                <p className="text-sm text-foreground font-medium truncate">
                  {photo.disciplina || '-'}
                </p>
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
                        title="Aplicar em todas as fotos"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Confiança da IA e Caminho de destino */}
            {photo.aiConfidence !== null && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Confiança IA</span>
                  <span className={`font-semibold ${photo.aiConfidence >= 90 ? 'text-success' : photo.aiConfidence >= 70 ? 'text-warning' : 'text-destructive'}`}>
                    {photo.aiConfidence}%
                  </span>
                </div>
                <Progress value={photo.aiConfidence} className="h-1.5" />
                
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Caminho de destino:</p>
                  <code className="text-[10px] text-accent bg-muted px-2 py-1 rounded block truncate">
                    {destinationPath}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <PhotoLightbox
        imageUrl={photo.thumbnailUrl}
        filename={photo.filename}
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
      />

      {/* Delete Dialog */}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}