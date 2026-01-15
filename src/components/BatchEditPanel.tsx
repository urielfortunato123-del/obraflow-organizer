import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  CheckCircle2, Edit3, ChevronDown, ChevronUp, 
  Building2, Wrench, Check, X, Copy, Layers
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { FRENTES_DE_OBRA, DISCIPLINAS, SERVICOS } from '@/data/constructionTerms';
import type { PhotoData } from '@/types/photo';

interface BatchEditPanelProps {
  photos: PhotoData[];
  onBatchUpdate: (ids: string[], updates: Partial<PhotoData>) => void;
}

// Componente de input com autocomplete inline
function BatchAutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value || value.length < 1) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const normalizedInput = value
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '');

    const filtered = suggestions
      .filter(item => {
        const normalizedItem = item
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Z0-9_]/g, '');
        return normalizedItem.includes(normalizedInput);
      })
      .sort((a, b) => {
        const normalizedA = a.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normalizedB = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const aStarts = normalizedA.toUpperCase().startsWith(normalizedInput);
        const bStarts = normalizedB.toUpperCase().startsWith(normalizedInput);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 8);

    setFilteredSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(-1);
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
          e.preventDefault();
          onChange(filteredSuggestions[selectedIndex]);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      case 'Tab':
        if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
          e.preventDefault();
          onChange(filteredSuggestions[selectedIndex]);
          setShowSuggestions(false);
        }
        break;
    }
  };

  return (
    <div className={cn("relative flex-1", className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (filteredSuggestions.length > 0) setShowSuggestions(true);
        }}
        placeholder={placeholder}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BatchEditPanel({ photos, onBatchUpdate }: BatchEditPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [frenteValue, setFrenteValue] = useState('');
  const [disciplinaValue, setDisciplinaValue] = useState('');
  const [servicoValue, setServicoValue] = useState('');

  // Agrupa valores únicos encontrados
  const uniqueValues = useMemo(() => {
    const frentes = new Map<string, number>();
    const disciplinas = new Map<string, number>();
    const servicos = new Map<string, number>();

    photos.forEach(photo => {
      if (photo.frente && photo.frente !== 'FRENTE_NAO_INFORMADA') {
        frentes.set(photo.frente, (frentes.get(photo.frente) || 0) + 1);
      }
      if (photo.disciplina && photo.disciplina !== 'DISCIPLINA_NAO_INFORMADA') {
        disciplinas.set(photo.disciplina, (disciplinas.get(photo.disciplina) || 0) + 1);
      }
      if (photo.servico && photo.servico !== 'SERVICO_NAO_IDENTIFICADO') {
        servicos.set(photo.servico, (servicos.get(photo.servico) || 0) + 1);
      }
    });

    return {
      frentes: Array.from(frentes.entries()).sort((a, b) => b[1] - a[1]),
      disciplinas: Array.from(disciplinas.entries()).sort((a, b) => b[1] - a[1]),
      servicos: Array.from(servicos.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [photos]);

  // Fotos com valores padrão/não identificados
  const photosWithDefaultValues = useMemo(() => {
    return photos.filter(
      p => p.frente === 'FRENTE_NAO_INFORMADA' || 
           p.disciplina === 'DISCIPLINA_NAO_INFORMADA' ||
           p.servico === 'SERVICO_NAO_IDENTIFICADO' ||
           !p.frente || !p.disciplina || !p.servico
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

  const handleApplyDisciplina = () => {
    if (!disciplinaValue.trim()) return;
    const targetIds = selectedIds.size > 0 
      ? Array.from(selectedIds) 
      : photos.map(p => p.id);
    onBatchUpdate(targetIds, { disciplina: disciplinaValue.trim() });
    setDisciplinaValue('');
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

  const handleQuickApplyDisciplina = (value: string) => {
    const targetIds = selectedIds.size > 0 
      ? Array.from(selectedIds) 
      : photos.map(p => p.id);
    onBatchUpdate(targetIds, { disciplina: value });
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
                    • {photosWithDefaultValues.length} sem identificação completa
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
                <BatchAutocompleteInput
                  value={frenteValue}
                  onChange={setFrenteValue}
                  suggestions={FRENTES_DE_OBRA}
                  placeholder="Digite: FREE_FLOW, BSO, TRECHO..."
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
                  <span className="text-xs text-muted-foreground mr-1">Usados:</span>
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

            {/* Aplicar Disciplina */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Layers className="w-4 h-4 text-accent" />
                Aplicar Disciplina
              </label>
              <div className="flex gap-2">
                <BatchAutocompleteInput
                  value={disciplinaValue}
                  onChange={setDisciplinaValue}
                  suggestions={DISCIPLINAS}
                  placeholder="Digite: TERRAPLANAGEM, PAVIMENTACAO..."
                />
                <Button 
                  onClick={handleApplyDisciplina}
                  disabled={!disciplinaValue.trim()}
                  className="btn-accent"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {selectedIds.size > 0 ? `Aplicar (${selectedIds.size})` : 'Aplicar em todas'}
                </Button>
              </div>
              
              {/* Sugestões de Disciplina */}
              {uniqueValues.disciplinas.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Usados:</span>
                  {uniqueValues.disciplinas.slice(0, 5).map(([value, count]) => (
                    <button
                      key={value}
                      onClick={() => handleQuickApplyDisciplina(value)}
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
                <BatchAutocompleteInput
                  value={servicoValue}
                  onChange={setServicoValue}
                  suggestions={SERVICOS}
                  placeholder="Digite: ESCAVACAO, CONCRETAGEM, PINTURA..."
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
                  <span className="text-xs text-muted-foreground mr-1">Usados:</span>
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
                          <span className={photo.disciplina === 'DISCIPLINA_NAO_INFORMADA' || !photo.disciplina ? 'text-warning' : ''}>
                            {photo.disciplina || 'Sem disciplina'}
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
