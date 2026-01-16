import { useMemo, useState, useCallback } from 'react';
import { Folder, Image, ChevronRight, ChevronDown, Download, FileText, AlertTriangle, Edit2, Check, X, Calendar, Shield, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PhotoData, ClassificationMode } from '@/types/photo';
import { DISCIPLINAS, SERVICOS, FOLDER_ROUTINE, FOLDER_UNIDENTIFIED } from '@/types/photo';
import { normalizeName } from '@/utils/helpers';
import { useToast } from '@/hooks/use-toast';
import { computeYearMonthDay } from '@/utils/exportPath';

interface ExportPreviewProps {
  photos: PhotoData[];
  onUpdatePhoto: (id: string, updates: Partial<PhotoData>) => void;
  onExportZip: () => void;
  onExportCSV: () => void;
  isExporting: boolean;
}

interface FolderNode {
  name: string;
  displayName: string;
  path: string;
  level: 'frente' | 'disciplina' | 'servico' | 'mes' | 'dia';
  imageCount: number;
  images: { id: string; filename: string }[];
  children: Map<string, FolderNode>;
}

// ============================================================================
// FUNÇÕES ANTI-NULL (REGRAS OFICIAIS)
// ============================================================================

function sanitize(value: string | null | undefined, fallback: string): string {
  if (value === null || value === undefined) return fallback;
  const trimmed = String(value).trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return fallback;
  }
  return trimmed;
}

function isCompleteClassification(photo: PhotoData): boolean {
  const frente = sanitize(photo.frente, '');
  const disciplina = sanitize(photo.disciplina, '');
  const servico = sanitize(photo.servico, '');
  
  const invalidValues = [
    '', 'NAO_INFORMADO', 'FRENTE_NAO_INFORMADA', 
    'DISCIPLINA_NAO_INFORMADA', 'SERVICO_NAO_INFORMADO',
    'SERVICO_NAO_IDENTIFICADO', 'SEM_DISCIPLINA', 'SEM_SERVICO'
  ];
  
  return !invalidValues.includes(frente.toUpperCase()) &&
         !invalidValues.includes(disciplina.toUpperCase()) &&
         !invalidValues.includes(servico.toUpperCase());
}

function hasLocationHint(photo: PhotoData): boolean {
  const text = [
    photo.ocrText || '',
    photo.filename || '',
    photo.folderPath || '',
    photo.locationHint || ''
  ].join(' ').toUpperCase();
  
  const locationPatterns = [
    /KM[_\s]?\d+/, /ESTACA[_\s]?\d+/, /SENTIDO/, /GPS/,
    /LAT[ITUDE]?/, /LONG[ITUDE]?/, /FREE_?FLOW/, /BSO[_\s]?\d+/,
    /PRACA[_\s]?\d+/, /TRECHO/, /PISTA/,
  ];
  
  return locationPatterns.some(pattern => pattern.test(text));
}

function extractDateFolder(photo: PhotoData): { yearMonth: string; day: string } {
  if (photo.dateIso && /^\d{4}-\d{2}-\d{2}$/.test(photo.dateIso)) {
    return { yearMonth: photo.dateIso.substring(0, 7), day: photo.dateIso.substring(8, 10) };
  }
  if (photo.yearMonth && /^\d{4}-\d{2}$/.test(photo.yearMonth)) {
    return { yearMonth: photo.yearMonth, day: photo.day || 'SEM_DIA' };
  }
  if (photo.file?.lastModified) {
    const { yearMonth, day } = computeYearMonthDay(null, photo.file.lastModified);
    return { yearMonth, day };
  }
  return { yearMonth: 'SEM_DATA', day: 'SEM_DIA' };
}

function decideMainFolder(photo: PhotoData): ClassificationMode {
  if (photo.classificationMode === 'ROUTINE') return 'ROUTINE';
  if (photo.classificationMode === 'UNIDENTIFIED') return 'UNIDENTIFIED';
  
  if (isCompleteClassification(photo)) {
    const confidence = photo.aiConfidence ?? 1.0;
    if (confidence >= 0.5) return 'AUTO';
  }
  
  const { yearMonth } = extractDateFolder(photo);
  const hasValidDate = yearMonth !== 'SEM_DATA';
  if (hasValidDate && hasLocationHint(photo)) return 'ROUTINE';
  
  return 'UNIDENTIFIED';
}

