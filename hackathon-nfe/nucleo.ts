// Lógica compartilhada pelo servidor web: criar cobrança, dar baixa e verificar documento.
import { Keypair, PublicKey } from "@solana/web3.js";
import { encodeURL, findReference, validateTransfer } from "@solana/pay";
import BigNumber from "bignumber.js";
import * as fs from "fs";
import * as crypto from "crypto";
import { conexao } from "./carteira";
import { RECEBEDOR, ARQUIVO_COBRANCAS, VALIDAR_MEMO } from "./config";

export const lerLista = (): any[] =>
  fs.existsSync(ARQUIVO_COBRANCAS) ? JSON.parse(fs.readFileSync(ARQUIVO_COBRANCAS, "utf8")) : [];

const gravarLista = (lista: any[]) =>
  fs.writeFileSync(ARQUIVO_COBRANCAS, JSON.stringify(lista, null, 2));

export const hashDe = (xml: Buffer) => crypto.createHash("sha256").update(xml).digest("hex");

export function lerNota(texto: string) {
  const chave = texto.match(/Id="NFe(\d{44})"/)?.[1];
  const vNF = texto.match(/<vNF>\s*([\d.]+)\s*<\/vNF>/)?.[1];
  if (!chave) throw new Error('Chave de acesso (Id="NFe...") não encontrada no XML.');
  if (!vNF) throw new Error("Valor total <vNF> não encontrado no XML.");
  return { chave, vNF };
}

// Mesma regra do cobranca.ts, mas recebendo o conteúdo do XML em vez do caminho
export function criarCobranca(xml: Buffer, nomeArquivo: string) {
  const { chave, vNF } = lerNota(xml.toString("utf8"));
  const hash = hashDe(xml);
  const lista = lerLista();

  const existente = lista.find((x) => x.chave === chave && x.status !== "invalida");
  if (existente) throw new Error(`Já existe cobrança para esta nota (status: ${existente.status}).`);

  const valor = new BigNumber(vNF);
  if (!valor.isFinite() || valor.lte(0)) throw new Error("Valor inválido: " + vNF);

  const reference = Keypair.generate().publicKey;
  const url = encodeURL({
    recipient: RECEBEDOR,
    amount: valor,
    reference,
    label: `NF-e ${chave.slice(25, 34)}`,
    message: "Pagamento de nota fiscal",
    memo: hash,
  });

  const cobranca = {
    reference: reference.toBase58(),
    chave,
    valor: valor.toString(),
    hash,
    arquivo: nomeArquivo,
    url: url.toString(),
    status: "pendente",
    criada: new Date().toISOString(),
  };
  lista.push(cobranca);
  gravarLista(lista);
  return cobranca;
}

// Procura o pagamento de uma cobrança. Retorna true se o status mudou.
async function verificarPagamento(c: any): Promise<boolean> {
  const reference = new PublicKey(c.reference);
  try {
    const { signature } = await findReference(conexao, reference, { finality: "confirmed" });
    const esperado: any = { recipient: RECEBEDOR, amount: new BigNumber(c.valor), reference };
    if (VALIDAR_MEMO) esperado.memo = c.hash;
    await validateTransfer(conexao, signature, esperado, { commitment: "confirmed" });

    c.status = "paga";
    c.assinatura = signature;
    c.paga_em = new Date().toISOString();
    console.log(`BAIXA: nota ${c.chave} paga. https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    return true;
  } catch (e: any) {
    if (e.name === "FindReferenceError") return false;
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

// Uma rodada do monitor: verifica todas as pendentes e grava só o que mudou
export async function rodadaMonitor() {
  const alteradas: any[] = [];
  for (const c of lerLista().filter((x) => x.status === "pendente")) {
    if (await verificarPagamento(c)) alteradas.push(c);
  }
  if (alteradas.length) {
    const atual = lerLista();
    for (const c of alteradas) {
      const i = atual.findIndex((x) => x.reference === c.reference);
      if (i >= 0) atual[i] = c;
    }
    gravarLista(atual);
  }
}

// Lê o memo gravado numa transação da blockchain
async function memoDaTransacao(assinatura: string): Promise<string | null> {
  const tx = await conexao.getParsedTransaction(assinatura, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return null;
  for (const ix of tx.transaction.message.instructions as any[]) {
    if (ix.program === "spl-memo" && typeof ix.parsed === "string") return ix.parsed;
  }
  return null;
}

// Tela "verificar documento": o XML enviado é o mesmo que foi pago e registrado na blockchain?
export async function verificarDocumento(xml: Buffer) {
  const hash = hashDe(xml);
  let chave: string | null = null;
  try {
    chave = lerNota(xml.toString("utf8")).chave;
  } catch {}

  const lista = lerLista();
  const pelaHash = lista.find((x) => x.hash === hash);
  const pelaChave = chave ? lista.find((x) => x.chave === chave) : null;

  if (!pelaHash) {
    if (pelaChave) {
      return {
        resultado: "alterado",
        mensagem: "This invoice exists, but the file was modified after it was issued.",
        hash,
        hashOriginal: pelaChave.hash,
        chave,
      };
    }
    return { resultado: "desconhecido", mensagem: "No charge found for this document.", hash, chave };
  }

  if (pelaHash.status !== "paga" || !pelaHash.assinatura) {
    return {
      resultado: "nao_paga",
      mensagem: `Document recognized, but not paid yet (status: ${pelaHash.status}).`,
      hash,
      chave: pelaHash.chave,
    };
  }

  // Confirma direto na blockchain, sem confiar só no arquivo local
  const memo = await memoDaTransacao(pelaHash.assinatura);
  const confere = memo === hash;
  return {
    resultado: confere ? "autentico" : "divergente",
    mensagem: confere
      ? "Authentic: the document hash matches the one recorded on-chain with the payment."
      : "Payment found, but the hash recorded on-chain does not match this file.",
    hash,
    memoNaBlockchain: memo,
    chave: pelaHash.chave,
    valor: pelaHash.valor,
    paga_em: pelaHash.paga_em,
    assinatura: pelaHash.assinatura,
    explorer: `https://explorer.solana.com/tx/${pelaHash.assinatura}?cluster=devnet`,
  };
}
