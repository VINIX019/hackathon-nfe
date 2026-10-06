import { PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { carregarOuCriar, conexao } from "./carteira";

const DESTINO = new PublicKey("COLE_AQUI_O_ENDERECO_DA_PHANTOM");

async function main() {
  const origem = carregarOuCriar();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: origem.publicKey,
      toPubkey: DESTINO,
      lamports: Math.round(0.1 * LAMPORTS_PER_SOL),
    })
  );
  const assinatura = await sendAndConfirmTransaction(conexao, tx, [origem]);
  console.log("Enviado: https://explorer.solana.com/tx/" + assinatura + "?cluster=devnet");
}
main();