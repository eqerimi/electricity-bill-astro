import React, { useState } from "react";

type Invoice = {
  total_consumption: number;
  consumption_high_rate: number;
  consumption_low_rate: number;
  cost_high: number;
  cost_low: number;
  cost_high_block2: number;
  cost_low_block2: number;
  fixed_tariff: number;
  net_amount: number;
  tax: number;
  final_bill: number;
};

export default function BillForm() {
  const [high, setHigh] = useState<string>("0");
  const [low, setLow] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const r = await fetch("/.netlify/functions/calculate-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumption_high_rate: Number(high),
          consumption_low_rate: Number(low),
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: Invoice = await r.json();
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Failed to calculate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: "1.5rem" }}>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          High rate (A1) kWh:
          <input
            type="number"
            min="0"
            step="1"
            value={high}
            onChange={(e) => setHigh(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </label>

        <label>
          Low rate (A2) kWh:
          <input
            type="number"
            min="0"
            step="1"
            value={low}
            onChange={(e) => setLow(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </label>

        <button type="submit" disabled={loading} style={{ padding: "0.6rem 1rem" }}>
          {loading ? "Calculating…" : "Calculate"}
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {result && (
        <div style={{ marginTop: "1rem", border: "1px solid #ddd", padding: "1rem", borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Result</h3>
          <table>
            <tbody>
              <Row label="Total consumption" value={`${result.total_consumption} kWh`} />
              <Row label="A1 (high) consumption" value={`${result.consumption_high_rate} kWh`} />
              <Row label="A2 (low) consumption" value={`${result.consumption_low_rate} kWh`} />
              <Row label="Cost high (Block 1)" value={`€ ${result.cost_high.toFixed(2)}`} />
              <Row label="Cost low (Block 1)" value={`€ ${result.cost_low.toFixed(2)}`} />
              <Row label="Cost high (Block 2)" value={`€ ${result.cost_high_block2.toFixed(2)}`} />
              <Row label="Cost low (Block 2)" value={`€ ${result.cost_low_block2.toFixed(2)}`} />
              <Row label="Fixed tariff" value={`€ ${result.fixed_tariff.toFixed(2)}`} />
              <Row label="Net amount" value={`€ ${result.net_amount.toFixed(2)}`} />
              <Row label="Tax (8%)" value={`€ ${result.tax.toFixed(2)}`} />
              <Row label="Final bill" value={`€ ${result.final_bill.toFixed(2)}`} />
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ paddingRight: 12 }}>{label}</td>
      <td><strong>{value}</strong></td>
    </tr>
  );
}