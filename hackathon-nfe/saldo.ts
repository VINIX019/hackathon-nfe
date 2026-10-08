import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { carregarOuCriar, conexao } from "./carteira";
import { USDC_MINT, USDC_DECIMAIS } from "./config";

async function main() {
  const carteira = carregarOuCriar();
  console.log("Endereço:", carteira.publicKey.toBase58());
  const saldo = await conexao.getBalance(carteira.publicKey);
  console.log("Saldo:   ", saldo / LAMPORTS_PER_SOL, "SOL");

  let usdc = 0n;
  try {
    usdc = (await getAccount(conexao, await getAssociatedTokenAddress(USDC_MINT, carteira.publicKey))).amount;
  } catch {} // conta de USDC ainda não existe = saldo zero
  console.log("Saldo:   ", Number(usdc) / 10 ** USDC_DECIMAIS, "USDC");
}
main();
