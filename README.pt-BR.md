# NF-e Pay

🇺🇸 [Read in English](README.md)

**Receba o pagamento de uma NF-e em USDC na Solana, com baixa automática e a impressão digital da nota gravada na blockchain.**

Feito para o hackathon Colosseum (trilha Superteam Brasil) por um estudante de Ciência da Computação e seu pai, que trabalha com NF-e todos os dias.

> **Status: protótipo em devnet.** Transações reais na Solana, notas sintéticas. Veja as [Limitações](#limitações-leia-primeiro).

Demo online: https://hackathon-nfe-production.up.railway.app/ · Vídeo: `<VIDEO_URL>`

---

## O problema

No Brasil, toda venda entre empresas gera uma NF-e, um XML. Receber é um processo separado e manual: alguém emite boleto ou PIX, outra pessoa confere o extrato e casa o pagamento com a nota. Divergências, conciliação atrasada e a pergunta "essa transferência era de qual nota?" são atrito diário para pequenas empresas.

## O que o NF-e Pay faz

1. **Você envia o XML da NF-e.** O app lê a chave de acesso (44 dígitos) e o valor total (`vNF`, em R$).
2. **Um QR Code Solana Pay é gerado.** O valor em reais é convertido em USDC pela cotação do momento, e a cotação fica travada na cobrança. Cada cobrança tem uma chave `reference` única.
3. **O cliente paga** escaneando o QR com uma carteira Solana. A transação leva um **Memo** com o **hash SHA-256 do arquivo XML exato**.
4. **O painel dá baixa sozinho.** Um monitor encontra a transação pela `reference`, valida destinatário, token e valor (e o hash do memo) e muda a nota para *paga*. Sem extrato, sem conferência manual.
5. **Qualquer pessoa pode verificar depois.** Solte um XML na tela *Verify*: o app calcula o hash e compara com o memo do pagamento na blockchain → `autêntico`, `alterado`, `divergente`, `não paga` ou `desconhecido`. Mude um byte do arquivo e o hash deixa de bater.

## Como funciona

```
 XML da NF-e ──► sha256 ───────────────────────┐
     │                                          ▼
     └─► vNF (R$) ÷ USD/BRL ─► URL Solana Pay (USDC, reference, memo)
                                    │  QR
                              carteira do cliente
                                    ▼
                  tx: [ memo(hash), transferência USDC + reference ]
                                    ▼
   monitor: findReference ─► validateTransfer (+ memo) ─► status: paga
```

- **Solana Pay** (`@solana/pay`): `encodeURL`, `findReference`, `validateTransfer`.
- **USDC (SPL)** na devnet, mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`, 6 casas decimais.
- **Programa Memo** carrega o hash do documento.
- **Cotação**: AwesomeAPI (USD/BRL), depois CoinGecko, cache de 60 s, fallback fixo (`COTACAO_BRL_POR_USDC`, padrão 5,50). A cotação usada fica gravada na cobrança.
- **Stack**: TypeScript (executado com `tsx`), Express 5, front-end em HTML/JS puro, armazenamento em arquivo JSON.

## Como rodar

Requer Node 20+.

```bash
npm install
npm run saldo      # cria carteira.json (carteira de teste da devnet) e mostra saldo de SOL/USDC
npm run painel     # http://localhost:3000  (painel + monitor de pagamentos)
```

Coloque saldo de teste na carteira: SOL devnet em faucet.solana.com e USDC devnet em faucet.circle.com (Solana → Devnet).

Defina a carteira recebedora em `config.ts` (`RECEBEDOR`).

### Pagar uma cobrança

**Com uma carteira:** abra o painel, envie um XML e escaneie o QR com uma carteira Solana na devnet (no Phantom: Configurações → Configurações do desenvolvedor → Modo Testnet → Solana Devnet), com USDC devnet e um pouco de SOL.

**Com o script** (simula o cliente e grava o memo):

```bash
npm run pagar      # paga a última cobrança pendente usando carteira.json
```

### Outros comandos

```bash
npm run cobranca -- nota.xml [valor]   # cria cobrança pelo terminal e salva qr.png
npm run monitorar                      # monitor no terminal (não rodar junto com o painel)
```

### Variáveis de ambiente (todas opcionais)

| Variável | Padrão | Função |
|---|---|---|
| `PORT` | 3000 | Porta HTTP |
| `COBRANCAS_FILE` | `cobrancas.json` | Onde as cobranças são salvas |
| `SOLANA_RPC_URL` | devnet pública | Use um RPC privado se der limite de requisições |
| `COTACAO_BRL_POR_USDC` | 5.50 | Cotação de fallback |

Nunca deixe essas variáveis com valor vazio.

## Limitações (leia primeiro)

- **Somente devnet.** Nenhum dinheiro real é movimentado.
- **O hash prova que *este pagamento foi feito para este arquivo exato*.** Ele **não** prova que a nota é fiscalmente válida; isso é papel da SEFAZ. Consultar a autorização na SEFAZ é um próximo passo.
- **O fluxo por carteira de celular foi pouco testado.** O pagamento por script (`pagar.ts`) está verificado de ponta a ponta: transferência USDC, memo, baixa automática e verificação "autêntica". Pagar escaneando com carteira de celular depende de a carteira incluir o memo e criar a conta de token do recebedor; a instabilidade da devnet também atrapalhou nos nossos testes. Se uma carteira omitir o memo, a cobrança é rejeitada como inválida.
- **As notas de teste são sintéticas**, sem dados reais de contribuintes.
- **O armazenamento é um arquivo JSON** e o painel **não tem autenticação**: serve para demo, não para produção. Uma instância publicada perde os dados a cada novo deploy, a menos que se monte um volume.
- **A cotação vem de APIs públicas**; a cotação travada é uma conveniência, não uma garantia.
- Feito com ajuda do Claude (assistente de código com IA), declarado com transparência.

## Roadmap

- USDC na mainnet, com RPC próprio e página de checkout com wallet adapter
- Consulta de autorização na SEFAZ para ligar o pagamento à validade fiscal
- Múltiplos recebedores e banco de dados de verdade
- Exportar a conciliação para ERPs e contabilidade (CSV, API)
- Pagamentos parciais e estornos

## Licença

ISC
