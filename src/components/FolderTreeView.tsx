import { useMemo } from 'react';
import { Folder, Image, ChevronRight } from 'lucide-react';

interface FolderStructure {
  name: string;
  path: string;
  imageCount: number;
  children: FolderStructure[];
}

interface FolderTreeViewProps {
  files: FileList | File[];
}

function buildFolderTree(files: File[]): FolderStructure {
  const root: FolderStructure = {
    name: 'Raiz',
    path: '',
    imageCount: 0,
    children: [],
  };

  const folderMap = new Map<string, FolderStructure>();
  folderMap.set('', root);

  for (const file of files) {
    const relativePath = (file as any).webkitRelativePath || file.name;
    const parts = relativePath.split('/');
    
    // Remove o nome do arquivo
    const fileName = parts.pop();
    
    // Se não tem pasta (arquivo solto), conta na raiz
    if (parts.length === 0) {
      root.imageCount++;
      continue;
    }

    // Constrói a estrutura de pastas
    let currentPath = '';
    let parentFolder = root;

    for (const folderName of parts) {
      const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      
      if (!folderMap.has(newPath)) {
        const newFolder: FolderStructure = {
          name: folderName,
          path: newPath,
          imageCount: 0,
          children: [],
        };
        folderMap.set(newPath, newFolder);
        parentFolder.children.push(newFolder);
      }
      
      parentFolder = folderMap.get(newPath)!;
      currentPath = newPath;
    }

    // Conta a imagem na pasta final
    parentFolder.imageCount++;
  }

  return root;
}

function FolderNode({ folder, level = 0 }: { folder: FolderStructure; level?: number }) {
  const hasChildren = folder.children.length > 0;
  const hasImages = folder.imageCount > 0;

  if (!hasChildren && !hasImages) return null;

  return (
    <div className="text-sm">
      <div 
        className="flex items-center gap-2 py-1 hover:bg-muted/50 rounded px-2"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        ) : (
          <span className="w-3" />
        )}
        <Folder className="w-4 h-4 text-accent" />
        <span className="text-foreground font-medium">{folder.name}</span>
        {hasImages && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Image className="w-3 h-3" />
            {folder.imageCount}
          </span>
        )}
      </div>
      {hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderNode key={child.path} folder={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTreeView({ files }: FolderTreeViewProps) {
  const fileArray = useMemo(() => Array.from(files), [files]);
  
  const tree = useMemo(() => buildFolderTree(fileArray), [fileArray]);
  
  const totalFolders = useMemo(() => {
    let count = 0;
    const countFolders = (folder: FolderStructure) => {
      count += folder.children.length;
      folder.children.forEach(countFolders);
    };
    countFolders(tree);
    return count;
  }, [tree]);

  const totalImages = fileArray.length;

  if (totalImages === 0) return null;

  // Se não tem estrutura de pastas (arquivos soltos), mostra resumo simples
  if (totalFolders === 0) {
    return (
      <div className="card-industrial p-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <Image className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {totalImages} imagem(ns) selecionada(s)
            </h3>
            <p className="text-xs text-muted-foreground">
              Arquivos individuais (sem estrutura de pastas)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-industrial p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Folder className="w-4 h-4 text-accent" />
          Estrutura de pastas detectada
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Folder className="w-3 h-3" />
            {totalFolders} pasta(s)
          </span>
          <span className="flex items-center gap-1">
            <Image className="w-3 h-3" />
            {totalImages} imagem(ns)
          </span>
        </div>
      </div>
      
      <div className="max-h-48 overflow-y-auto border border-border rounded-lg bg-muted/30">
        <FolderNode folder={tree} />
      </div>
    </div>
  );
}
