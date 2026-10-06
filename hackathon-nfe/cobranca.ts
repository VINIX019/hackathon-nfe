import { Keypair } from "@solana/web3.js";
import { encodeURL } from "@solana/pay";
import BigNumber from "bignumber.js";
import QRCode from "qrcode";
import * as fs from "fs";
import * as crypto from "crypto";
import { RECEBEDOR, ARQUIVO_COBRANCAS } from "./config";

async function main() {
  const [, , xmlPath, valorStr] = process.argv;
  if (!xmlPath || !valorStr) {
    console.error("Uso: npx tsx cobranca.ts nota.xml 0.1   (valor em SOL)");
    process.exit(1);
  }

  const xml = fs.readFileSync(xmlPath);
  const hash = crypto.createHash("sha256").update(xml).digest("hex");
  const reference = Keypair.generate().publicKey; // id único da cobrança
  const valor = new BigNumber(valorStr);

  const url = encodeURL({
    recipient: RECEBEDOR,
    amount: valor,
    reference,
    label: "Cobranca NF-e",
    message: "Pagamento de nota fiscal",
    memo: hash, // hash do XML gravado na transação
  });

  const lista = fs.existsSync(ARQUIVO_COBRANCAS)
    ? JSON.parse(fs.readFileSync(ARQUIVO_COBRANCAS, "utf8"))
    : [];
  lista.push({
    reference: reference.toBase58(),
    valor: valor.toString(),
    hash,
    arquivo: xmlPath,
    status: "pendente",
    criada: new Date().toISOString(),
  });
  fs.writeFileSync(ARQUIVO_COBRANCAS, JSON.stringify(lista, null, 2));

  await QRCode.toFile("qr.png", url.toString(), { width: 400 });
  console.log("Reference:", reference.toBase58());
  console.log("Hash:", hash);
  console.log("QR salvo em qr.png");
}
main();