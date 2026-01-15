import { useState, useEffect } from 'react';
import { Settings, Wifi, WifiOff, ChevronDown, ChevronUp, Building2, Wrench, Calendar, Sparkles, FileText, Zap, CheckCircle, BookOpen, X, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { AppSettings } from '@/types/photo';
import { isOnline } from '@/utils/helpers';

interface ConfigPanelProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

interface ToggleOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  highlight?: boolean;
}

function ToggleOption({ icon, title, description, checked, onCheckedChange, disabled, highlight }: ToggleOptionProps) {
  return (
    <div 
      className={`flex items-center justify-between gap-3 py-3 px-3 rounded-lg transition-colors ${
        highlight ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-lg flex-shrink-0 ${highlight ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="flex-shrink-0"
      />
    </div>
  );
}

export function ConfigPanel({ settings, onSettingsChange }: ConfigPanelProps) {
  const [online, setOnline] = useState(isOnline());
  const [expanded, setExpanded] = useState(false);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [newWord, setNewWord] = useState('');

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);
    localStorage.setItem('obradash_settings', JSON.stringify(newSettings));
  };

  const addDictionaryWord = () => {
    if (newWord.trim() && !settings.ocrDictionary.includes(newWord.trim().toUpperCase())) {
      updateSetting('ocrDictionary', [...settings.ocrDictionary, newWord.trim().toUpperCase()]);
      setNewWord('');
    }
  };

  const removeDictionaryWord = (word: string) => {
    updateSetting('ocrDictionary', settings.ocrDictionary.filter(w => w !== word));
  };

  return (
    <div className="card-industrial p-4 animate-fade-in">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/15">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground uppercase tracking-wide">Opções de Processamento</h2>
            <p className="text-xs text-muted-foreground">Configure como as fotos serão organizadas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            online ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
          }`}>
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {online ? 'Online' : 'Offline'}
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-5 space-y-4 animate-slide-up">
          {/* Empresa/Cliente */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="defaultLocal" className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
                Empresa / Cliente
              </Label>
            </div>
            <Input
              id="defaultLocal"
              placeholder="BC-2"
              value={settings.defaultLocal}
              onChange={(e) => updateSetting('defaultLocal', e.target.value)}
              className="input-industrial h-11 text-base font-medium"
            />
            <p className="text-xs text-muted-foreground">Nome da pasta raiz para organização</p>
          </div>

          {/* Frente de Serviço Padrão */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="defaultServico" className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
                Frente de Serviço Padrão
              </Label>
            </div>
            <Input
              id="defaultServico"
              placeholder="EX: PORTICO_01, CONSERVAC"
              value={settings.defaultServico}
              onChange={(e) => updateSetting('defaultServico', e.target.value)}
              className="input-industrial h-11"
            />
            <p className="text-xs text-muted-foreground">Usado quando a frente de serviço não é identificada</p>
          </div>

          {/* Opções com toggle */}
          <div className="space-y-1 pt-2">
            <ToggleOption
              icon={<Calendar className="w-4 h-4" />}
              title="Organizar por Data"
              description="Cria subpastas mês_ano/dia_mês"
              checked={settings.organizePorData}
              onCheckedChange={(checked) => updateSetting('organizePorData', checked)}
            />

            <ToggleOption
              icon={<Sparkles className="w-4 h-4" />}
              title="Prioridade IA"
              description="Usa análise avançada com Gemini/GPT"
              checked={settings.prioridadeIA}
              onCheckedChange={(checked) => updateSetting('prioridadeIA', checked)}
              disabled={!online}
            />

            <ToggleOption
              icon={<FileText className="w-4 h-4" />}
              title="OCR Local"
              description="Extrai texto antes da IA (-60% custo)"
              checked={settings.ocrLocal}
              onCheckedChange={(checked) => updateSetting('ocrLocal', checked)}
            />

            <ToggleOption
              icon={<Zap className="w-4 h-4" />}
              title="Modo Econômico"
              description="2x mais fotos por $ (modelo leve)"
              checked={settings.modoEconomico}
              onCheckedChange={(checked) => updateSetting('modoEconomico', checked)}
              highlight={true}
            />

            <ToggleOption
              icon={<CheckCircle className="w-4 h-4" />}
              title="Correção IA"
              description="Corrige erros de OCR automaticamente"
              checked={settings.correcaoIA}
              onCheckedChange={(checked) => updateSetting('correcaoIA', checked)}
              disabled={!online}
            />
          </div>

          {/* Botão do Dicionário OCR */}
          <Dialog open={dictionaryOpen} onOpenChange={setDictionaryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 h-11 mt-2">
                <BookOpen className="w-4 h-4" />
                Dicionário OCR
                {settings.ocrDictionary.length > 0 && (
                  <span className="ml-auto bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                    {settings.ocrDictionary.length}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Dicionário OCR
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Adicione palavras ou termos que o OCR deve reconhecer corretamente (nomes de empresas, locais, serviços específicos).
                </p>

                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: PORTICO_01, BC-2..."
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addDictionaryWord()}
                    className="flex-1"
                  />
                  <Button onClick={addDictionaryWord} size="icon" className="flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {settings.ocrDictionary.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-muted/50 rounded-lg">
                    {settings.ocrDictionary.map((word) => (
                      <span 
                        key={word} 
                        className="inline-flex items-center gap-1 px-2 py-1 bg-background border border-border rounded-md text-sm"
                      >
                        {word}
                        <button
                          onClick={() => removeDictionaryWord(word)}
                          className="text-muted-foreground hover:text-destructive p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Nenhum termo adicionado
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}