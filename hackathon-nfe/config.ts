import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

export const RECEBEDOR = new PublicKey("6en4Aeq8wVwJbTpvhhNBPdLzSXd2cQHd2axyWerc7abb");
export const ARQUIVO_COBRANCAS = "cobrancas.json";
export const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// true = só dá baixa se o memo da transação for o hash do XML.
// Se a Phantom do celular não incluir o memo, mude para false.
export const VALIDAR_MEMO = true;

// Cotação fixa da demo: quantos reais valem 1 SOL.
// O <vNF> da NF-e é em reais; a cobrança em SOL é vNF / COTACAO_BRL_POR_SOL.
// Troque pelo valor real do dia, ou rode: COTACAO_BRL_POR_SOL=900 npm run painel
// A cotação usada fica gravada em cada cobrança (campo "cotacao").
export const COTACAO_BRL_POR_SOL = new BigNumber(process.env.COTACAO_BRL_POR_SOL ?? "800");

if (!COTACAO_BRL_POR_SOL.isFinite() || COTACAO_BRL_POR_SOL.lte(0)) {
  throw new Error("COTACAO_BRL_POR_SOL inválida: " + process.env.COTACAO_BRL_POR_SOL);
}

// Reais -> SOL, com 9 casas (1 lamport) e arredondando para cima,
// para o cliente nunca pagar a menos que o valor da nota.
export const brlParaSol = (brl: BigNumber.Value): BigNumber =>
  new BigNumber(brl).dividedBy(COTACAO_BRL_POR_SOL).decimalPlaces(9, BigNumber.ROUND_UP);