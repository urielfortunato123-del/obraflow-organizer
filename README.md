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

#### 📍 FRENTES DE OBRA (Locais de Trabalho)

```typescript
// Free Flow / Praças de Pedágio
'FREE_FLOW_P01', 'FREE_FLOW_P02', 'FREE_FLOW_P03', 'FREE_FLOW_P04', 'FREE_FLOW_P05',
'FREE_FLOW_P06', 'FREE_FLOW_P07', 'FREE_FLOW_P08', 'FREE_FLOW_P09', 'FREE_FLOW_P10',
'FREE_FLOW_P11', 'FREE_FLOW_P12', 'FREE_FLOW_P13', 'FREE_FLOW_P14', 'FREE_FLOW_P15',
'FREE_FLOW_NORTE', 'FREE_FLOW_SUL', 'FREE_FLOW_LESTE', 'FREE_FLOW_OESTE',

// BSO - Base de Serviço Operacional
'BSO_01', 'BSO_02', 'BSO_03', 'BSO_04', 'BSO_05', 'BSO_06', 'BSO_07', 'BSO_08',
'BSO_NORTE', 'BSO_SUL', 'BSO_LESTE', 'BSO_OESTE', 'BSO_CENTRAL',

// Praças de Pedágio
'PRACA_01', 'PRACA_02', 'PRACA_03', 'PRACA_04', 'PRACA_05',
'PRACA_PEDAGIO_NORTE', 'PRACA_PEDAGIO_SUL', 'PRACA_PEDAGIO_CENTRAL',

// Trechos Rodoviários / Quilometragem
'TRECHO_01', 'TRECHO_02', 'TRECHO_03', 'TRECHO_04', 'TRECHO_05',
'KM_000_010', 'KM_010_020', 'KM_020_030', 'KM_030_040', 'KM_040_050',
'KM_050_060', 'KM_060_070', 'KM_070_080', 'KM_080_090', 'KM_090_100',

// Lotes de Obra
'LOTE_01', 'LOTE_02', 'LOTE_03', 'LOTE_04', 'LOTE_05',
'LOTE_A', 'LOTE_B', 'LOTE_C', 'LOTE_D', 'LOTE_E',

// Canteiros
'CANTEIRO_OBRAS', 'CANTEIRO_CENTRAL', 'CANTEIRO_APOIO',
'CANTEIRO_01', 'CANTEIRO_02', 'CANTEIRO_03',

// Áreas específicas
'AREA_APOIO', 'AREA_ADMINISTRATIVA', 'AREA_TECNICA', 'AREA_OPERACIONAL',
'JAZIDA_01', 'JAZIDA_02', 'BOTA_FORA_01', 'BOTA_FORA_02',
'EMPRESTIMO_01', 'EMPRESTIMO_02', 'USINA_ASFALTO', 'BRITADOR',

// Pontos de Referência / Obras de Arte
'PONTE_01', 'PONTE_02', 'VIADUTO_01', 'VIADUTO_02',
'PASSARELA_01', 'PASSARELA_02', 'TUNEL_01', 'TUNEL_02',
'INTERSECAO_01', 'INTERSECAO_02', 'RETORNO_01', 'RETORNO_02',

// Edificações
'EDIFICIO_ADMIN', 'EDIFICIO_OPERACIONAL', 'GUARITA', 'PORTARIA',
'ALMOXARIFADO', 'OFICINA', 'REFEITORIO', 'VESTIARIO',

// Estacas (marcos de localização)
'ESTACA_0', 'ESTACA_10', 'ESTACA_20', 'ESTACA_30', 'ESTACA_40', 'ESTACA_50',
'ESTACA_60', 'ESTACA_70', 'ESTACA_80', 'ESTACA_90', 'ESTACA_100',
'ESTACA_110', 'ESTACA_120', 'ESTACA_130', 'ESTACA_140', 'ESTACA_150',
'ESTACA_200', 'ESTACA_250', 'ESTACA_300', 'ESTACA_350', 'ESTACA_400',

// Faixas e Sentidos
'FAIXA_1', 'FAIXA_2', 'FAIXA_3', 'FAIXA_ACOSTAMENTO',
'PISTA_NORTE', 'PISTA_SUL', 'PISTA_LESTE', 'PISTA_OESTE',
'SENTIDO_CAPITAL', 'SENTIDO_INTERIOR',
```

