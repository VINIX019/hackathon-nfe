import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";


export const COTACAO_BRL_POR_USDC = new BigNumber(globalThis.process?.env?.COTACAO_BRL_POR_USDC ?? "5.50");

export const RECEBEDOR = new PublicKey("6en4Aeq8wVwJbTpvhhNBPdLzSXd2cQHd2axyWerc7abb");
export const ARQUIVO_COBRANCAS = process.env.COBRANCAS_FILE ?? "cobrancas.json";
// Moeda das novas cobranças: "USDC" (padrão) ou "SOL".
// Cobranças antigas continuam sendo validadas na moeda em que foram criadas.
export const MOEDA: "USDC" | "SOL" = "USDC";

// USDC de teste da Circle na devnet (faucet.circle.com). 6 casas decimais.
export const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
export const USDC_DECIMAIS = 6;

export const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// true = só dá baixa se o memo da transação for o hash do XML.
// Se a Phantom do celular não incluir o memo, mude para false.
export const VALIDAR_MEMO = true;