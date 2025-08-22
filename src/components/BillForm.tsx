import React, { useState } from "react";
import tariffs from "../data/tariffs_2025.json";

type Group =
  | "household_two"
  | "household_one"
  | "group_1"
  | "group_2"
  | "group_3"
  | "group_4"
  | "group_7"
  | "group_8";

interface ValidationError {
  field: string;
  message: string;
}

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
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const validateInputs = (): boolean => {
    const errors: ValidationError[] = [];
    
    const validateNumber = (value: string, field: string, min = 0, max = 50000) => {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push({ field, message: `${field} must be a valid number` });
      } else if (num < min) {
        errors.push({ field, message: `${field} must be at least ${min}` });
      } else if (num > max) {
        errors.push({ field, message: `${field} cannot exceed ${max} kWh` });
      }
    };

    switch (group) {
      case "household_two":
        validateNumber(a1, "A1 (high) kWh");
        validateNumber(a2, "A2 (low) kWh");
        break;
      case "household_one":
      case "group_4":
      case "group_7":
      case "group_8":
        validateNumber(total, "Total kWh");
        break;
      case "group_1":
      case "group_2":
        validateNumber(high, "High tariff kWh");
        validateNumber(low, "Low tariff kWh");
        break;
      case "group_3":
        validateNumber(high, "High tariff kWh");
        validateNumber(low, "Low tariff kWh");
        if (demand) validateNumber(demand, "Demand kW", 0, 1000);
        if (reactive) validateNumber(reactive, "Reactive kVArh", 0, 10000);
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(error => error.field === field)?.message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateInputs()) {
      return;
    }

    setLoading(true);
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

      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${r.status}: ${r.statusText}`);
      }
      
      const data = await r.json();
      setResult(data);
      setValidationErrors([]);
    } catch (err: any) {
      console.error('Calculation error:', err);
      setError(err.message || "Unable to calculate bill. Please check your inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (setter: (value: string) => void, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    // Clear validation errors for this field when user starts typing
    setValidationErrors(prev => prev.filter(error => error.field !== field));
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGroup(e.target.value as Group);
    setValidationErrors([]);
    setError(null);
    setResult(null);
  };

  const renderInputs = () => {
    const inputStyle = {
      padding: "0.5rem",
      border: "2px solid #e1e5e9",
      borderRadius: "4px",
      fontSize: "1rem",
      width: "100%",
      boxSizing: "border-box" as const
    };

    const errorInputStyle = {
      ...inputStyle,
      borderColor: "#dc3545"
    };

    const labelStyle = {
      display: "flex",
      flexDirection: "column" as const,
      gap: "0.25rem",
      fontWeight: "500"
    };

    switch (group) {
      case "household_two":
        return (
          <>
            <label style={labelStyle}>
              A1 (high tariff) kWh:
              <input 
                value={a1} 
                onChange={handleInputChange(setA1, "A1 (high) kWh")} 
                type="number" 
                min="0" 
                step="0.01"
                style={getFieldError("A1 (high) kWh") ? errorInputStyle : inputStyle}
                placeholder="Enter high tariff consumption"
              />
              {getFieldError("A1 (high) kWh") && <span style={{color: "#dc3545", fontSize: "0.875rem"}}>{getFieldError("A1 (high) kWh")}</span>}
            </label>
            <label style={labelStyle}>
              A2 (low tariff) kWh:
              <input 
                value={a2} 
                onChange={handleInputChange(setA2, "A2 (low) kWh")} 
                type="number" 
                min="0" 
                step="0.01"
                style={getFieldError("A2 (low) kWh") ? errorInputStyle : inputStyle}
                placeholder="Enter low tariff consumption"
              />
              {getFieldError("A2 (low) kWh") && <span style={{color: "#dc3545", fontSize: "0.875rem"}}>{getFieldError("A2 (low) kWh")}</span>}
            </label>
          </>
        );
      case "household_one":
      case "group_4":
      case "group_7":
      case "group_8":
        return (
          <label style={labelStyle}>
            Total kWh:
            <input 
              value={total} 
              onChange={handleInputChange(setTotal, "Total kWh")} 
              type="number" 
              min="0" 
              step="0.01"
              style={getFieldError("Total kWh") ? errorInputStyle : inputStyle}
              placeholder="Enter total consumption"
            />
            {getFieldError("Total kWh") && <span style={{color: "#dc3545", fontSize: "0.875rem"}}>{getFieldError("Total kWh")}</span>}
          </label>
        );
      case "group_1":
      case "group_2":
        return (
          <>
            <label style={labelStyle}>
              High tariff kWh:
              <input 
                value={high} 
                onChange={handleInputChange(setHigh, "High tariff kWh")} 
                type="number" 
                min="0" 
                step="0.01"
                style={getFieldError("High tariff kWh") ? errorInputStyle : inputStyle}
                placeholder="Enter high tariff consumption"
              />
              {getFieldError("High tariff kWh") && <span style={{color: "#dc3545", fontSize: "0.875rem"}}>{getFieldError("High tariff kWh")}</span>}
            </label>
            <label style={labelStyle}>
              Low tariff kWh:
              <input 
                value={low} 
                onChange={handleInputChange(setLow, "Low tariff kWh")} 
                type="number" 
                min="0" 
                step="0.01"
                style={getFieldError("Low tariff kWh") ? errorInputStyle : inputStyle}
                placeholder="Enter low tariff consumption"
              />
              {getFieldError("Low tariff kWh") && <span style={{color: "#dc3545", fontSize: "0.875rem"}}>{getFieldError("Low tariff kWh")}</span>}
            </label>
          </>
        );
      case "group_3":
        return (
          <>
            <label style={labelStyle}>
              High tariff kWh:
              <input 
                value={high} 
                onChange={handleInputChange(setHigh, "High tariff kWh")} 
                type="number" 
                min="0" 
                step="0.01"
                style={getFieldError("High tariff kWh") ? errorInputStyle : inputStyle}
                placeholder="Enter high tariff consumption"
              />
              {getFieldError("High tariff kWh") && <span style={{color: "#dc3545", fontSize: "0.875rem"}}>{getFieldError("High tariff kWh")}</span>}
            </label>
            <label style={labelStyle}>
              Low tariff kWh:
              <input 
                value={low} 
                onChange={handleInputChange(setLow, "Low tariff kWh")} 
                type="number" 
                min="0" 
                step="0.01"
                style={getFieldError("Low tariff kWh") ? errorInputStyle : inputStyle}
                placeholder="Enter low tariff consumption"
              />
              {getFieldError("Low tariff kWh") && <span style={{color: "#dc3545", fontSize: "0.875rem"}}>{getFieldError("Low tariff kWh")}</span>}
            </label>
            <label style={labelStyle}>
              Demand (kW):
              <input 
                value={demand} 
                onChange={handleInputChange(setDemand, "Demand kW")} 
                type="number" 
                min="0" 
                step="0.01"
                style={getFieldError("Demand kW") ? errorInputStyle : inputStyle}
                placeholder="Enter maximum demand (optional)"
              />
              {getFieldError("Demand kW") && <span style={{color: "#dc3545", fontSize: "0.875rem"}}>{getFieldError("Demand kW")}</span>}
            </label>
            <label style={labelStyle}>
              Reactive Energy (kVArh):
              <input 
                value={reactive} 
                onChange={handleInputChange(setReactive, "Reactive kVArh")} 
                type="number" 
                min="0" 
                step="0.01"
                style={getFieldError("Reactive kVArh") ? errorInputStyle : inputStyle}
                placeholder="Enter reactive energy (optional)"
              />
              {getFieldError("Reactive kVArh") && <span style={{color: "#dc3545", fontSize: "0.875rem"}}>{getFieldError("Reactive kVArh")}</span>}
            </label>
          </>
        );
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(value);
  const formatNumber = (value: number) =>
    new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value);
  const formatCurrency4 = (value: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(value);

  const getGroupLabel = (g: Group) => {
    switch (g) {
      case "household_two": return "Household — 2-tariff (A1/A2)";
      case "household_one": return "Household — 1-tariff";
      case "group_1": return "Business 35 kV (Group 1)";
      case "group_2": return "Business 10 kV (Group 2)";
      case "group_3": return "Business 0.4 kV Category I (Group 3)";
      case "group_4": return "Business 0.4 kV Category II (Group 4)";
      case "group_7": return "Household per meter (Group 7)";
      case "group_8": return "Public lighting (Group 8)";
    }
  };

  const centsToEuro = (cents: number) => cents / 100;

  const onPrint = () => {
    window.print();
  };

  const containerStyle = {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "1rem",
    fontFamily: "system-ui, -apple-system, sans-serif"
  };

  const formStyle = {
    display: "grid",
    gap: "1rem",
    backgroundColor: "#f8f9fa",
    padding: "1.5rem",
    borderRadius: "8px",
    border: "1px solid #e9ecef"
  };

  const selectStyle = {
    padding: "0.5rem",
    border: "2px solid #e1e5e9",
    borderRadius: "4px",
    fontSize: "1rem",
    backgroundColor: "white",
    cursor: "pointer"
  };

  const buttonStyle = {
    padding: "0.75rem 1.5rem",
    backgroundColor: loading ? "#6c757d" : "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "background-color 0.2s"
  };

  return (
    <section style={containerStyle}>
      <style>
        {`@page { size: A4; margin: 12mm; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            body * { visibility: hidden; }
            .invoice-print-area, .invoice-print-area * { visibility: visible; }
            .invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
            /* Compact styles to fit one page */
            .invoice-print-area { font-size: 12px; }
            .invoice-print-area h1, .invoice-print-area h2, .invoice-print-area h3 { margin: 0.25rem 0; }
            .invoice-print-area table th, .invoice-print-area table td { padding: 4px !important; }
            .invoice-print-area .cards-compact > div { padding: 8px !important; }
            .invoice-print-area .total-compact { font-size: 20px !important; }
            .invoice-print-area .print-hide { display: none !important; }
          }`}
      </style>
      <form onSubmit={handleSubmit} style={formStyle}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontWeight: "500" }}>
          Tariff Group:
          <select value={group} onChange={handleGroupChange} style={selectStyle}>
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

        {validationErrors.some(e => e.field === "consumption") && (
          <div style={{color: "#dc3545", fontSize: "0.875rem", fontWeight: "500"}}>
            {validationErrors.find(e => e.field === "consumption")?.message}
          </div>
        )}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Calculating..." : "Calculate Bill"}
        </button>
      </form>

      {error && (
        <div style={{ 
          marginTop: "1rem", 
          padding: "1rem", 
          backgroundColor: "#f8d7da", 
          color: "#721c24", 
          border: "1px solid #f5c6cb", 
          borderRadius: "4px" 
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="invoice-print-area" style={{ 
          marginTop: "1rem", 
          backgroundColor: "white", 
          border: "1px solid #e9ecef", 
          borderRadius: "8px",
          overflow: "hidden"
        }}>
          <div style={{ 
            backgroundColor: "#e9ecef", 
            padding: "1rem", 
            fontWeight: "600",
            fontSize: "1.125rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap" as const
          }}>
            <span>Invoice Details</span>
            <div>
              <button type="button" className="no-print" onClick={onPrint} style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}>Print / Save PDF</button>
            </div>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ color: "#495057", fontWeight: 600 }}>{getGroupLabel(result.group)}</div>
              <div style={{ color: "#6c757d", fontSize: "0.95rem" }}>
                {(() => {
                  const g = result.group as Group;
                  const supply = g === 'household_two' ? tariffs.group_5.supply_level
                    : g === 'household_one' ? tariffs.group_6.supply_level
                    : g === 'group_1' ? tariffs.group_1.supply_level
                    : g === 'group_2' ? tariffs.group_2.supply_level
                    : g === 'group_3' ? tariffs.group_3.supply_level
                    : g === 'group_4' ? tariffs.group_4.supply_level
                    : g === 'group_7' ? tariffs.group_7.supply_level
                    : tariffs.group_8.supply_level;
                  return `Supply level: ${supply}`;
                })()}
              </div>
              <div style={{ color: "#6c757d", fontSize: "0.95rem" }}>
                {`Invoice date: ${new Date().toLocaleString()}`}
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <caption style={{ textAlign: "left", paddingBottom: "0.5rem", fontWeight: 600 }}>Rate and block breakdown</caption>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #e9ecef", padding: "0.5rem" }}>Item</th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid #e9ecef", padding: "0.5rem" }}>kWh/Qty</th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid #e9ecef", padding: "0.5rem" }}>Rate</th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid #e9ecef", padding: "0.5rem" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows: Array<JSX.Element> = [];
                    const g = result.group as Group;
                    if (g === 'household_two') {
                      const b = result.blocks || {};
                      const t = tariffs.group_5;
                      const rA1B1 = centsToEuro(t.block_1.high);
                      const rA2B1 = centsToEuro(t.block_1.low);
                      const rA1B2 = centsToEuro(t.block_2.high);
                      const rA2B2 = centsToEuro(t.block_2.low);
                      rows.push(
                        <tr key="a1b1">
                          <td style={{ padding: "0.5rem" }}>A1 Block 1</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(b.a1_block1_kwh || 0)}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rA1B1)}/kWh</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(b.a1_block1_cost || 0)}</td>
                        </tr>
                      );
                      rows.push(
                        <tr key="a2b1">
                          <td style={{ padding: "0.5rem" }}>A2 Block 1</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(b.a2_block1_kwh || 0)}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rA2B1)}/kWh</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(b.a2_block1_cost || 0)}</td>
                        </tr>
                      );
                      if ((b.a1_block2_kwh || 0) > 0 || (b.a2_block2_kwh || 0) > 0) {
                        rows.push(
                          <tr key="a1b2">
                            <td style={{ padding: "0.5rem" }}>A1 Block 2</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(b.a1_block2_kwh || 0)}</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rA1B2)}/kWh</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(b.a1_block2_cost || 0)}</td>
                          </tr>
                        );
                        rows.push(
                          <tr key="a2b2">
                            <td style={{ padding: "0.5rem" }}>A2 Block 2</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(b.a2_block2_kwh || 0)}</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rA2B2)}/kWh</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(b.a2_block2_cost || 0)}</td>
                          </tr>
                        );
                      }
                    } else if (g === 'household_one') {
                      const b = result.blocks || {};
                      const t = tariffs.group_6;
                      const rB1 = centsToEuro(t.block_1.single);
                      const rB2 = centsToEuro(t.block_2.single);
                      rows.push(
                        <tr key="b1">
                          <td style={{ padding: "0.5rem" }}>Block 1 (0–800 kWh)</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(b.block1_kwh || 0)}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rB1)}/kWh</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(b.block1_cost || 0)}</td>
                        </tr>
                      );
                      if ((b.block2_kwh || 0) > 0) {
                        rows.push(
                          <tr key="b2">
                            <td style={{ padding: "0.5rem" }}>Block 2 (800+ kWh)</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(b.block2_kwh || 0)}</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rB2)}/kWh</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(b.block2_cost || 0)}</td>
                          </tr>
                        );
                      }
                    } else if (g === 'group_1' || g === 'group_2') {
                      const high = result.inputs?.high_kwh || 0;
                      const low = result.inputs?.low_kwh || 0;
                      const t = g === 'group_1' ? tariffs.group_1 : tariffs.group_2;
                      const rHigh = centsToEuro(t.active_energy.high);
                      const rLow = centsToEuro(t.active_energy.low);
                      rows.push(
                        <tr key="high">
                          <td style={{ padding: "0.5rem" }}>High tariff</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(high)}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rHigh)}/kWh</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(high * rHigh)}</td>
                        </tr>
                      );
                      rows.push(
                        <tr key="low">
                          <td style={{ padding: "0.5rem" }}>Low tariff</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(low)}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rLow)}/kWh</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(low * rLow)}</td>
                        </tr>
                      );
                    } else if (g === 'group_3') {
                      const high = result.inputs?.high_kwh || 0;
                      const low = result.inputs?.low_kwh || 0;
                      const demandKw = result.inputs?.demand_kw || 0;
                      const reactive = result.inputs?.reactive_kvarh || 0;
                      const t = tariffs.group_3;
                      const rHigh = centsToEuro(t.active_energy.high);
                      const rLow = centsToEuro(t.active_energy.low);
                      const rDemand = t.demand_charge; // €/kW
                      const rReactive = centsToEuro(t.reactive_energy); // €/kVArh
                      rows.push(
                        <tr key="high">
                          <td style={{ padding: "0.5rem" }}>High tariff</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(high)}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rHigh)}/kWh</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(high * rHigh)}</td>
                        </tr>
                      );
                      rows.push(
                        <tr key="low">
                          <td style={{ padding: "0.5rem" }}>Low tariff</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(low)}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rLow)}/kWh</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(low * rLow)}</td>
                        </tr>
                      );
                      if (demandKw > 0) {
                        rows.push(
                          <tr key="demand">
                            <td style={{ padding: "0.5rem" }}>Demand charge</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(demandKw)} kW</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rDemand)}/kW</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(demandKw * rDemand)}</td>
                          </tr>
                        );
                      }
                      if (reactive > 0) {
                        rows.push(
                          <tr key="reactive">
                            <td style={{ padding: "0.5rem" }}>Reactive energy</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(reactive)} kVArh</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(rReactive)}/kVArh</td>
                            <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(reactive * rReactive)}</td>
                          </tr>
                        );
                      }
                    } else {
                      // single-rate groups 4,7,8
                      const totalKwh = result.inputs?.total_kwh || 0;
                      const t = g === 'group_4' ? tariffs.group_4 : g === 'group_7' ? tariffs.group_7 : tariffs.group_8;
                      const r = centsToEuro(t.active_energy.single);
                      rows.push(
                        <tr key="single">
                          <td style={{ padding: "0.5rem" }}>Active energy</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatNumber(totalKwh)}</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency4(r)}/kWh</td>
                          <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatCurrency(totalKwh * r)}</td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>

            <div className="cards-compact" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: "1rem" }}>
              <div style={{ padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "4px", border: "1px solid #e9ecef" }}>
                <div style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "0.25rem" }}>Fixed Fee</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{formatCurrency(result.fixed_fee)}</div>
              </div>
              <div style={{ padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "4px", border: "1px solid #e9ecef" }}>
                <div style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "0.25rem" }}>Energy Cost</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{formatCurrency(result.energy_cost)}</div>
              </div>
              {typeof result.demand_cost === 'number' && result.demand_cost > 0 && (
                <div style={{ padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "4px", border: "1px solid #e9ecef" }}>
                  <div style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "0.25rem" }}>Demand Charge</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{formatCurrency(result.demand_cost)}</div>
                </div>
              )}
              {typeof result.reactive_cost === 'number' && result.reactive_cost > 0 && (
                <div style={{ padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "4px", border: "1px solid #e9ecef" }}>
                  <div style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "0.25rem" }}>Reactive Energy</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{formatCurrency(result.reactive_cost)}</div>
                </div>
              )}
              <div style={{ padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "4px", border: "1px solid #e9ecef" }}>
                <div style={{ fontSize: "0.875rem", color: "#6c757d", marginBottom: "0.25rem" }}>Tax (8%)</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{formatCurrency(result.tax)}</div>
              </div>
              <div style={{ padding: "1rem", backgroundColor: "#d1ecf1", borderRadius: "4px", border: "2px solid #bee5eb", gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "0.875rem", color: "#0c5460", marginBottom: "0.25rem" }}>Total Bill</div>
                <div className="total-compact" style={{ fontSize: "2rem", fontWeight: 700, color: "#0c5460" }}>{formatCurrency(result.final_bill)}</div>
              </div>
            </div>

            {(() => {
              // Effective unit price
              let totalKwh = 0;
              const g = result.group as Group;
              if (g === 'household_two') totalKwh = (result.inputs?.a1_kwh || 0) + (result.inputs?.a2_kwh || 0);
              else if (g === 'household_one' || g === 'group_4' || g === 'group_7' || g === 'group_8') totalKwh = result.inputs?.total_kwh || 0;
              else if (g === 'group_1' || g === 'group_2' || g === 'group_3') totalKwh = (result.inputs?.high_kwh || 0) + (result.inputs?.low_kwh || 0);
              const effective = totalKwh > 0 ? result.final_bill / totalKwh : null;
              return (
                <div className="print-hide" style={{ marginTop: "0.75rem", color: "#6c757d" }}>
                  Effective unit price: {effective ? `${formatCurrency(effective)}/kWh` : '—'}
                </div>
              );
            })()}

            <div className="print-hide" style={{ marginTop: "1rem", color: "#6c757d", fontSize: "0.9rem" }}>
              <div>Tariff periods:</div>
              <ul style={{ marginTop: "0.25rem" }}>
                <li>High tariff: {tariffs.tariff_periods.high_tariff.winter} (winter), {tariffs.tariff_periods.high_tariff.summer} (summer)</li>
                <li>Low tariff: {tariffs.tariff_periods.low_tariff}</li>
                <li>Reactive energy applies if cos φ &lt; 0.95</li>
              </ul>
              <div style={{ marginTop: "0.5rem" }}>Note: Rates in data are c€/kWh converted to €/kWh for calculations.</div>
              <div style={{ marginTop: "0.25rem" }}>Disclaimer: Estimation only; official bills may differ.</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
