interface ProgressBarProps {
  progress: number;
  label?: string;
  subLabel?: string;
}

export function ProgressBar({ progress, label, subLabel }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label || 'Processando...'}</span>
        <span className="text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
      {subLabel && (
        <p className="text-xs text-muted-foreground">{subLabel}</p>
      )}
    </div>
  );
}
