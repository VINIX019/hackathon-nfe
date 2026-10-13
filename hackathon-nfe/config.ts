import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";


export const COTACAO_BRL_POR_USDC = new BigNumber(globalThis.process?.env?.COTACAO_BRL_POR_USDC ?? "5.50");

export const RECEBEDOR = new PublicKey("6en4Aeq8wVwJbTpvhhNBPdLzSXd2cQHd2axyWerc7abb");
export const ARQUIVO_COBRANCAS = process.env.COBRANCAS_FILE ?? "cobrancas.json";

export const MOEDA: "USDC" | "SOL" = "USDC";

export const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
export const USDC_DECIMAIS = 6;

export const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export const VALIDAR_MEMO = true;