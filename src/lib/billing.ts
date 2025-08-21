// Shared billing logic for all groups (2025 proposal).
export type Tariffs = typeof import("../data/tariffs_2025.json");

const BLOCK_THRESHOLD = 800; // kWh
const TAX_RATE = 0.08;

const round2 = (n: number) => Math.round((n + 1e-12) * 100) / 100;
const cToEuro = (centsPerKwh: number) => centsPerKwh / 100;

export function billHouseholdTwo(tariffs: Tariffs, a1_kwh: number, a2_kwh: number) {
  const t = tariffs.group_5;
  const fixed = Number(t.fixed_fee);
  const total = a1_kwh + a2_kwh;
  const shareA1 = total ? a1_kwh / total : 0;
  const shareA2 = total ? a2_kwh / total : 0;

  let a1_b1 = 0, a2_b1 = 0, a1_b2 = 0, a2_b2 = 0;
  if (total <= BLOCK_THRESHOLD) {
    a1_b1 = total * shareA1;
    a2_b1 = total * shareA2;
  } else {
    const b1 = BLOCK_THRESHOLD, b2 = total - BLOCK_THRESHOLD;
    a1_b1 = b1 * shareA1; a2_b1 = b1 * shareA2;
    a1_b2 = b2 * shareA1; a2_b2 = b2 * shareA2;
  }

  const r_a1_b1 = cToEuro(t.block_1.high);
  const r_a2_b1 = cToEuro(t.block_1.low);
  const r_a1_b2 = cToEuro(t.block_2.high);
  const r_a2_b2 = cToEuro(t.block_2.low);

  const cost_a1_b1 = a1_b1 * r_a1_b1;
  const cost_a2_b1 = a2_b1 * r_a2_b1;
  const cost_a1_b2 = a1_b2 * r_a1_b2;
  const cost_a2_b2 = a2_b2 * r_a2_b2;

  const energy = cost_a1_b1 + cost_a2_b1 + cost_a1_b2 + cost_a2_b2;
  const net = fixed + energy;
  const tax = net * TAX_RATE;
  const final = net + tax;

  return {
    group: "household_two" as const,
    inputs: { a1_kwh: round2(a1_kwh), a2_kwh: round2(a2_kwh) },
    blocks: {
      a1_block1_kwh: round2(a1_b1), a2_block1_kwh: round2(a2_b1),
      a1_block2_kwh: round2(a1_b2), a2_block2_kwh: round2(a2_b2),
      a1_block1_cost: round2(cost_a1_b1), a2_block1_cost: round2(cost_a2_b1),
      a1_block2_cost: round2(cost_a1_b2), a2_block2_cost: round2(cost_a2_b2)
    },
    fixed_fee: round2(fixed),
    energy_cost: round2(energy),
    net_amount: round2(net),
    tax: round2(tax),
    final_bill: round2(final)
  };
}

export function billHouseholdOne(tariffs: Tariffs, total_kwh: number) {
  const t = tariffs.group_6;
  const fixed = Number(t.fixed_fee);

  const b1_kwh = Math.min(total_kwh, BLOCK_THRESHOLD);
  const b2_kwh = Math.max(0, total_kwh - BLOCK_THRESHOLD);

  const r_b1 = cToEuro(t.block_1.single);
  const r_b2 = cToEuro(t.block_2.single);

  const cost_b1 = b1_kwh * r_b1;
  const cost_b2 = b2_kwh * r_b2;

  const energy = cost_b1 + cost_b2;
  const net = fixed + energy;
  const tax = net * TAX_RATE;
  const final = net + tax;

  return {
    group: "household_one" as const,
    inputs: { total_kwh: round2(total_kwh) },
    blocks: {
      block1_kwh: round2(b1_kwh), block2_kwh: round2(b2_kwh),
      block1_cost: round2(cost_b1), block2_cost: round2(cost_b2)
    },
    fixed_fee: round2(fixed),
    energy_cost: round2(energy),
    net_amount: round2(net),
    tax: round2(tax),
    final_bill: round2(final)
  };
}

