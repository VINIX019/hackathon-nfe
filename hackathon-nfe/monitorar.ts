import { findReference, validateTransfer } from "@solana/pay";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import * as fs from "fs";
import { conexao } from "./carteira";
import { RECEBEDOR, ARQUIVO_COBRANCAS } from "./config";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function verificar(c: any): Promise<boolean> {
  const reference = new PublicKey(c.reference);
  try {
    const { signature } = await findReference(conexao, reference, { finality: "confirmed" });
    await validateTransfer(
      conexao,
      signature,
      { recipient: RECEBEDOR, amount: new BigNumber(c.valor), reference },
      { commitment: "confirmed" }
    );
    c.status = "paga";
    c.assinatura = signature;
    c.paga_em = new Date().toISOString();
    console.log(`BAIXA: nota ${c.arquivo} paga. https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    return true;
  } catch (e: any) {
    if (e.name === "FindReferenceError") return false; // ainda não pagou
    console.error("Pagamento encontrado, mas inválido:", e.message);
    c.status = "invalida";
    return true;
  }
}

async function main() {
  console.log("Monitorando cobranças pendentes...");
  while (true) {
    const lista = JSON.parse(fs.readFileSync(ARQUIVO_COBRANCAS, "utf8"));
    let mudou = false;
    for (const c of lista.filter((x: any) => x.status === "pendente")) {
      if (await verificar(c)) mudou = true;
    }
    if (mudou) fs.writeFileSync(ARQUIVO_COBRANCAS, JSON.stringify(lista, null, 2));
    await espera(3000);
  }
}
main();