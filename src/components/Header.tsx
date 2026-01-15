import { Construction, Wrench } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-primary py-6 px-4 shadow-industrial-lg">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent/20">
            <Construction className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground flex items-center gap-2">
              ObraDash Organizer
              <Wrench className="w-5 h-5 text-accent animate-pulse-subtle" />
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base mt-1">
              Organize fotos de obra com OCR e IA — Classifique, agrupe e exporte com facilidade
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
