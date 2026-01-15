import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Zap, ChevronDown, ChevronUp, Check, ChevronLeft, ChevronRight,
  Building2, Layers, Wrench, SkipForward, Grid3X3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { FRENTES_DE_OBRA, DISCIPLINAS, SERVICOS } from '@/data/constructionTerms';
import type { PhotoData } from '@/types/photo';

interface QuickClassifyPanelProps {
  photos: PhotoData[];
  onUpdatePhoto: (id: string, updates: Partial<PhotoData>) => void;
  onBatchUpdate: (ids: string[], updates: Partial<PhotoData>) => void;
}

type ClassifyStep = 'frente' | 'disciplina' | 'servico';

export function QuickClassifyPanel({ photos, onUpdatePhoto, onBatchUpdate }: QuickClassifyPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState<ClassifyStep>('frente');
  const [searchTerm, setSearchTerm] = useState('');
  const [recentFrente, setRecentFrente] = useState<string[]>([]);
  const [recentDisciplina, setRecentDisciplina] = useState<string[]>([]);
  const [recentServico, setRecentServico] = useState<string[]>([]);

  // Fotos não classificadas ou com valores padrão
  const unclassifiedPhotos = useMemo(() => {
    return photos.filter(
      p => !p.frente || 
           !p.disciplina || 
           !p.servico ||
           p.frente === 'FRENTE_NAO_INFORMADA' || 
           p.disciplina === 'DISCIPLINA_NAO_INFORMADA' ||
           p.servico === 'SERVICO_NAO_IDENTIFICADO'
    );
  }, [photos]);

  // Foto atual selecionada para classificação
  const currentPhoto = useMemo(() => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0];
      return photos.find(p => p.id === id);
    }
    return unclassifiedPhotos[currentIndex] || null;
  }, [photos, unclassifiedPhotos, currentIndex, selectedIds]);

  // Sugestões baseadas no passo atual
  const suggestions = useMemo(() => {
    let list: string[] = [];
    let recentList: string[] = [];

    switch (currentStep) {
      case 'frente':
        list = FRENTES_DE_OBRA;
        recentList = recentFrente;
        break;
      case 'disciplina':
        list = DISCIPLINAS;
        recentList = recentDisciplina;
        break;
      case 'servico':
        list = SERVICOS;
        recentList = recentServico;
        break;
    }

    // Filtra por termo de busca
    if (searchTerm) {
      const normalized = searchTerm
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]/g, '');

      list = list.filter(item => {
        const normalizedItem = item
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Z0-9_]/g, '');
        return normalizedItem.includes(normalized);
      });
    }

    // Coloca recentes primeiro
    const recentSet = new Set(recentList);
    const sortedList = [
      ...recentList.filter(r => !searchTerm || list.includes(r)),
      ...list.filter(item => !recentSet.has(item))
    ];

    return sortedList.slice(0, 20);
  }, [currentStep, searchTerm, recentFrente, recentDisciplina, recentServico]);

  // Aplica valor selecionado
  const applyValue = useCallback((value: string) => {
    const targetIds = selectedIds.size > 0 
      ? Array.from(selectedIds)
      : currentPhoto 
        ? [currentPhoto.id]
        : [];

    if (targetIds.length === 0) return;

    // Atualiza fotos
    const updates: Partial<PhotoData> = {};
    switch (currentStep) {
      case 'frente':
        updates.frente = value;
        setRecentFrente(prev => [value, ...prev.filter(v => v !== value)].slice(0, 5));
        break;
      case 'disciplina':
        updates.disciplina = value;
        setRecentDisciplina(prev => [value, ...prev.filter(v => v !== value)].slice(0, 5));
        break;
      case 'servico':
        updates.servico = value;
        setRecentServico(prev => [value, ...prev.filter(v => v !== value)].slice(0, 5));
        break;
    }

    onBatchUpdate(targetIds, updates);

    // Avança para próximo passo ou próxima foto
    if (currentStep === 'frente') {
      setCurrentStep('disciplina');
    } else if (currentStep === 'disciplina') {
      setCurrentStep('servico');
    } else {
      // Serviço aplicado - avança para próxima foto
      setCurrentStep('frente');
      if (selectedIds.size === 0) {
        setCurrentIndex(prev => Math.min(prev + 1, unclassifiedPhotos.length - 1));
      } else {
        setSelectedIds(new Set());
      }
    }

    setSearchTerm('');
  }, [selectedIds, currentPhoto, currentStep, onBatchUpdate, unclassifiedPhotos.length]);

  // Pula foto atual
  const skipPhoto = useCallback(() => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setCurrentIndex(prev => Math.min(prev + 1, unclassifiedPhotos.length - 1));
    }
    setCurrentStep('frente');
    setSearchTerm('');
  }, [selectedIds, unclassifiedPhotos.length]);

  // Volta para foto anterior
  const prevPhoto = useCallback(() => {
    setSelectedIds(new Set());
    setCurrentIndex(prev => Math.max(prev - 1, 0));
    setCurrentStep('frente');
    setSearchTerm('');
  }, []);

  // Seleciona/deseleciona foto para classificação em lote
  const togglePhotoSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Atalhos de teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se está digitando no input
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          skipPhoto();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevPhoto();
          break;
        case '1':
          setCurrentStep('frente');
          break;
        case '2':
          setCurrentStep('disciplina');
          break;
        case '3':
          setCurrentStep('servico');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, skipPhoto, prevPhoto]);

  if (photos.length === 0) return null;

  const stepLabels = {
    frente: { label: 'Frente de Obra', icon: Building2 },
    disciplina: { label: 'Disciplina', icon: Layers },
    servico: { label: 'Serviço', icon: Wrench },
  };

  const StepIcon = stepLabels[currentStep].icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="card-industrial overflow-hidden border-2 border-accent/30">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors bg-accent/5">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-accent" />
            <div className="text-left">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Classificação Rápida
                <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                  TURBO
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {unclassifiedPhotos.length > 0 
                  ? `${unclassifiedPhotos.length} foto(s) aguardando classificação`
                  : 'Todas as fotos classificadas!'
                }
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
          <div className="p-4 pt-0 border-t border-border space-y-4">
            {/* Miniaturas para seleção rápida */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  Clique para selecionar (múltiplas = lote)
                </span>
                {selectedIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                    className="h-6 text-xs"
                  >
                    Limpar ({selectedIds.size})
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {unclassifiedPhotos.slice(0, 20).map((photo, idx) => (
                  <button
                    key={photo.id}
                    onClick={() => togglePhotoSelection(photo.id)}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all relative group",
                      selectedIds.has(photo.id)
                        ? "border-accent ring-2 ring-accent/50"
                        : idx === currentIndex && selectedIds.size === 0
                          ? "border-primary"
                          : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <img 
                      src={photo.thumbnailUrl} 
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                    />
                    {selectedIds.has(photo.id) && (
                      <div className="absolute inset-0 bg-accent/30 flex items-center justify-center">
                        <Check className="w-6 h-6 text-accent-foreground" />
                      </div>
                    )}
                    {/* Indicadores de status */}
                    <div className="absolute bottom-0 left-0 right-0 flex gap-0.5 p-0.5">
                      <div className={cn(
                        "flex-1 h-1 rounded-full",
                        photo.frente && photo.frente !== 'FRENTE_NAO_INFORMADA'
                          ? "bg-green-500"
                          : "bg-muted"
                      )} />
                      <div className={cn(
                        "flex-1 h-1 rounded-full",
                        photo.disciplina && photo.disciplina !== 'DISCIPLINA_NAO_INFORMADA'
                          ? "bg-green-500"
                          : "bg-muted"
                      )} />
                      <div className={cn(
                        "flex-1 h-1 rounded-full",
                        photo.servico && photo.servico !== 'SERVICO_NAO_IDENTIFICADO'
                          ? "bg-green-500"
                          : "bg-muted"
                      )} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Foto atual em destaque */}
            {currentPhoto && (
              <div className="flex gap-4">
                {/* Preview maior */}
                <div className="w-32 h-32 rounded-lg overflow-hidden border border-border flex-shrink-0">
                  <img 
                    src={currentPhoto.thumbnailUrl} 
                    alt={currentPhoto.filename}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info da foto */}
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-medium text-foreground truncate">
                    {currentPhoto.filename}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className={cn(
                      "px-2 py-1 rounded",
                      currentPhoto.frente && currentPhoto.frente !== 'FRENTE_NAO_INFORMADA'
                        ? "bg-green-500/20 text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <span className="opacity-70">Frente:</span><br/>
                      {currentPhoto.frente || '—'}
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded",
                      currentPhoto.disciplina && currentPhoto.disciplina !== 'DISCIPLINA_NAO_INFORMADA'
                        ? "bg-green-500/20 text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <span className="opacity-70">Disciplina:</span><br/>
                      {currentPhoto.disciplina || '—'}
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded",
                      currentPhoto.servico && currentPhoto.servico !== 'SERVICO_NAO_IDENTIFICADO'
                        ? "bg-green-500/20 text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <span className="opacity-70">Serviço:</span><br/>
                      {currentPhoto.servico || '—'}
                    </div>
                  </div>

                  {/* Navegação */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevPhoto}
                      disabled={currentIndex === 0 && selectedIds.size === 0}
                      className="h-7"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.size > 0 
                        ? `${selectedIds.size} selecionada(s)`
                        : `${currentIndex + 1} / ${unclassifiedPhotos.length}`
                      }
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={skipPhoto}
                      className="h-7"
                    >
                      <SkipForward className="w-4 h-4 mr-1" />
                      Pular
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Seletor de passo */}
            <div className="flex gap-2">
              {(['frente', 'disciplina', 'servico'] as ClassifyStep[]).map((step, idx) => {
                const Icon = stepLabels[step].icon;
                return (
                  <button
                    key={step}
                    onClick={() => {
                      setCurrentStep(step);
                      setSearchTerm('');
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                      currentStep === step
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{stepLabels[step].label}</span>
                    <span className="text-xs opacity-70">({idx + 1})</span>
                  </button>
                );
              })}
            </div>

            {/* Busca e sugestões */}
            <div className="space-y-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                placeholder={`Buscar ${stepLabels[currentStep].label}...`}
                className="w-full"
                autoFocus
              />

              {/* Botões de sugestão rápida */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    onClick={() => applyValue(item)}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg transition-all",
                      "bg-muted hover:bg-accent hover:text-accent-foreground",
                      "border border-transparent hover:border-accent"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {/* Input personalizado */}
              {searchTerm && !suggestions.includes(searchTerm) && (
                <Button
                  onClick={() => applyValue(searchTerm)}
                  className="w-full btn-accent"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Usar "{searchTerm}" (personalizado)
                </Button>
              )}
            </div>

            {/* Dica de atalhos */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
              Atalhos: <kbd className="px-1 py-0.5 bg-muted rounded">←</kbd> Anterior 
              <span className="mx-2">|</span>
              <kbd className="px-1 py-0.5 bg-muted rounded">→</kbd> Pular
              <span className="mx-2">|</span>
              <kbd className="px-1 py-0.5 bg-muted rounded">1</kbd><kbd className="px-1 py-0.5 bg-muted rounded">2</kbd><kbd className="px-1 py-0.5 bg-muted rounded">3</kbd> Mudar passo
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
