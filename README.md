# 📸 Sistema de Classificação de Fotos para Obras

Sistema inteligente para organização, classificação e exportação de fotos de obras de construção civil, utilizando Multi-OCR (4 engines) e Inteligência Artificial para automação do processo.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades Principais](#funcionalidades-principais)
3. [Arquitetura do Sistema](#arquitetura-do-sistema)
4. [Fluxo de Trabalho](#fluxo-de-trabalho)
5. [Componentes](#componentes)
6. [Estrutura de Dados](#estrutura-de-dados)
7. [Categorias Completas](#categorias-completas)
8. [Integrações](#integrações)
9. [Edge Functions](#edge-functions)
10. [Estrutura de Pastas do Projeto](#estrutura-de-pastas-do-projeto)
11. [Tecnologias Utilizadas](#tecnologias-utilizadas)
12. [Configuração](#configuração)

---

## 🎯 Visão Geral

Este sistema foi desenvolvido para automatizar a classificação de fotografias de obras de construção civil. Ele permite:

- **Upload em massa** de fotos (individual ou pastas inteiras)
- **Reconhecimento automático** via Multi-OCR (4 engines paralelos)
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

#### Etapa 1: OCR Multi-Engine (Reconhecimento de Texto)
- **4 engines paralelos** para máxima precisão:
  - 🔵 **Gemini Vision** (Google Gemini 2.5 Flash)
  - 🟠 **Groq Vision** (Llama 3.2 90B Vision)
  - 🟢 **Google Vision** (Google Cloud Vision API)
  - 🔴 **Azure Vision** (Microsoft Azure Computer Vision)
- Combina resultados por votação/consenso
- Identifica legendas, datas, informações técnicas
- Processamento paralelo para velocidade

#### Etapa 2: Classificação por IA
- Analisa: nome do arquivo + pasta + texto OCR
- Classifica automaticamente:
  - **Frente**: LOCAL, GERAL, FREE_FLOW, BSO, etc.
  - **Disciplina**: CIVIL, ELÉTRICA, HIDRÁULICA, PAVIMENTAÇÃO, etc.
  - **Serviço**: FUNDAÇÃO, ALVENARIA, PINTURA, CONCRETAGEM, etc.
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
          └── MM_MES_AAAA/
              └── DD_MM/
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
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ ocr-multi  │  │ ocr-groq   │  │ocr-vision  │  │ classify  │ │
│  │ (4 engines)│  │ (Llama)    │  │(Google)    │  │ -batch    │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVIÇOS EXTERNOS                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ Gemini     │  │ Groq       │  │ Google     │  │ Azure     │ │
│  │ Vision     │  │ Llama 3.2  │  │ Cloud      │  │ Computer  │ │
│  │ (Lovable)  │  │ Vision     │  │ Vision     │  │ Vision    │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Lovable AI Gateway (Classificação)           │  │
│  │              google/gemini-2.5-flash                      │  │
│  └──────────────────────────────────────────────────────────┘  │
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

2. OCR MULTI-ENGINE (Etapa 1)
   │
   ├─► Para cada foto:
   │   ├─► Converte para Base64
   │   ├─► Envia para Edge Function ocr-multi
   │   ├─► 4 engines processam em paralelo:
   │   │   ├─► Gemini Vision (via Lovable AI)
   │   │   ├─► Groq Llama 3.2 Vision
   │   │   ├─► Google Cloud Vision
   │   │   └─► Azure Computer Vision
   │   ├─► Combina resultados por votação/consenso
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
  filename: string;        // Nome do arquivo
  
  // Metadados do arquivo
  folderPath?: string;     // Caminho da pasta original
  lastModified?: number;   // Timestamp de modificação
  
  // Classificação
  frente: string | null;      // Ex: "FREE_FLOW_P01", "BSO_NORTE"
  disciplina: string | null;  // Ex: "PAVIMENTACAO", "DRENAGEM"
  servico: string | null;     // Ex: "CONCRETAGEM", "PINTURA_FAIXA"
  
  // Data
  yearMonth: string | null;   // Formato: "AAAA-MM"
  dateIso: string | null;     // Formato: "AAAA-MM-DD"
  day: string | null;         // Formato: "DD"
  hora: string | null;        // Formato: "HH:MM"
  
  // Localização
  latitude: number | null;
  longitude: number | null;
  
  // OCR e IA
  ocrText?: string;           // Texto extraído por OCR
  ocrEngine?: string;         // Engine que extraiu (gemini, groq, google, azure)
  aiConfidence?: number;      // Confiança da classificação (0-1)
  
  // Alertas e Status
  alertas: string[];          // Lista de alertas/avisos
  status: 'pending' | 'processing' | 'OK' | 'Pendente' | 'error';
}
```

---

## 📂 Categorias Completas

### 📍 FRENTES DE OBRA (96 itens)

Locais físicos onde o trabalho é realizado.

```typescript
// ═══════════════════════════════════════════════════════════════
// FREE FLOW / PRAÇAS DE PEDÁGIO (29 itens)
// ═══════════════════════════════════════════════════════════════
'FREE_FLOW_P01', 'FREE_FLOW_P02', 'FREE_FLOW_P03', 'FREE_FLOW_P04', 'FREE_FLOW_P05',
'FREE_FLOW_P06', 'FREE_FLOW_P07', 'FREE_FLOW_P08', 'FREE_FLOW_P09', 'FREE_FLOW_P10',
'FREE_FLOW_P11', 'FREE_FLOW_P12', 'FREE_FLOW_P13', 'FREE_FLOW_P14', 'FREE_FLOW_P15',
'FREE_FLOW_P16', 'FREE_FLOW_P17', 'FREE_FLOW_P18', 'FREE_FLOW_P19', 'FREE_FLOW_P20',
'FREE_FLOW_P21', 'FREE_FLOW_P22', 'FREE_FLOW_P23', 'FREE_FLOW_P24', 'FREE_FLOW_P25',
'FREE_FLOW_NORTE', 'FREE_FLOW_SUL', 'FREE_FLOW_LESTE', 'FREE_FLOW_OESTE',

// ═══════════════════════════════════════════════════════════════
// BSO - BASE DE SERVIÇO OPERACIONAL (13 itens)
// ═══════════════════════════════════════════════════════════════
'BSO_01', 'BSO_02', 'BSO_03', 'BSO_04', 'BSO_05', 'BSO_06', 'BSO_07', 'BSO_08',
'BSO_NORTE', 'BSO_SUL', 'BSO_LESTE', 'BSO_OESTE', 'BSO_CENTRAL',

// ═══════════════════════════════════════════════════════════════
// PRAÇAS DE PEDÁGIO (8 itens)
// ═══════════════════════════════════════════════════════════════
'PRACA_01', 'PRACA_02', 'PRACA_03', 'PRACA_04', 'PRACA_05',
'PRACA_PEDAGIO_NORTE', 'PRACA_PEDAGIO_SUL', 'PRACA_PEDAGIO_CENTRAL',

// ═══════════════════════════════════════════════════════════════
// TRECHOS RODOVIÁRIOS / QUILOMETRAGEM (15 itens)
// ═══════════════════════════════════════════════════════════════
'TRECHO_01', 'TRECHO_02', 'TRECHO_03', 'TRECHO_04', 'TRECHO_05',
'KM_000_010', 'KM_010_020', 'KM_020_030', 'KM_030_040', 'KM_040_050',
'KM_050_060', 'KM_060_070', 'KM_070_080', 'KM_080_090', 'KM_090_100',

// ═══════════════════════════════════════════════════════════════
// LOTES DE OBRA (10 itens)
// ═══════════════════════════════════════════════════════════════
'LOTE_01', 'LOTE_02', 'LOTE_03', 'LOTE_04', 'LOTE_05',
'LOTE_A', 'LOTE_B', 'LOTE_C', 'LOTE_D', 'LOTE_E',

// ═══════════════════════════════════════════════════════════════
// CANTEIROS (6 itens)
// ═══════════════════════════════════════════════════════════════
'CANTEIRO_OBRAS', 'CANTEIRO_CENTRAL', 'CANTEIRO_APOIO',
'CANTEIRO_01', 'CANTEIRO_02', 'CANTEIRO_03',

// ═══════════════════════════════════════════════════════════════
// ÁREAS ESPECÍFICAS (12 itens)
// ═══════════════════════════════════════════════════════════════
'AREA_APOIO', 'AREA_ADMINISTRATIVA', 'AREA_TECNICA', 'AREA_OPERACIONAL',
'JAZIDA_01', 'JAZIDA_02', 'BOTA_FORA_01', 'BOTA_FORA_02',
'EMPRESTIMO_01', 'EMPRESTIMO_02', 'USINA_ASFALTO', 'BRITADOR',

// ═══════════════════════════════════════════════════════════════
// PONTOS DE REFERÊNCIA / OBRAS DE ARTE (12 itens)
// ═══════════════════════════════════════════════════════════════
'PONTE_01', 'PONTE_02', 'VIADUTO_01', 'VIADUTO_02',
'PASSARELA_01', 'PASSARELA_02', 'TUNEL_01', 'TUNEL_02',
'INTERSECAO_01', 'INTERSECAO_02', 'RETORNO_01', 'RETORNO_02',

// ═══════════════════════════════════════════════════════════════
// EDIFICAÇÕES (8 itens)
// ═══════════════════════════════════════════════════════════════
'EDIFICIO_ADMIN', 'EDIFICIO_OPERACIONAL', 'GUARITA', 'PORTARIA',
'ALMOXARIFADO', 'OFICINA', 'REFEITORIO', 'VESTIARIO',

// ═══════════════════════════════════════════════════════════════
// ESTACAS - MARCOS DE LOCALIZAÇÃO (22 itens)
// ═══════════════════════════════════════════════════════════════
'ESTACA_0', 'ESTACA_10', 'ESTACA_20', 'ESTACA_30', 'ESTACA_40', 'ESTACA_50',
'ESTACA_60', 'ESTACA_70', 'ESTACA_80', 'ESTACA_90', 'ESTACA_100',
'ESTACA_110', 'ESTACA_120', 'ESTACA_130', 'ESTACA_140', 'ESTACA_150',
'ESTACA_200', 'ESTACA_250', 'ESTACA_300', 'ESTACA_350', 'ESTACA_400',

// ═══════════════════════════════════════════════════════════════
// FAIXAS E SENTIDOS (10 itens)
// ═══════════════════════════════════════════════════════════════
'FAIXA_1', 'FAIXA_2', 'FAIXA_3', 'FAIXA_ACOSTAMENTO',
'PISTA_NORTE', 'PISTA_SUL', 'PISTA_LESTE', 'PISTA_OESTE',
'SENTIDO_CAPITAL', 'SENTIDO_INTERIOR',
```

**TOTAL FRENTES: 96 itens**

---

### 🔧 DISCIPLINAS (80 itens)

Áreas técnicas/especialidades do trabalho.

```typescript
// ═══════════════════════════════════════════════════════════════
// TERRAPLENAGEM E MOVIMENTAÇÃO DE TERRA (8 itens)
// ═══════════════════════════════════════════════════════════════
'TERRAPLANAGEM', 'MOVIMENTACAO_TERRA', 'ESCAVACAO', 'ATERRO',
'CORTE', 'COMPACTACAO', 'REGULARIZACAO', 'SUBLEITO',

// ═══════════════════════════════════════════════════════════════
// PAVIMENTAÇÃO (17 itens)
// ═══════════════════════════════════════════════════════════════
'PAVIMENTACAO', 'PAVIMENTO_ASFALTICO', 'PAVIMENTO_CONCRETO',
'FRESAGEM', 'RECAPEAMENTO', 'REMENDO', 'TAPA_BURACO',
'BASE', 'SUB_BASE', 'REFORCO_SUBLEITO', 'IMPRIMACAO',
'CBUQ', 'PMF', 'TSS', 'TSD', 'LAMA_ASFALTICA',

// ═══════════════════════════════════════════════════════════════
// DRENAGEM (12 itens)
// ═══════════════════════════════════════════════════════════════
'DRENAGEM', 'DRENAGEM_SUPERFICIAL', 'DRENAGEM_PROFUNDA',
'BUEIRO', 'SARJETA', 'VALETA', 'MEIO_FIO', 'CANALETA',
'BOCA_LOBO', 'POCO_VISITA', 'DESCIDA_AGUA', 'DISSIPADOR',

// ═══════════════════════════════════════════════════════════════
// OBRAS DE ARTE (10 itens)
// ═══════════════════════════════════════════════════════════════
'OBRAS_ARTE_CORRENTES', 'OBRAS_ARTE_ESPECIAIS',
'PONTE', 'VIADUTO', 'PASSARELA', 'TUNEL', 'GALERIA',
'CONTENÇÃO', 'MURO_ARRIMO', 'CORTINA_ATIRANTADA',

// ═══════════════════════════════════════════════════════════════
// SINALIZAÇÃO (13 itens)
// ═══════════════════════════════════════════════════════════════
'SINALIZACAO', 'SINALIZACAO_HORIZONTAL', 'SINALIZACAO_VERTICAL',
'PINTURA_FAIXA', 'DEMARCACAO', 'TACHAS_REFLETIVAS',
'PLACAS', 'PORTICO', 'SEMAFORO', 'BALIZADOR',
'DEFENSA_METALICA', 'NEW_JERSEY', 'GUARD_RAIL',

// ═══════════════════════════════════════════════════════════════
// SEGURANÇA (7 itens)
// ═══════════════════════════════════════════════════════════════
'SEGURANCA', 'SEGURANCA_TRABALHO', 'EPI', 'EPC',
'ISOLAMENTO', 'SINALIZACAO_OBRA', 'DESVIO_TRAFEGO',

// ═══════════════════════════════════════════════════════════════
// INSTALAÇÕES ELÉTRICAS E HIDROSSANITÁRIAS (10 itens)
// ═══════════════════════════════════════════════════════════════
'INSTALACOES_ELETRICAS', 'INSTALACOES_HIDROSANITARIAS',
'ILUMINACAO', 'REDE_ELETRICA', 'SUBESTACAO', 'POSTE',
'ABASTECIMENTO_AGUA', 'ESGOTO', 'FOSSA', 'CAIXA_GORDURA',

// ═══════════════════════════════════════════════════════════════
// ESTRUTURA (14 itens)
// ═══════════════════════════════════════════════════════════════
'ESTRUTURA', 'ESTRUTURA_METALICA', 'ESTRUTURA_CONCRETO',
'FUNDACAO', 'ESTACA', 'SAPATA', 'BLOCO', 'BALDRAME',
'VIGA', 'PILAR', 'LAJE', 'ARMADURA', 'FORMA', 'CONCRETAGEM',

// ═══════════════════════════════════════════════════════════════
// ACABAMENTO (16 itens)
// ═══════════════════════════════════════════════════════════════
'ACABAMENTO', 'ACABAMENTO_INTERNO', 'ACABAMENTO_EXTERNO',
'ALVENARIA', 'CHAPISCO', 'EMBOCO', 'REBOCO', 'MASSA_CORRIDA',
'PINTURA', 'PINTURA_INTERNA', 'PINTURA_EXTERNA', 'TEXTURA',
'REVESTIMENTO', 'PISO', 'AZULEJO', 'PORCELANATO', 'CERAMICA',

// ═══════════════════════════════════════════════════════════════
// COBERTURA (8 itens)
// ═══════════════════════════════════════════════════════════════
'COBERTURA', 'TELHADO', 'ESTRUTURA_TELHADO', 'TELHA',
'CALHA', 'RUFO', 'CUMEEIRA', 'IMPERMEABILIZACAO_LAJE',

// ═══════════════════════════════════════════════════════════════
// ESQUADRIAS (9 itens)
// ═══════════════════════════════════════════════════════════════
'ESQUADRIAS', 'PORTAS', 'JANELAS', 'VIDROS', 'FERRAGENS',
'GRADIL', 'PORTAO', 'CERCA', 'ALAMBRADO',

// ═══════════════════════════════════════════════════════════════
// PAISAGISMO (8 itens)
// ═══════════════════════════════════════════════════════════════
'PAISAGISMO', 'JARDINAGEM', 'GRAMADO', 'PLANTIO',
'ARBORIZAÇÃO', 'IRRIGACAO', 'ROCADA', 'CAPINA',

// ═══════════════════════════════════════════════════════════════
// DEMOLIÇÃO E LIMPEZA (7 itens)
// ═══════════════════════════════════════════════════════════════
'DEMOLICAO', 'REMOCAO', 'LIMPEZA', 'DESTOCA',
'BOTA_FORA', 'TRANSPORTE', 'CARGA_DESCARGA',

// ═══════════════════════════════════════════════════════════════
// SERVIÇOS PRELIMINARES (9 itens)
// ═══════════════════════════════════════════════════════════════
'SERVICOS_PRELIMINARES', 'MOBILIZACAO', 'DESMOBILIZACAO',
'INSTALACOES_PROVISORIAS', 'LOCACAO_OBRA', 'TOPOGRAFIA',
'SONDAGEM', 'CANTEIRO', 'PLACA_OBRA',

// ═══════════════════════════════════════════════════════════════
// MEIO AMBIENTE (6 itens)
// ═══════════════════════════════════════════════════════════════
'MEIO_AMBIENTE', 'CONTROLE_AMBIENTAL', 'EROSAO',
'RECUPERACAO_AMBIENTAL', 'APP', 'COMPENSACAO_AMBIENTAL',

// ═══════════════════════════════════════════════════════════════
// MANUTENÇÃO (6 itens)
// ═══════════════════════════════════════════════════════════════
'MANUTENCAO', 'MANUTENCAO_PREVENTIVA', 'MANUTENCAO_CORRETIVA',
'CONSERVACAO', 'LIMPEZA_FAIXA', 'ROCADA_MECANIZADA',

// ═══════════════════════════════════════════════════════════════
// ADMINISTRATIVO (7 itens)
// ═══════════════════════════════════════════════════════════════
'MEDICAO', 'FISCALIZACAO', 'ADMINISTRACAO', 'QUALIDADE',
'DOCUMENTACAO', 'CONTROLE_TECNOLOGICO', 'ENSAIO',
```

**TOTAL DISCIPLINAS: 80 itens**

---

### ⚙️ SERVIÇOS (193 itens)

Atividades específicas executadas na obra.

```typescript
// ═══════════════════════════════════════════════════════════════
// 🟦 TERRAPLENAGEM (13 itens)
// ═══════════════════════════════════════════════════════════════
'LIMPEZA_DE_TERRENO', 'ROÇADA_MANUAL', 'ROÇADA_MECANIZADA', 'DESTOCAMENTO',
'ESCAVAÇÃO_MANUAL', 'ESCAVAÇÃO_MECANIZADA', 'CARGA_DE_MATERIAL',
'TRANSPORTE_DE_MATERIAL', 'BOTA_FORA', 'ATERRO', 'REATERRO',
'COMPACTAÇÃO_DE_SOLO', 'REGULARIZAÇÃO_DO_SUBLEITO',

// ═══════════════════════════════════════════════════════════════
// 🟦 DRENAGEM (14 itens)
// ═══════════════════════════════════════════════════════════════
'ESCAVAÇÃO_DE_VALAS', 'ASSENTAMENTO_DE_TUBOS', 'TUBULAÇÃO_DE_CONCRETO',
'TUBULAÇÃO_DE_PVC', 'CAIXA_DE_PASSAGEM', 'POÇO_DE_VISITA', 'BUEIRO_CELULAR',
'BUEIRO_TUBULAR', 'SARJETA', 'SARJETÃO', 'CANALETA', 'DRENO_LONGITUDINAL',
'DRENO_TRANSVERSAL', 'LIMPEZA_DE_DRENAGEM',

// ═══════════════════════════════════════════════════════════════
// 🟦 PAVIMENTAÇÃO (14 itens)
// ═══════════════════════════════════════════════════════════════
'IMPRIMAÇÃO', 'PINTURA_DE_LIGAÇÃO', 'BASE_GRANULAR', 'SUB_BASE', 'BGS',
'BRITA_CORRIDA', 'SOLO_CIMENTO', 'EXECUÇÃO_DE_CBUQ', 'EXECUÇÃO_DE_CAUC',
'MICROREVESTIMENTO', 'TRATAMENTO_SUPERFICIAL', 'FRESAGEM', 'RECAPAGEM',
'SELAGEM_DE_TRINCAS',

// ═══════════════════════════════════════════════════════════════
// 🟦 GUIAS, SARJETAS E CALÇADAS (8 itens)
// ═══════════════════════════════════════════════════════════════
'EXECUÇÃO_DE_GUIA', 'EXECUÇÃO_DE_SARJETA', 'EXECUÇÃO_DE_MEIA_GUIA',
'REBAIXO_DE_GUIA', 'RECOMPOSIÇÃO_DE_CALÇADA', 'PISO_INTERTRAVADO',
'PISO_DE_CONCRETO', 'CALÇADA_ACESSÍVEL',

// ═══════════════════════════════════════════════════════════════
// 🟦 SINALIZAÇÃO VIÁRIA (10 itens)
// ═══════════════════════════════════════════════════════════════
'SINALIZAÇÃO_HORIZONTAL', 'PINTURA_DE_FAIXAS', 'PINTURA_DE_EIXO', 'TACHÃO',
'TARTARUGA', 'PLACA_DE_SINALIZAÇÃO', 'IMPLANTAÇÃO_DE_PLACAS',
'DEFENSA_METÁLICA', 'BALIZADOR', 'CONES_E_SINALIZAÇÃO_TEMPORÁRIA',

// ═══════════════════════════════════════════════════════════════
// 🟦 OBRAS DE ARTE CORRENTES (6 itens)
// ═══════════════════════════════════════════════════════════════
'BOCA_DE_LOBO', 'CAIXA_COLETORA', 'DESCIDA_DAGUA', 'ESCADA_HIDRÁULICA',
'MURO_DE_CONTENÇÃO', 'GABIÃO',

// ═══════════════════════════════════════════════════════════════
// 🟨 SERVIÇOS PRELIMINARES - CONSTRUÇÃO CIVIL (6 itens)
// ═══════════════════════════════════════════════════════════════
'CANTEIRO_DE_OBRAS', 'TAPUME', 'LOCAÇÃO_DE_OBRA', 'LIMPEZA_INICIAL',
'DEMOLIÇÃO', 'REMOÇÃO_DE_ENTULHO',

// ═══════════════════════════════════════════════════════════════
// 🟨 FUNDAÇÃO (16 itens)
// ═══════════════════════════════════════════════════════════════
'ESCAVAÇÃO_DE_FUNDAÇÃO', 'SAPATA', 'BLOCO_DE_FUNDAÇÃO', 'ESTACA_ESCAVADA',
'ESTACA_HELICE_CONTINUA', 'ESTACA_RAIZ', 'RADIER',
'ESTACA_BROCA', 'ESTACA_PRE_MOLDADA', 'TUBULAO', 'SAPATA_CORRIDA',
'SAPATA_ISOLADA', 'BLOCO_FUNDACAO', 'BALDRAME', 'VIGA_BALDRAME',
'LASTRO_CONCRETO',

// ═══════════════════════════════════════════════════════════════
// 🟨 ESTRUTURA DE CONCRETO (19 itens)
// ═══════════════════════════════════════════════════════════════
'ARMAÇÃO_DE_AÇO', 'FÔRMAS', 'CONCRETAGEM', 'VIBRAÇÃO_DE_CONCRETO',
'CURA_DO_CONCRETO', 'DESFORMA',
'FORMA_MADEIRA', 'FORMA_METALICA', 'ESCORAMENTO', 'ARMACAO_ACO',
'LANCAMENTO_CONCRETO', 'CURA_CONCRETO', 'ACABAMENTO_CONCRETO',
'PILAR_CONCRETO', 'VIGA_CONCRETO', 'LAJE_MACICA', 'LAJE_NERVURADA',
'LAJE_PRE_MOLDADA', 'PROTENSAO',

// ═══════════════════════════════════════════════════════════════
// 🟨 ALVENARIA (12 itens)
// ═══════════════════════════════════════════════════════════════
'ALVENARIA_ESTRUTURAL', 'ALVENARIA_DE_VEDAÇÃO', 'LEVANTAMENTO_DE_PAREDES',
'VERGAS_E_CONTRAVERGAS',
'ALVENARIA_VEDACAO', 'ALVENARIA_TIJOLO', 'ALVENARIA_BLOCO_CONCRETO',
'ALVENARIA_BLOCO_CERAMICO', 'VERGA', 'CONTRAVERGA', 'CINTA_AMARRACAO',
'ENCUNHAMENTO',

// ═══════════════════════════════════════════════════════════════
// 🟨 COBERTURA (16 itens)
// ═══════════════════════════════════════════════════════════════
'ESTRUTURA_DE_TELHADO', 'TELHAMENTO', 'CALHAS', 'RUFOS',
'ESTRUTURA_MADEIRA_TELHADO', 'ESTRUTURA_METALICA_TELHADO', 'TELHA_CERAMICA',
'TELHA_CONCRETO', 'TELHA_FIBROCIMENTO', 'TELHA_METALICA', 'TELHA_TERMOACUSTICA',
'CALHA_BEIRAL', 'RUFO_METALICO', 'CUMEEIRA', 'IMPERMEABILIZACAO_MANTA',
'IMPERMEABILIZACAO_LIQUIDA',

// ═══════════════════════════════════════════════════════════════
// 🟨 REVESTIMENTOS (18 itens)
// ═══════════════════════════════════════════════════════════════
'CHAPISCO', 'EMBOÇO', 'REBOCO', 'REVESTIMENTO_CERÂMICO', 'PORCELANATO',
'ARGAMASSA_COLANTE',
'CHAPISCO_ROLADO', 'CHAPISCO_DESEMPENADO', 'EMBOCO', 'MASSA_UNICA',
'GESSO_LISO', 'GESSO_PROJETADO', 'ASSENTAMENTO_CERAMICA',
'ASSENTAMENTO_PORCELANATO', 'ASSENTAMENTO_AZULEJO', 'REJUNTAMENTO',
'CIMENTADO_LISO', 'CIMENTADO_DESEMPENADO',

// ═══════════════════════════════════════════════════════════════
// 🟨 PISOS (4 itens)
// ═══════════════════════════════════════════════════════════════
'CONTRAPISO', 'PISO_CERÂMICO', 'PISO_INDUSTRIAL', 'PISO_POLIDO',

// ═══════════════════════════════════════════════════════════════
// 🟨 PINTURA E ACABAMENTO (15 itens)
// ═══════════════════════════════════════════════════════════════
'MASSA_CORRIDA', 'MASSA_ACRÍLICA', 'PINTURA_INTERNA', 'PINTURA_EXTERNA',
'TEXTURA', 'VERNIZ',
'PINTURA_LATEX_PVA', 'PINTURA_LATEX_ACRILICA', 'PINTURA_ESMALTE',
'PINTURA_EPOXI', 'PINTURA_TEXTURA', 'FUNDO_PREPARADOR', 'SELADOR',
'STAIN', 'HIDROFUGANTE',

// ═══════════════════════════════════════════════════════════════
// 🟥 INFRAESTRUTURA ELÉTRICA (4 itens)
// ═══════════════════════════════════════════════════════════════
'ABERTURA_DE_RASGOS', 'INSTALAÇÃO_DE_ELETRODUTOS', 'CAIXAS_DE_PASSAGEM',
'INFRA_DE_ILUMINAÇÃO',

// ═══════════════════════════════════════════════════════════════
// 🟥 INSTALAÇÃO ELÉTRICA (19 itens)
// ═══════════════════════════════════════════════════════════════
'PASSAGEM_DE_FIOS', 'INSTALAÇÃO_DE_QUADRO', 'DISJUNTOR', 'TOMADAS',
'INTERRUPTORES', 'ILUMINAÇÃO', 'ATERRAMENTO', 'SPDA',
'ELETRODUTO', 'FIACAO', 'QUADRO_DISTRIBUICAO', 'TOMADA', 'INTERRUPTOR',
'LUMINARIA', 'LAMPADA', 'PARA_RAIOS', 'POSTE_ILUMINACAO', 'BRACO_LUMINARIA',
'CABO_ELETRICO',

// ═══════════════════════════════════════════════════════════════
// 🟩 ÁGUA - HIDROSSANITÁRIO (4 itens)
// ═══════════════════════════════════════════════════════════════
'TUBULAÇÃO_DE_AGUA_FRIA', 'TUBULAÇÃO_DE_AGUA_QUENTE', 'CAIXA_DAGUA', 'BOMBAS',

// ═══════════════════════════════════════════════════════════════
// 🟩 ESGOTO (19 itens)
// ═══════════════════════════════════════════════════════════════
'TUBULAÇÃO_DE_ESGOTO', 'CAIXA_DE_GORDURA', 'CAIXA_DE_INSPEÇÃO', 'FOSSA',
'SUMIDOURO',
'TUBULACAO_AGUA_FRIA', 'TUBULACAO_AGUA_QUENTE', 'TUBULACAO_ESGOTO',
'TUBULACAO_PLUVIAL', 'CAIXA_INSPECAO', 'CAIXA_GORDURA', 'FOSSA_SEPTICA',
'REGISTRO', 'VALVULA', 'TORNEIRA', 'CHUVEIRO', 'VASO_SANITARIO', 'PIA', 'TANQUE',

// ═══════════════════════════════════════════════════════════════
// 🟪 URBANIZAÇÃO (4 itens)
// ═══════════════════════════════════════════════════════════════
'URBANIZAÇÃO_DE_VIAS', 'PRAÇAS', 'CICLOVIA', 'CICLOFAIXA',

// ═══════════════════════════════════════════════════════════════
// 🟪 PAISAGISMO (12 itens)
// ═══════════════════════════════════════════════════════════════
'PREPARO_DE_SOLO', 'PLANTIO_DE_GRAMA', 'PLANTIO_DE_ARVORES', 'JARDINAGEM',
'PLANTIO_GRAMA', 'PLANTIO_ARBUSTOS', 'PLANTIO_ARVORES', 'HIDROSSEMEADURA',
'ADUBACAO', 'PODA', 'IRRIGACAO_MANUAL', 'IRRIGACAO_AUTOMATICA',

// ═══════════════════════════════════════════════════════════════
// 🧹 SERVIÇOS COMPLEMENTARES (4 itens)
// ═══════════════════════════════════════════════════════════════
'LIMPEZA_FINAL', 'LIMPEZA_DE_OBRA', 'REMOÇÃO_DE_RESÍDUOS',
'ORGANIZAÇÃO_DO_CANTEIRO',

// ═══════════════════════════════════════════════════════════════
// PAVIMENTAÇÃO DETALHADA (19 itens)
// ═══════════════════════════════════════════════════════════════
'IMPRIMACAO_ASFALTICA', 'CBUQ_BINDER', 'CBUQ_ROLAMENTO', 'CBUQ_GAP_GRADED',
'PMF_PRE_MISTURADO_FRIO', 'TSS_TRATAMENTO_SIMPLES', 'TSD_TRATAMENTO_DUPLO',
'LAMA_ASFALTICA', 'MICRORREVESTIMENTO', 'FRESAGEM_ASFALTO',
'REMENDO_PROFUNDO', 'REMENDO_SUPERFICIAL', 'OPERACAO_TAPA_BURACO',
'SELAGEM_TRINCA', 'BRITA_GRADUADA', 'MACADAME_HIDRAULICO', 'SOLO_BRITA',
'RACHAO', 'PEDRA_ASSENTADA',

// ═══════════════════════════════════════════════════════════════
// DRENAGEM DETALHADA (16 itens)
// ═══════════════════════════════════════════════════════════════
'SARJETA_CONCRETO', 'MEIO_FIO_CONCRETO', 'CANALETA_CONCRETO',
'VALETA_PROTECAO', 'BOCA_BUEIRO', 'POCO_VISITA', 'CAIXA_COLETA',
'BOCA_LOBO', 'DRENO_PROFUNDO', 'DRENO_FRANCES', 'COLCHAO_DRENANTE',
'DESCIDA_AGUA', 'ESCADA_DISSIPADORA', 'BACIA_AMORTECIMENTO', 'RIP_RAP',
'ENROCAMENTO',

// ═══════════════════════════════════════════════════════════════
// SINALIZAÇÃO HORIZONTAL DETALHADA (10 itens)
// ═══════════════════════════════════════════════════════════════
'PINTURA_FAIXA', 'PINTURA_SETA', 'PINTURA_LEGENDA', 'PINTURA_ZEBRADO',
'LINHA_BORDA', 'LINHA_CENTRO', 'LINHA_CANALIZACAO', 'TACHAS_REFLETIVAS',
'TERMOPLASTICO', 'SINALIZACAO_PROVISORIA',

// ═══════════════════════════════════════════════════════════════
// SINALIZAÇÃO VERTICAL DETALHADA (11 itens)
// ═══════════════════════════════════════════════════════════════
'PLACA_REGULAMENTACAO', 'PLACA_ADVERTENCIA', 'PLACA_INDICATIVA',
'PLACA_ORIENTACAO', 'PLACA_EDUCATIVA', 'PLACA_SERVICOS', 'PORTICO',
'SEMI_PORTICO', 'BANDEIRA', 'SUPORTE_METALICO', 'POSTE_SINALIZACAO',

// ═══════════════════════════════════════════════════════════════
// DISPOSITIVOS DE SEGURANÇA (10 itens)
// ═══════════════════════════════════════════════════════════════
'NEW_JERSEY_CONCRETO', 'NEW_JERSEY_PLASTICO', 'GUARD_RAIL', 'BARREIRA_RIGIDA',
'CERCA_GUIA', 'TELA_PROTECAO', 'ATENUADOR_IMPACTO', 'TERMINAL_ANCORA',
'GRADIL_METALICO', 'ALAMBRADO',

// ═══════════════════════════════════════════════════════════════
// ESQUADRIAS DETALHADAS (12 itens)
// ═══════════════════════════════════════════════════════════════
'PORTA_MADEIRA', 'PORTA_METALICA', 'PORTA_ALUMINIO', 'PORTA_VIDRO',
'JANELA_ALUMINIO', 'JANELA_MADEIRA', 'JANELA_PVC', 'VIDRO_COMUM',
'VIDRO_TEMPERADO', 'FECHADURA', 'DOBRADICA', 'BATENTE',

// ═══════════════════════════════════════════════════════════════
// MANUTENÇÃO DETALHADA (10 itens)
// ═══════════════════════════════════════════════════════════════
'MANUTENCAO_PREVENTIVA', 'MANUTENCAO_CORRETIVA', 'INSPECAO_VISUAL',
'VISTORIA_TECNICA', 'LIMPEZA_DISPOSITIVO', 'DESOBSTRUCAO',
'PINTURA_MANUTENCAO', 'ROÇADA_MANUTENCAO', 'LIMPEZA_SARJETA', 'LIMPEZA_BUEIRO',

// ═══════════════════════════════════════════════════════════════
// SERVIÇOS TÉCNICOS (8 itens)
// ═══════════════════════════════════════════════════════════════
'LEVANTAMENTO_TOPOGRAFICO', 'LOCACAO_OBRA', 'SONDAGEM_SPT', 'SONDAGEM_ROTATIVA',
'ENSAIO_CAMPO', 'ENSAIO_LABORATORIO', 'CONTROLE_TECNOLOGICO', 'FISCALIZACAO',

// ═══════════════════════════════════════════════════════════════
// ADMINISTRATIVO E OUTROS (7 itens)
// ═══════════════════════════════════════════════════════════════
'MOBILIZACAO', 'DESMOBILIZACAO', 'INSTALACAO_CANTEIRO', 'ADMINISTRACAO_LOCAL',
'ELABORACAO_PROJETO', 'DOCUMENTACAO_TECNICA', 'REUNIAO_OBRA',

// ═══════════════════════════════════════════════════════════════
// LIMPEZA E PREPARAÇÃO (8 itens)
// ═══════════════════════════════════════════════════════════════
'LIMPEZA_TERRENO', 'CAPINA', 'ROCADA', 'DESTOCA', 'DESMATAMENTO',
'RASPAGEM', 'REGULARIZACAO_TERRENO', 'NIVELAMENTO',

// ═══════════════════════════════════════════════════════════════
// ESCAVAÇÃO E TERRAPLENAGEM (9 itens)
// ═══════════════════════════════════════════════════════════════
'ESCAVACAO_MANUAL', 'ESCAVACAO_MECANICA', 'ESCAVACAO_ROCHA',
'CORTE_SOLO', 'ATERRO_COMPACTADO', 'CARGA_MATERIAL', 'TRANSPORTE_MATERIAL',
'COMPACTACAO_SOLO', 'REGULARIZACAO_SUBLEITO',
```

**TOTAL SERVIÇOS: 193 itens**

---

## 📊 Resumo das Categorias

| Categoria | Quantidade | Descrição |
|-----------|------------|-----------|
| **Frentes de Obra** | 96 | Locais físicos de trabalho |
| **Disciplinas** | 80 | Áreas técnicas/especialidades |
| **Serviços** | 193 | Atividades executadas |
| **Total Único** | ~350 | Termos únicos (sem duplicatas) |

---

## 🔌 Integrações

### 1. Multi-OCR (4 Engines)

**Edge Function**: `supabase/functions/ocr-multi/index.ts`

| Engine | Tecnologia | Descrição |
|--------|------------|-----------|
| 🔵 Gemini | Lovable AI Gateway | Google Gemini 2.5 Flash Vision |
| 🟠 Groq | Groq API | Llama 3.2 90B Vision Preview |
| 🟢 Google | Google Cloud Vision API | OCR especializado |
| 🔴 Azure | Azure Computer Vision | Microsoft AI Vision |

**Funcionamento**:
- 4 engines processam em paralelo
- Resultados combinados por votação/consenso
- Melhor texto selecionado automaticamente

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
    servico: string,
    confidence: number
  }]
}
```

**Usa**: Lovable AI Gateway (sem API key necessária)
**Modelo**: `google/gemini-2.5-flash`

---

## ⚙️ Edge Functions

### 1. ocr-multi (Principal)

**Propósito**: Extrair texto usando 4 engines em paralelo

**Endpoint**: `POST /functions/v1/ocr-multi`

**Payload**:
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Resposta**:
```json
{
  "text": "Texto extraído combinado",
  "engine": "gemini",
  "allResults": {
    "gemini": "texto...",
    "groq": "texto...",
    "google": "texto...",
    "azure": "texto..."
  },
  "success": true
}
```

### 2. ocr-groq

**Propósito**: OCR via Groq Llama 3.2 Vision

**Endpoint**: `POST /functions/v1/ocr-groq`

**Requer**: `GROQ_API_KEY` nas secrets

### 3. ocr-vision

**Propósito**: OCR via Google Cloud Vision

**Endpoint**: `POST /functions/v1/ocr-vision`

**Requer**: `GOOGLE_VISION_API_KEY` nas secrets

### 4. classify-photo

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

### 5. classify-batch

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
      "servico": "FUNDAÇÃO",
      "confidence": 0.85
    }
  ]
}
```

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
│   │   ├── ui/                    # Componentes shadcn/ui
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
│   │   ├── aliases.ts             # Regras de alias para classificação
│   │   └── constructionTerms.ts   # Termos de construção para autocomplete
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Cliente Supabase
│   │       └── types.ts           # Tipos gerados
│   │
│   ├── lib/
│   │   └── utils.ts               # Utilitários (cn, etc)
│   │
│   ├── pages/
│   │   ├── Index.tsx              # Página principal
│   │   └── NotFound.tsx
│   │
│   ├── types/
│   │   └── photo.ts               # Tipos TypeScript
│   │
│   ├── utils/
│   │   ├── ai.ts                  # Funções de IA
│   │   ├── classification.ts      # Lógica de classificação
│   │   ├── export.ts              # Funções de exportação ZIP
│   │   ├── exportPath.ts          # Geração de caminhos
│   │   ├── frente.ts              # Extração de frente
│   │   ├── helpers.ts             # Funções auxiliares
│   │   ├── inference.ts           # Inferência de dados
│   │   └── ocr.ts                 # Funções de OCR
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
│   │   ├── ocr-groq/
│   │   │   └── index.ts
│   │   ├── ocr-multi/
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
| TypeScript | - | Tipagem estática |
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
| Lovable AI Gateway | Classificação IA + Gemini Vision OCR |
| Groq API | Llama 3.2 Vision OCR |
| Google Cloud Vision | OCR especializado |
| Azure Computer Vision | OCR Microsoft |

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
| `LOVABLE_API_KEY` | ✅ Auto | Lovable AI Gateway (Gemini) |
| `GROQ_API_KEY` | ✅ Para Groq | Groq Llama 3.2 Vision |
| `GOOGLE_VISION_API_KEY` | ⚠️ Opcional | Google Cloud Vision |
| `AZURE_VISION_KEY` | ⚠️ Opcional | Azure Computer Vision |
| `AZURE_VISION_ENDPOINT` | ⚠️ Opcional | Azure endpoint |

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

1. **Indicador visual de engines OCR**: Mostrar quais engines foram usados em cada foto
2. **Extração de EXIF**: Ler data/hora direto dos metadados da imagem
3. **Cache de classificações**: Reutilizar classificações para fotos similares
4. **Templates de projeto**: Configurações pré-definidas por tipo de obra
5. **Relatório de processamento**: Exportar log do que foi classificado
6. **Integração com storage**: Salvar fotos na nuvem
7. **Múltiplos usuários**: Sistema de login e projetos por usuário
8. **API externa**: Endpoint para receber fotos de outros sistemas
9. **Preview de exportação**: Visualizar estrutura antes de baixar

---

## 📞 Suporte

Para dúvidas ou problemas:
- Documentação Lovable: https://docs.lovable.dev
- Comunidade Discord: https://discord.gg/lovable

---

*Desenvolvido com ❤️ usando Lovable*
