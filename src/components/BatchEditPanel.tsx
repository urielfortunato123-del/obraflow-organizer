import { useState, useMemo } from 'react';
import { 
  CheckCircle2, Edit3, ChevronDown, ChevronUp, 
  Building2, Wrench, Check, X, Copy
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { PhotoData } from '@/types/photo';

interface BatchEditPanelProps {
  photos: PhotoData[];
  onBatchUpdate: (ids: string[], updates: Partial<PhotoData>) => void;
}

export function BatchEditPanel({ photos, onBatchUpdate }: BatchEditPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [frenteValue, setFrenteValue] = useState('');
  const [servicoValue, setServicoValue] = useState('');

  // Agrupa valores únicos encontrados
  const uniqueValues = useMemo(() => {
    const frentes = new Map<string, number>();
    const servicos = new Map<string, number>();

    photos.forEach(photo => {
      if (photo.frente && photo.frente !== 'FRENTE_NAO_INFORMADA') {
        frentes.set(photo.frente, (frentes.get(photo.frente) || 0) + 1);
      }
      if (photo.servico && photo.servico !== 'SERVICO_NAO_IDENTIFICADO') {
        servicos.set(photo.servico, (servicos.get(photo.servico) || 0) + 1);
      }
    });

    return {
      frentes: Array.from(frentes.entries()).sort((a, b) => b[1] - a[1]),
      servicos: Array.from(servicos.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [photos]);

  // Fotos com valores padrão/não identificados
  const photosWithDefaultValues = useMemo(() => {
    return photos.filter(
      p => p.frente === 'FRENTE_NAO_INFORMADA' || 
           p.servico === 'SERVICO_NAO_IDENTIFICADO' ||
           !p.frente || !p.servico
    );
  }, [photos]);

  const handleSelectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map(p => p.id)));
    }
  };

  const handleSelectWithDefaults = () => {
    setSelectedIds(new Set(photosWithDefaultValues.map(p => p.id)));
  };

  const handleTogglePhoto = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleApplyFrente = () => {
    if (!frenteValue.trim()) return;
    const targetIds = selectedIds.size > 0 
      ? Array.from(selectedIds) 
      : photos.map(p => p.id);
    onBatchUpdate(targetIds, { frente: frenteValue.trim() });
    setFrenteValue('');
  };

  const handleApplyServico = () => {
    if (!servicoValue.trim()) return;
    const targetIds = selectedIds.size > 0 
      ? Array.from(selectedIds) 
      : photos.map(p => p.id);
    onBatchUpdate(targetIds, { servico: servicoValue.trim() });
    setServicoValue('');
  };

  const handleQuickApplyFrente = (value: string) => {
    const targetIds = selectedIds.size > 0 
      ? Array.from(selectedIds) 
      : photos.map(p => p.id);
    onBatchUpdate(targetIds, { frente: value });
  };

  const handleQuickApplyServico = (value: string) => {
    const targetIds = selectedIds.size > 0 
      ? Array.from(selectedIds) 
      : photos.map(p => p.id);
    onBatchUpdate(targetIds, { servico: value });
  };

  if (photos.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="card-industrial overflow-hidden">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Edit3 className="w-5 h-5 text-accent" />
            <div className="text-left">
              <h3 className="font-semibold text-foreground">Edição em Lote</h3>
              <p className="text-xs text-muted-foreground">
                {selectedIds.size > 0 
                  ? `${selectedIds.size} foto(s) selecionada(s)`
                  : 'Aplicar alterações em várias fotos'
                }
                {photosWithDefaultValues.length > 0 && (
                  <span className="text-warning ml-2">
                    • {photosWithDefaultValues.length} sem frente/serviço definido
                  </span>
                )}
              </p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 border-t border-border">
            {/* Seleção rápida */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Selecionar:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="h-7 text-xs"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {selectedIds.size === photos.length ? 'Desmarcar todas' : 'Todas'}
              </Button>
              {photosWithDefaultValues.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectWithDefaults}
                  className="h-7 text-xs border-warning text-warning hover:bg-warning/10"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Sem identificação ({photosWithDefaultValues.length})
                </Button>
              )}
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                  className="h-7 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpar seleção
                </Button>
              )}
            </div>

            {/* Aplicar Frente */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Building2 className="w-4 h-4 text-accent" />
                Aplicar Frente de Serviço
              </label>
              <div className="flex gap-2">
                <Input
                  value={frenteValue}
                  onChange={(e) => setFrenteValue(e.target.value)}
                  placeholder="Ex: FREE_FLOW_P09, BSO_04..."
                  className="flex-1"
                />
                <Button 
                  onClick={handleApplyFrente}
                  disabled={!frenteValue.trim()}
                  className="btn-accent"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {selectedIds.size > 0 ? `Aplicar (${selectedIds.size})` : 'Aplicar em todas'}
                </Button>
              </div>
              
              {/* Sugestões de Frente */}
              {uniqueValues.frentes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Sugestões:</span>
                  {uniqueValues.frentes.slice(0, 5).map(([value, count]) => (
                    <button
                      key={value}
                      onClick={() => handleQuickApplyFrente(value)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                      title={`Aplicar "${value}" (${count} foto(s) já usam)`}
                    >
                      <Copy className="w-3 h-3" />
                      {value}
                      <span className="text-muted-foreground">({count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Aplicar Serviço */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Wrench className="w-4 h-4 text-accent" />
                Aplicar Serviço
              </label>
              <div className="flex gap-2">
                <Input
                  value={servicoValue}
                  onChange={(e) => setServicoValue(e.target.value)}
                  placeholder="Ex: LIMPEZA_TERRENO, ALVENARIA..."
                  className="flex-1"
                />
                <Button 
                  onClick={handleApplyServico}
                  disabled={!servicoValue.trim()}
                  className="btn-accent"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {selectedIds.size > 0 ? `Aplicar (${selectedIds.size})` : 'Aplicar em todas'}
                </Button>
              </div>
              
              {/* Sugestões de Serviço */}
              {uniqueValues.servicos.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Sugestões:</span>
                  {uniqueValues.servicos.slice(0, 5).map(([value, count]) => (
                    <button
                      key={value}
                      onClick={() => handleQuickApplyServico(value)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                      title={`Aplicar "${value}" (${count} foto(s) já usam)`}
                    >
                      <Copy className="w-3 h-3" />
                      {value}
                      <span className="text-muted-foreground">({count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de seleção individual */}
            {photos.length > 0 && photos.length <= 20 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Seleção individual:
                </label>
                <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {photos.map((photo) => (
                    <label
                      key={photo.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedIds.has(photo.id)}
                        onCheckedChange={() => handleTogglePhoto(photo.id)}
                      />
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.filename}
                        className="w-8 h-8 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {photo.filename}
                        </p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span className={photo.frente === 'FRENTE_NAO_INFORMADA' || !photo.frente ? 'text-warning' : ''}>
                            {photo.frente || 'Sem frente'}
                          </span>
                          <span>•</span>
                          <span className={photo.servico === 'SERVICO_NAO_IDENTIFICADO' || !photo.servico ? 'text-warning' : ''}>
                            {photo.servico || 'Sem serviço'}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}