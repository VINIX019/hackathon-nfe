
import { SystemProgram, Transaction, TransactionInstruction, PublicKey,
  sendAndConfirmTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount,
  createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction } from "@solana/spl-token";
import BigNumber from "bignumber.js";
import { carregarOuCriar, conexao } from "./carteira";
import { RECEBEDOR, MEMO_PROGRAM, USDC_MINT, USDC_DECIMAIS } from "./config";
import { lerLista, moedaDe } from "./nucleo";

async function main() {
  const c = lerLista().filter((x: any) => x.status === "pendente").pop();
  if (!c) return console.log("Nenhuma cobrança pendente.");

  const pagador = carregarOuCriar();
  if (pagador.publicKey.equals(RECEBEDOR)) throw new Error("Pagador e recebedor são a mesma carteira.");

  const moeda = moedaDe(c);
  const reference = new PublicKey(c.reference);
  const solSaldo = await conexao.getBalance(pagador.publicKey);
  const tx = new Transaction();
  let transfer: TransactionInstruction;

  if (moeda === "USDC") {

    const unidades = BigInt(new BigNumber(c.valor).times(10 ** USDC_DECIMAIS).integerValue().toFixed());
    const origem = await getAssociatedTokenAddress(USDC_MINT, pagador.publicKey);
    const destino = await getAssociatedTokenAddress(USDC_MINT, RECEBEDOR);

    let saldoUsdc = 0n;
    try { saldoUsdc = (await getAccount(conexao, origem)).amount; } catch {}
    if (saldoUsdc < unidades) {
      throw new Error(`Saldo USDC insuficiente na carteira pagadora (${Number(saldoUsdc) / 10 ** USDC_DECIMAIS} USDC, ` +
        `precisa de ${c.valor}). Envie USDC de teste (faucet.circle.com) para ${pagador.publicKey.toBase58()}`);
    }
    if (solSaldo < 10_000_000) {
      throw new Error(`A carteira pagadora precisa de um pouco de SOL (0.01) para as taxas. ` +
        `Saldo atual: ${solSaldo / LAMPORTS_PER_SOL} SOL em ${pagador.publicKey.toBase58()}`);
    }

    const contaDestino = await conexao.getAccountInfo(destino);
    if (!contaDestino) {
      tx.add(createAssociatedTokenAccountIdempotentInstruction(pagador.publicKey, destino, RECEBEDOR, USDC_MINT));
    }
    transfer = createTransferCheckedInstruction(origem, USDC_MINT, destino, pagador.publicKey, unidades, USDC_DECIMAIS);
  } else {
    const lamports = new BigNumber(c.valor).times(LAMPORTS_PER_SOL).integerValue().toNumber();
    if (solSaldo < lamports + 10_000) {
      throw new Error(`Saldo SOL insuficiente na carteira pagadora (${solSaldo / LAMPORTS_PER_SOL} SOL em ${pagador.publicKey.toBase58()}).`);
    }
    transfer = SystemProgram.transfer({ fromPubkey: pagador.publicKey, toPubkey: RECEBEDOR, lamports });
  }

  transfer.keys.push({ pubkey: reference, isSigner: false, isWritable: false });

  const memo = new TransactionInstruction({ keys: [], programId: MEMO_PROGRAM, data: Buffer.from(c.hash) });


  tx.add(memo, transfer);
  const sig = await sendAndConfirmTransaction(conexao, tx, [pagador]);
  console.log(`Pago ${c.valor} ${moeda}:`, `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}
main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });