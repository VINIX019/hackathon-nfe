// Monitor pelo terminal (o painel web já tem um embutido; use um ou outro).
import { rodadaMonitor } from "./nucleo";
import { VALIDAR_MEMO } from "./config";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("Monitorando cobranças pendentes... (memo:", VALIDAR_MEMO ? "validado" : "ignorado", ")");
  while (true) {
    try {
      await rodadaMonitor();
    } catch (e: any) {
      console.warn("Erro no monitor:", e.message);
    }
    await espera(3000);
  }
}
main();
