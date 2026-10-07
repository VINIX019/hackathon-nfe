import { findReference, validateTransfer } from "@solana/pay";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import * as fs from "fs";
import { conexao } from "./carteira";
import { RECEBEDOR, ARQUIVO_COBRANCAS, VALIDAR_MEMO } from "./config";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

const lerLista = () =>
  fs.existsSync(ARQUIVO_COBRANCAS) ? JSON.parse(fs.readFileSync(ARQUIVO_COBRANCAS, "utf8")) : [];

async function verificar(c: any): Promise<boolean> {
  const reference = new PublicKey(c.reference);
  try {
    const { signature } = await findReference(conexao, reference, { finality: "confirmed" });

    const esperado: any = { recipient: RECEBEDOR, amount: new BigNumber(c.valor), reference };
    if (VALIDAR_MEMO) esperado.memo = c.hash;

    await validateTransfer(conexao, signature, esperado, { commitment: "confirmed" });

    c.status = "paga";
    c.assinatura = signature;
    c.paga_em = new Date().toISOString();
    console.log(`BAIXA: nota ${c.chave ?? c.arquivo} paga. https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    return true;
  } catch (e: any) {
    if (e.name === "FindReferenceError") return false; // ainda não pagou
    if (e.name === "ValidateTransferError") {
      console.error("Pagamento encontrado, mas inválido:", e.message);
      c.status = "invalida";
      c.motivo = e.message;
      return true;
    }
    console.warn("Falha temporária, tento de novo:", e.message);
    return false;
  }
}

async function main() {
  console.log("Monitorando cobranças pendentes... (memo:", VALIDAR_MEMO ? "validado" : "ignorado", ")");
  while (true) {
    const alteradas: any[] = [];
    for (const c of lerLista().filter((x: any) => x.status === "pendente")) {
      if (await verificar(c)) alteradas.push(c);
    }

    if (alteradas.length) {
      // Relê o arquivo antes de gravar: cobranças criadas enquanto
      // consultávamos a rede não podem ser perdidas.
      const atual = lerLista();
      for (const c of alteradas) {
        const i = atual.findIndex((x: any) => x.reference === c.reference);
        if (i >= 0) atual[i] = c;
      }
      fs.writeFileSync(ARQUIVO_COBRANCAS, JSON.stringify(atual, null, 2));
    }
    await espera(3000);
  }
}
main();