export function billDualRateNoBlocks(
  tariffs: Tariffs,
  groupKey: "group_1" | "group_2" | "group_3",
  params: { high_kwh: number; low_kwh: number; demand_kw?: number; reactive_kvarh?: number }
) {
  const t = (tariffs as any)[groupKey];
  const fixed = Number(t.fixed_fee);
  const r_high = cToEuro(t.active_energy.high);
  const r_low  = cToEuro(t.active_energy.low);

  const energyCost = params.high_kwh * r_high + params.low_kwh * r_low;

  const demandRate = t.demand_charge ? Number(t.demand_charge) : 0;      // €/kW
  const reactiveRate = t.reactive_energy ? Number(t.reactive_energy) : 0; // c€/kVArh
  const demandCost = params.demand_kw ? params.demand_kw * demandRate : 0;
  const reactiveCost = params.reactive_kvarh ? params.reactive_kvarh * cToEuro(reactiveRate) : 0;

  const subtotal = energyCost + demandCost + reactiveCost;
  const net = fixed + subtotal;
  const tax = net * TAX_RATE;
  const final = net + tax;

  return {
    group: groupKey,
    inputs: {
      high_kwh: round2(params.high_kwh),
      low_kwh: round2(params.low_kwh),
      demand_kw: params.demand_kw ? round2(params.demand_kw) : 0,
      reactive_kvarh: params.reactive_kvarh ? round2(params.reactive_kvarh) : 0
    },
    fixed_fee: round2(fixed),
    energy_cost: round2(energyCost),
    demand_cost: round2(demandCost),
    reactive_cost: round2(reactiveCost),
    net_amount: round2(net),
    tax: round2(tax),
    final_bill: round2(final)
  };
}

export function billSingleRateNoBlocks(
  tariffs: Tariffs,
  groupKey: "group_4" | "group_7" | "group_8",
  total_kwh: number
) {
  const t = (tariffs as any)[groupKey];
  const fixed = Number(t.fixed_fee);
  const rate = cToEuro(t.active_energy.single);

  const energy = total_kwh * rate;
  const net = fixed + energy;
  const tax = net * TAX_RATE;
  const final = net + tax;

  return {
    group: groupKey,
    inputs: { total_kwh: round2(total_kwh) },
    rate_eur_per_kwh: round2(rate),
    fixed_fee: round2(fixed),
    energy_cost: round2(energy),
    net_amount: round2(net),
    tax: round2(tax),
    final_bill: round2(final)
  };
}

export type CalcPayload =
  | { group: "household_two"; a1_kwh: number; a2_kwh: number }
  | { group: "household_one"; total_kwh: number }
  | { group: "group_1" | "group_2"; high_kwh: number; low_kwh: number }
  | { group: "group_3"; high_kwh: number; low_kwh: number; demand_kw?: number; reactive_kvarh?: number }
  | { group: "group_4" | "group_7" | "group_8"; total_kwh: number };

export function calculateForGroup(tariffs: Tariffs, body: CalcPayload) {
  switch (body.group) {
    case "household_two":
      return billHouseholdTwo(tariffs, body.a1_kwh, body.a2_kwh);
    case "household_one":
      return billHouseholdOne(tariffs, body.total_kwh);
    case "group_1":
    case "group_2":
      return billDualRateNoBlocks(tariffs, body.group, { high_kwh: body.high_kwh, low_kwh: body.low_kwh });
    case "group_3":
      return billDualRateNoBlocks(tariffs, "group_3", {
        high_kwh: body.high_kwh,
        low_kwh: body.low_kwh,
        demand_kw: body.demand_kw ?? 0,
        reactive_kvarh: body.reactive_kvarh ?? 0
      });
    case "group_4":
    case "group_7":
    case "group_8":
      return billSingleRateNoBlocks(tariffs, body.group, body.total_kwh);
  }
}
