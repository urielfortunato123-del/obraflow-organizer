import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { ConfigPanel } from '@/components/ConfigPanel';
import { PhotoUploader } from '@/components/PhotoUploader';
import { PhotoCard } from '@/components/PhotoCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ActionButtons } from '@/components/ActionButtons';
import { FolderTreeView } from '@/components/FolderTreeView';
import { BatchEditPanel } from '@/components/BatchEditPanel';
import { QuickClassifyPanel } from '@/components/QuickClassifyPanel';
import { TurboProcessPanel } from '@/components/TurboProcessPanel';
import { ExportPreview } from '@/components/ExportPreview';
import type { PhotoData, AppSettings } from '@/types/photo';
import { DEFAULT_SETTINGS } from '@/types/photo';
import { generateId, extractDateFromText, extractCoordinatesFromText, sortPhotosForView } from '@/utils/helpers';
import { processOCR } from '@/utils/ocr';
import { classifyWithAI, isAIAvailable } from '@/utils/ai';
import { generateZip, generateCSV } from '@/utils/export';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('obradash_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [progressSubLabel, setProgressSubLabel] = useState('');

  // Salva settings quando muda
  useEffect(() => {
    localStorage.setItem('obradash_settings', JSON.stringify(settings));
  }, [settings]);

  // Adiciona fotos
  const handleFilesSelected = useCallback((files: FileList) => {
    const newPhotos: PhotoData[] = Array.from(files).map((file) => {
      // Extrai o caminho da pasta do webkitRelativePath
      const relativePath = (file as any).webkitRelativePath || '';
      const pathParts = relativePath.split('/');
      pathParts.pop(); // Remove o nome do arquivo
      const folderPath = pathParts.join('/');

      return {
        id: generateId(),
        file,
        thumbnailUrl: URL.createObjectURL(file),
        filename: file.name,
        folderPath,
        ocrText: '',
        ocrStatus: 'pending' as const,
        dateIso: null,
        yearMonth: null,
        day: null,
        hora: null,
        latitude: null,
        longitude: null,
        frente: settings.defaultLocal,
        disciplina: '',
        servico: settings.defaultServico,
        aiStatus: 'pending' as const,
        aiConfidence: null,
        alertas: [],
        status: 'Pendente' as const,
      };
    });

    setPhotos((prev) => [...prev, ...newPhotos]);
    
    toast({
      title: `${files.length} foto(s) adicionada(s)`,
      description: 'Clique em "Processar OCR + IA" para analisar',
    });
  }, [settings.defaultLocal, settings.defaultServico, toast]);

  // Atualiza foto individual
  const handleUpdatePhoto = useCallback((id: string, updates: Partial<PhotoData>) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  // Atualiza múltiplas fotos em lote
  const handleBatchUpdate = useCallback((ids: string[], updates: Partial<PhotoData>) => {
    setPhotos((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, ...updates } : p))
    );
    toast({
      title: 'Atualização em lote',
      description: `${ids.length} foto(s) atualizada(s)`,
    });
  }, [toast]);

  // Exclui foto individual
  const handleDeletePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find(p => p.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.thumbnailUrl);
      }
      return prev.filter(p => p.id !== id);
    });
    toast({
      title: 'Foto excluída',
      description: 'A foto foi removida da lista',
    });
  }, [toast]);

  // Processa OCR + IA
  const handleProcess = useCallback(async () => {
    if (photos.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    const total = photos.length;
    let processed = 0;

    for (const photo of photos) {
      try {
        // OCR
        if (settings.ocrLocal) {
          setProgressLabel(`OCR Vision: ${photo.filename}`);
          setProgressSubLabel(`${processed + 1} de ${total}`);

          handleUpdatePhoto(photo.id, { ocrStatus: 'processing' });

          try {
            const ocrResult = await processOCR(
              photo.file, 
              { apiKey: settings.ocrApiKey, liteMode: settings.modoEconomico, useVision: true },
              (p) => {
                setProgress((processed / total) * 100 + (p / total) * 0.5);
              }
            );

            const { dateIso, yearMonth } = extractDateFromText(ocrResult.text);
            const coords = extractCoordinatesFromText(ocrResult.text);

            // Tenta extrair data do campo date retornado pelo Vision
            let finalDateIso = dateIso;
            let finalYearMonth = yearMonth;
            let finalHora = null;
            
            if (!dateIso && ocrResult.date) {
              // Tenta parsear a data do Vision (formato DD/MM/YYYY HH:MM)
              const dateParts = ocrResult.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
              if (dateParts) {
                const [, day, month, year] = dateParts;
                finalDateIso = `${year}-${month}-${day}`;
                finalYearMonth = `${year}-${month}`;
              }
              // Extrai hora
              const timeParts = ocrResult.date.match(/(\d{2}):(\d{2})/);
              if (timeParts) {
                finalHora = `${timeParts[1]}:${timeParts[2]}`;
              }
            }

            // Fallback para lastModified se não encontrou data
            if (!finalDateIso && photo.file.lastModified) {
              const fallbackDate = new Date(photo.file.lastModified);
              finalDateIso = fallbackDate.toISOString().split('T')[0];
              finalYearMonth = `${fallbackDate.getFullYear()}-${String(fallbackDate.getMonth() + 1).padStart(2, '0')}`;
              console.log(`[OCR] Usando lastModified como fallback: ${finalDateIso}`);
            }

            // Extrai o dia da data
            const finalDay = finalDateIso ? finalDateIso.split('-')[2] : null;

            // Usa frente/serviço do Vision se disponível
            const visionFrente = ocrResult.local || undefined;
            const visionServico = ocrResult.servico || undefined;

            handleUpdatePhoto(photo.id, {
              ocrText: ocrResult.text,
              ocrStatus: 'success',
              dateIso: finalDateIso,
              yearMonth: finalYearMonth,
              day: finalDay,
              hora: finalHora,
              latitude: coords.latitude,
              longitude: coords.longitude,
              // Se o Vision já extraiu frente/serviço, usa eles
              ...(visionFrente && { frente: visionFrente }),
              ...(visionServico && { servico: visionServico }),
            });

          } catch (ocrError) {
            console.error('[Process] Erro OCR:', ocrError);
            handleUpdatePhoto(photo.id, {
              ocrStatus: 'error',
              status: 'OCR Falhou',
            });
          }
        }

        // IA
        const currentPhoto = photos.find(p => p.id === photo.id);
        const updatedPhoto = { ...photo, ...currentPhoto };

        if (settings.prioridadeIA && isAIAvailable(settings)) {
          setProgressLabel(`IA: ${photo.filename}`);
          
          handleUpdatePhoto(photo.id, { aiStatus: 'processing' });

          try {
            const aiResult = await classifyWithAI(
              {
                ocrText: updatedPhoto.ocrText || '',
                dateIso: updatedPhoto.dateIso,
                yearMonth: updatedPhoto.yearMonth,
                latitude: updatedPhoto.latitude,
                longitude: updatedPhoto.longitude,
                userFrente: updatedPhoto.frente || settings.defaultLocal,
                userServico: updatedPhoto.servico || settings.defaultServico,
                liteMode: settings.modoEconomico,
              },
              settings
            );

            handleUpdatePhoto(photo.id, {
              frente: aiResult.frente,
              disciplina: aiResult.disciplina,
              servico: aiResult.servico,
              yearMonth: aiResult.year_month || updatedPhoto.yearMonth,
              hora: aiResult.hora || updatedPhoto.hora,
              alertas: aiResult.alertas || [],
              aiStatus: 'success',
              aiConfidence: aiResult.confianca,
              status: 'OK',
            });

          } catch (aiError) {
            console.error('[Process] Erro IA:', aiError);
            handleUpdatePhoto(photo.id, {
              aiStatus: 'error',
              status: updatedPhoto.ocrStatus === 'success' ? 'IA Falhou' : 'OCR Falhou',
            });
          }
        } else {
          // IA desabilitada ou indisponível
          handleUpdatePhoto(photo.id, {
            aiStatus: 'skipped',
            status: updatedPhoto.ocrStatus === 'success' ? 'OK' : updatedPhoto.status,
          });
        }

        processed++;
        setProgress((processed / total) * 100);

      } catch (error) {
        console.error('[Process] Erro geral:', error);
        handleUpdatePhoto(photo.id, { status: 'OCR Falhou' });
        processed++;
      }
    }

    setIsProcessing(false);
    setProgress(100);
    setProgressLabel('Concluído!');
    setProgressSubLabel('');

    toast({
      title: 'Processamento concluído',
      description: `${processed} foto(s) processada(s)`,
    });

    // Limpa progresso após 2s
    setTimeout(() => {
      setProgress(0);
      setProgressLabel('');
    }, 2000);

  }, [photos, settings, handleUpdatePhoto, toast]);

  // Gera ZIP
  const handleGenerateZip = useCallback(async () => {
    const processedPhotos = photos.filter(p => p.status === 'OK' || p.frente || p.servico);
    
    if (processedPhotos.length === 0) {
      toast({
        title: 'Nenhuma foto para exportar',
        description: 'Processe as fotos primeiro ou defina frente/serviço manualmente',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setProgressLabel('Gerando ZIP...');

    try {
      await generateZip(processedPhotos, setProgress);
      
      toast({
        title: 'ZIP gerado com sucesso!',
        description: `${processedPhotos.length} foto(s) organizadas`,
      });
    } catch (error) {
      console.error('[Export] Erro ZIP:', error);
      toast({
        title: 'Erro ao gerar ZIP',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }

    setIsExporting(false);
    setProgress(0);
    setProgressLabel('');
  }, [photos, toast]);

  // Baixa CSV
  const handleDownloadCSV = useCallback(() => {
    if (photos.length === 0) return;

    try {
      generateCSV(photos);
      toast({
        title: 'CSV gerado com sucesso!',
        description: `${photos.length} registro(s) exportados`,
      });
    } catch (error) {
      console.error('[Export] Erro CSV:', error);
      toast({
        title: 'Erro ao gerar CSV',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [photos, toast]);

  // Limpa tudo
  const handleClear = useCallback(() => {
    // Revoga URLs de thumbnails
    photos.forEach(p => URL.revokeObjectURL(p.thumbnailUrl));
    setPhotos([]);
    setProgress(0);
    setProgressLabel('');
    
    toast({
      title: 'Lista limpa',
      description: 'Todas as fotos foram removidas',
    });
  }, [photos, toast]);

  const processedCount = photos.filter(p => p.status === 'OK' || p.frente || p.servico).length;

  // Ordena fotos para visualização: EMPRESA > FRENTE (P01..P25) > DISCIPLINA > SERVIÇO > DATA > NOME
  const photosOrdered = useMemo(() => sortPhotosForView(photos), [photos]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Configurações */}
        <ConfigPanel settings={settings} onSettingsChange={setSettings} />

        {/* Upload */}
        <PhotoUploader
          onFilesSelected={handleFilesSelected}
          disabled={isProcessing || isExporting}
        />

        {/* Estrutura de pastas */}
        {photos.length > 0 && (
          <FolderTreeView files={photos.map(p => p.file)} />
        )}

        {/* 🚀 MODO TURBO - IA EM MASSA */}
        {photos.length > 0 && (
          <TurboProcessPanel
            photos={photos}
            onBatchUpdate={handleBatchUpdate}
            onUpdatePhoto={handleUpdatePhoto}
            onScrollToPhoto={(photoId) => {
              const element = document.getElementById(`photo-${photoId}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-4', 'ring-accent', 'ring-offset-2');
                setTimeout(() => {
                  element.classList.remove('ring-4', 'ring-accent', 'ring-offset-2');
                }, 3000);
              }
            }}
          />
        )}

        {/* Classificação Rápida - TURBO MODE */}
        {photos.length > 0 && (
          <QuickClassifyPanel
            photos={photos}
            onUpdatePhoto={handleUpdatePhoto}
            onBatchUpdate={handleBatchUpdate}
          />
        )}

        {/* Edição em lote */}
        {photos.length > 0 && (
          <BatchEditPanel 
            photos={photos} 
            onBatchUpdate={handleBatchUpdate} 
          />
        )}

        {/* Preview da estrutura de exportação */}
        {photos.length > 0 && (
          <ExportPreview
            photos={photos}
            onUpdatePhoto={handleUpdatePhoto}
            onExportZip={handleGenerateZip}
            onExportCSV={handleDownloadCSV}
            isExporting={isExporting}
          />
        )}

        {/* Barra de progresso */}
        {(isProcessing || isExporting || progress > 0) && (
          <div className="card-industrial p-4">
            <ProgressBar
              progress={progress}
              label={progressLabel}
              subLabel={progressSubLabel}
            />
          </div>
        )}

        {/* Lista de fotos */}
        {photos.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Fotos ({photos.length})
                {processedCount > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    • {processedCount} processada(s)
                  </span>
                )}
              </h2>
              
              <ActionButtons
                photosCount={photos.length}
                processedCount={processedCount}
                onProcess={handleProcess}
                onGenerateZip={handleGenerateZip}
                onDownloadCSV={handleDownloadCSV}
                onClear={handleClear}
                isProcessing={isProcessing}
                isExporting={isExporting}
              />
            </div>

            <div className="grid gap-4">
              {photosOrdered.map((photo) => (
                <div key={photo.id} id={`photo-${photo.id}`} className="transition-all duration-300">
                  <PhotoCard
                    photo={photo}
                    onUpdate={handleUpdatePhoto}
                    onDelete={handleDeletePhoto}
                    onApplyToAll={(field, value) => {
                      const allIds = photos.map(p => p.id);
                      handleBatchUpdate(allIds, { [field]: value });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {photos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhuma foto selecionada. Arraste fotos ou clique no botão acima.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto max-w-6xl px-4 text-center">
          <p className="text-sm text-muted-foreground">
            ObraDash Organizer — Organize fotos de obra com OCR e IA
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;