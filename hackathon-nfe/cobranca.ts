// Gera a cobrança de uma NF-e pelo terminal (mesma regra do painel web) e salva o QR em qr.png.
import QRCode from "qrcode";
import * as fs from "fs";
import { criarCobranca, moedaDe } from "./nucleo";

async function main() {
  const [, , xmlPath, valorManual] = process.argv;
  if (!xmlPath) {
    console.error("Uso: npm run cobranca -- nota.xml [valor]");
    console.error("     Sem [valor], converte o <vNF> (R$) para USDC pela cotação do momento.");
    console.error("     Com [valor], cobra esse valor direto na moeda da cobrança (só para testes).");
    process.exit(1);
  }

  const c = await criarCobranca(fs.readFileSync(xmlPath), xmlPath, valorManual);
  await QRCode.toFile("qr.png", c.url, { width: 400 });
  console.log("Nota:     ", c.chave);
  console.log("Valor:    ", `R$ ${c.valorBRL} =`, c.valor, moedaDe(c));
  if ("cotacao" in c) console.log("Cotação:  ", `R$ ${c.cotacao} por USDC (${c.fonteCotacao})`);
  console.log("Reference:", c.reference);
  console.log("Hash:     ", c.hash);
  console.log("QR salvo em qr.png");
}

main().catch((e) => {
  console.error("Falhou:", e.message);
  process.exit(1);
});