**Total: 96 Frentes de Obra**

---

#### 🔧 DISCIPLINAS (Áreas Técnicas)

```typescript
// Terraplenagem e Movimentação de Terra
'TERRAPLANAGEM', 'MOVIMENTACAO_TERRA', 'ESCAVACAO', 'ATERRO',
'CORTE', 'COMPACTACAO', 'REGULARIZACAO', 'SUBLEITO',

// Pavimentação
'PAVIMENTACAO', 'PAVIMENTO_ASFALTICO', 'PAVIMENTO_CONCRETO',
'FRESAGEM', 'RECAPEAMENTO', 'REMENDO', 'TAPA_BURACO',
'BASE', 'SUB_BASE', 'REFORCO_SUBLEITO', 'IMPRIMACAO',
'CBUQ', 'PMF', 'TSS', 'TSD', 'LAMA_ASFALTICA',

// Drenagem
'DRENAGEM', 'DRENAGEM_SUPERFICIAL', 'DRENAGEM_PROFUNDA',
'BUEIRO', 'SARJETA', 'VALETA', 'MEIO_FIO', 'CANALETA',
'BOCA_LOBO', 'POCO_VISITA', 'DESCIDA_AGUA', 'DISSIPADOR',

// Obras de Arte
'OBRAS_ARTE_CORRENTES', 'OBRAS_ARTE_ESPECIAIS',
'PONTE', 'VIADUTO', 'PASSARELA', 'TUNEL', 'GALERIA',
'CONTENÇÃO', 'MURO_ARRIMO', 'CORTINA_ATIRANTADA',

// Sinalização
'SINALIZACAO', 'SINALIZACAO_HORIZONTAL', 'SINALIZACAO_VERTICAL',
'PINTURA_FAIXA', 'DEMARCACAO', 'TACHAS_REFLETIVAS',
'PLACAS', 'PORTICO', 'SEMAFORO', 'BALIZADOR',
'DEFENSA_METALICA', 'NEW_JERSEY', 'GUARD_RAIL',

// Segurança
'SEGURANCA', 'SEGURANCA_TRABALHO', 'EPI', 'EPC',
'ISOLAMENTO', 'SINALIZACAO_OBRA', 'DESVIO_TRAFEGO',

// Instalações Elétricas
'INSTALACOES_ELETRICAS', 'INSTALACOES_HIDROSANITARIAS',
'ILUMINACAO', 'REDE_ELETRICA', 'SUBESTACAO', 'POSTE',
'ABASTECIMENTO_AGUA', 'ESGOTO', 'FOSSA', 'CAIXA_GORDURA',

// Estrutura
'ESTRUTURA', 'ESTRUTURA_METALICA', 'ESTRUTURA_CONCRETO',
'FUNDACAO', 'ESTACA', 'SAPATA', 'BLOCO', 'BALDRAME',
'VIGA', 'PILAR', 'LAJE', 'ARMADURA', 'FORMA', 'CONCRETAGEM',

// Acabamento
'ACABAMENTO', 'ACABAMENTO_INTERNO', 'ACABAMENTO_EXTERNO',
'ALVENARIA', 'CHAPISCO', 'EMBOCO', 'REBOCO', 'MASSA_CORRIDA',
'PINTURA', 'PINTURA_INTERNA', 'PINTURA_EXTERNA', 'TEXTURA',
'REVESTIMENTO', 'PISO', 'AZULEJO', 'PORCELANATO', 'CERAMICA',

// Cobertura
'COBERTURA', 'TELHADO', 'ESTRUTURA_TELHADO', 'TELHA',
'CALHA', 'RUFO', 'CUMEEIRA', 'IMPERMEABILIZACAO_LAJE',

// Esquadrias
'ESQUADRIAS', 'PORTAS', 'JANELAS', 'VIDROS', 'FERRAGENS',
'GRADIL', 'PORTAO', 'CERCA', 'ALAMBRADO',

// Paisagismo
'PAISAGISMO', 'JARDINAGEM', 'GRAMADO', 'PLANTIO',
'ARBORIZAÇÃO', 'IRRIGACAO', 'ROCADA', 'CAPINA',

// Demolição e Limpeza
'DEMOLICAO', 'REMOCAO', 'LIMPEZA', 'DESTOCA',
'BOTA_FORA', 'TRANSPORTE', 'CARGA_DESCARGA',

// Serviços Preliminares
'SERVICOS_PRELIMINARES', 'MOBILIZACAO', 'DESMOBILIZACAO',
'INSTALACOES_PROVISORIAS', 'LOCACAO_OBRA', 'TOPOGRAFIA',
'SONDAGEM', 'CANTEIRO', 'PLACA_OBRA',

// Meio Ambiente
'MEIO_AMBIENTE', 'CONTROLE_AMBIENTAL', 'EROSAO',
'RECUPERACAO_AMBIENTAL', 'APP', 'COMPENSACAO_AMBIENTAL',

// Manutenção
'MANUTENCAO', 'MANUTENCAO_PREVENTIVA', 'MANUTENCAO_CORRETIVA',
'CONSERVACAO', 'LIMPEZA_FAIXA', 'ROCADA_MECANIZADA',

// Administrativo
'MEDICAO', 'FISCALIZACAO', 'ADMINISTRACAO', 'QUALIDADE',
'DOCUMENTACAO', 'CONTROLE_TECNOLOGICO', 'ENSAIO',
```

