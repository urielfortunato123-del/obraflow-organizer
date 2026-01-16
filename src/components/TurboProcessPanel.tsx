import { useState, useCallback, useMemo } from 'react';
import { 
  Rocket, ChevronDown, ChevronUp, AlertCircle,
  CheckCircle2, Loader2, Zap, FolderOpen, Sparkles,
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
import { processOCR } from '@/utils/ocr';
import { extractDateFromFile } from '@/utils/exportPath';

interface TurboProcessPanelProps {
  photos: PhotoData[];
  onBatchUpdate: (ids: string[], updates: Partial<PhotoData>) => void;
  onScrollToPhoto?: (photoId: string) => void;
  onUpdatePhoto?: (id: string, updates: Partial<PhotoData>) => void;
}

const BATCH_SIZE = 10; // Reduzido para evitar truncamento de resposta da IA
const OCR_PARALLEL_LIMIT = 5;

// ============================================
// SISTEMA DEFINITIVO - VERSÃO FINAL
// ============================================

/**
 * Extrai EMPRESA da pasta raiz
 */
function extractEmpresa(folderPath?: string): string {
  if (!folderPath) return '';
  const parts = folderPath.split('/').filter(Boolean);
  return parts[0] || '';
}

/**
 * Extrai FRENTE do caminho da pasta
 */
function extractFrenteFromPath(folderPath?: string, filename?: string): string {
  const text = `${folderPath || ''} ${filename || ''}`.toUpperCase();
  
  // FREE_FLOW
  const ffMatch = text.match(/FREE[_\s-]?FLOW[_\s-]?(P?\d{1,2})/i);
  if (ffMatch) return `FREE_FLOW_P${ffMatch[1].replace('P', '').padStart(2, '0')}`;
  
  // BSO
  const bsoMatch = text.match(/BSO[_\s-]?(\d{1,2})/i);
  if (bsoMatch) return `BSO_${bsoMatch[1].padStart(2, '0')}`;
  
  // PRAÇA
  const pracaMatch = text.match(/PRACA[_\s-]?(\d{1,2})/i);
  if (pracaMatch) return `PRACA_${pracaMatch[1].padStart(2, '0')}`;
  
  // KM
  const kmMatch = text.match(/KM[_\s-]?(\d{1,3})/i);
  if (kmMatch) return `KM_${kmMatch[1].padStart(3, '0')}`;
  
  return '';
}

/**
 * Extrai CATEGORIA do caminho da pasta
 */
function extractCategoriaFromPath(folderPath?: string): string {
  const p = (folderPath || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (/\bBC\d*\b/.test(p) || p.includes('DRENAGEM') || p.includes('BACIA')) return 'DRENAGEM';
  if (p.includes('TERRAPLAN') || p.includes('TERR')) return 'TERRAPLANAGEM';
  if (p.includes('PAVIMENT') || p.includes('PAV') || p.includes('ASFALTO')) return 'PAVIMENTACAO';
  if (p.includes('SINALIZ') || p.includes('SIN') || p.includes('PLACA')) return 'SINALIZACAO';
  if (p.includes('ESTRUT') || p.includes('EST') || p.includes('CONCRET') || /\bBL\d*\b/.test(p)) return 'ESTRUTURA';
  if (p.includes('PAISAG') || p.includes('GRAMA')) return 'PAISAGISMO';
  if (p.includes('LIMPEZA') || p.includes('ROCADA')) return 'LIMPEZA';
  if (p.includes('ELETRI') || p.includes('ILUMIN')) return 'INSTALACOES_ELETRICAS';
  if (p.includes('HIDRAUL')) return 'INSTALACOES_HIDRAULICAS';
  if (p.includes('FUNDAC')) return 'FUNDACAO';
  if (p.includes('MANUTEN')) return 'MANUTENCAO';
  
  return '';
}

/**
 * Extrai SERVIÇO do caminho da pasta ou texto OCR
 */
function extractServicoFromText(text?: string): string {
  const t = (text || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (t.includes('LIMPEZA DE TERRENO') || t.includes('LIMPEZA TERRENO')) return 'LIMPEZA_DE_TERRENO';
  if (t.includes('ROCADA MECANIZADA')) return 'ROCADA_MECANIZADA';
  if (t.includes('ROCADA')) return 'ROCADA_MANUAL';
  if (t.includes('ESCAVACAO DE VALA') || t.includes('ESCAVACAO VALETA')) return 'ESCAVACAO_DE_VALA';
  if (t.includes('ESCAVACAO')) return 'ESCAVACAO_MECANIZADA';
  if (t.includes('ASSENTAMENTO DE TUBO')) return 'ASSENTAMENTO_DE_TUBOS';
  if (t.includes('EXECUCAO DE DRENAGEM') || t.includes('DRENAGEM')) return 'EXECUCAO_DE_DRENAGEM';
  if (t.includes('CONCRETAGEM') || t.includes('LANCAMENTO CONCRETO')) return 'CONCRETAGEM';
  if (t.includes('ARMACAO')) return 'ARMACAO_DE_ACO';
  if (t.includes('FORMA')) return 'EXECUCAO_DE_FORMA';
  if (t.includes('BASE') || t.includes('BRITA')) return 'EXECUCAO_DE_BASE';
  if (t.includes('PAVIMENTO') || t.includes('ASFALTO') || t.includes('CBUQ')) return 'EXECUCAO_DE_PAVIMENTO';
  if (t.includes('FRESAGEM')) return 'FRESAGEM';
  if (t.includes('SINALIZACAO HORIZONTAL') || t.includes('PINTURA FAIXA')) return 'SINALIZACAO_HORIZONTAL';
  if (t.includes('SINALIZACAO VERTICAL') || t.includes('PLACA')) return 'SINALIZACAO_VERTICAL';
  if (t.includes('PLANTIO') || t.includes('GRAMA')) return 'PLANTIO_DE_GRAMA';
  if (t.includes('MANUTENCAO')) return 'MANUTENCAO_PREVENTIVA';
  if (t.includes('INSPECAO') || t.includes('VISTORIA')) return 'INSPECAO';
  if (t.includes('LIMPEZA')) return 'LIMPEZA_DE_TERRENO';
  if (t.includes('EXECUCAO DE LIMPEZA')) return 'LIMPEZA_DE_TERRENO';
  
  return '';
}

/**
 * Extrai data do texto OCR (formato PT-BR)
 */
function extractDateFromOCR(ocrText?: string): { dateIso: string | null; yearMonth: string | null; day: string | null } {
  if (!ocrText) return { dateIso: null, yearMonth: null, day: null };
  
  // Formatos: DD/MM/YYYY, DD-MM-YYYY, DD de mês de YYYY
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{1,2})\s+de\s+(\w+)\.?\s+de\s+(\d{4})/i,
  ];
  
  const months: Record<string, string> = {
    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
    'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
  };
  
  for (const pattern of patterns) {
    const match = ocrText.match(pattern);
    if (match) {
      let day = match[1].padStart(2, '0');
      let month = match[2];
      let year = match[3];
      
      // Converte nome do mês
      if (isNaN(parseInt(month))) {
        const monthKey = month.toLowerCase().substring(0, 3);
        month = months[monthKey] || '01';
      } else {
        month = month.padStart(2, '0');
      }
      
      const dateIso = `${year}-${month}-${day}`;
      const yearMonth = `${year}-${month}`;
      
      return { dateIso, yearMonth, day };
    }
  }
  
  return { dateIso: null, yearMonth: null, day: null };
}

/**
 * Calcula confiança baseado nas fontes
 */
function calculateConfidence(sources: { folder: boolean; ocr: boolean; ai: boolean }): number {
  let confidence = 0;
  if (sources.folder) confidence += 0.4;
  if (sources.ocr) confidence += 0.3;
  if (sources.ai) confidence += 0.3;
  return Math.min(confidence, 1.0);
}

/**
 * Determina status visual baseado na confiança
 */
function getStatusFromConfidence(confidence: number): 'OK' | 'Pendente' {
  // >= 0.55 = aceitável, < 0.55 = verificação manual
  return confidence >= 0.55 ? 'OK' : 'Pendente';
}

export function TurboProcessPanel({ photos, onBatchUpdate, onScrollToPhoto, onUpdatePhoto }: TurboProcessPanelProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Estado para fotos pendentes
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [showPending, setShowPending] = useState(false);
  
  // Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoData | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Estatísticas
  const stats = useMemo(() => {
    const classified = photos.filter(p => 
      p.frente && p.frente !== 'NAO_INFORMADO' &&
      p.disciplina && p.disciplina !== 'NAO_INFORMADO' &&
      p.servico && p.servico !== 'NAO_INFORMADO'
    );
    
    const pending = photos.filter(p => 
      !p.frente || p.frente === 'NAO_INFORMADO' ||
      !p.disciplina || p.disciplina === 'NAO_INFORMADO' ||
      !p.servico || p.servico === 'NAO_INFORMADO'
    );
    
    const byConfidence = {
      green: photos.filter(p => (p.aiConfidence || 0) >= 0.75).length,
      yellow: photos.filter(p => (p.aiConfidence || 0) >= 0.55 && (p.aiConfidence || 0) < 0.75).length,
      red: photos.filter(p => (p.aiConfidence || 0) < 0.55).length,
    };
    
    return {
      total: photos.length,
      classified: classified.length,
      pending: pending.length,
      pendingPhotos: pending,
      byConfidence,
    };
  }, [photos]);

  // ============================================
  // FLUXO PRINCIPAL - TURBO PROCESS
  // ============================================
  const processWithAI = useCallback(async () => {
    if (photos.length === 0) {
      toast({ title: 'Nenhuma foto para processar' });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);
    setPendingPhotos([]);

    let photosToProcess = [...photos];
    const pendingIds: string[] = [];
    
    // ============================================
    // ETAPA 1: OCR (0-30%)
    // ============================================
    setStatusMessage('📷 Extraindo texto das fotos (OCR)...');
    
    const photosNeedingOCR = photosToProcess.filter(p => !p.ocrText || p.ocrText.trim() === '');
    
    if (photosNeedingOCR.length > 0 && onUpdatePhoto) {
      console.log(`[Turbo] ETAPA 1: OCR em ${photosNeedingOCR.length} fotos`);
      
      for (let i = 0; i < photosNeedingOCR.length; i += OCR_PARALLEL_LIMIT) {
        const batch = photosNeedingOCR.slice(i, i + OCR_PARALLEL_LIMIT);
        
        const ocrPromises = batch.map(async (photo) => {
          try {
            const ocrResult = await processOCR(photo.file, { useVision: true });
            return { photo, ocrResult, success: true };
          } catch {
            return { photo, ocrResult: null, success: false };
          }
        });
        
        const results = await Promise.all(ocrPromises);
        
        for (const { photo, ocrResult, success } of results) {
          if (success && ocrResult) {
            const updates: Partial<PhotoData> = { ocrText: ocrResult.text || '' };
            
            // Usa dados do OCR Vision se disponíveis
            if (ocrResult.servico) updates.servico = ocrResult.servico;
            if (ocrResult.disciplina) updates.disciplina = ocrResult.disciplina;
            
            onUpdatePhoto(photo.id, updates);
            
            // Atualiza no array local
            const idx = photosToProcess.findIndex(p => p.id === photo.id);
            if (idx !== -1) {
              photosToProcess[idx] = { ...photosToProcess[idx], ...updates };
            }
          }
        }
        
        const processed = Math.min(i + OCR_PARALLEL_LIMIT, photosNeedingOCR.length);
        setProgress((processed / photosNeedingOCR.length) * 30);
      }
    }
    
    setProgress(30);
    
    // ============================================
    // ETAPA 2: EXTRAÇÃO AUTOMÁTICA (30-50%)
    // ============================================
    setStatusMessage('🔍 Extraindo informações das pastas e datas...');
    console.log(`[Turbo] ETAPA 2: Extração automática`);
    
    for (const photo of photosToProcess) {
      const updates: Partial<PhotoData> = {};
      const sources = { folder: false, ocr: false, ai: false };
      
      // EMPRESA (pasta raiz)
      // (não armazenamos em photo, será usado na exportação)
      
      // FRENTE (da pasta)
      if (!photo.frente || photo.frente === 'NAO_INFORMADO' || photo.frente === 'FRENTE_NAO_INFORMADA') {
        const frente = extractFrenteFromPath(photo.folderPath, photo.filename);
        if (frente) {
          updates.frente = frente;
          sources.folder = true;
        }
      } else {
        sources.folder = true;
      }
      
      // CATEGORIA (da pasta)
      if (!photo.disciplina || photo.disciplina === 'NAO_INFORMADO' || photo.disciplina === 'DISCIPLINA_NAO_INFORMADA') {
        const categoria = extractCategoriaFromPath(photo.folderPath);
        if (categoria) {
          updates.disciplina = categoria;
          sources.folder = true;
        }
      } else {
        sources.folder = true;
      }
      
      // SERVIÇO (da pasta ou OCR)
      if (!photo.servico || photo.servico === 'NAO_INFORMADO' || photo.servico === 'SERVICO_NAO_IDENTIFICADO') {
        let servico = extractServicoFromText(photo.folderPath);
        if (!servico && photo.ocrText) {
          servico = extractServicoFromText(photo.ocrText);
          if (servico) sources.ocr = true;
        } else if (servico) {
          sources.folder = true;
        }
        if (servico) updates.servico = servico;
      } else {
        sources.folder = true;
      }
      
      // DATA (OCR primeiro, depois lastModified)
      if (!photo.dateIso) {
        const ocrDate = extractDateFromOCR(photo.ocrText);
        if (ocrDate.dateIso) {
          updates.dateIso = ocrDate.dateIso;
          updates.yearMonth = ocrDate.yearMonth;
          updates.day = ocrDate.day;
          sources.ocr = true;
        } else {
          const fileDate = extractDateFromFile(photo.file);
          updates.dateIso = fileDate.dateIso;
          updates.yearMonth = fileDate.yearMonth;
          updates.day = fileDate.day;
        }
      }
      
      if (Object.keys(updates).length > 0) {
        onBatchUpdate([photo.id], updates);
        
        // Atualiza no array local
        const idx = photosToProcess.findIndex(p => p.id === photo.id);
        if (idx !== -1) {
          photosToProcess[idx] = { ...photosToProcess[idx], ...updates };
        }
      }
    }
    
    setProgress(50);
    
    // ============================================
    // ETAPA 3: PROPAGAÇÃO POR PASTA (50-60%)
    // ============================================
    setStatusMessage('📂 Propagando classificações por pasta...');
    console.log(`[Turbo] ETAPA 3: Propagação por pasta`);
    
    // Agrupa por pasta e conta classificações
    const folderStats = new Map<string, Map<string, { count: number; frente: string; categoria: string; servico: string }>>();
    
    for (const photo of photosToProcess) {
      const folder = photo.folderPath || '';
      if (!folder) continue;
      
      const frente = photo.frente || 'NAO_INFORMADO';
      const categoria = photo.disciplina || 'NAO_INFORMADO';
      const servico = photo.servico || 'NAO_INFORMADO';
      
      // Só conta se tiver pelo menos categoria
      if (categoria === 'NAO_INFORMADO') continue;
      
      const key = `${frente}|${categoria}|${servico}`;
      
      if (!folderStats.has(folder)) {
        folderStats.set(folder, new Map());
      }
      
      const stats = folderStats.get(folder)!;
      if (!stats.has(key)) {
        stats.set(key, { count: 0, frente, categoria, servico });
      }
      stats.get(key)!.count++;
    }
    
    // Propaga para fotos sem classificação (>=5 fotos ou >=70% da pasta com conf >=0.7)
    for (const [folder, stats] of folderStats) {
      let bestKey = '';
      let bestCount = 0;
      
      for (const [key, data] of stats) {
        if (data.count > bestCount) {
          bestCount = data.count;
          bestKey = key;
        }
      }
      
      const photosInFolder = photosToProcess.filter(p => p.folderPath === folder);
      const shouldPropagate = bestCount >= 5 || bestCount >= photosInFolder.length * 0.7;
      
      if (shouldPropagate && bestKey) {
        const [frente, categoria, servico] = bestKey.split('|');
        
        for (const photo of photosInFolder) {
          const needsUpdate = 
            (!photo.frente || photo.frente === 'NAO_INFORMADO') ||
            (!photo.disciplina || photo.disciplina === 'NAO_INFORMADO') ||
            (!photo.servico || photo.servico === 'NAO_INFORMADO');
            
          if (needsUpdate) {
            const updates: Partial<PhotoData> = {};
            if (!photo.frente || photo.frente === 'NAO_INFORMADO') updates.frente = frente;
            if (!photo.disciplina || photo.disciplina === 'NAO_INFORMADO') updates.disciplina = categoria;
            if (!photo.servico || photo.servico === 'NAO_INFORMADO') updates.servico = servico;
            
            onBatchUpdate([photo.id], { ...updates, aiConfidence: 0.7 });
            
            // Atualiza no array local
            const idx = photosToProcess.findIndex(p => p.id === photo.id);
            if (idx !== -1) {
              photosToProcess[idx] = { ...photosToProcess[idx], ...updates, aiConfidence: 0.7 };
            }
            
            console.log(`[Turbo] 📂 Propagado: ${photo.filename} ← pasta ${folder}`);
          }
        }
      }
    }
    
    setProgress(60);
    
    // ============================================
    // ETAPA 4: IA PARA FOTOS RESTANTES (60-95%)
    // ============================================
    const photosNeedingAI = photosToProcess.filter(p => 
      (!p.frente || p.frente === 'NAO_INFORMADO' || p.frente === 'FRENTE_NAO_INFORMADA') ||
      (!p.disciplina || p.disciplina === 'NAO_INFORMADO' || p.disciplina === 'DISCIPLINA_NAO_INFORMADA') ||
      (!p.servico || p.servico === 'NAO_INFORMADO' || p.servico === 'SERVICO_NAO_IDENTIFICADO')
    );
    
    if (photosNeedingAI.length > 0) {
      setStatusMessage(`🤖 Classificando ${photosNeedingAI.length} fotos com IA...`);
      console.log(`[Turbo] ETAPA 4: IA para ${photosNeedingAI.length} fotos`);
      
      const batches = Math.ceil(photosNeedingAI.length / BATCH_SIZE);
      
      for (let i = 0; i < batches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, photosNeedingAI.length);
        const batch = photosNeedingAI.slice(start, end);
        
        try {
          const batchData = batch.map(p => ({
            id: p.id,
            filename: p.filename,
            folderPath: p.folderPath,
            ocrText: p.ocrText?.substring(0, 200),
            empresa: extractEmpresa(p.folderPath),
            existingFrente: p.frente !== 'FRENTE_NAO_INFORMADA' ? p.frente : undefined,
            existingCategoria: p.disciplina !== 'DISCIPLINA_NAO_INFORMADA' ? p.disciplina : undefined,
            existingServico: p.servico !== 'SERVICO_NAO_IDENTIFICADO' ? p.servico : undefined,
          }));
          
          const { data, error } = await supabase.functions.invoke('classify-batch', {
            body: { photos: batchData },
          });
          
          if (error) {
            console.error('[Turbo] Erro IA:', error);
            batch.forEach(p => pendingIds.push(p.id));
            continue;
          }
          
          if (data.error) {
            if (data.error.includes('Rate limit')) {
              await new Promise(r => setTimeout(r, 5000));
              i--;
              continue;
            }
            batch.forEach(p => pendingIds.push(p.id));
            continue;
          }
          
          // Aplica resultados
          const results = data.results || [];
          for (const result of results) {
            const photo = batch.find(p => p.id === result.id);
            if (!photo) continue;
            
            const confidence = result.confidence || 0.3;
            const status = getStatusFromConfidence(confidence);
            
            const updates: Partial<PhotoData> = {
              frente: result.frente || photo.frente || 'NAO_INFORMADO',
              disciplina: result.categoria || photo.disciplina || 'NAO_INFORMADO',
              servico: result.servico || photo.servico || 'NAO_INFORMADO',
              aiConfidence: confidence,
              aiStatus: 'success',
              status,
            };
            
            onBatchUpdate([result.id], updates);
            
            if (confidence < 0.55) {
              pendingIds.push(result.id);
            }
          }
          
        } catch (err) {
          console.error('[Turbo] Erro no lote:', err);
          batch.forEach(p => pendingIds.push(p.id));
        }
        
        setProgress(60 + ((i + 1) / batches) * 35);
        setProcessedCount(prev => prev + batch.length);
      }
    }
    
    setProgress(95);
    
    // ============================================
    // ETAPA 5: FINALIZAÇÃO (95-100%)
    // ============================================
    setStatusMessage('✅ Finalizando...');
    
    // Atualiza status de todas as fotos
    for (const photo of photosToProcess) {
      const hasAllFields = 
        photo.frente && photo.frente !== 'NAO_INFORMADO' && photo.frente !== 'FRENTE_NAO_INFORMADA' &&
        photo.disciplina && photo.disciplina !== 'NAO_INFORMADO' && photo.disciplina !== 'DISCIPLINA_NAO_INFORMADA' &&
        photo.servico && photo.servico !== 'NAO_INFORMADO' && photo.servico !== 'SERVICO_NAO_IDENTIFICADO';
      
      if (!hasAllFields && !pendingIds.includes(photo.id)) {
        pendingIds.push(photo.id);
      }
    }
    
    setPendingPhotos(pendingIds);
    setProgress(100);
    setIsProcessing(false);
    setStatusMessage('');
    
    const successCount = photos.length - pendingIds.length;
    const successRate = Math.round((successCount / photos.length) * 100);
    
    toast({
      title: `✅ Processamento concluído!`,
      description: `${successCount}/${photos.length} fotos classificadas (${successRate}%)`,
    });
    
    console.log(`[Turbo] Concluído: ${successCount}/${photos.length} (${successRate}%) - ${pendingIds.length} pendentes`);
    
  }, [photos, onBatchUpdate, onUpdatePhoto, toast]);

  // Lightbox helpers
  const pendingPhotosFull = useMemo(() => {
    return pendingPhotos.map(id => photos.find(p => p.id === id)).filter(Boolean) as PhotoData[];
  }, [pendingPhotos, photos]);

  const openLightbox = (photo: PhotoData) => {
    const idx = pendingPhotosFull.findIndex(p => p.id === photo.id);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxPhoto(photo);
    setZoom(1);
    setRotation(0);
  };

  const navigateLightbox = (direction: 1 | -1) => {
    const newIndex = lightboxIndex + direction;
    if (newIndex >= 0 && newIndex < pendingPhotosFull.length) {
      setLightboxIndex(newIndex);
      setLightboxPhoto(pendingPhotosFull[newIndex]);
      setZoom(1);
      setRotation(0);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-card border rounded-lg p-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            <span className="font-semibold">Processamento TURBO</span>
            {stats.total > 0 && (
              <span className="text-sm text-muted-foreground">
                ({stats.classified}/{stats.total} classificadas)
              </span>
            )}
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-4 space-y-4">
        {/* Estatísticas */}
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="bg-muted/50 p-2 rounded text-center">
            <div className="font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="bg-green-500/20 p-2 rounded text-center">
            <div className="font-bold text-green-600">{stats.byConfidence.green}</div>
            <div className="text-xs text-muted-foreground">🟢 Alta</div>
          </div>
          <div className="bg-yellow-500/20 p-2 rounded text-center">
            <div className="font-bold text-yellow-600">{stats.byConfidence.yellow}</div>
            <div className="text-xs text-muted-foreground">🟡 Média</div>
          </div>
          <div className="bg-red-500/20 p-2 rounded text-center">
            <div className="font-bold text-red-600">{stats.byConfidence.red}</div>
            <div className="text-xs text-muted-foreground">🔴 Baixa</div>
          </div>
        </div>

        {/* Progresso */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{statusMessage}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        )}

        {/* Botão principal */}
        <Button 
          onClick={processWithAI} 
          disabled={isProcessing || stats.total === 0}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              🚀 PROCESSAR TUDO
            </>
          )}
        </Button>

        {/* Fotos pendentes */}
        {pendingPhotos.length > 0 && (
          <Collapsible open={showPending} onOpenChange={setShowPending}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span>{pendingPhotos.length} fotos para verificar</span>
                </div>
                {showPending ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-2">
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {pendingPhotosFull.slice(0, 20).map(photo => (
                  <div 
                    key={photo.id}
                    className="relative cursor-pointer rounded overflow-hidden"
                    onClick={() => openLightbox(photo)}
                  >
                    <img 
                      src={photo.thumbnailUrl} 
                      alt={photo.filename}
                      className="w-full h-16 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ))}
              </div>
              {pendingPhotos.length > 20 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  +{pendingPhotos.length - 20} mais...
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CollapsibleContent>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button 
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigateLightbox(-1)}
              disabled={lightboxIndex === 0}
              className="text-white p-2 hover:bg-white/20 rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            
            <div className="max-w-4xl max-h-[80vh] overflow-hidden">
              <img 
                src={lightboxPhoto.thumbnailUrl}
                alt={lightboxPhoto.filename}
                className="max-w-full max-h-[70vh] object-contain transition-transform"
                style={{ 
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
              <div className="text-white text-center mt-4">
                <p className="font-medium">{lightboxPhoto.filename}</p>
                <p className="text-sm text-gray-400">
                  {lightboxPhoto.folderPath} | {lightboxPhoto.disciplina} | {lightboxPhoto.servico}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => navigateLightbox(1)}
              disabled={lightboxIndex === pendingPhotosFull.length - 1}
              className="text-white p-2 hover:bg-white/20 rounded disabled:opacity-50"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="text-white p-2 hover:bg-white/20 rounded">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="text-white p-2 hover:bg-white/20 rounded">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button onClick={() => setRotation(r => r + 90)} className="text-white p-2 hover:bg-white/20 rounded">
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </Collapsible>
  );
}
