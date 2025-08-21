import type { Handler } from "@netlify/functions";
import tariffs from "../../src/data/tariffs_2025.json" assert { type: "json" };
import { calculateForGroup, type CalcPayload } from "../../src/lib/billing";

const ok = (obj: unknown) => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json", ...cors() },
  body: JSON.stringify(obj)
});

const bad = (status: number, msg: string) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...cors() },
  body: JSON.stringify({ error: msg })
});

const preflight = () => ({ statusCode: 204, headers: cors() });

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return preflight();
  if (event.httpMethod !== "POST") return bad(405, "Method Not Allowed");

  try {
    const body = JSON.parse(event.body || "{}") as CalcPayload | any;
    const payload = patchLegacyPayload(body);
    const result = calculateForGroup(tariffs as any, payload as CalcPayload);
    return ok(result);
  } catch (e: any) {
    return bad(400, e?.message || "Bad request");
  }
};

function patchLegacyPayload(body: any): CalcPayload {
  if (body.group === "household_two" || (!body.group && (body.consumption_high_rate !== undefined || body.a1_kwh !== undefined))) {
    return {
      group: "household_two",
      a1_kwh: Number(body.a1_kwh ?? body.consumption_high_rate ?? 0),
      a2_kwh: Number(body.a2_kwh ?? body.consumption_low_rate ?? 0)
    };
  }
  if (body.group === "household_one") {
    return { group: "household_one", total_kwh: Number(body.total_kwh ?? 0) };
  }
  if (body.group === "group_1" || body.group === "group_2") {
    return { group: body.group, high_kwh: Number(body.high_kwh ?? 0), low_kwh: Number(body.low_kwh ?? 0) };
  }
  if (body.group === "group_3") {
    return {
      group: "group_3",
      high_kwh: Number(body.high_kwh ?? 0),
      low_kwh: Number(body.low_kwh ?? 0),
      demand_kw: body.demand_kw !== undefined ? Number(body.demand_kw) : undefined,
      reactive_kvarh: body.reactive_kvarh !== undefined ? Number(body.reactive_kvarh) : undefined
    };
  }
  if (body.group === "group_4" || body.group === "group_7" || body.group === "group_8") {
    return { group: body.group, total_kwh: Number(body.total_kwh ?? 0) };
  }
  return { group: "household_two", a1_kwh: 0, a2_kwh: 0 };
}
