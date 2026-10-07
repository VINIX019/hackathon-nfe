import { PublicKey } from "@solana/web3.js";

export const RECEBEDOR = new PublicKey("6en4Aeq8wVwJbTpvhhNBPdLzSXd2cQHd2axyWerc7abb");
export const ARQUIVO_COBRANCAS = "cobrancas.json";
export const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// true = só dá baixa se o memo da transação for o hash do XML.
// Se a Phantom do celular não incluir o memo, mude para false.
export const VALIDAR_MEMO = true;