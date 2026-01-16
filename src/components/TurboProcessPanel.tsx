import { useState, useCallback, useMemo } from 'react';
import { 
  Rocket, ChevronDown, ChevronUp, AlertCircle,
  CheckCircle2, Loader2, Zap, FolderOpen, Copy, Repeat, Sparkles,
  AlertTriangle, Eye, X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight
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
import { classifyPhoto, needsReview, propagateByFolder, determineStatus } from '@/utils/classification';
import { extractDateFromFile } from '@/utils/exportPath';
import { processOCR } from '@/utils/ocr';
import { 
  inferDisciplinaFromPath, 
  inferFrenteFromPath, 
  inferDisciplinaFromServico,
  inferServicoFromDisciplina,
  needsManualReview,
  applyFallbacks 
} from '@/utils/inference';

interface TurboProcessPanelProps {
  photos: PhotoData[];
  onBatchUpdate: (ids: string[], updates: Partial<PhotoData>) => void;
  onScrollToPhoto?: (photoId: string) => void;
  onUpdatePhoto?: (id: string, updates: Partial<PhotoData>) => void;
}

const BATCH_SIZE = 50; // Fotos por lote para a IA

// Armazena última classificação usada por categoria
interface LastClassification {
  frente: string;
  disciplina: string;
  servico: string;
  count: number;
}

// Resultado de análise com confiança
interface AnalysisResult {
  photoId: string;
  confidence: 'high' | 'medium' | 'low' | 'unrecognized';
  frente?: string;
  disciplina?: string;
  servico?: string;
  reason?: string;
}

export function TurboProcessPanel({ photos, onBatchUpdate, onScrollToPhoto, onUpdatePhoto }: TurboProcessPanelProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  
  // Estado para fotos não reconhecidas
  const [unrecognizedPhotos, setUnrecognizedPhotos] = useState<AnalysisResult[]>([]);
  const [showUnrecognized, setShowUnrecognized] = useState(false);
  
  // Lightbox para verificação
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoData | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Estatísticas e agrupamentos
  const stats = useMemo(() => {
    // Fotos sem classificação completa
    const unclassified = photos.filter(
      p => !p.frente || 
           !p.disciplina || 
           !p.servico ||
           p.frente === 'FRENTE_NAO_INFORMADA' || 
           p.disciplina === 'DISCIPLINA_NAO_INFORMADA' ||
           p.servico === 'SERVICO_NAO_IDENTIFICADO'
    );
    
    // Fotos PRONTAS = classificação + data completas
    const ready = photos.filter(
      p => p.frente && p.frente !== 'FRENTE_NAO_INFORMADA' &&
           p.disciplina && p.disciplina !== 'DISCIPLINA_NAO_INFORMADA' &&
           p.servico && p.servico !== 'SERVICO_NAO_IDENTIFICADO' &&
           p.yearMonth && p.dateIso
    );
    
    const classified = photos.length - unclassified.length;
    
    // Agrupa por pasta
    const folders = new Map<string, number>();
    photos.forEach(p => {
      const folder = p.folderPath || 'root';
      folders.set(folder, (folders.get(folder) || 0) + 1);
    });

    // Agrupa classificações usadas (para "última classificação")
    const classificationCounts = new Map<string, LastClassification>();
    photos.forEach(p => {
      if (p.frente && p.disciplina && p.servico &&
          p.frente !== 'FRENTE_NAO_INFORMADA' &&
          p.disciplina !== 'DISCIPLINA_NAO_INFORMADA' &&
          p.servico !== 'SERVICO_NAO_IDENTIFICADO') {
        const key = `${p.frente}|${p.disciplina}|${p.servico}`;
        const current = classificationCounts.get(key);
        if (current) {
          current.count++;
        } else {
          classificationCounts.set(key, {
            frente: p.frente,
            disciplina: p.disciplina,
            servico: p.servico,
            count: 1,
          });
        }
      }
    });

    // Ordena por contagem (mais usadas primeiro)
    const topClassifications = Array.from(classificationCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: photos.length,
      classified,
      ready: ready.length,
      unclassified: unclassified.length,
      folders: folders.size,
      unclassifiedPhotos: unclassified,
      readyPhotos: ready,
      topClassifications,
    };
  }, [photos]);

  // Fotos não reconhecidas com dados completos
  const unrecognizedPhotosFull = useMemo(() => {
    return unrecognizedPhotos.map(ur => ({
      ...ur,
      photo: photos.find(p => p.id === ur.photoId)
    })).filter(ur => ur.photo);
  }, [unrecognizedPhotos, photos]);

  // Processa em lotes - NOVO SISTEMA: Classificação local inteligente + IA como fallback
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
    setUnrecognizedPhotos([]);

    let photosToProcess = [...stats.unclassifiedPhotos];
    const newUnrecognized: AnalysisResult[] = [];
    
    let ocrCount = 0;
    let localMatchCount = 0;
    let aiProcessCount = 0;
    let successCount = 0;
    let errors = 0;
    
    // ============================================
    // FASE 0: OCR nas fotos que ainda não têm texto
    // OTIMIZADO: Processa em paralelo (5 fotos por vez)
    // ============================================
    const photosNeedingOCR = photosToProcess.filter(p => !p.ocrText || p.ocrText.trim() === '');
    const OCR_PARALLEL_LIMIT = 5; // Número de OCRs em paralelo
    
    if (photosNeedingOCR.length > 0 && onUpdatePhoto) {
      console.log('[Turbo] FASE 0: Executando OCR em', photosNeedingOCR.length, 'fotos (paralelo:', OCR_PARALLEL_LIMIT, ')...');
      
      toast({
        title: '📷 Executando OCR em paralelo...',
        description: `Extraindo texto de ${photosNeedingOCR.length} fotos (${OCR_PARALLEL_LIMIT}x mais rápido)`,
      });
      
      // Processa em lotes paralelos
      for (let i = 0; i < photosNeedingOCR.length; i += OCR_PARALLEL_LIMIT) {
        const batch = photosNeedingOCR.slice(i, i + OCR_PARALLEL_LIMIT);
        
        // Executa OCR em paralelo para o lote
        const ocrPromises = batch.map(async (photo) => {
          try {
            const ocrResult = await processOCR(photo.file, { useVision: true });
            return { photo, ocrResult, success: true };
          } catch (err) {
            console.warn(`[Turbo] ⚠️ OCR falhou para ${photo.filename}:`, err);
            return { photo, ocrResult: null, success: false };
          }
        });
        
        const results = await Promise.all(ocrPromises);
        
        // Processa resultados do lote
        for (const { photo, ocrResult, success } of results) {
          if (success && ocrResult?.text) {
            // Atualiza a foto com o texto OCR
            onUpdatePhoto(photo.id, {
              ocrText: ocrResult.text,
            });
            
            // Atualiza também no array local para usar na classificação
            const idx = photosToProcess.findIndex(p => p.id === photo.id);
            if (idx !== -1) {
              photosToProcess[idx] = {
                ...photosToProcess[idx],
                ocrText: ocrResult.text,
              };
            }
            
            ocrCount++;
            console.log(`[Turbo] 📷 OCR OK: ${photo.filename} → "${ocrResult.text.substring(0, 80)}..."`);
          }
        }
        
        // Progresso: Fase 0 = 0-20%
        const processed = Math.min(i + OCR_PARALLEL_LIMIT, photosNeedingOCR.length);
        const phase0Progress = (processed / photosNeedingOCR.length) * 20;
        setProgress(phase0Progress);
      }
      
      console.log(`[Turbo] FASE 0 concluída: ${ocrCount} fotos com OCR extraído`);
    }
    
    // ============================================
    // FASE 1: Classificação local inteligente
    // Hierarquia: folderPath > filename > OCR
    // ============================================
    console.log('[Turbo] FASE 1: Classificação local em', photosToProcess.length, 'fotos...');
    
    const photosNeedingAI: PhotoData[] = [];
    
    for (const photo of photosToProcess) {
      // Usa o novo sistema de classificação
      const classification = classifyPhoto({
        file: photo.file,
        folderPath: photo.folderPath,
        filename: photo.filename,
        ocrText: photo.ocrText,
        dateIso: photo.dateIso,
        yearMonth: photo.yearMonth,
      });

      // Garante que a data sempre vem do arquivo se não tiver
      let finalDateIso = classification.dateIso || photo.dateIso;
      let finalYearMonth = classification.yearMonth || photo.yearMonth;
      let finalDay = classification.day || photo.day;
      
      if (!finalDateIso && photo.file) {
        const fileDate = extractDateFromFile(photo.file);
        finalDateIso = fileDate.dateIso;
        finalYearMonth = fileDate.yearMonth;
        finalDay = fileDate.day;
      }

      // Determina status baseado na nova regra objetiva
      const finalStatus = determineStatus({
        frente: classification.frente,
        disciplina: classification.disciplina,
        servico: classification.servico,
        dateIso: finalDateIso,
      });

      if (classification.status === 'AUTO_OK' || finalStatus === 'OK') {
        // ✅ Classificação completa - não precisa de IA
        onBatchUpdate([photo.id], {
          frente: classification.frente,
          disciplina: classification.disciplina,
          servico: classification.servico,
          dateIso: finalDateIso,
          yearMonth: finalYearMonth,
          day: finalDay,
          status: 'OK',
          aiStatus: 'skipped',
        });
        localMatchCount++;
        successCount++;
        console.log(`[Turbo] ✅ AUTO_OK: ${photo.filename} → ${classification.frente} / ${classification.disciplina} / ${classification.servico}`);
      } else if (classification.status === 'REVISAR') {
        // ⚠️ Falta 1 campo - classifica mas marca para revisão
        onBatchUpdate([photo.id], {
          frente: classification.frente,
          disciplina: classification.disciplina,
          servico: classification.servico,
          dateIso: finalDateIso,
          yearMonth: finalYearMonth,
          day: finalDay,
          status: finalStatus,
          aiStatus: 'success',
        });
        
        // Só adiciona à lista de verificação se realmente precisar
        if (needsReview({ frente: classification.frente, disciplina: classification.disciplina, servico: classification.servico })) {
          newUnrecognized.push({
            photoId: photo.id,
            confidence: 'medium',
            frente: classification.frente,
            disciplina: classification.disciplina,
            servico: classification.servico,
            reason: 'Verificar classificação',
          });
        }
        
        localMatchCount++;
        successCount++;
        console.log(`[Turbo] ⚠️ REVISAR: ${photo.filename} → ${classification.disciplina} / ${classification.servico}`);
      } else {
        // ❌ Precisa de IA
        // Mas primeiro, aplica o que conseguiu extrair
        if (classification.frente !== 'FRENTE_NAO_INFORMADA' || 
            classification.disciplina !== 'DISCIPLINA_NAO_INFORMADA' ||
            classification.servico !== 'SERVICO_NAO_IDENTIFICADO') {
          onBatchUpdate([photo.id], {
            frente: classification.frente,
            disciplina: classification.disciplina,
            servico: classification.servico,
            dateIso: finalDateIso,
            yearMonth: finalYearMonth,
            day: finalDay,
          });
        }
        photosNeedingAI.push({
          ...photo,
          frente: classification.frente,
          disciplina: classification.disciplina,
          servico: classification.servico,
          dateIso: finalDateIso,
          yearMonth: finalYearMonth,
          day: finalDay,
        });
      }
    }
    
    console.log(`[Turbo] FASE 1 concluída: ${localMatchCount} fotos classificadas localmente, ${photosNeedingAI.length} precisam de IA`);
    
    // ============================================
    // FASE 1.5: Propagação por pasta
    // Se uma foto da pasta foi classificada, propaga
    // ============================================
    if (localMatchCount > 0 && photosNeedingAI.length > 0) {
      console.log('[Turbo] FASE 1.5: Propagando classificação por pasta...');
      
      // Agrupa fotos já classificadas por pasta
      const classifiedByFolder = new Map<string, { frente: string; disciplina: string; servico: string }>();
      
      for (const photo of photosToProcess) {
        if (!photo.folderPath) continue;
        
        const currentPhoto = photos.find(p => p.id === photo.id);
        if (!currentPhoto) continue;
        
        const hasClass = currentPhoto.disciplina && 
          currentPhoto.disciplina !== 'DISCIPLINA_NAO_INFORMADA' &&
          currentPhoto.disciplina !== 'DISCIPLINA_NAO_IDENTIFICADA' &&
          currentPhoto.servico &&
          currentPhoto.servico !== 'SERVICO_NAO_IDENTIFICADO' &&
          currentPhoto.servico !== 'SERVICO_NAO_INFORMADO';
        
        if (hasClass && !classifiedByFolder.has(photo.folderPath)) {
          classifiedByFolder.set(photo.folderPath, {
            frente: currentPhoto.frente,
            disciplina: currentPhoto.disciplina,
            servico: currentPhoto.servico,
          });
        }
      }
      
      // Propaga para fotos que precisam de IA
      const stillNeedAI: PhotoData[] = [];
      for (const photo of photosNeedingAI) {
        const base = classifiedByFolder.get(photo.folderPath || '');
        
        if (base) {
          // Propaga classificação da pasta
          onBatchUpdate([photo.id], {
            frente: base.frente,
            disciplina: base.disciplina,
            servico: base.servico,
            status: 'OK',
            aiStatus: 'skipped',
          });
          localMatchCount++;
          successCount++;
          console.log(`[Turbo] 📂 Propagado: ${photo.filename} ← pasta ${photo.folderPath}`);
        } else {
          stillNeedAI.push(photo);
        }
      }
      
      photosNeedingAI.length = 0;
      photosNeedingAI.push(...stillNeedAI);
      console.log(`[Turbo] FASE 1.5 concluída: ${stillNeedAI.length} ainda precisam de IA`);
    }
    
    // Atualiza progresso após fase 1 (20-50%)
    const phase1Progress = 20 + (photosToProcess.length > 0 
      ? (localMatchCount / photosToProcess.length) * 30
      : 0);
    setProgress(phase1Progress);
    setProcessedCount(localMatchCount);
    
    // ============================================
    // FASE 2: Chama IA apenas para fotos restantes
    // ============================================
    if (photosNeedingAI.length > 0) {
      console.log('[Turbo] FASE 2: Processando', photosNeedingAI.length, 'fotos com IA...');
      
      const batches = Math.ceil(photosNeedingAI.length / BATCH_SIZE);
      setTotalBatches(batches);

      for (let i = 0; i < batches; i++) {
        setCurrentBatch(i + 1);
        
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, photosNeedingAI.length);
        const batch = photosNeedingAI.slice(start, end);

        try {
          // Prepara dados para a IA (inclui classificação parcial para contexto)
          const batchData = batch.map(p => ({
            id: p.id,
            filename: p.filename,
            folderPath: p.folderPath,
            ocrText: p.ocrText?.substring(0, 300),
            dateIso: p.dateIso,
            yearMonth: p.yearMonth,
            // Inclui classificação parcial para a IA complementar
            partialFrente: p.frente !== 'FRENTE_NAO_INFORMADA' ? p.frente : undefined,
            partialDisciplina: p.disciplina !== 'DISCIPLINA_NAO_INFORMADA' ? p.disciplina : undefined,
            partialServico: p.servico !== 'SERVICO_NAO_IDENTIFICADO' ? p.servico : undefined,
          }));

          console.log(`[Turbo] Processando lote IA ${i + 1}/${batches} (${batch.length} fotos)`);

          const { data, error } = await supabase.functions.invoke('classify-batch', {
            body: { photos: batchData },
          });

          if (error) {
            console.error('[Turbo] Erro na edge function:', error);
            errors += batch.length;
            batch.forEach(p => {
              newUnrecognized.push({
                photoId: p.id,
                confidence: 'unrecognized',
                reason: 'Erro na API de classificação',
              });
            });
            continue;
          }

          if (data.error) {
            console.error('[Turbo] Erro retornado:', data.error);
            
            if (data.error.includes('Rate limit')) {
              toast({
                title: 'Aguardando rate limit...',
                description: 'Esperando 5 segundos antes de continuar.',
              });
              await new Promise(r => setTimeout(r, 5000));
              i--;
              continue;
            }
            
            errors += batch.length;
            batch.forEach(p => {
              newUnrecognized.push({
                photoId: p.id,
                confidence: 'unrecognized',
                reason: data.error,
              });
            });
            continue;
          }

          // Aplica resultados com fallbacks determinísticos
          const results = data.results || [];
          for (const result of results) {
            const originalPhoto = batch.find(p => p.id === result.id);
            
            // Monta classificação base (IA + original)
            let baseFrente = result.frente || originalPhoto?.frente || '';
            let baseDisciplina = result.disciplina || originalPhoto?.disciplina || '';
            let baseServico = result.servico || originalPhoto?.servico || '';
            
            // Se a pasta já tinha classificação, mantém (pasta > IA)
            if (originalPhoto?.frente && originalPhoto.frente !== 'FRENTE_NAO_INFORMADA') {
              baseFrente = originalPhoto.frente;
            }
            if (originalPhoto?.disciplina && originalPhoto.disciplina !== 'DISCIPLINA_NAO_INFORMADA') {
              baseDisciplina = originalPhoto.disciplina;
            }
            if (originalPhoto?.servico && originalPhoto.servico !== 'SERVICO_NAO_IDENTIFICADO') {
              baseServico = originalPhoto.servico;
            }
            
            // ✅ APLICA FALLBACKS DETERMINÍSTICOS
            // Se ainda falta disciplina, tenta inferir do path ou do serviço
            if (!baseDisciplina || baseDisciplina === 'DISCIPLINA_NAO_INFORMADA' || 
                baseDisciplina === 'DISCIPLINA_NAO_IDENTIFICADA') {
              const inferredDisc = inferDisciplinaFromPath(originalPhoto?.folderPath) ||
                                   inferDisciplinaFromServico(baseServico);
              if (inferredDisc) {
                baseDisciplina = inferredDisc;
                console.log(`[Turbo] 🔧 Fallback disciplina: ${originalPhoto?.filename} → ${inferredDisc}`);
              }
            }
            
            // Se ainda falta frente, tenta inferir do path
            if (!baseFrente || baseFrente === 'FRENTE_NAO_INFORMADA') {
              const inferredFrente = inferFrenteFromPath(originalPhoto?.folderPath);
              if (inferredFrente) {
                baseFrente = inferredFrente;
                console.log(`[Turbo] 🔧 Fallback frente: ${originalPhoto?.filename} → ${inferredFrente}`);
              }
            }
            
            // Aplica fallbacks finais
            const fallbacks = applyFallbacks({
              frente: baseFrente,
              disciplina: baseDisciplina,
              servico: baseServico,
              folderPath: originalPhoto?.folderPath,
              filename: originalPhoto?.filename,
            });
            
            const finalFrente = fallbacks.frente;
            const finalDisciplina = fallbacks.disciplina;
            const finalServico = fallbacks.servico;

            // Determina status final
            const finalStatus = determineStatus({
              frente: finalFrente,
              disciplina: finalDisciplina,
              servico: finalServico,
              dateIso: originalPhoto?.dateIso,
            });

            onBatchUpdate([result.id], {
              frente: finalFrente,
              disciplina: finalDisciplina,
              servico: finalServico,
              status: finalStatus,
              aiStatus: 'success',
              aiConfidence: result.confidence ?? 0.7,
            });

            // ✅ USA NOVA REGRA DE VERIFICAÇÃO (menos agressiva)
            if (needsManualReview({ 
              frente: finalFrente, 
              disciplina: finalDisciplina, 
              servico: finalServico,
              confidence: result.confidence 
            })) {
              newUnrecognized.push({
                photoId: result.id,
                confidence: finalStatus === 'OK' ? 'medium' : 'low',
                frente: finalFrente,
                disciplina: finalDisciplina,
                servico: finalServico,
                reason: 'Verificar classificação da IA',
              });
            }
            
            aiProcessCount++;
            successCount++;
          }

          // Verifica fotos sem resultado
          const resultIds = new Set(results.map((r: any) => r.id));
          batch.forEach(p => {
            if (!resultIds.has(p.id)) {
              newUnrecognized.push({
                photoId: p.id,
                confidence: 'unrecognized',
                reason: 'Sem resposta da IA',
              });
            }
          });

        } catch (err) {
          console.error('[Turbo] Erro no lote:', err);
          errors += batch.length;
          batch.forEach(p => {
            newUnrecognized.push({
              photoId: p.id,
              confidence: 'unrecognized',
              reason: 'Erro de conexão',
            });
          });
        }

        setProcessedCount(localMatchCount + aiProcessCount);
        setErrorCount(errors);
        
        // Progresso: 0-20% OCR, 20-50% fase 1, 50-100% fase 2
        const phase2Progress = 50 + (((i + 1) / batches) * 50);
        setProgress(phase2Progress);

        if (i < batches - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    setIsProcessing(false);
    setProgress(100);
    setUnrecognizedPhotos(newUnrecognized);
    
    if (newUnrecognized.length > 0) {
      setShowUnrecognized(true);
    }

    // Mensagem final com estatísticas
    const ocrDone = ocrCount > 0 ? ` 📷 ${ocrCount} OCR extraído.` : '';
    const aiSaved = localMatchCount > 0 ? ` 🚀 ${localMatchCount} classificadas localmente.` : '';
    const aiUsed = aiProcessCount > 0 ? ` 🤖 ${aiProcessCount} por IA.` : '';
    const okCount = photos.filter(p => p.status === 'OK').length + successCount;
    
    toast({
      title: 'Processamento TURBO concluído!',
      description: `✅ ${okCount} fotos prontas.${ocrDone}${aiSaved}${aiUsed}${newUnrecognized.length > 0 ? ` ⚠️ ${newUnrecognized.length} para verificar.` : ''}`,
    });

  }, [stats.unclassifiedPhotos, photos, onBatchUpdate, onUpdatePhoto, toast]);

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

        // Remove da lista de não reconhecidos
        setUnrecognizedPhotos(prev => 
          prev.filter(ur => !unclassifiedIds.includes(ur.photoId))
        );

        toast({
          title: 'Classificação propagada!',
          description: `${unclassifiedIds.length} fotos da pasta "${folderPath}" atualizadas.`,
        });
      }
    }
  }, [photos, onBatchUpdate, toast]);

  // Aplica classificação em todas as fotos não classificadas que tenham características similares
  const applyClassificationToSimilar = useCallback(async (classification: LastClassification) => {
    // Encontra fotos não classificadas que podem receber esta classificação
    // Baseado em: mesmo nome de pasta contendo palavras-chave, mesmo texto OCR similar
    
    const unclassifiedIds: string[] = [];
    
    for (const photo of stats.unclassifiedPhotos) {
      // Verifica se a foto tem características que combinam com a classificação
      const folderLower = (photo.folderPath || '').toLowerCase();
      const filenameLower = (photo.filename || '').toLowerCase();
      const ocrLower = (photo.ocrText || '').toLowerCase();
      
      const frenteLower = classification.frente.toLowerCase().replace(/_/g, ' ');
      const disciplinaLower = classification.disciplina.toLowerCase().replace(/_/g, ' ');
      const servicoLower = classification.servico.toLowerCase().replace(/_/g, ' ');
      
      // Verifica se alguma palavra-chave da classificação aparece no contexto da foto
      const keywords = [
        ...frenteLower.split(' '),
        ...disciplinaLower.split(' '),
        ...servicoLower.split(' '),
      ].filter(k => k.length > 3); // Ignora palavras muito curtas
      
      const hasMatch = keywords.some(keyword => 
        folderLower.includes(keyword) || 
        filenameLower.includes(keyword) ||
        ocrLower.includes(keyword)
      );
      
      if (hasMatch) {
        unclassifiedIds.push(photo.id);
      }
    }

    if (unclassifiedIds.length === 0) {
      toast({
        title: 'Nenhuma foto compatível encontrada',
        description: 'Não há fotos não classificadas com características similares.',
        variant: 'destructive',
      });
      return;
    }

    onBatchUpdate(unclassifiedIds, {
      frente: classification.frente,
      disciplina: classification.disciplina,
      servico: classification.servico,
      status: 'OK',
    });

    // Remove da lista de não reconhecidos
    setUnrecognizedPhotos(prev => 
      prev.filter(ur => !unclassifiedIds.includes(ur.photoId))
    );

    toast({
      title: '✨ Classificação aplicada!',
      description: `${unclassifiedIds.length} fotos similares receberam: ${classification.disciplina} / ${classification.servico}`,
    });
  }, [stats.unclassifiedPhotos, onBatchUpdate, toast]);

  // Aplica classificação em TODAS as fotos não classificadas (sem filtro)
  const applyToAllUnclassified = useCallback((classification: LastClassification) => {
    const unclassifiedIds = stats.unclassifiedPhotos.map(p => p.id);

    if (unclassifiedIds.length === 0) {
      toast({
        title: 'Nenhuma foto pendente',
        description: 'Todas as fotos já estão classificadas!',
      });
      return;
    }

    onBatchUpdate(unclassifiedIds, {
      frente: classification.frente,
      disciplina: classification.disciplina,
      servico: classification.servico,
      status: 'OK',
    });

    // Limpa lista de não reconhecidos
    setUnrecognizedPhotos([]);

    toast({
      title: '🚀 Classificação aplicada em massa!',
      description: `${unclassifiedIds.length} fotos atualizadas com: ${classification.frente} / ${classification.disciplina} / ${classification.servico}`,
    });
  }, [stats.unclassifiedPhotos, onBatchUpdate, toast]);

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

  // Abre lightbox para verificar foto
  const openLightbox = (photo: PhotoData, index: number) => {
    setLightboxPhoto(photo);
    setLightboxIndex(index);
    setZoom(1);
    setRotation(0);
  };

  // Navegação no lightbox
  const navigateLightbox = (direction: 'prev' | 'next') => {
    const list = unrecognizedPhotosFull;
    let newIndex = lightboxIndex;
    
    if (direction === 'prev') {
      newIndex = lightboxIndex > 0 ? lightboxIndex - 1 : list.length - 1;
    } else {
      newIndex = lightboxIndex < list.length - 1 ? lightboxIndex + 1 : 0;
    }
    
    const newPhoto = list[newIndex]?.photo;
    if (newPhoto) {
      setLightboxPhoto(newPhoto);
      setLightboxIndex(newIndex);
      setZoom(1);
      setRotation(0);
    }
  };

  // Remove foto da lista de não reconhecidos (marca como verificada)
  const markAsVerified = (photoId: string) => {
    setUnrecognizedPhotos(prev => prev.filter(ur => ur.photoId !== photoId));
    
    // Fecha lightbox se era a foto atual
    if (lightboxPhoto?.id === photoId) {
      // Navega para próxima ou fecha
      if (unrecognizedPhotosFull.length > 1) {
        navigateLightbox('next');
      } else {
        setLightboxPhoto(null);
      }
    }
    
    toast({
      title: '✓ Foto verificada',
      description: 'A foto foi marcada como verificada.',
    });
  };

  // Navega até a foto na lista principal
  const scrollToPhoto = (photoId: string) => {
    if (onScrollToPhoto) {
      onScrollToPhoto(photoId);
    } else {
      // Fallback: scroll para o elemento
      const element = document.getElementById(`photo-${photoId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-accent');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-accent');
        }, 2000);
      }
    }
  };

  if (photos.length === 0) return null;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="card-industrial overflow-hidden border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-accent/5">
          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Rocket className="w-6 h-6 text-primary animate-pulse" />
              <div className="text-left">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  🚀 Modo TURBO - Analisar e Verificar
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full animate-pulse">
                    AUTOMÁTICO
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {stats.ready > 0 && (
                    <span className="text-green-500 font-medium">
                      ✅ {stats.ready} prontas para download
                    </span>
                  )}
                  {stats.unclassified > 0 && (
                    <span className={stats.ready > 0 ? 'ml-2' : ''}>
                      • {stats.unclassified} pendentes
                    </span>
                  )}
                  {unrecognizedPhotos.length > 0 && (
                    <span className="ml-2 text-warning">
                      • ⚠️ {unrecognizedPhotos.length} para verificar
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
            <div className="p-4 pt-0 border-t border-border space-y-4">
              {/* Estatísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <div className="text-xl font-bold text-foreground">{stats.total}</div>
                  <div className="text-[10px] text-muted-foreground">Total</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-2 text-center border-2 border-green-500/30">
                  <div className="text-xl font-bold text-green-500">{stats.ready}</div>
                  <div className="text-[10px] text-muted-foreground">✅ Prontas</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                  <div className="text-xl font-bold text-blue-500">{stats.classified}</div>
                  <div className="text-[10px] text-muted-foreground">Classificadas</div>
                </div>
                <div className="bg-orange-500/10 rounded-lg p-2 text-center">
                  <div className="text-xl font-bold text-orange-500">{stats.unclassified}</div>
                  <div className="text-[10px] text-muted-foreground">Pendentes</div>
                </div>
                <div className="bg-warning/10 rounded-lg p-2 text-center">
                  <div className="text-xl font-bold text-warning">{unrecognizedPhotos.length}</div>
                  <div className="text-[10px] text-muted-foreground">Verificar</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2 text-center">
                  <div className="text-xl font-bold text-muted-foreground">{stats.folders}</div>
                  <div className="text-[10px] text-muted-foreground">Pastas</div>
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
                    🚀 ANALISAR E VERIFICAR {stats.unclassified} FOTOS
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
                      {processedCount} analisadas
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

              {/* 🔴 FOTOS NÃO RECONHECIDAS / PARA VERIFICAR */}
              {unrecognizedPhotos.length > 0 && (
                <div className="space-y-3 p-3 bg-warning/10 rounded-lg border-2 border-warning/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                      ⚠️ Fotos para Verificação Manual ({unrecognizedPhotos.length})
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUnrecognized(!showUnrecognized)}
                    >
                      {showUnrecognized ? 'Ocultar' : 'Mostrar'}
                      {showUnrecognized ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    A IA não conseguiu identificar todas as informações. Clique para ver a foto expandida e classificar manualmente.
                  </p>

                  {showUnrecognized && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-80 overflow-y-auto p-2">
                      {unrecognizedPhotosFull.map((item, index) => (
                        <div
                          key={item.photoId}
                          className={cn(
                            "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                            item.confidence === 'unrecognized' && "border-red-500",
                            item.confidence === 'low' && "border-orange-500",
                            item.confidence === 'medium' && "border-yellow-500"
                          )}
                          onClick={() => item.photo && openLightbox(item.photo, index)}
                        >
                          <img
                            src={item.photo?.thumbnailUrl}
                            alt={item.photo?.filename}
                            className="w-full h-24 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1">
                            <Eye className="w-5 h-5 mb-1" />
                            <span className="text-[10px] text-center line-clamp-2">
                              {item.reason}
                            </span>
                          </div>
                          <div className={cn(
                            "absolute top-1 right-1 w-3 h-3 rounded-full",
                            item.confidence === 'unrecognized' && "bg-red-500",
                            item.confidence === 'low' && "bg-orange-500",
                            item.confidence === 'medium' && "bg-yellow-500"
                          )} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 🔥 APLICAR ÚLTIMA CLASSIFICAÇÃO */}
              {stats.topClassifications.length > 0 && stats.unclassified > 0 && (
                <div className="space-y-2 p-3 bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg border border-accent/30">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    Aplicar classificação em massa
                    <span className="text-xs text-accent bg-accent/20 px-2 py-0.5 rounded-full">
                      RÁPIDO
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Clique para aplicar em fotos similares (por palavras-chave) ou em TODAS de uma vez:
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stats.topClassifications.map((c, idx) => (
                      <div
                        key={`${c.frente}-${c.disciplina}-${c.servico}`}
                        className="bg-background rounded-lg p-2 border border-border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground">
                              {idx === 0 && '⭐ Mais usada • '}{c.count} foto(s)
                            </div>
                            <div className="text-sm font-medium truncate">
                              <span className="text-blue-400">{c.frente}</span>
                              <span className="text-muted-foreground mx-1">/</span>
                              <span className="text-green-400">{c.disciplina}</span>
                              <span className="text-muted-foreground mx-1">/</span>
                              <span className="text-orange-400">{c.servico}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applyClassificationToSimilar(c)}
                            className="flex-1 h-8 text-xs"
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Aplicar em similares
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => applyToAllUnclassified(c)}
                            className="flex-1 h-8 text-xs bg-accent hover:bg-accent/90"
                          >
                            <Repeat className="w-3 h-3 mr-1" />
                            Aplicar em TODAS ({stats.unclassified})
                          </Button>
                        </div>
                      </div>
                    ))}
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
                💡 <strong>Como funciona:</strong><br/>
                1. <strong>Clique "ANALISAR"</strong> → A IA classifica automaticamente todas as fotos<br/>
                2. <strong>Fotos não reconhecidas</strong> → Aparecem na seção amarela para verificação<br/>
                3. <strong>Clique na foto</strong> → Abre em tela cheia para ver legendas e detalhes<br/>
                4. <strong>Edite na lista</strong> → Navegue até a foto para corrigir manualmente
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* LIGHTBOX PARA VERIFICAÇÃO */}
      {lightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          {/* Toolbar superior */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/20 backdrop-blur-sm rounded-lg p-2 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(z - 0.25, 0.5)); }}
              className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-white text-sm min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(z + 0.25, 4)); }}
              className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-white/30 mx-1" />
            <button
              onClick={(e) => { e.stopPropagation(); setRotation(r => (r + 90) % 360); }}
              className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          {/* Navegação */}
          {unrecognizedPhotosFull.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Botão fechar */}
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/20 text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Imagem */}
          <div 
            className="max-w-[85vw] max-h-[70vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxPhoto.thumbnailUrl}
              alt={lightboxPhoto.filename}
              className="max-w-none transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
              draggable={false}
            />
          </div>

          {/* Info Panel - Bottom */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Filename e Folder */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">{lightboxPhoto.filename}</h3>
                  {lightboxPhoto.folderPath && (
                    <p className="text-white/60 text-sm flex items-center gap-1">
                      <FolderOpen className="w-4 h-4" />
                      {lightboxPhoto.folderPath}
                    </p>
                  )}
                </div>
                <div className="text-right text-white/60 text-sm">
                  {lightboxIndex + 1} / {unrecognizedPhotosFull.length}
                </div>
              </div>

              {/* OCR Text - Legenda */}
              {lightboxPhoto.ocrText && (
                <div className="bg-white/10 rounded-lg p-4 max-h-32 overflow-y-auto">
                  <h4 className="text-white/80 text-xs font-medium mb-2 flex items-center gap-1">
                    📝 TEXTO EXTRAÍDO / LEGENDA
                  </h4>
                  <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                    {lightboxPhoto.ocrText}
                  </p>
                </div>
              )}

              {/* Classificação atual + Ações */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 flex items-center gap-2 text-sm">
                  <span className="text-white/60">Classificação:</span>
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    (!lightboxPhoto.frente || lightboxPhoto.frente === 'FRENTE_NAO_INFORMADA') 
                      ? "bg-red-500/30 text-red-300" 
                      : "bg-blue-500/30 text-blue-300"
                  )}>
                    {lightboxPhoto.frente || 'FRENTE?'}
                  </span>
                  <span className="text-white/40">/</span>
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    (!lightboxPhoto.disciplina || lightboxPhoto.disciplina === 'DISCIPLINA_NAO_INFORMADA')
                      ? "bg-red-500/30 text-red-300"
                      : "bg-green-500/30 text-green-300"
                  )}>
                    {lightboxPhoto.disciplina || 'DISCIPLINA?'}
                  </span>
                  <span className="text-white/40">/</span>
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    (!lightboxPhoto.servico || lightboxPhoto.servico === 'SERVICO_NAO_IDENTIFICADO')
                      ? "bg-red-500/30 text-red-300"
                      : "bg-orange-500/30 text-orange-300"
                  )}>
                    {lightboxPhoto.servico || 'SERVIÇO?'}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => scrollToPhoto(lightboxPhoto.id)}
                    className="text-xs"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ir para edição
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => markAsVerified(lightboxPhoto.id)}
                    className="bg-green-600 hover:bg-green-700 text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Marcar verificada
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
