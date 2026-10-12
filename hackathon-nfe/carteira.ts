import { Keypair, Connection, clusterApiUrl } from "@solana/web3.js";
import * as fs from "fs";

const ARQUIVO = "carteira.json";

export const conexao = new Connection(process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet"), "confirmed");

export function carregarOuCriar(): Keypair {
  if (fs.existsSync(ARQUIVO)) {
    const segredo = Uint8Array.from(JSON.parse(fs.readFileSync(ARQUIVO, "utf8")));
    return Keypair.fromSecretKey(segredo);
  }
  const nova = Keypair.generate();
  fs.writeFileSync(ARQUIVO, JSON.stringify(Array.from(nova.secretKey)));
  return nova;
}