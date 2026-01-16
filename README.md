# 📸 Sistema de Classificação de Fotos para Obras

Sistema inteligente para organização, classificação e exportação de fotos de obras de construção civil, utilizando OCR e Inteligência Artificial para automação do processo.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades Principais](#funcionalidades-principais)
3. [Arquitetura do Sistema](#arquitetura-do-sistema)
4. [Fluxo de Trabalho](#fluxo-de-trabalho)
5. [Componentes](#componentes)
6. [Estrutura de Dados](#estrutura-de-dados)
7. [Integrações](#integrações)
8. [Estrutura de Pastas do Projeto](#estrutura-de-pastas-do-projeto)
9. [Tecnologias Utilizadas](#tecnologias-utilizadas)
10. [Edge Functions](#edge-functions)
11. [Configuração](#configuração)

---

## 🎯 Visão Geral

Este sistema foi desenvolvido para automatizar a classificação de fotografias de obras de construção civil. Ele permite:

- **Upload em massa** de fotos (individual ou pastas inteiras)
- **Reconhecimento automático** via OCR das legendas/textos nas imagens
- **Classificação por IA** baseada em nome do arquivo, pasta e texto extraído
- **Organização hierárquica** por: Frente > Disciplina > Serviço > Mês > Dia
- **Exportação estruturada** em ZIP com pastas organizadas

### Problema que Resolve

Em obras de construção, milhares de fotos são tiradas diariamente para documentação. Organizá-las manualmente é:
- Demorado (horas de trabalho)
- Propenso a erros
- Inconsistente entre diferentes operadores

Este sistema reduz esse processo de horas para minutos.

---

## ⚡ Funcionalidades Principais

### 1. Upload de Fotos
- **Drag & Drop**: Arraste arquivos ou pastas para a área de upload
- **Seleção múltipla**: Selecione vários arquivos de uma vez
- **Preservação de estrutura**: Mantém informação da pasta original
- **Formatos suportados**: JPG, JPEG, PNG, GIF, WebP, BMP

### 2. Modo TURBO (Processamento em Lote)
O modo principal de operação, com 3 etapas:

#### Etapa 1: OCR (Reconhecimento de Texto)
- Extrai texto visível nas imagens
- Identifica legendas, datas, informações técnicas
- Usa Google Vision API via Edge Function
- Processamento paralelo para velocidade

#### Etapa 2: Classificação por IA
- Analisa: nome do arquivo + pasta + texto OCR
- Classifica automaticamente:
  - **Frente**: LOCAL, GERAL, etc.
  - **Disciplina**: CIVIL, ELÉTRICA, HIDRÁULICA, etc.
  - **Serviço**: FUNDAÇÃO, ALVENARIA, PINTURA, etc.
- Indica nível de confiança (alta/média/baixa)

#### Etapa 3: Verificação
- Lista fotos não reconhecidas ou com baixa confiança
- Permite visualização expandida (lightbox)
- Zoom e rotação para análise de legendas
- Navegação entre fotos pendentes
- Marcação como verificada

### 3. Classificação Manual
Para fotos que precisam de ajuste:
- **AutoComplete**: Sugestões baseadas em termos de construção
- **Edição em lote**: Selecione múltiplas fotos e aplique mesma classificação
- **Quick Classify**: Classificação rápida com 1 clique em categorias predefinidas

### 4. Visualização
- **Grid de Cards**: Visualização em miniatura com informações
- **Lightbox**: Visualização ampliada com:
  - Zoom (scroll do mouse)
  - Rotação (90°)
  - Texto OCR extraído
  - Navegação entre fotos
- **Árvore de Pastas**: Visualização hierárquica da estrutura final

### 5. Exportação
- **Pré-verificação**: Valida se todas as fotos têm dados completos
- **Correção automática**: Preenche datas faltantes usando metadados do arquivo
- **Estrutura de pastas**:
  ```
  FRENTE/
  └── DISCIPLINA/
      └── SERVIÇO/
          └── AAAA-MM/
              └── DD/
                  └── foto.jpg
  ```
- **Download em ZIP**: Arquivo compactado pronto para uso

### 6. Configurações
- Ativar/desativar OCR automático
- Ativar/desativar classificação por IA
- Configurar comportamento de processamento

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ PhotoUploader│  │ TurboProcess │  │ ExportPreview│          │
│  │              │  │    Panel     │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Estado Global (Index.tsx)                   │   │
│  │  - photos: PhotoData[]                                   │   │
│  │  - selectedPhotos: string[]                              │   │
│  │  - config: { ocrEnabled, aiClassifyEnabled }             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTIONS (Supabase)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │   ocr-vision     │  │ classify-photo   │  │ classify-batch│ │
│  │                  │  │                  │  │               │ │
│  │ Google Vision API│  │ Lovable AI (1x1) │  │ Lovable AI    │ │
│  │ para OCR         │  │ para classific.  │  │ (lote)        │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVIÇOS EXTERNOS                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Google Cloud     │  │ Lovable AI       │                    │
│  │ Vision API       │  │ Gateway          │                    │
│  │ (OCR)            │  │ (Gemini/GPT)     │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Trabalho

### Fluxo Principal (Modo TURBO)

```
1. UPLOAD
   │
   ├─► Usuário arrasta fotos/pastas
   ├─► Sistema extrai: nome, pasta, data modificação
   └─► Fotos adicionadas ao estado com status "pending"

2. OCR (Etapa 1)
   │
   ├─► Para cada foto:
   │   ├─► Converte para Base64
   │   ├─► Envia para Edge Function ocr-vision
   │   ├─► Recebe texto extraído
   │   └─► Atualiza photo.ocrText
   └─► Atualiza contadores de progresso

3. CLASSIFICAÇÃO IA (Etapa 2)
   │
   ├─► Agrupa fotos em lotes (máx 10)
   ├─► Para cada lote:
   │   ├─► Envia para Edge Function classify-batch
   │   ├─► IA analisa: filename + folder + ocrText
   │   ├─► Retorna: frente, disciplina, servico, confidence
   │   └─► Atualiza cada photo com classificação
   └─► Propaga classificação por pasta (fotos na mesma pasta = mesma classificação)

4. VERIFICAÇÃO (Etapa 3)
   │
   ├─► Identifica fotos com:
   │   ├─► confidence < 0.5 (baixa confiança)
   │   ├─► Campos não reconhecidos (frente/disciplina/servico vazios)
   │   └─► Dados incompletos
   ├─► Exibe lista de verificação manual
   ├─► Usuário pode:
   │   ├─► Visualizar foto em lightbox
   │   ├─► Editar classificação
   │   └─► Marcar como verificada
   └─► Fotos verificadas saem da lista

5. EXPORTAÇÃO
   │
   ├─► Pré-verificação:
   │   ├─► Valida campos obrigatórios
   │   ├─► Corrige datas faltantes (usa lastModified)
   │   └─► Separa: prontas vs pendentes
   ├─► Gera estrutura de pastas
   ├─► Cria arquivo ZIP
   └─► Download automático
```

---

## 🧩 Componentes

### Páginas

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| **Index** | `src/pages/Index.tsx` | Página principal, gerencia estado global |
| **NotFound** | `src/pages/NotFound.tsx` | Página 404 |

### Componentes Principais

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| **Header** | `src/components/Header.tsx` | Cabeçalho com logo e navegação |
| **PhotoUploader** | `src/components/PhotoUploader.tsx` | Área de upload com drag & drop |
| **PhotoCard** | `src/components/PhotoCard.tsx` | Card individual de foto com preview e dados |
| **PhotoLightbox** | `src/components/PhotoLightbox.tsx` | Visualização ampliada com zoom/rotação |
| **TurboProcessPanel** | `src/components/TurboProcessPanel.tsx` | Painel do Modo TURBO (3 etapas) |
| **BatchEditPanel** | `src/components/BatchEditPanel.tsx` | Edição em lote de múltiplas fotos |
| **QuickClassifyPanel** | `src/components/QuickClassifyPanel.tsx` | Classificação rápida com botões |
| **ExportPreview** | `src/components/ExportPreview.tsx` | Preview e download da exportação |
| **FolderTreeView** | `src/components/FolderTreeView.tsx` | Visualização em árvore da estrutura |
| **ConfigPanel** | `src/components/ConfigPanel.tsx` | Configurações do sistema |
| **ActionButtons** | `src/components/ActionButtons.tsx` | Botões de ação (processar, exportar) |
| **ProgressBar** | `src/components/ProgressBar.tsx` | Barra de progresso das operações |
| **AutocompleteInput** | `src/components/AutocompleteInput.tsx` | Input com sugestões automáticas |

### Componentes UI (shadcn/ui)

Todos em `src/components/ui/`:
- Button, Card, Dialog, Sheet, Tabs
- Input, Select, Checkbox, Switch
- Badge, Progress, Skeleton
- Toast, Tooltip, Popover
- E outros...

---

## 📊 Estrutura de Dados

### PhotoData (Tipo Principal)

```typescript
interface PhotoData {
  // Identificação
  id: string;              // UUID único
  file: File;              // Arquivo original
  preview: string;         // Data URL para preview
  
  // Metadados do arquivo
  name: string;            // Nome do arquivo
  folderPath?: string;     // Caminho da pasta original
  lastModified?: Date;     // Data de modificação
  
  // Classificação
  frente: string;          // Ex: "LOCAL", "GERAL"
  disciplina: string;      // Ex: "CIVIL", "ELÉTRICA"
  servico: string;         // Ex: "FUNDAÇÃO", "ALVENARIA"
  
  // Data
  yearMonth: string;       // Formato: "AAAA-MM"
  dateIso: string;         // Formato: "AAAA-MM-DD"
  
  // OCR e IA
  ocrText?: string;        // Texto extraído por OCR
  aiProcessed?: boolean;   // Se foi processado por IA
  confidence?: number;     // Confiança da classificação (0-1)
  
  // Controle
  selected?: boolean;      // Se está selecionado
  status: 'pending' | 'processing' | 'classified' | 'error';
}
```

### Categorias de Classificação

```typescript
// Frentes de Obra
const FRENTES = [
  "LOCAL", "GERAL", "FACHADA", "COBERTURA", 
  "SUBSOLO", "ÁREA COMUM", "UNIDADE"
];

// Disciplinas
const DISCIPLINAS = [
  "CIVIL", "ESTRUTURA", "ELÉTRICA", "HIDRÁULICA",
  "CLIMATIZAÇÃO", "INCÊNDIO", "PAISAGISMO",
  "IMPERMEABILIZAÇÃO", "REVESTIMENTO", "ESQUADRIAS"
];

// Serviços (exemplos)
const SERVICOS = [
  "FUNDAÇÃO", "ALVENARIA", "REBOCO", "PINTURA",
  "PISO", "FORRO", "INSTALAÇÃO", "ACABAMENTO"
];
```

---

## 🔌 Integrações

### 1. OCR - Google Cloud Vision

**Edge Function**: `supabase/functions/ocr-vision/index.ts`

```typescript
// Entrada
{
  image: string  // Base64 da imagem
}

// Saída
{
  text: string,  // Texto extraído
  success: boolean
}
```

**Requer**: `GOOGLE_VISION_API_KEY` nas secrets

### 2. Classificação IA - Lovable AI Gateway

**Edge Functions**:
- `supabase/functions/classify-photo/index.ts` (individual)
- `supabase/functions/classify-batch/index.ts` (lote)

```typescript
// Entrada (batch)
{
  photos: [{
    id: string,
    filename: string,
    folderPath: string,
    ocrText: string,
    date: string
  }]
}

// Saída
{
  results: [{
    id: string,
    frente: string,
    disciplina: string,
    servico: string
  }]
}
```

**Usa**: Lovable AI Gateway (sem API key necessária)
**Modelo**: `google/gemini-2.5-flash`

---

## 📁 Estrutura de Pastas do Projeto

```
├── public/
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── manifest.json
│   └── robots.txt
│
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes shadcn/ui
│   │   ├── ActionButtons.tsx
│   │   ├── AutocompleteInput.tsx
│   │   ├── BatchEditPanel.tsx
│   │   ├── ConfigPanel.tsx
│   │   ├── ExportPreview.tsx
│   │   ├── FolderTreeView.tsx
│   │   ├── Header.tsx
│   │   ├── NavLink.tsx
│   │   ├── PhotoCard.tsx
│   │   ├── PhotoLightbox.tsx
│   │   ├── PhotoUploader.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── QuickClassifyPanel.tsx
│   │   └── TurboProcessPanel.tsx
│   │
│   ├── data/
│   │   └── constructionTerms.ts  # Termos de construção para autocomplete
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts    # Cliente Supabase
│   │       └── types.ts     # Tipos gerados
│   │
│   ├── lib/
│   │   └── utils.ts         # Utilitários (cn, etc)
│   │
│   ├── pages/
│   │   ├── Index.tsx        # Página principal
│   │   └── NotFound.tsx
│   │
│   ├── types/
│   │   └── photo.ts         # Tipos TypeScript
│   │
│   ├── utils/
│   │   ├── ai.ts            # Funções de IA
│   │   ├── export.ts        # Funções de exportação
│   │   ├── helpers.ts       # Funções auxiliares
│   │   └── ocr.ts           # Funções de OCR
│   │
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── supabase/
│   ├── functions/
│   │   ├── classify-batch/
│   │   │   └── index.ts
│   │   ├── classify-photo/
│   │   │   └── index.ts
│   │   └── ocr-vision/
│   │       └── index.ts
│   └── config.toml
│
├── .env
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 🛠️ Tecnologias Utilizadas

### Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.3 | Framework UI |
| TypeScript | - | Tipagem |
| Vite | - | Build tool |
| Tailwind CSS | - | Estilização |
| shadcn/ui | - | Componentes UI |
| Lucide React | 0.462 | Ícones |
| React Router | 6.30 | Roteamento |

### Utilitários
| Tecnologia | Uso |
|------------|-----|
| JSZip | Criação de arquivos ZIP |
| FileSaver | Download de arquivos |
| date-fns | Manipulação de datas |
| Sonner | Notificações toast |

### Backend (Lovable Cloud)
| Tecnologia | Uso |
|------------|-----|
| Supabase Edge Functions | Serverless backend |
| Lovable AI Gateway | Classificação IA |
| Google Cloud Vision | OCR |

---

## ⚙️ Edge Functions

### 1. ocr-vision

**Propósito**: Extrair texto de imagens usando Google Cloud Vision

**Endpoint**: `POST /functions/v1/ocr-vision`

**Payload**:
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Resposta**:
```json
{
  "text": "Texto extraído da imagem",
  "success": true
}
```

### 2. classify-photo

**Propósito**: Classificar uma única foto

**Endpoint**: `POST /functions/v1/classify-photo`

**Payload**:
```json
{
  "filename": "foto_fundacao_01.jpg",
  "folderPath": "OBRA_X/CIVIL",
  "ocrText": "Legenda: Fundação bloco A"
}
```

### 3. classify-batch

**Propósito**: Classificar múltiplas fotos em lote

**Endpoint**: `POST /functions/v1/classify-batch`

**Payload**:
```json
{
  "photos": [
    {
      "id": "uuid-1",
      "filename": "foto1.jpg",
      "folderPath": "CIVIL",
      "ocrText": "Fundação",
      "date": "2024-01-15"
    }
  ]
}
```

**Resposta**:
```json
{
  "results": [
    {
      "id": "uuid-1",
      "frente": "LOCAL",
      "disciplina": "CIVIL",
      "servico": "FUNDAÇÃO"
    }
  ]
}
```

---

## 🔧 Configuração

### Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

### Secrets (Edge Functions)

| Secret | Obrigatório | Uso |
|--------|-------------|-----|
| `LOVABLE_API_KEY` | ✅ Auto | Lovable AI Gateway |
| `GOOGLE_VISION_API_KEY` | ⚠️ Para OCR | Google Cloud Vision |

### Configuração do Usuário

No painel de configurações:
- **OCR Automático**: Ativa/desativa extração de texto
- **Classificação IA**: Ativa/desativa classificação automática

---

## 📈 Métricas e Estatísticas

O sistema exibe em tempo real:

| Métrica | Descrição |
|---------|-----------|
| Total | Quantidade total de fotos |
| Prontas | Fotos completamente classificadas com data |
| Classificadas | Fotos com frente/disciplina/serviço |
| Pendentes | Fotos aguardando classificação |
| Com OCR | Fotos com texto extraído |
| Sem Data | Fotos sem informação de data |

---

## 🚀 Melhorias Futuras Sugeridas

1. **Extração de EXIF**: Ler data/hora direto dos metadados da imagem
2. **Cache de classificações**: Reutilizar classificações para fotos similares
3. **Templates de projeto**: Configurações pré-definidas por tipo de obra
4. **Relatório de processamento**: Exportar log do que foi classificado
5. **Integração com storage**: Salvar fotos na nuvem
6. **Múltiplos usuários**: Sistema de login e projetos por usuário
7. **API externa**: Endpoint para receber fotos de outros sistemas
8. **Preview de exportação**: Visualizar estrutura antes de baixar

---

## 📞 Suporte

Para dúvidas ou problemas:
- Documentação Lovable: https://docs.lovable.dev
- Comunidade Discord: https://discord.gg/lovable

---

*Desenvolvido com ❤️ usando Lovable*
