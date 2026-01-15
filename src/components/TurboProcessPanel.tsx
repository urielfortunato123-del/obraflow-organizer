import { useState, useCallback, useMemo } from 'react';
import { 
  Rocket, ChevronDown, ChevronUp, Play, Pause, AlertCircle,
  CheckCircle2, Loader2, Zap, FolderOpen, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { PhotoData } from '@/types/photo';
import { useToast } from '@/hooks/use-toast';

interface TurboProcessPanelProps {
  photos: PhotoData[];
  onBatchUpdate: (ids: string[], updates: Partial<PhotoData>) => void;
}

const BATCH_SIZE = 50; // Fotos por lote para a IA

export function TurboProcessPanel({ photos, onBatchUpdate }: TurboProcessPanelProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  // Estatísticas
  const stats = useMemo(() => {
    const unclassified = photos.filter(
      p => !p.frente || 
           !p.disciplina || 
           !p.servico ||
           p.frente === 'FRENTE_NAO_INFORMADA' || 
           p.disciplina === 'DISCIPLINA_NAO_INFORMADA' ||
           p.servico === 'SERVICO_NAO_IDENTIFICADO'
    );
    
    const classified = photos.length - unclassified.length;
    
    // Agrupa por pasta
    const folders = new Map<string, number>();
    photos.forEach(p => {
      const folder = p.folderPath || 'root';
      folders.set(folder, (folders.get(folder) || 0) + 1);
    });

    return {
      total: photos.length,
      classified,
      unclassified: unclassified.length,
      folders: folders.size,
      unclassifiedPhotos: unclassified,
    };
  }, [photos]);

  // Processa em lotes usando a edge function
  const processWithAI = useCallback(async () => {
    if (stats.unclassifiedPhotos.length === 0) {
      toast({
        title: 'Todas as fotos já estão classificadas!',
        description: 'Não há fotos pendentes.',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);
    setErrorCount(0);

    const photosToProcess = stats.unclassifiedPhotos;
    const batches = Math.ceil(photosToProcess.length / BATCH_SIZE);
    setTotalBatches(batches);

    let successCount = 0;
    let errors = 0;

    for (let i = 0; i < batches; i++) {
      setCurrentBatch(i + 1);
      
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, photosToProcess.length);
      const batch = photosToProcess.slice(start, end);

      try {
        // Prepara dados para a IA
        const batchData = batch.map(p => ({
          id: p.id,
          filename: p.filename,
          folderPath: p.folderPath,
          ocrText: p.ocrText?.substring(0, 200), // Limita texto
          dateIso: p.dateIso,
          yearMonth: p.yearMonth,
        }));

        console.log(`[Turbo] Processando lote ${i + 1}/${batches} (${batch.length} fotos)`);

        const { data, error } = await supabase.functions.invoke('classify-batch', {
          body: { photos: batchData },
        });

        if (error) {
          console.error('[Turbo] Erro na edge function:', error);
          errors += batch.length;
          continue;
        }

        if (data.error) {
          console.error('[Turbo] Erro retornado:', data.error);
          
          // Se for rate limit, espera um pouco
          if (data.error.includes('Rate limit')) {
            toast({
              title: 'Aguardando rate limit...',
              description: 'Esperando 5 segundos antes de continuar.',
            });
            await new Promise(r => setTimeout(r, 5000));
            i--; // Tenta novamente
            continue;
          }
          
          errors += batch.length;
          continue;
        }

        // Aplica resultados
        const results = data.results || [];
        for (const result of results) {
          onBatchUpdate([result.id], {
            frente: result.frente,
            disciplina: result.disciplina,
            servico: result.servico,
            status: 'OK',
            aiStatus: 'success',
          });
          successCount++;
        }

      } catch (err) {
        console.error('[Turbo] Erro no lote:', err);
        errors += batch.length;
      }

      setProcessedCount(successCount);
      setErrorCount(errors);
      setProgress(((i + 1) / batches) * 100);

      // Pequena pausa entre lotes para evitar rate limit
      if (i < batches - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setIsProcessing(false);
    setProgress(100);

    toast({
      title: 'Processamento TURBO concluído!',
      description: `${successCount} fotos classificadas. ${errors > 0 ? `${errors} erros.` : ''}`,
    });

  }, [stats.unclassifiedPhotos, onBatchUpdate, toast]);

  // Propaga classificação de uma foto para todas da mesma pasta
  const propagateFromFolder = useCallback((folderPath: string) => {
    const folderPhotos = photos.filter(p => p.folderPath === folderPath);
    const classified = folderPhotos.find(p => 
      p.frente && 
      p.disciplina && 
      p.servico &&
      p.frente !== 'FRENTE_NAO_INFORMADA' &&
      p.disciplina !== 'DISCIPLINA_NAO_INFORMADA' &&
      p.servico !== 'SERVICO_NAO_IDENTIFICADO'
    );

    if (classified) {
      const unclassifiedIds = folderPhotos
        .filter(p => !p.frente || !p.disciplina || !p.servico ||
                     p.frente === 'FRENTE_NAO_INFORMADA' ||
                     p.disciplina === 'DISCIPLINA_NAO_INFORMADA' ||
                     p.servico === 'SERVICO_NAO_IDENTIFICADO')
        .map(p => p.id);

      if (unclassifiedIds.length > 0) {
        onBatchUpdate(unclassifiedIds, {
          frente: classified.frente,
          disciplina: classified.disciplina,
          servico: classified.servico,
          status: 'OK',
        });

        toast({
          title: 'Classificação propagada!',
          description: `${unclassifiedIds.length} fotos da pasta "${folderPath}" atualizadas.`,
        });
      }
    }
  }, [photos, onBatchUpdate, toast]);

  // Lista de pastas com fotos não classificadas
  const foldersWithUnclassified = useMemo(() => {
    const folders = new Map<string, { total: number; unclassified: number; hasClassified: boolean }>();
    
    photos.forEach(p => {
      const folder = p.folderPath || 'root';
      const current = folders.get(folder) || { total: 0, unclassified: 0, hasClassified: false };
      
      current.total++;
      
      const isUnclassified = !p.frente || !p.disciplina || !p.servico ||
        p.frente === 'FRENTE_NAO_INFORMADA' ||
        p.disciplina === 'DISCIPLINA_NAO_INFORMADA' ||
        p.servico === 'SERVICO_NAO_IDENTIFICADO';
      
      if (isUnclassified) {
        current.unclassified++;
      } else {
        current.hasClassified = true;
      }
      
      folders.set(folder, current);
    });

    return Array.from(folders.entries())
      .filter(([, data]) => data.unclassified > 0)
      .sort((a, b) => b[1].unclassified - a[1].unclassified);
  }, [photos]);

  if (photos.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="card-industrial overflow-hidden border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-accent/5">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Rocket className="w-6 h-6 text-primary animate-pulse" />
            <div className="text-left">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                🚀 Modo TURBO - IA em Massa
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full animate-pulse">
                  3000+ FOTOS
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {stats.unclassified > 0 
                  ? `${stats.unclassified} fotos aguardando • ${stats.folders} pastas`
                  : '✅ Todas as fotos classificadas!'
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
            {/* Estatísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-500">{stats.classified}</div>
                <div className="text-xs text-muted-foreground">Classificadas</div>
              </div>
              <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.unclassified}</div>
                <div className="text-xs text-muted-foreground">Pendentes</div>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-500">{stats.folders}</div>
                <div className="text-xs text-muted-foreground">Pastas</div>
              </div>
            </div>

            {/* Botão principal */}
            <Button
              onClick={processWithAI}
              disabled={isProcessing || stats.unclassified === 0}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Processando lote {currentBatch}/{totalBatches}...
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6 mr-2" />
                  🚀 CLASSIFICAR {stats.unclassified} FOTOS COM IA
                </>
              )}
            </Button>

            {/* Progresso */}
            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    <CheckCircle2 className="w-3 h-3 inline mr-1 text-green-500" />
                    {processedCount} classificadas
                  </span>
                  {errorCount > 0 && (
                    <span>
                      <AlertCircle className="w-3 h-3 inline mr-1 text-red-500" />
                      {errorCount} erros
                    </span>
                  )}
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            )}

            {/* Propagação por pasta */}
            {foldersWithUnclassified.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Propagar classificação por pasta
                  <span className="text-xs text-muted-foreground">(clique para aplicar)</span>
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {foldersWithUnclassified.slice(0, 20).map(([folder, data]) => (
                    <button
                      key={folder}
                      onClick={() => propagateFromFolder(folder)}
                      disabled={!data.hasClassified}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all",
                        data.hasClassified
                          ? "bg-muted hover:bg-accent/20 cursor-pointer"
                          : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                      )}
                    >
                      <span className="truncate flex-1 text-left">
                        📁 {folder || 'root'}
                      </span>
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-orange-500">{data.unclassified} pendentes</span>
                        {data.hasClassified ? (
                          <Copy className="w-3 h-3 text-accent" />
                        ) : (
                          <span className="text-muted-foreground">sem modelo</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                {foldersWithUnclassified.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{foldersWithUnclassified.length - 20} pastas...
                  </p>
                )}
              </div>
            )}

            {/* Dica */}
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              💡 <strong>Dica:</strong> O modo TURBO analisa o nome das pastas e arquivos para classificar automaticamente. 
              Fotos na mesma pasta recebem a mesma classificação. 
              Você pode também clicar em uma pasta para propagar a classificação de uma foto já classificada para todas as outras.
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
