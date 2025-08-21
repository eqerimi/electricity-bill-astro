import React, { useState } from "react";

type Group =
  | "household_two"
  | "household_one"
  | "group_1"
  | "group_2"
  | "group_3"
  | "group_4"
  | "group_7"
  | "group_8";

export default function BillForm() {
  const [group, setGroup] = useState<Group>("household_two");
  const [a1, setA1] = useState("0");
  const [a2, setA2] = useState("0");
  const [total, setTotal] = useState("0");
  const [high, setHigh] = useState("0");
  const [low, setLow] = useState("0");
  const [demand, setDemand] = useState("0");
  const [reactive, setReactive] = useState("0");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let payload: Record<string, any> = { group };

      if (group === "household_two") {
        payload = { group, a1_kwh: Number(a1), a2_kwh: Number(a2) };
      } else if (group === "household_one") {
        payload = { group, total_kwh: Number(total) };
      } else if (group === "group_1" || group === "group_2") {
        payload = { group, high_kwh: Number(high), low_kwh: Number(low) };
      } else if (group === "group_3") {
        payload = {
          group,
          high_kwh: Number(high),
          low_kwh: Number(low),
          demand_kw: Number(demand) || undefined,
          reactive_kvarh: Number(reactive) || undefined
        };
      } else if (group === "group_4" || group === "group_7" || group === "group_8") {
        payload = { group, total_kwh: Number(total) };
      }

      const r = await fetch("/.netlify/functions/calculate-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const renderInputs = () => {
    switch (group) {
      case "household_two":
        return (
          <>
            <label>A1 (high) kWh: <input value={a1} onChange={e => setA1(e.target.value)} type="number" min="0" /></label>
            <label>A2 (low) kWh: <input value={a2} onChange={e => setA2(e.target.value)} type="number" min="0" /></label>
          </>
        );
      case "household_one":
      case "group_4":
      case "group_7":
      case "group_8":
        return (<label>Total kWh: <input value={total} onChange={e => setTotal(e.target.value)} type="number" min="0" /></label>);
      case "group_1":
      case "group_2":
        return (
          <>
            <label>High tariff kWh: <input value={high} onChange={e => setHigh(e.target.value)} type="number" min="0" /></label>
            <label>Low tariff kWh: <input value={low} onChange={e => setLow(e.target.value)} type="number" min="0" /></label>
          </>
        );
      case "group_3":
        return (
          <>
            <label>High tariff kWh: <input value={high} onChange={e => setHigh(e.target.value)} type="number" min="0" /></label>
            <label>Low tariff kWh: <input value={low} onChange={e => setLow(e.target.value)} type="number" min="0" /></label>
            <label>Demand (kW): <input value={demand} onChange={e => setDemand(e.target.value)} type="number" min="0" /></label>
            <label>Reactive (kVArh, optional): <input value={reactive} onChange={e => setReactive(e.target.value)} type="number" min="0" /></label>
          </>
        );
    }
  };

  return (
    <section>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.8rem" }}>
        <label>
          Tariff group:
          <select value={group} onChange={(e) => setGroup(e.target.value as Group)} style={{ marginLeft: 8 }}>
            <option value="household_two">Household (2-tariff: A1/A2)</option>
            <option value="household_one">Household (1-tariff: single)</option>
            <option value="group_1">Business 35 kV</option>
            <option value="group_2">Business 10 kV</option>
            <option value="group_3">Business 0.4 kV Category I</option>
            <option value="group_4">Business 0.4 kV Category II</option>
            <option value="group_7">Household per meter</option>
            <option value="group_8">Public lighting</option>
          </select>
        </label>

        {renderInputs()}

        <button type="submit" disabled={loading}>{loading ? "Calculating…" : "Calculate"}</button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {result && (
        <div style={{ marginTop: "1rem", border: "1px solid #ddd", padding: "1rem" }}>
          <h3>Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}
