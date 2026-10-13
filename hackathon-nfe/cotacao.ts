
import BigNumber from "bignumber.js";


const FIXA = new BigNumber(process.env.COTACAO_BRL_POR_USDC ?? "5.50");
const TTL_MS = 60_000;

export type Cotacao = { valor: BigNumber; fonte: string; em: number };
let cache: Cotacao | null = null;

async function buscar(url: string, extrair: (j: any) => string, fonte: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(`${fonte}: HTTP ${r.status}`);
  const v = new BigNumber(extrair(await r.json()));

  if (!v.isFinite() || v.lt(1) || v.gt(20)) throw new Error(`${fonte}: valor suspeito (${v})`);
  return { valor: v, fonte };
}

export async function cotacaoBRLporUSDC(): Promise<Cotacao> {
  if (cache && Date.now() - cache.em < TTL_MS) return cache;

  const fontes = [
    () => buscar("https://economia.awesomeapi.com.br/json/last/USD-BRL", (j) => j.USDBRL.bid, "AwesomeAPI USD/BRL"),
    () =>
      buscar(
        "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=brl",
        (j) => String(j["usd-coin"].brl),
        "CoinGecko USDC/BRL"
      ),
  ];

  for (const f of fontes) {
    try {
      cache = { ...(await f()), em: Date.now() };
      return cache;
    } catch (e: any) {
      console.warn("Cotação falhou:", e.message);
    }
  }

  return cache ?? { valor: FIXA, fonte: "fixed (fallback)", em: Date.now() };
}