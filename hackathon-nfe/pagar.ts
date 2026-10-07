import { SystemProgram, Transaction, TransactionInstruction, PublicKey,
  sendAndConfirmTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import * as fs from "fs";
import { carregarOuCriar, conexao } from "./carteira";
import { RECEBEDOR, ARQUIVO_COBRANCAS, MEMO_PROGRAM } from "./config";

async function main() {
  if (!fs.existsSync(ARQUIVO_COBRANCAS)) return console.log("Nenhuma cobrança criada.");
  const lista = JSON.parse(fs.readFileSync(ARQUIVO_COBRANCAS, "utf8"));
  const c = lista.filter((x: any) => x.status === "pendente").pop();
  if (!c) return console.log("Nenhuma cobrança pendente.");

  const pagador = carregarOuCriar();
  const lamports = new BigNumber(c.valor).times(LAMPORTS_PER_SOL).integerValue().toNumber();

  if (pagador.publicKey.equals(RECEBEDOR)) {
    throw new Error("Pagador e recebedor são a mesma carteira.");
  }
  const saldo = await conexao.getBalance(pagador.publicKey);
  if (saldo < lamports + 10_000) throw new Error("Saldo insuficiente na carteira pagadora.");

  const memo = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM,
    data: Buffer.from(c.hash),
  });

  const transfer = SystemProgram.transfer({
    fromPubkey: pagador.publicKey,
    toPubkey: RECEBEDOR,
    lamports,
  });
  transfer.keys.push({ pubkey: new PublicKey(c.reference), isSigner: false, isWritable: false });

  // Ordem importa: o validateTransfer do Solana Pay espera memo primeiro.
  const tx = new Transaction().add(memo, transfer);
  const sig = await sendAndConfirmTransaction(conexao, tx, [pagador]);
  console.log("Pago:", `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}
main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });