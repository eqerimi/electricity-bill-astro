import type { Handler } from "@netlify/functions";

type Req = {
  consumption_high_rate?: number;
  consumption_low_rate?: number;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const data: Req = JSON.parse(event.body || "{}");
    const consumptionHigh = Number(data.consumption_high_rate || 0);
    const consumptionLow  = Number(data.consumption_low_rate || 0);
    const invoice = calculateBill(consumptionHigh, consumptionLow);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoice),
    };
  } catch (err: any) {
    return { statusCode: 400, body: JSON.stringify({ error: err?.message || "Bad request" }) };
  }
};

function calculateBill(consumption_high_rate: number, consumption_low_rate: number) {
  const TARIFF_A1_BLOCK1 = 7.79;
  const TARIFF_A2_BLOCK1 = 3.34;
  const TARIFF_A1_BLOCK2 = 13.29;
  const TARIFF_A2_BLOCK2 = 6.27;
  const FIXED_TARIFF = 2.0;
  const TAX_RATE = 0.08;
  const BLOCK_THRESHOLD = 800;

  const total = consumption_high_rate + consumption_low_rate;

  let allocHigh = 0, allocLow = 0;
  if (total !== 0) {
    allocHigh = consumption_high_rate / total;
    allocLow = consumption_low_rate / total;
  }

  let costHigh = 0, costLow = 0, costHigh2 = 0, costLow2 = 0;

  if (total <= BLOCK_THRESHOLD) {
    costHigh = allocHigh * total * TARIFF_A1_BLOCK1 / 100;
    costLow  = allocLow  * total * TARIFF_A2_BLOCK1 / 100;
  } else {
    costHigh = allocHigh * BLOCK_THRESHOLD * TARIFF_A1_BLOCK1 / 100;
    costLow  = allocLow  * BLOCK_THRESHOLD * TARIFF_A2_BLOCK1 / 100;
    const remainingHigh = allocHigh * (total - BLOCK_THRESHOLD);
    const remainingLow  = allocLow  * (total - BLOCK_THRESHOLD);
    costHigh2 = remainingHigh * TARIFF_A1_BLOCK2 / 100;
    costLow2  = remainingLow  * TARIFF_A2_BLOCK2 / 100;
  }

  const totalCost = costHigh + costLow + costHigh2 + costLow2;
  const netAmount = FIXED_TARIFF + totalCost;
  const tax = netAmount * TAX_RATE;
  const finalBill = netAmount + tax;

  return {
    total_consumption: total,
    consumption_high_rate,
    consumption_low_rate,
    cost_high: round2(costHigh),
    cost_low: round2(costLow),
    cost_high_block2: round2(costHigh2),
    cost_low_block2: round2(costLow2),
    fixed_tariff: round2(FIXED_TARIFF),
    net_amount: round2(netAmount),
    tax: round2(tax),
    final_bill: round2(finalBill),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}