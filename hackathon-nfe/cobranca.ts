import { Keypair } from "@solana/web3.js";
import { encodeURL } from "@solana/pay";
import BigNumber from "bignumber.js";
import QRCode from "qrcode";
import * as fs from "fs";
import * as crypto from "crypto";
import { RECEBEDOR, ARQUIVO_COBRANCAS, COTACAO_BRL_POR_SOL, brlParaSol } from "./config";

// Lê os dados que interessam do XML da NF-e
function lerNota(texto: string) {
  const chave = texto.match(/Id="NFe(\d{44})"/)?.[1];
  const vNF = texto.match(/<vNF>\s*([\d.]+)\s*<\/vNF>/)?.[1];
  if (!chave) throw new Error("Chave de acesso (Id=\"NFe...\") não encontrada no XML.");
  if (!vNF) throw new Error("Valor total <vNF> não encontrado no XML.");
  return { chave, vNF };
}

async function main() {
  const [, , xmlPath, valorManual] = process.argv;
  if (!xmlPath) {
    console.error("Uso: npm run cobranca -- nota.xml [valorEmSOL]");
    console.error(`     Sem [valorEmSOL], converte o <vNF> (R$) pela cotação: R$ ${COTACAO_BRL_POR_SOL} = 1 SOL.`);
    console.error("     Com [valorEmSOL], cobra esse valor em SOL (só para testes na devnet).");
    process.exit(1);
  }

  const xml = fs.readFileSync(xmlPath);
  const { chave, vNF } = lerNota(xml.toString("utf8"));
  const hash = crypto.createHash("sha256").update(xml).digest("hex");

  const lista = fs.existsSync(ARQUIVO_COBRANCAS)
    ? JSON.parse(fs.readFileSync(ARQUIVO_COBRANCAS, "utf8"))
    : [];

  // Evita cobrar a mesma nota duas vezes
  const existente = lista.find((x: any) => x.chave === chave && x.status !== "invalida");
  if (existente) {
    console.error(`Já existe cobrança para esta nota (status: ${existente.status}).`);
    console.error("Reference:", existente.reference);
    process.exit(1);
  }

  // O <vNF> é em reais. A cobrança é em SOL: vNF / cotação (ou o valor manual, para testes).
  const valorBRL = new BigNumber(vNF);
  if (!valorBRL.isFinite() || valorBRL.lte(0)) throw new Error("Valor inválido: " + vNF);
  const valor = valorManual ? new BigNumber(valorManual) : brlParaSol(valorBRL);
  if (!valor.isFinite() || valor.lte(0)) throw new Error("Valor inválido: " + (valorManual ?? vNF));
  const cotacaoEfetiva = valorBRL.dividedBy(valor).decimalPlaces(2).toString(); // R$ por 1 SOL

  const reference = Keypair.generate().publicKey; // id único da cobrança

  const url = encodeURL({
    recipient: RECEBEDOR,
    amount: valor,
    reference,
    label: `NF-e ${chave.slice(25, 34)}`, // número da nota (posições 26-34 da chave)
    message: "Pagamento de nota fiscal",
    memo: hash, // hash do XML gravado na transação
  });

  lista.push({
    reference: reference.toBase58(),
    chave,
    valor: valor.toString(), // em SOL
    valorBRL: valorBRL.toString(),
    cotacao: cotacaoEfetiva,
    hash,
    arquivo: xmlPath,
    url: url.toString(),
    status: "pendente",
    criada: new Date().toISOString(),
  });
  fs.writeFileSync(ARQUIVO_COBRANCAS, JSON.stringify(lista, null, 2));

  await QRCode.toFile("qr.png", url.toString(), { width: 400 });
  console.log("Nota:     ", chave);
  console.log("Valor:    ", "R$", valorBRL.toString(), "=", valor.toString(), "SOL", `(R$ ${cotacaoEfetiva} por SOL)`);
  console.log("Reference:", reference.toBase58());
  console.log("Hash:     ", hash);
  console.log("QR salvo em qr.png");
}

main().catch((e) => {
  console.error("Falhou:", e.message);
  process.exit(1);
});