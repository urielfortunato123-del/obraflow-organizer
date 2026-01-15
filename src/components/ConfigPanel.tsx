import { useState, useEffect } from 'react';
import { Settings, Save, Eye, EyeOff, Wifi, WifiOff, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AppSettings } from '@/types/photo';
import { isOnline } from '@/utils/helpers';

interface ConfigPanelProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function ConfigPanel({ settings, onSettingsChange }: ConfigPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [online, setOnline] = useState(isOnline());
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const handleSaveSettings = () => {
    localStorage.setItem('obradash_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    console.log('[Config] Configurações salvas');
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);
    
    // Desabilita IA se offline
    if (key === 'aiEnabled' && value === true && !online) {
      onSettingsChange({ ...newSettings, aiEnabled: false });
    }
  };

  return (
    <div className="card-industrial p-4 md:p-6 animate-fade-in">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Configurações</h2>
            <p className="text-sm text-muted-foreground">OCR e IA</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status de conexão */}
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
        <div className="mt-6 space-y-6 animate-slide-up">
          {/* Campos de texto padrão */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultLocal" className="text-sm font-medium">
                Local da obra (opcional)
              </Label>
              <Input
                id="defaultLocal"
                placeholder="Ex: Rodovia BR-116 km 42"
                value={settings.defaultLocal}
                onChange={(e) => updateSetting('defaultLocal', e.target.value)}
                className="input-industrial"
              />
              <p className="text-xs text-muted-foreground">Se vazio, a IA tentará inferir</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultServico" className="text-sm font-medium">
                Serviço (opcional)
              </Label>
              <Input
                id="defaultServico"
                placeholder="Ex: Pavimentação"
                value={settings.defaultServico}
                onChange={(e) => updateSetting('defaultServico', e.target.value)}
                className="input-industrial"
              />
              <p className="text-xs text-muted-foreground">Se vazio, a IA classificará</p>
            </div>
          </div>

          {/* Switches */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="ocrEnabled"
                checked={settings.ocrEnabled}
                onCheckedChange={(checked) => updateSetting('ocrEnabled', checked)}
              />
              <Label htmlFor="ocrEnabled" className="text-sm font-medium cursor-pointer">
                Modo OCR
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="aiEnabled"
                checked={settings.aiEnabled && online}
                onCheckedChange={(checked) => updateSetting('aiEnabled', checked)}
                disabled={!online}
              />
              <Label 
                htmlFor="aiEnabled" 
                className={`text-sm font-medium cursor-pointer ${!online ? 'text-muted-foreground' : ''}`}
              >
                Modo IA {!online && '(requer internet)'}
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="liteMode"
                checked={settings.liteMode}
                onCheckedChange={(checked) => updateSetting('liteMode', checked)}
              />
              <Label htmlFor="liteMode" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent text-accent-foreground text-xs font-bold">
                  LITE
                </span>
                OCR Rápido + IA
              </Label>
            </div>
          </div>

          {/* Dica do modo lite */}
          {settings.liteMode && (
            <div className="text-xs text-muted-foreground bg-accent/30 rounded-lg px-3 py-2 border border-accent/50">
              💡 <strong>Modo Lite:</strong> OCR Engine 1 (mais rápido). 
              A IA compensa eventuais falhas de leitura.
            </div>
          )}

          {/* Configurações de OCR.space */}
          {settings.ocrEnabled && (
            <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
              <h3 className="text-sm font-semibold text-foreground">OCR.space API</h3>
              <p className="text-xs text-muted-foreground">
                Obtenha sua chave gratuita em <a href="https://ocr.space/ocrapi" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ocr.space/ocrapi</a> (25.000 req/mês grátis)
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="ocrApiKey" className="text-sm font-medium">
                  Chave da API OCR
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="ocrApiKey"
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="K1234567890..."
                      value={settings.ocrApiKey}
                      onChange={(e) => updateSetting('ocrApiKey', e.target.value)}
                      className="input-industrial pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button 
                    onClick={handleSaveSettings}
                    className="btn-industrial flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saved ? 'Salvo!' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Info da IA integrada */}
          {settings.aiEnabled && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">IA Integrada (Gemini Lite)</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Classificação automática usando Google Gemini. Não precisa de API key — já está configurado!
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
