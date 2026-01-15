import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  onSave,
  onCancel,
  suggestions,
  placeholder = 'Digite para buscar...',
  className,
}: AutocompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filtra sugestões baseado no valor atual
  const filterSuggestions = useCallback((input: string) => {
    if (!input || input.length < 1) {
      setFilteredSuggestions([]);
      return;
    }

    const normalizedInput = input
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '');

    const filtered = suggestions
      .filter(item => {
        const normalizedItem = item
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Z0-9_]/g, '');
        
        // Prioriza itens que começam com o input
        return normalizedItem.includes(normalizedInput);
      })
      .sort((a, b) => {
        const normalizedA = a.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normalizedB = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Itens que começam com o input vêm primeiro
        const aStarts = normalizedA.toUpperCase().startsWith(normalizedInput);
        const bStarts = normalizedB.toUpperCase().startsWith(normalizedInput);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 10);

    setFilteredSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    filterSuggestions(value);
  }, [value, filterSuggestions]);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
          onChange(filteredSuggestions[selectedIndex]);
          setShowSuggestions(false);
        } else {
          onSave();
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (showSuggestions) {
          setShowSuggestions(false);
        } else {
          onCancel();
        }
        break;
      case 'Tab':
        if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
          e.preventDefault();
          onChange(filteredSuggestions[selectedIndex]);
          setShowSuggestions(false);
        }
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative flex items-center gap-1", className)}>
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredSuggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className="h-8 text-sm"
          placeholder={placeholder}
          autoFocus
        />
        
        {/* Dropdown de sugestões */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <HighlightMatch text={suggestion} query={value} />
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button 
        onClick={onSave} 
        className="p-1 text-success hover:bg-success/10 rounded"
        title="Salvar"
      >
        <Check className="w-4 h-4" />
      </button>
      <button 
        onClick={onCancel} 
        className="p-1 text-destructive hover:bg-destructive/10 rounded"
        title="Cancelar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Componente para destacar a parte do texto que corresponde à busca
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;

  const normalizedQuery = query
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');

  const normalizedText = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const index = normalizedText.toUpperCase().indexOf(normalizedQuery);

  if (index === -1) return <span>{text}</span>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <span>
      {before}
      <span className="font-bold text-accent">{match}</span>
      {after}
    </span>
  );
}
