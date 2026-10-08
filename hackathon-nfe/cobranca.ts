// Gera a cobrança de uma NF-e pelo terminal (mesma regra do painel web) e salva o QR em qr.png.
import QRCode from "qrcode";
import * as fs from "fs";
import { criarCobranca, moedaDe } from "./nucleo";

async function main() {
  const [, , xmlPath, valorManual] = process.argv;
  if (!xmlPath) {
    console.error("Uso: npm run cobranca -- nota.xml [valor]");
    console.error("     Sem [valor], usa o <vNF> da nota.");
    process.exit(1);
  }

  const c = criarCobranca(fs.readFileSync(xmlPath), xmlPath, valorManual);
  await QRCode.toFile("qr.png", c.url, { width: 400 });
  console.log("Nota:     ", c.chave);
  console.log("Valor:    ", c.valor, moedaDe(c));
  console.log("Reference:", c.reference);
  console.log("Hash:     ", c.hash);
  console.log("QR salvo em qr.png");
}

main().catch((e) => {
  console.error("Falhou:", e.message);
  process.exit(1);
});