function formatYearMonth(yearMonth: string): string {
  if (!yearMonth || yearMonth === 'SEM_DATA') return 'SEM_DATA';
  const [year, month] = yearMonth.split('-');
  if (!year || !month) return 'SEM_DATA';
  const monthNames = ['', 'JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const monthNum = parseInt(month, 10);
  return `${month}_${monthNames[monthNum] || 'MES'}_${year}`;
}

function formatDay(day: string, yearMonth: string): string {
  if (!day || day === 'SEM_DIA') return 'SEM_DIA';
  const month = yearMonth?.split('-')[1] || '00';
  return `${day}_${month}`;
}

function buildExportTree(photos: PhotoData[]): FolderNode {
  const root: FolderNode = {
    name: 'ZIP',
    displayName: 'ZIP',
    path: '',
    level: 'frente',
    imageCount: 0,
    images: [],
    children: new Map(),
  };

  const processedPhotos = photos.filter(p => p.status === 'OK' || p.frente || p.servico);

  for (const photo of processedPhotos) {
    const mode = decideMainFolder(photo);
    const { yearMonth, day } = extractDateFolder(photo);
    const mes = formatYearMonth(yearMonth);
    const dia = formatDay(day, yearMonth);
    
    let currentNode = root;
    
    if (mode === 'AUTO') {
      // Estrutura completa: FRENTE > DISCIPLINA > SERVIÇO > MÊS > DIA
      const frente = normalizeName(sanitize(photo.frente, FOLDER_UNIDENTIFIED));
      const disciplina = normalizeName(sanitize(photo.disciplina, 'SEM_DISCIPLINA'));
      const servico = normalizeName(sanitize(photo.servico, 'SEM_SERVICO'));
      
      // Nível 1: Frente
      if (!currentNode.children.has(frente)) {
        currentNode.children.set(frente, {
          name: frente,
          displayName: photo.frente || frente,
          path: frente,
          level: 'frente',
          imageCount: 0,
          images: [],
          children: new Map(),
        });
      }
      currentNode = currentNode.children.get(frente)!;
      
      // Nível 2: Disciplina
      if (!currentNode.children.has(disciplina)) {
        currentNode.children.set(disciplina, {
          name: disciplina,
          displayName: photo.disciplina || disciplina,
          path: `${frente}/${disciplina}`,
          level: 'disciplina',
          imageCount: 0,
          images: [],
          children: new Map(),
        });
      }
      currentNode = currentNode.children.get(disciplina)!;
      
      // Nível 3: Serviço
      if (!currentNode.children.has(servico)) {
        currentNode.children.set(servico, {
          name: servico,
          displayName: photo.servico || servico,
          path: `${frente}/${disciplina}/${servico}`,
          level: 'servico',
          imageCount: 0,
          images: [],
          children: new Map(),
        });
      }
      currentNode = currentNode.children.get(servico)!;
    } else {
      // ROUTINE ou UNIDENTIFIED: pasta principal única
      const folderName = mode === 'ROUTINE' ? FOLDER_ROUTINE : FOLDER_UNIDENTIFIED;
      const displayName = mode === 'ROUTINE' ? '📸 FOTO DE ROTINA' : '❓ FOTOS SEM IDENTIFICAÇÃO';
      
      if (!currentNode.children.has(folderName)) {
        currentNode.children.set(folderName, {
          name: folderName,
          displayName: displayName,
          path: folderName,
          level: 'frente',
          imageCount: 0,
          images: [],
          children: new Map(),
        });
      }
      currentNode = currentNode.children.get(folderName)!;
    }
    
    // Nível: Mês (sempre)
    if (!currentNode.children.has(mes)) {
      currentNode.children.set(mes, {
        name: mes,
        displayName: mes,
        path: `${currentNode.path}/${mes}`,
        level: 'mes',
        imageCount: 0,
        images: [],
        children: new Map(),
      });
    }
    currentNode = currentNode.children.get(mes)!;
    
    // Nível: Dia (sempre)
    if (!currentNode.children.has(dia)) {
      currentNode.children.set(dia, {
        name: dia,
        displayName: dia,
        path: `${currentNode.path}/${dia}`,
        level: 'dia',
        imageCount: 0,
        images: [],
        children: new Map(),
      });
    }
    currentNode = currentNode.children.get(dia)!;
    
    // Adiciona a imagem
    currentNode.imageCount++;
    currentNode.images.push({ id: photo.id, filename: photo.filename });
  }

  return root;
}

interface TreeNodeProps {
  node: FolderNode;
  level?: number;
  onEditPhotos?: (photoIds: string[], field: string, value: string) => void;
  onEditDate?: (photoIds: string[], date: Date) => void;
}

function TreeNode({ node, level = 0, onEditPhotos, onEditDate }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(level < 3);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.displayName);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const hasChildren = node.children.size > 0;
  const hasImages = node.imageCount > 0;
  const isWarning = node.name.includes('NAO_INFORMAD') || node.name.includes('SEM_DATA') || node.name.includes('SEM_DIA');
  const isEditable = ['frente', 'disciplina', 'servico', 'mes', 'dia'].includes(node.level);
  const isDateLevel = ['mes', 'dia'].includes(node.level);

  const childrenArray = Array.from(node.children.values());
  
  // Coleta todos os IDs de fotos neste nó e filhos
  const getAllPhotoIds = (n: FolderNode): string[] => {
    let ids = n.images.map(img => img.id);
    n.children.forEach(child => {
      ids = ids.concat(getAllPhotoIds(child));
    });
    return ids;
  };

  const handleSaveEdit = () => {
    if (onEditPhotos && editValue.trim()) {
      const photoIds = getAllPhotoIds(node);
      const fieldMap: Record<string, string> = {
        'frente': 'frente',
        'disciplina': 'disciplina',
        'servico': 'servico',
      };
      const field = fieldMap[node.level];
      if (field) {
        onEditPhotos(photoIds, field, editValue.trim());
      }
    }
    setEditing(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && onEditDate) {
      const photoIds = getAllPhotoIds(node);
      onEditDate(photoIds, date);
      setCalendarOpen(false);
    }
  };

  if (!hasChildren && !hasImages) return null;

  return (
    <div className="text-sm select-none">
      <div 
        className={`flex items-center gap-2 py-1.5 hover:bg-muted/50 rounded px-2 group ${isWarning ? 'bg-warning/10' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        
        <Folder className={`w-4 h-4 flex-shrink-0 ${isWarning ? 'text-warning' : 'text-accent'}`} />
        
        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            {node.level === 'disciplina' ? (
              <Select value={editValue} onValueChange={setEditValue}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCIPLINAS.map(disc => (
                    <SelectItem key={disc} value={disc}>{disc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : node.level === 'servico' ? (
              <Select value={editValue} onValueChange={setEditValue}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICOS.map(svc => (
                    <SelectItem key={svc} value={svc}>{svc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-7 text-xs"
                autoFocus
              />
            )}
            <button onClick={handleSaveEdit} className="p-1 text-success hover:bg-success/10 rounded">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setEditing(false); setEditValue(node.displayName); }} className="p-1 text-destructive hover:bg-destructive/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className={`font-medium truncate ${isWarning ? 'text-warning' : 'text-foreground'}`}>
              {node.displayName}
            </span>
            
            {isWarning && (
              <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0" />
            )}
            
            {isEditable && !isDateLevel && onEditPhotos && (
              <button 
                onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-opacity"
                title={`Editar ${node.level}`}
              >
                <Edit2 className="w-3 h-3 text-muted-foreground" />
              </button>
            )}

            {isDateLevel && onEditDate && (
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button 
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-opacity"
                    title={`Editar ${node.level === 'mes' ? 'mês' : 'data'}`}
                  >
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    onSelect={handleDateSelect}
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}
          </>
        )}
        
        {hasImages && !editing && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto flex-shrink-0">
            <Image className="w-3 h-3" />
            {node.imageCount}
          </span>
        )}
      </div>
      
      {expanded && hasChildren && (
        <div>
          {childrenArray.map((child) => (
            <TreeNode key={child.path} node={child} level={level + 1} onEditPhotos={onEditPhotos} onEditDate={onEditDate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ExportPreview({ photos, onUpdatePhoto, onExportZip, onExportCSV, isExporting }: ExportPreviewProps) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  
  const tree = useMemo(() => buildExportTree(photos), [photos]);
  
  const stats = useMemo(() => {
    const processedPhotos = photos.filter(p => p.status === 'OK' || p.frente || p.servico);
    
    // Fotos PRONTAS = tem frente + disciplina + serviço + data
    const readyPhotos = processedPhotos.filter(p => 
      p.frente && p.frente !== 'FRENTE_NAO_INFORMADA' &&
      p.disciplina && p.disciplina !== 'DISCIPLINA_NAO_INFORMADA' &&
      p.servico && p.servico !== 'SERVICO_NAO_IDENTIFICADO' &&
      p.yearMonth && p.yearMonth !== 'SEM_DATA' &&
      p.dateIso && p.dateIso !== 'SEM_DIA'
    );
    
    // Fotos pendentes de classificação
    const pendingClassification = processedPhotos.filter(p => 
      (p.frente === 'FRENTE_NAO_INFORMADA' || !p.frente) ||
      (p.disciplina === 'DISCIPLINA_NAO_INFORMADA' || !p.disciplina) ||
      (p.servico === 'SERVICO_NAO_IDENTIFICADO' || !p.servico)
    );
    
    // Fotos pendentes de DATA
    const pendingDate = processedPhotos.filter(p => 
      !p.yearMonth || !p.dateIso
    );
    
    const frentes = new Set(processedPhotos.map(p => p.frente).filter(Boolean));
    const disciplinas = new Set(processedPhotos.map(p => p.disciplina).filter(Boolean));
    const servicos = new Set(processedPhotos.map(p => p.servico).filter(Boolean));
    
    return {
      total: photos.length,
      processed: processedPhotos.length,
      ready: readyPhotos.length,
      pendingClassification: pendingClassification.length,
      pendingDate: pendingDate.length,
      frentes: frentes.size,
      disciplinas: disciplinas.size,
      servicos: servicos.size,
    };
  }, [photos]);

  const handleEditPhotos = (photoIds: string[], field: string, value: string) => {
    photoIds.forEach(id => {
      onUpdatePhoto(id, { [field]: value });
    });
  };

  const handleEditDate = (photoIds: string[], date: Date) => {
    const dateIso = format(date, 'yyyy-MM-dd');
    const yearMonth = format(date, 'yyyy-MM');
    const day = format(date, 'dd');
    photoIds.forEach(id => {
      onUpdatePhoto(id, { dateIso, yearMonth, day });
    });
  };

  // Corrige datas ausentes usando lastModified do arquivo
  const fixMissingDates = useCallback(() => {
    let fixed = 0;
    photos.forEach(photo => {
      if (!photo.yearMonth || !photo.dateIso) {
        // Usa lastModified do arquivo como fallback
        if (photo.file?.lastModified) {
          const date = new Date(photo.file.lastModified);
          const dateIso = format(date, 'yyyy-MM-dd');
          const yearMonth = format(date, 'yyyy-MM');
          const day = format(date, 'dd');
          onUpdatePhoto(photo.id, { dateIso, yearMonth, day });
          fixed++;
        }
      }
    });
    
    if (fixed > 0) {
      toast({
        title: '📅 Datas corrigidas!',
        description: `${fixed} fotos receberam data do arquivo original.`,
      });
    } else {
      toast({
        title: 'Nenhuma correção necessária',
        description: 'Todas as fotos já têm data definida.',
      });
    }
  }, [photos, onUpdatePhoto, toast]);

  // Verificação pré-download
  const handleVerifyBeforeDownload = useCallback(async () => {
    setIsVerifying(true);
    
    // 1. Corrige datas ausentes
    let datesFixed = 0;
    for (const photo of photos) {
      if (!photo.yearMonth || !photo.dateIso) {
        if (photo.file?.lastModified) {
          const date = new Date(photo.file.lastModified);
          const dateIso = format(date, 'yyyy-MM-dd');
          const yearMonth = format(date, 'yyyy-MM');
          const day = format(date, 'dd');
          onUpdatePhoto(photo.id, { dateIso, yearMonth, day });
          datesFixed++;
        }
      }
    }
    
    // Simula verificação
    await new Promise(r => setTimeout(r, 500));
    
    setIsVerifying(false);
    setVerificationComplete(true);
    
    const issues: string[] = [];
    if (stats.pendingClassification > 0) {
      issues.push(`${stats.pendingClassification} sem classificação`);
    }
    if (stats.pendingDate > 0 && datesFixed < stats.pendingDate) {
      issues.push(`${stats.pendingDate - datesFixed} sem data`);
    }
    
    if (issues.length > 0) {
      toast({
        title: '⚠️ Verificação concluída com alertas',
        description: `${datesFixed > 0 ? `${datesFixed} datas corrigidas. ` : ''}Pendências: ${issues.join(', ')}`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: '✅ Verificação concluída!',
        description: `Todas as ${stats.processed} fotos estão prontas para download.${datesFixed > 0 ? ` (${datesFixed} datas corrigidas)` : ''}`,
      });
    }
  }, [photos, stats, onUpdatePhoto, toast]);

  // Download com verificação
  const handleDownloadWithVerify = useCallback(async () => {
    if (!verificationComplete) {
      await handleVerifyBeforeDownload();
    }
    onExportZip();
  }, [verificationComplete, handleVerifyBeforeDownload, onExportZip]);

  if (photos.length === 0) return null;

  return (
    <div className="card-industrial p-4 animate-fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Download className="w-4 h-4 text-accent" />
          Estrutura de saída (Editável)
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span>{stats.frentes} frente</span>
          <span>•</span>
          <span>{stats.disciplinas} disciplina</span>
          <span>•</span>
          <span>{stats.servicos} serviço</span>
          <span>•</span>
          <span className="text-green-500 font-medium">{stats.ready} prontas</span>
        </div>
      </div>

      {/* Status das fotos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-green-500/10 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-500">{stats.ready}</div>
          <div className="text-muted-foreground">Prontas</div>
        </div>
        <div className="bg-orange-500/10 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-orange-500">{stats.pendingClassification}</div>
          <div className="text-muted-foreground">Sem classificação</div>
        </div>
        <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-yellow-500">{stats.pendingDate}</div>
          <div className="text-muted-foreground">Sem data</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-foreground">{stats.processed}</div>
          <div className="text-muted-foreground">Total</div>
        </div>
      </div>

      {/* Botão para corrigir datas */}
      {stats.pendingDate > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={fixMissingDates}
          className="w-full text-xs"
        >
          <Calendar className="w-4 h-4 mr-2" />
          📅 Corrigir {stats.pendingDate} fotos sem data (usar data do arquivo)
        </Button>
      )}

      {/* Aviso de pendentes */}
      {(stats.pendingClassification > 0 || stats.pendingDate > 0) && (
        <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/30 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-warning">
            <strong>{stats.pendingClassification + stats.pendingDate} foto(s)</strong> com campos pendentes. 
            <span className="block text-xs mt-0.5">
              {stats.pendingClassification > 0 && `${stats.pendingClassification} sem classificação. `}
              {stats.pendingDate > 0 && `${stats.pendingDate} sem data (clique acima para corrigir).`}
            </span>
          </div>
        </div>
      )}

      {/* Estrutura em árvore editável */}
      <div className="max-h-80 overflow-y-auto border border-border rounded-lg bg-muted/30 p-2">
        <TreeNode node={tree} onEditPhotos={handleEditPhotos} onEditDate={handleEditDate} />
      </div>

      {/* Legenda */}
      <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted/30 rounded-lg">
        <p><strong>Estrutura:</strong> FRENTE / DISCIPLINA / SERVIÇO / MÊS / DIA / fotos</p>
        <p>
          <strong>Exemplo:</strong>{' '}
          <code className="bg-muted px-1 rounded text-[10px]">
            FREE_FLOW_P09/TERRAPLANAGEM/LIMPEZA_TERRENO/08_AGOSTO_2025/31_08/foto.jpg
          </code>
        </p>
      </div>

      {/* Botões de exportação */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleVerifyBeforeDownload}
          disabled={isVerifying || isExporting}
          variant="outline"
          className="flex-1 min-w-[150px]"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Verificar antes de baixar
            </>
          )}
        </Button>
        
        <Button
          onClick={handleDownloadWithVerify}
          disabled={isExporting || stats.processed === 0}
          className="btn-accent flex-1 min-w-[150px]"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando ZIP...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Baixar ZIP ({stats.processed} fotos)
            </>
          )}
        </Button>
        
        <Button
          onClick={onExportCSV}
          disabled={photos.length === 0}
          variant="outline"
          className="flex-shrink-0"
        >
          <FileText className="w-4 h-4 mr-2" />
          CSV
        </Button>
      </div>

      {verificationComplete && (
        <div className="text-xs text-center text-muted-foreground">
          ✅ Última verificação concluída
        </div>
      )}
    </div>
  );
}
