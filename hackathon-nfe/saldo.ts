import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { carregarOuCriar, conexao } from "./carteira";

async function main() {
  const carteira = carregarOuCriar();
  console.log("Endereço:", carteira.publicKey.toBase58());
  const saldo = await conexao.getBalance(carteira.publicKey);
  console.log("Saldo:", saldo / LAMPORTS_PER_SOL, "SOL");
}
main();