# NF-e Pay

🇧🇷 [Leia em português](README.pt-BR.md)

**Get paid for a Brazilian invoice (NF-e) in USDC on Solana — reconciled automatically, with the invoice's fingerprint written on-chain.**

Built for the Colosseum hackathon (Superteam Brasil track) by a CS student and his father, who works with NF-e every day.

> **Status: devnet prototype.** Real Solana transactions, synthetic invoices. See [Limitations](#limitations-read-this-first).

Live demo: https://hackathon-nfe-production.up.railway.app/ · Video: `<VIDEO_URL>`

---

## The problem

In Brazil every B2B sale produces an NF-e, an XML invoice. Getting paid is a separate, manual process: someone issues a boleto or PIX, someone else checks the bank statement and matches the payment to the invoice by hand. Mismatches, late reconciliation and "which invoice was this transfer for?" are daily friction for small businesses.

## What NF-e Pay does

1. **Upload an NF-e XML.** The app reads the access key (44 digits) and the total (`vNF`, in BRL).
2. **A Solana Pay QR is generated.** The BRL amount is converted to USDC at the live USD/BRL rate and the rate is locked in the charge. Each charge has a unique `reference` key.
3. **The customer pays** by scanning the QR with a Solana wallet. The transaction carries a **Memo** with the **SHA-256 hash of the exact XML file**.
4. **The panel reconciles on its own.** A monitor finds the transaction by its `reference`, validates recipient, token and amount (and the memo hash), and flips the invoice to *paid*. No bank statement, no manual matching.
5. **Anyone can verify later.** Drop an XML into the *Verify* screen: the app hashes it and compares with the memo of the payment on-chain → `authentic`, `altered`, `divergent`, `not paid` or `unknown`. Change one byte of the file and it no longer matches.

## How it works

```
 NF-e XML ──► sha256 ──────────────────────────┐
     │                                          ▼
     └─► vNF (R$) ÷ USD/BRL ─► Solana Pay URL (USDC, reference, memo)
                                    │  QR
                              customer wallet
                                    ▼
                  tx: [ memo(hash), USDC transfer + reference ]
                                    ▼
   monitor: findReference ─► validateTransfer (+ memo check) ─► status: paid
```

- **Solana Pay** (`@solana/pay`): `encodeURL`, `findReference`, `validateTransfer`.
- **USDC (SPL)** on devnet, mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`, 6 decimals.
- **Memo program** carries the document hash.
- **FX rate**: AwesomeAPI (USD/BRL), then CoinGecko, cached 60 s, fixed fallback (`COTACAO_BRL_POR_USDC`, default 5.50). The rate used is stored with the charge.
- **Stack**: TypeScript (run with `tsx`), Express 5, plain HTML/JS front end, JSON file storage.

## Run it

Requires Node 20+.

```bash
npm install
npm run saldo      # creates carteira.json (a devnet test wallet) and prints SOL/USDC balance
npm run painel     # http://localhost:3000  (panel + payment monitor)
```

Fund the test wallet with devnet SOL (faucet.solana.com) and devnet USDC (faucet.circle.com, Solana → Devnet).

Set the receiving wallet in `config.ts` (`RECEBEDOR`).

### Pay a charge

**With a wallet:** open the panel, upload an XML, scan the QR with a Solana wallet set to devnet (in Phantom: Settings → Developer Settings → Testnet Mode → Solana Devnet) holding devnet USDC and a little SOL.

**With the script** (simulates the customer, writes the memo):

```bash
npm run pagar      # pays the latest pending charge from carteira.json
```

### Other commands

```bash
npm run cobranca -- nota.xml [valor]   # create a charge from the terminal, saves qr.png
npm run monitorar                      # terminal monitor (don't run alongside the panel)
```

### Environment variables (all optional)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | 3000 | HTTP port |
| `COBRANCAS_FILE` | `cobrancas.json` | Where charges are stored |
| `SOLANA_RPC_URL` | public devnet | Use a private RPC if you hit rate limits |
| `COTACAO_BRL_POR_USDC` | 5.50 | Fallback FX rate |

Never set these to an empty string.

## Limitations (read this first)

- **Devnet only.** No real money moves.
- **The hash proves *this payment was made for this exact file*.** It does **not** prove the invoice is fiscally valid; that is SEFAZ's job. Integrating SEFAZ authorization lookup is a next step.
- **Mobile-wallet flow is lightly tested.** The scripted payment (`pagar.ts`) is fully verified end to end: USDC transfer, memo, automatic reconciliation, "authentic" verification. Paying by scanning with a phone wallet depends on the wallet including the memo and creating the recipient's token account; devnet congestion also made it flaky in our tests. If a wallet omits the memo, the charge is rejected as invalid.
- **Test invoices are synthetic**, not real taxpayer data.
- **Storage is a JSON file** and the panel has **no authentication**: fine for a demo, not for production. A deployed instance resets its data on redeploy unless a volume is mounted.
- **FX uses public APIs**; the locked rate is a convenience, not a guaranteed quote.
- Built with help from Claude (AI coding assistant), disclosed per hackathon spirit.

## Roadmap

- Mainnet USDC with a proper RPC and wallet-adapter checkout page
- SEFAZ authorization lookup to tie payment to fiscal validity
- Multi-merchant accounts and a real database
- Export reconciliation to ERPs / accounting (CSV, API)
- Partial payments and refunds

## License

ISC
