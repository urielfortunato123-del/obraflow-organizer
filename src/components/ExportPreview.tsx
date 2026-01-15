import { useMemo, useState } from 'react';
import { Folder, Image, ChevronRight, ChevronDown, Download, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PhotoData } from '@/types/photo';
import { normalizeName } from '@/utils/helpers';

interface FolderNode {
  name: string;
  path: string;
  imageCount: number;
  images: string[];
  children: Map<string, FolderNode>;
}

interface ExportPreviewProps {
  photos: PhotoData[];
  onExportZip: () => void;
  onExportCSV: () => void;
  isExporting: boolean;
}

function buildExportTree(photos: PhotoData[]): FolderNode {
  const root: FolderNode = {
    name: 'ZIP',
    path: '',
    imageCount: 0,
    images: [],
    children: new Map(),
  };

  const processedPhotos = photos.filter(p => p.status === 'OK' || p.local || p.servico);

  for (const photo of processedPhotos) {
    const local = normalizeName(photo.local || 'LOCAL_NAO_INFORMADO');
    const servico = normalizeName(photo.servico || 'SERVICO_NAO_INFORMADO');
    const yearMonth = photo.yearMonth || 'SEM_DATA';
    
    // Navega/cria a estrutura: LOCAL > SERVIÇO > ANO-MÊS
    let currentNode = root;
    
    // Nível 1: Local
    if (!currentNode.children.has(local)) {
      currentNode.children.set(local, {
        name: local,
        path: local,
        imageCount: 0,
        images: [],
        children: new Map(),
      });
    }
    currentNode = currentNode.children.get(local)!;
    
    // Nível 2: Serviço
    if (!currentNode.children.has(servico)) {
      currentNode.children.set(servico, {
        name: servico,
        path: `${local}/${servico}`,
        imageCount: 0,
        images: [],
        children: new Map(),
      });
    }
    currentNode = currentNode.children.get(servico)!;
    
    // Nível 3: Ano-Mês
    if (!currentNode.children.has(yearMonth)) {
      currentNode.children.set(yearMonth, {
        name: yearMonth,
        path: `${local}/${servico}/${yearMonth}`,
        imageCount: 0,
        images: [],
        children: new Map(),
      });
    }
    currentNode = currentNode.children.get(yearMonth)!;
    
    // Adiciona a imagem
    currentNode.imageCount++;
    currentNode.images.push(photo.filename);
  }

  return root;
}

function TreeNode({ node, level = 0, defaultExpanded = true }: { node: FolderNode; level?: number; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded && level < 2);
  const hasChildren = node.children.size > 0;
  const hasImages = node.imageCount > 0;
  const isWarning = node.name.includes('NAO_INFORMADO') || node.name.includes('NAO_IDENTIFICADO');

  if (!hasChildren && !hasImages) return null;

  const childrenArray = Array.from(node.children.values());

  return (
    <div className="text-sm select-none">
      <div 
        className={`flex items-center gap-2 py-1.5 hover:bg-muted/50 rounded px-2 cursor-pointer ${isWarning ? 'bg-warning/10' : ''}`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        
        <Folder className={`w-4 h-4 flex-shrink-0 ${isWarning ? 'text-warning' : 'text-accent'}`} />
        
        <span className={`font-medium truncate ${isWarning ? 'text-warning' : 'text-foreground'}`}>
          {node.name}
        </span>
        
        {isWarning && (
          <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0" />
        )}
        
        {hasImages && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto flex-shrink-0">
            <Image className="w-3 h-3" />
            {node.imageCount}
          </span>
        )}
      </div>
      
      {expanded && hasChildren && (
        <div>
          {childrenArray.map((child) => (
            <TreeNode key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
      
      {expanded && hasImages && node.images.length <= 5 && (
        <div className="ml-8" style={{ paddingLeft: `${level * 20 + 8}px` }}>
          {node.images.map((img, idx) => (
            <div key={idx} className="flex items-center gap-2 py-0.5 text-xs text-muted-foreground">
              <Image className="w-3 h-3" />
              <span className="truncate">{img}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExportPreview({ photos, onExportZip, onExportCSV, isExporting }: ExportPreviewProps) {
  const tree = useMemo(() => buildExportTree(photos), [photos]);
  
  const stats = useMemo(() => {
    const processedPhotos = photos.filter(p => p.status === 'OK' || p.local || p.servico);
    const pendingPhotos = photos.filter(p => 
      (p.local === 'LOCAL_NAO_INFORMADO' || !p.local) ||
      (p.servico === 'SERVICO_NAO_IDENTIFICADO' || !p.servico)
    );
    const locais = new Set(processedPhotos.map(p => p.local).filter(Boolean));
    const servicos = new Set(processedPhotos.map(p => p.servico).filter(Boolean));
    
    return {
      total: photos.length,
      processed: processedPhotos.length,
      pending: pendingPhotos.length,
      locais: locais.size,
      servicos: servicos.size,
    };
  }, [photos]);

  if (photos.length === 0) return null;

  return (
    <div className="card-industrial p-4 animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Download className="w-4 h-4 text-accent" />
          Estrutura de saída (Preview)
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{stats.locais} local(is)</span>
          <span>•</span>
          <span>{stats.servicos} serviço(s)</span>
          <span>•</span>
          <span>{stats.processed} foto(s)</span>
        </div>
      </div>

      {/* Aviso de pendentes */}
      {stats.pending > 0 && (
        <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/30 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          <span className="text-warning">
            {stats.pending} foto(s) com Local ou Serviço pendente. Corrija antes de exportar.
          </span>
        </div>
      )}

      {/* Estrutura em árvore */}
      <div className="max-h-64 overflow-y-auto border border-border rounded-lg bg-muted/30 p-2">
        <TreeNode node={tree} />
      </div>

      {/* Legenda */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Estrutura:</strong> LOCAL / SERVIÇO / ANO-MÊS / fotos</p>
        <p>Exemplo: <code className="bg-muted px-1 rounded">PORTICO_09/ACABAMENTO_EXTERNO/2025-08/foto.jpg</code></p>
      </div>

      {/* Botões de exportação */}
      <div className="flex gap-2">
        <Button
          onClick={onExportZip}
          disabled={isExporting || stats.processed === 0}
          className="btn-accent flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar ZIP ({stats.processed} fotos)
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
    </div>
  );
}