**Total: 80 Disciplinas**

---

#### ⚙️ SERVIÇOS (Atividades Específicas)

```typescript
// 🟦 TERRAPLENAGEM
'LIMPEZA_DE_TERRENO', 'ROÇADA_MANUAL', 'ROÇADA_MECANIZADA', 'DESTOCAMENTO',
'ESCAVAÇÃO_MANUAL', 'ESCAVAÇÃO_MECANIZADA', 'CARGA_DE_MATERIAL',
'TRANSPORTE_DE_MATERIAL', 'BOTA_FORA', 'ATERRO', 'REATERRO',
'COMPACTAÇÃO_DE_SOLO', 'REGULARIZAÇÃO_DO_SUBLEITO',

// 🟦 DRENAGEM
'ESCAVAÇÃO_DE_VALAS', 'ASSENTAMENTO_DE_TUBOS', 'TUBULAÇÃO_DE_CONCRETO',
'TUBULAÇÃO_DE_PVC', 'CAIXA_DE_PASSAGEM', 'POÇO_DE_VISITA', 'BUEIRO_CELULAR',
'BUEIRO_TUBULAR', 'SARJETA', 'SARJETÃO', 'CANALETA', 'DRENO_LONGITUDINAL',
'DRENO_TRANSVERSAL', 'LIMPEZA_DE_DRENAGEM',

// 🟦 PAVIMENTAÇÃO
'IMPRIMAÇÃO', 'PINTURA_DE_LIGAÇÃO', 'BASE_GRANULAR', 'SUB_BASE', 'BGS',
'BRITA_CORRIDA', 'SOLO_CIMENTO', 'EXECUÇÃO_DE_CBUQ', 'EXECUÇÃO_DE_CAUC',
'MICROREVESTIMENTO', 'TRATAMENTO_SUPERFICIAL', 'FRESAGEM', 'RECAPAGEM',
'SELAGEM_DE_TRINCAS',

// 🟦 GUIAS, SARJETAS E CALÇADAS
'EXECUÇÃO_DE_GUIA', 'EXECUÇÃO_DE_SARJETA', 'EXECUÇÃO_DE_MEIA_GUIA',
'REBAIXO_DE_GUIA', 'RECOMPOSIÇÃO_DE_CALÇADA', 'PISO_INTERTRAVADO',
'PISO_DE_CONCRETO', 'CALÇADA_ACESSÍVEL',

// 🟦 SINALIZAÇÃO VIÁRIA
'SINALIZAÇÃO_HORIZONTAL', 'PINTURA_DE_FAIXAS', 'PINTURA_DE_EIXO', 'TACHÃO',
'TARTARUGA', 'PLACA_DE_SINALIZAÇÃO', 'IMPLANTAÇÃO_DE_PLACAS',
'DEFENSA_METÁLICA', 'BALIZADOR', 'CONES_E_SINALIZAÇÃO_TEMPORÁRIA',

// 🟦 OBRAS DE ARTE CORRENTES
'BOCA_DE_LOBO', 'CAIXA_COLETORA', 'DESCIDA_DAGUA', 'ESCADA_HIDRÁULICA',
'MURO_DE_CONTENÇÃO', 'GABIÃO',

// 🟨 SERVIÇOS PRELIMINARES (Construção Civil)
'CANTEIRO_DE_OBRAS', 'TAPUME', 'LOCAÇÃO_DE_OBRA', 'LIMPEZA_INICIAL',
'DEMOLIÇÃO', 'REMOÇÃO_DE_ENTULHO',

// 🟨 FUNDAÇÃO
'ESCAVAÇÃO_DE_FUNDAÇÃO', 'SAPATA', 'BLOCO_DE_FUNDAÇÃO', 'ESTACA_ESCAVADA',
'ESTACA_HELICE_CONTINUA', 'ESTACA_RAIZ', 'RADIER',

// 🟨 ESTRUTURA DE CONCRETO
'ARMAÇÃO_DE_AÇO', 'FÔRMAS', 'CONCRETAGEM', 'VIBRAÇÃO_DE_CONCRETO',
'CURA_DO_CONCRETO', 'DESFORMA',

// 🟨 ALVENARIA
'ALVENARIA_ESTRUTURAL', 'ALVENARIA_DE_VEDAÇÃO', 'LEVANTAMENTO_DE_PAREDES',
'VERGAS_E_CONTRAVERGAS',

// 🟨 COBERTURA
'ESTRUTURA_DE_TELHADO', 'TELHAMENTO', 'CALHAS', 'RUFOS',

// 🟨 REVESTIMENTOS
'CHAPISCO', 'EMBOÇO', 'REBOCO', 'REVESTIMENTO_CERÂMICO', 'PORCELANATO',
'ARGAMASSA_COLANTE',

// 🟨 PISOS
'CONTRAPISO', 'PISO_CERÂMICO', 'PISO_INDUSTRIAL', 'PISO_POLIDO',

// 🟨 PINTURA E ACABAMENTO
'MASSA_CORRIDA', 'MASSA_ACRÍLICA', 'PINTURA_INTERNA', 'PINTURA_EXTERNA',
'TEXTURA', 'VERNIZ',

// 🟥 INFRAESTRUTURA ELÉTRICA
'ABERTURA_DE_RASGOS', 'INSTALAÇÃO_DE_ELETRODUTOS', 'CAIXAS_DE_PASSAGEM',
'INFRA_DE_ILUMINAÇÃO',

// 🟥 INSTALAÇÃO ELÉTRICA
'PASSAGEM_DE_FIOS', 'INSTALAÇÃO_DE_QUADRO', 'DISJUNTOR', 'TOMADAS',
'INTERRUPTORES', 'ILUMINAÇÃO', 'ATERRAMENTO', 'SPDA',

// 🟩 ÁGUA (Hidrossanitário)
'TUBULAÇÃO_DE_AGUA_FRIA', 'TUBULAÇÃO_DE_AGUA_QUENTE', 'CAIXA_DAGUA', 'BOMBAS',

// 🟩 ESGOTO
'TUBULAÇÃO_DE_ESGOTO', 'CAIXA_DE_GORDURA', 'CAIXA_DE_INSPEÇÃO', 'FOSSA',
'SUMIDOURO',

// 🟪 URBANIZAÇÃO
'URBANIZAÇÃO_DE_VIAS', 'PRAÇAS', 'CICLOVIA', 'CICLOFAIXA',

// 🟪 PAISAGISMO
'PREPARO_DE_SOLO', 'PLANTIO_DE_GRAMA', 'PLANTIO_DE_ARVORES', 'JARDINAGEM',

// 🧹 SERVIÇOS COMPLEMENTARES
'LIMPEZA_FINAL', 'LIMPEZA_DE_OBRA', 'REMOÇÃO_DE_RESÍDUOS',
'ORGANIZAÇÃO_DO_CANTEIRO',

// ─────────────────────────────────────────────────────────────────
// SERVIÇOS DETALHADOS ADICIONAIS
// ─────────────────────────────────────────────────────────────────

// Escavação e Terraplenagem Detalhada
'ESCAVACAO_MANUAL', 'ESCAVACAO_MECANICA', 'ESCAVACAO_ROCHA',
'CORTE_SOLO', 'ATERRO_COMPACTADO', 'CARGA_MATERIAL', 'TRANSPORTE_MATERIAL',
'COMPACTACAO_SOLO', 'REGULARIZACAO_SUBLEITO',

// Fundações Detalhadas
'ESTACA_BROCA', 'ESTACA_PRE_MOLDADA', 'TUBULAO', 'SAPATA_CORRIDA',
'SAPATA_ISOLADA', 'BLOCO_FUNDACAO', 'BALDRAME', 'VIGA_BALDRAME',
'LASTRO_CONCRETO',

// Estrutura de Concreto Detalhada
'FORMA_MADEIRA', 'FORMA_METALICA', 'ESCORAMENTO', 'ARMACAO_ACO',
'LANCAMENTO_CONCRETO', 'CURA_CONCRETO', 'ACABAMENTO_CONCRETO',
'PILAR_CONCRETO', 'VIGA_CONCRETO', 'LAJE_MACICA', 'LAJE_NERVURADA',
'LAJE_PRE_MOLDADA', 'PROTENSAO',

// Alvenaria Detalhada
'ALVENARIA_VEDACAO', 'ALVENARIA_TIJOLO', 'ALVENARIA_BLOCO_CONCRETO',
'ALVENARIA_BLOCO_CERAMICO', 'VERGA', 'CONTRAVERGA', 'CINTA_AMARRACAO',
'ENCUNHAMENTO',

// Revestimento Detalhado
'CHAPISCO_ROLADO', 'CHAPISCO_DESEMPENADO', 'EMBOCO', 'MASSA_UNICA',
'GESSO_LISO', 'GESSO_PROJETADO', 'ASSENTAMENTO_CERAMICA',
'ASSENTAMENTO_PORCELANATO', 'ASSENTAMENTO_AZULEJO', 'REJUNTAMENTO',
'CIMENTADO_LISO', 'CIMENTADO_DESEMPENADO',

// Pintura Detalhada
'PINTURA_LATEX_PVA', 'PINTURA_LATEX_ACRILICA', 'PINTURA_ESMALTE',
'PINTURA_EPOXI', 'PINTURA_TEXTURA', 'FUNDO_PREPARADOR', 'SELADOR',
'STAIN', 'HIDROFUGANTE',

// Pavimentação Detalhada
'IMPRIMACAO_ASFALTICA', 'CBUQ_BINDER', 'CBUQ_ROLAMENTO', 'CBUQ_GAP_GRADED',
'PMF_PRE_MISTURADO_FRIO', 'TSS_TRATAMENTO_SIMPLES', 'TSD_TRATAMENTO_DUPLO',
'LAMA_ASFALTICA', 'MICRORREVESTIMENTO', 'FRESAGEM_ASFALTO',
'REMENDO_PROFUNDO', 'REMENDO_SUPERFICIAL', 'OPERACAO_TAPA_BURACO',
'SELAGEM_TRINCA', 'BRITA_GRADUADA', 'MACADAME_HIDRAULICO', 'SOLO_BRITA',
'RACHAO', 'PEDRA_ASSENTADA',

// Drenagem Detalhada
'SARJETA_CONCRETO', 'MEIO_FIO_CONCRETO', 'CANALETA_CONCRETO',
'VALETA_PROTECAO', 'BOCA_BUEIRO', 'POCO_VISITA', 'CAIXA_COLETA',
'BOCA_LOBO', 'DRENO_PROFUNDO', 'DRENO_FRANCES', 'COLCHAO_DRENANTE',
'DESCIDA_AGUA', 'ESCADA_DISSIPADORA', 'BACIA_AMORTECIMENTO', 'RIP_RAP',
'ENROCAMENTO',

// Sinalização Horizontal Detalhada
'PINTURA_FAIXA', 'PINTURA_SETA', 'PINTURA_LEGENDA', 'PINTURA_ZEBRADO',
'LINHA_BORDA', 'LINHA_CENTRO', 'LINHA_CANALIZACAO', 'TACHAS_REFLETIVAS',
'TERMOPLASTICO', 'SINALIZACAO_PROVISORIA',

// Sinalização Vertical Detalhada
'PLACA_REGULAMENTACAO', 'PLACA_ADVERTENCIA', 'PLACA_INDICATIVA',
'PLACA_ORIENTACAO', 'PLACA_EDUCATIVA', 'PLACA_SERVICOS', 'PORTICO',
'SEMI_PORTICO', 'BANDEIRA', 'SUPORTE_METALICO', 'POSTE_SINALIZACAO',

// Dispositivos de Segurança
'NEW_JERSEY_CONCRETO', 'NEW_JERSEY_PLASTICO', 'GUARD_RAIL', 'BARREIRA_RIGIDA',
'CERCA_GUIA', 'TELA_PROTECAO', 'ATENUADOR_IMPACTO', 'TERMINAL_ANCORA',
'GRADIL_METALICO', 'ALAMBRADO',

// Instalações Elétricas Detalhadas
'ELETRODUTO', 'FIACAO', 'QUADRO_DISTRIBUICAO', 'TOMADA', 'INTERRUPTOR',
'LUMINARIA', 'LAMPADA', 'PARA_RAIOS', 'POSTE_ILUMINACAO', 'BRACO_LUMINARIA',
'CABO_ELETRICO',

// Instalações Hidrossanitárias Detalhadas
'TUBULACAO_AGUA_FRIA', 'TUBULACAO_AGUA_QUENTE', 'TUBULACAO_ESGOTO',
'TUBULACAO_PLUVIAL', 'CAIXA_INSPECAO', 'CAIXA_GORDURA', 'FOSSA_SEPTICA',
'REGISTRO', 'VALVULA', 'TORNEIRA', 'CHUVEIRO', 'VASO_SANITARIO', 'PIA', 'TANQUE',

// Cobertura Detalhada
'ESTRUTURA_MADEIRA_TELHADO', 'ESTRUTURA_METALICA_TELHADO', 'TELHA_CERAMICA',
'TELHA_CONCRETO', 'TELHA_FIBROCIMENTO', 'TELHA_METALICA', 'TELHA_TERMOACUSTICA',
'CALHA_BEIRAL', 'RUFO_METALICO', 'CUMEEIRA', 'IMPERMEABILIZACAO_MANTA',
'IMPERMEABILIZACAO_LIQUIDA',

// Esquadrias Detalhadas
'PORTA_MADEIRA', 'PORTA_METALICA', 'PORTA_ALUMINIO', 'PORTA_VIDRO',
'JANELA_ALUMINIO', 'JANELA_MADEIRA', 'JANELA_PVC', 'VIDRO_COMUM',
'VIDRO_TEMPERADO', 'FECHADURA', 'DOBRADICA', 'BATENTE',

// Manutenção Detalhada
'MANUTENCAO_PREVENTIVA', 'MANUTENCAO_CORRETIVA', 'INSPECAO_VISUAL',
'VISTORIA_TECNICA', 'LIMPEZA_DISPOSITIVO', 'DESOBSTRUCAO',
'PINTURA_MANUTENCAO', 'ROÇADA_MANUTENCAO', 'LIMPEZA_SARJETA', 'LIMPEZA_BUEIRO',

// Paisagismo Detalhado
'PLANTIO_GRAMA', 'PLANTIO_ARBUSTOS', 'PLANTIO_ARVORES', 'HIDROSSEMEADURA',
'ADUBACAO', 'PODA', 'IRRIGACAO_MANUAL', 'IRRIGACAO_AUTOMATICA',

// Serviços Técnicos
'LEVANTAMENTO_TOPOGRAFICO', 'LOCACAO_OBRA', 'SONDAGEM_SPT', 'SONDAGEM_ROTATIVA',
'ENSAIO_CAMPO', 'ENSAIO_LABORATORIO', 'CONTROLE_TECNOLOGICO', 'FISCALIZACAO',

// Administrativo e Outros
'MOBILIZACAO', 'DESMOBILIZACAO', 'INSTALACAO_CANTEIRO', 'ADMINISTRACAO_LOCAL',
'ELABORACAO_PROJETO', 'DOCUMENTACAO_TECNICA', 'REUNIAO_OBRA',
```

**Total: 193 Serviços**

---

### Resumo das Categorias

| Categoria | Quantidade | Descrição |
|-----------|------------|-----------|
| **Frentes de Obra** | 96 | Locais físicos de trabalho |
| **Disciplinas** | 80 | Áreas técnicas/especialidades |
| **Serviços** | 193 | Atividades executadas |
| **Total Único** | ~350 | Termos únicos (sem duplicatas) |

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
