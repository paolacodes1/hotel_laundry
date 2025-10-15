# 🏨 Sistema de Controle de Lavanderia - Hotel Maerkli

Sistema de gerenciamento de lavanderia desenvolvido especificamente para o Hotel Maerkli. Permite controle completo do fluxo de roupas de cama e banho enviadas para lavanderia externa.

## 📱 Recursos Principais

### ✅ **Workflow Completo**
1. **Fotografar Folhas Manuscritas** - Governança continua escrevendo à mão, recepção fotografa
2. **OCR Automático** - Extração automática dos números das folhas fotografadas
3. **Revisão e Ajuste** - Interface para corrigir valores antes de salvar
4. **Acúmulo de Folhas** - Adicione múltiplas folhas (diferentes andares/dias)
5. **Criação de Lote** - Agrupe folhas pendentes em um lote único
6. **Geração de PDF** - Requisição limpa para enviar com a roupa
7. **Rastreamento** - Acompanhe status (Pendente → Em trânsito → Retornado)
8. **Registro de Retorno** - Fotografe documento de retorno da lavanderia
9. **Cross-Reference** - Compare enviado vs. recebido automaticamente
10. **Relatórios** - PDFs com discrepâncias destacadas

### 🎯 **Características Técnicas**
- **PWA (Progressive Web App)** - Funciona offline, instalável no celular/tablet
- **OCR em Português** - Reconhecimento otimizado para handwriting português
- **Armazenamento Local** - Dados salvos no dispositivo (Zustand + localStorage)
- **Mobile-First** - Interface otimizada para uso em smartphones
- **Sem Servidor Necessário** - Roda 100% no navegador

## 🚀 Como Usar

### Instalação

```bash
# Navegue até o diretório do projeto
cd hotel-laundry-tracker

# Instale as dependências (se ainda não instalou)
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

### Fluxo de Trabalho

#### 1️⃣ **Adicionar Novas Folhas**

1. Clique em **"+ Nova Folha"**
2. Toque no botão da câmera para fotografar a folha manuscrita
3. Aguarde o processamento OCR (15-30 segundos)
4. **Revise e ajuste** os valores detectados na tabela
5. Adicione observações se necessário (ex: "Andar 2")
6. Clique em **"Salvar Folha"**

Repita para todas as folhas do dia/período.

#### 2️⃣ **Criar e Enviar Lote**

1. Vá para **"Pendentes"** - você verá todas as folhas aguardando
2. Revise o total de itens e folhas
3. Ajuste o **Custo de Coleta** (padrão: R$ 150,00)
4. Adicione observações do lote se necessário
5. Clique em **"Criar Lote e Enviar"**
6. Digite o nome de quem está enviando
7. **PDF será gerado automaticamente** - imprima e envie com a roupa

#### 3️⃣ **Acompanhar Lotes**

1. Vá para **"Lotes"** para ver histórico completo
2. Cada lote mostra:
   - Status atual (Pendente, Em trânsito, Retornado)
   - Data de envio e responsável
   - Número de folhas e itens
   - Custo total calculado
3. Quando retornar, fotografe o documento da lavanderia
4. Sistema compara e destaca discrepâncias automaticamente

## 📊 Categorias de Itens

O sistema rastreia estas categorias:

- **L. Casal** - Lençol de Casal
- **L. Solteiro** - Lençol de Solteiro
- **Fronha** - Fronhas
- **T. Banho** - Toalha de Banho
- **T. Rosto** - Toalha de Rosto
- **Piso** - Tapete de Piso
- **Edredom** - Edredom
- **Colcha** - Colcha
- **Capa Edredom** - Capa de Edredom
- **Sala** - Roupas de Sala
- **Box** - Tapete de Box
- **Capa Colchão** - Capa de Colchão
- **Toalha Mesa** - Toalha de Mesa

## 💰 Cálculo de Custos

O sistema calcula automaticamente:
- **Custo por item** - Baseado em preços configuráveis
- **Custo de coleta** - Taxa fixa da lavanderia
- **Custo total do lote** - Soma de todos os custos

Você pode ajustar os preços editando `lib/store.ts` na seção `defaultPricing`.

## 📱 Instalação como PWA

### No iPhone/iPad:
1. Abra no Safari
2. Toque no ícone de compartilhar
3. Selecione "Adicionar à Tela de Início"
4. Confirme

### No Android:
1. Abra no Chrome
2. Toque nos 3 pontos
3. Selecione "Instalar app" ou "Adicionar à tela inicial"
4. Confirme

Agora você pode usar o app offline!

## 🔧 Configuração Avançada

### Ajustar Preços

Edite `/lib/store.ts`:

```typescript
const defaultPricing: PricingConfig = {
  collectionFee: 150.0, // Taxa de coleta
  l_casal: 2.5,        // Preço por lençol de casal
  l_solteiro: 2.0,
  fronha: 1.0,
  // ... ajuste conforme necessário
};
```

### Melhorar OCR

Para melhorar a precisão do OCR:
1. Tire fotos com boa iluminação
2. Mantenha a câmera paralela ao papel
3. Evite sombras sobre os números
4. Sempre revise os valores detectados

## 🏗️ Estrutura do Projeto

```
hotel-laundry-tracker/
├── app/
│   ├── layout.tsx      # Layout principal com PWA config
│   └── page.tsx        # Página principal com toda UI
├── components/
│   ├── PhotoUpload.tsx       # Upload e OCR de fotos
│   └── LaundryItemsTable.tsx # Tabela editável de itens
├── lib/
│   ├── store.ts        # Estado global (Zustand)
│   ├── ocr.ts          # Lógica de OCR
│   └── pdf.ts          # Geração de PDFs
├── types/
│   └── index.ts        # TypeScript types
└── public/
    ├── logo.png        # Logo do hotel
    └── manifest.json   # PWA manifest
```

## 🐛 Solução de Problemas

### OCR não está funcionando
- Verifique se tem boa iluminação na foto
- Tente fotografar mais de perto
- Sempre revise e ajuste manualmente os valores

### PDF não está sendo gerado
- Verifique se o popup blocker está desabilitado
- Tente em outro navegador
- Certifique-se que há itens no lote

### App não funciona offline
- Certifique-se que você abriu o app pelo menos uma vez online
- Verifique se o service worker está registrado
- Limpe o cache e tente novamente

## 📝 Notas Importantes

- ⚠️ **Dados ficam salvos no navegador** - Se limpar dados do navegador, perde histórico
- 💾 **Recomendação**: Exporte PDFs regularmente para backup
- 📸 **Qualidade das fotos** - Quanto melhor a foto, melhor o OCR
- ✅ **Sempre revise** - OCR não é 100% preciso, sempre confira os números

## 🚀 Deploy para Produção

Para hospedar online:

```bash
# Build para produção
npm run build

# Inicie servidor de produção
npm start
```

Ou faça deploy gratuito na Vercel:

```bash
npm install -g vercel
vercel
```

## 📞 Suporte

Para dúvidas ou problemas, consulte a equipe de desenvolvimento.

---

**Desenvolvido para Hotel Maerkli** 🏨
