import { describe, it, expect } from 'vitest';
import { billHouseholdTwo, billHouseholdOne, billSingleRateNoBlocks, billDualRateNoBlocks, calculateForGroup } from './billing';
import tariffs from '../data/tariffs_2025.json';

describe('Billing Calculations', () => {
  describe('billHouseholdTwo', () => {
    it('should calculate correctly for basic usage under threshold', () => {
      const result = billHouseholdTwo(tariffs as any, 300, 200);
      
      expect(result.group).toBe('household_two');
      expect(result.inputs.a1_kwh).toBe(300);
      expect(result.inputs.a2_kwh).toBe(200);
      expect(result.final_bill).toBeGreaterThan(0);
      expect(result.tax).toBe(result.net_amount * 0.08);
      
      // Check that all blocks are properly calculated
      expect(result.blocks.a1_block1_kwh + result.blocks.a2_block1_kwh).toBe(500);
      expect(result.blocks.a1_block2_kwh).toBe(0);
      expect(result.blocks.a2_block2_kwh).toBe(0);
    });

    it('should handle usage above 800 kWh threshold', () => {
      const result = billHouseholdTwo(tariffs as any, 600, 400);
      
      expect(result.inputs.a1_kwh + result.inputs.a2_kwh).toBe(1000);
      expect(result.blocks.a1_block2_kwh).toBeGreaterThan(0);
      expect(result.blocks.a2_block2_kwh).toBeGreaterThan(0);
      
      // Total should be 800 in block 1, 200 in block 2
      expect(result.blocks.a1_block1_kwh + result.blocks.a2_block1_kwh).toBe(800);
      expect(result.blocks.a1_block2_kwh + result.blocks.a2_block2_kwh).toBe(200);
    });

    it('should handle zero consumption', () => {
      const result = billHouseholdTwo(tariffs as any, 0, 0);
      
      expect(result.energy_cost).toBe(0);
      expect(result.final_bill).toBeCloseTo(result.fixed_fee * 1.08, 2); // Only fixed fee + tax
    });

    it('should maintain proportional distribution between A1 and A2', () => {
      const result = billHouseholdTwo(tariffs as any, 600, 300); // 2:1 ratio
      
      const totalBlock1 = result.blocks.a1_block1_kwh + result.blocks.a2_block1_kwh;
      const totalBlock2 = result.blocks.a1_block2_kwh + result.blocks.a2_block2_kwh;
      
      if (totalBlock1 > 0) {
        expect(result.blocks.a1_block1_kwh / totalBlock1).toBeCloseTo(2/3, 2);
      }
      if (totalBlock2 > 0) {
        expect(result.blocks.a1_block2_kwh / totalBlock2).toBeCloseTo(2/3, 2);
      }
    });
  });

  describe('billHouseholdOne', () => {
    it('should calculate correctly for single tariff under threshold', () => {
      const result = billHouseholdOne(tariffs as any, 500);
      
      expect(result.group).toBe('household_one');
      expect(result.inputs.total_kwh).toBe(500);
      expect(result.blocks.block1_kwh).toBe(500);
      expect(result.blocks.block2_kwh).toBe(0);
      expect(result.final_bill).toBeGreaterThan(0);
    });

    it('should handle usage above 800 kWh threshold', () => {
      const result = billHouseholdOne(tariffs as any, 1200);
      
      expect(result.blocks.block1_kwh).toBe(800);
      expect(result.blocks.block2_kwh).toBe(400);
      expect(result.blocks.block1_cost).toBeGreaterThan(0);
      expect(result.blocks.block2_cost).toBeGreaterThan(0);
    });

    it('should apply correct tariff rates', () => {
      const result = billHouseholdOne(tariffs as any, 1000);
      const expectedBlock1Cost = 800 * (tariffs.group_6.block_1.single / 100);
      const expectedBlock2Cost = 200 * (tariffs.group_6.block_2.single / 100);
      
      expect(result.blocks.block1_cost).toBeCloseTo(expectedBlock1Cost, 2);
      expect(result.blocks.block2_cost).toBeCloseTo(expectedBlock2Cost, 2);
    });
  });

  describe('billDualRateNoBlocks', () => {
    it('should calculate correctly for group_1', () => {
      const result = billDualRateNoBlocks(tariffs as any, 'group_1', { high_kwh: 300, low_kwh: 200 });
      
      expect(result.group).toBe('group_1');
      expect(result.inputs.high_kwh).toBe(300);
      expect(result.inputs.low_kwh).toBe(200);
      expect(result.final_bill).toBeGreaterThan(0);
      expect(result.demand_cost).toBe(0);
      expect(result.reactive_cost).toBe(0);
    });

    it('should handle group_3 with demand and reactive charges', () => {
      const result = billDualRateNoBlocks(
        tariffs as any, 
        'group_3', 
        { high_kwh: 400, low_kwh: 300, demand_kw: 50, reactive_kvarh: 100 }
      );
      
      expect(result.group).toBe('group_3');
      expect(result.demand_cost).toBeGreaterThan(0);
      expect(result.reactive_cost).toBeGreaterThan(0);
      
      const expectedDemandCost = 50 * tariffs.group_3.demand_charge;
      const expectedReactiveCost = 100 * (tariffs.group_3.reactive_energy / 100);
      
      expect(result.demand_cost).toBeCloseTo(expectedDemandCost, 2);
      expect(result.reactive_cost).toBeCloseTo(expectedReactiveCost, 2);
    });
  });

  describe('billSingleRateNoBlocks', () => {
    it('should calculate correctly for group_4', () => {
      const result = billSingleRateNoBlocks(tariffs as any, 'group_4', 1000);
      
      expect(result.group).toBe('group_4');
      expect(result.inputs.total_kwh).toBe(1000);
      expect(result.final_bill).toBeGreaterThan(0);
      
      const expectedEnergyCost = 1000 * (tariffs.group_4.active_energy.single / 100);
      expect(result.energy_cost).toBeCloseTo(expectedEnergyCost, 2);
    });

    it('should handle all single rate groups', () => {
      const groups: Array<'group_4' | 'group_7' | 'group_8'> = ['group_4', 'group_7', 'group_8'];
      
      groups.forEach(group => {
        const result = billSingleRateNoBlocks(tariffs as any, group, 500);
        expect(result.group).toBe(group);
        expect(result.final_bill).toBeGreaterThan(0);
        expect(result.inputs.total_kwh).toBe(500);
      });
    });
  });

  describe('calculateForGroup', () => {
    it('should route household_two correctly', () => {
      const payload = { group: 'household_two' as const, a1_kwh: 100, a2_kwh: 50 };
      const result = calculateForGroup(tariffs as any, payload);
      
      expect(result.group).toBe('household_two');
      expect((result as any).inputs.a1_kwh).toBe(100);
      expect((result as any).inputs.a2_kwh).toBe(50);
    });

    it('should route household_one correctly', () => {
      const payload = { group: 'household_one' as const, total_kwh: 500 };
      const result = calculateForGroup(tariffs as any, payload);
      
      expect(result.group).toBe('household_one');
      expect((result as any).inputs.total_kwh).toBe(500);
    });

    it('should route business groups correctly', () => {
      const testCases = [
        { group: 'group_1' as const, high_kwh: 300, low_kwh: 200 },
        { group: 'group_2' as const, high_kwh: 400, low_kwh: 250 },
        { group: 'group_3' as const, high_kwh: 500, low_kwh: 300, demand_kw: 25, reactive_kvarh: 50 },
        { group: 'group_4' as const, total_kwh: 1000 },
        { group: 'group_7' as const, total_kwh: 800 },
        { group: 'group_8' as const, total_kwh: 600 }
      ];

      testCases.forEach(payload => {
        const result = calculateForGroup(tariffs as any, payload);
        expect(result.group).toBe(payload.group);
        expect(result.final_bill).toBeGreaterThan(0);
      });
    });
  });

  describe('Mathematical accuracy and edge cases', () => {
    it('should handle very large consumption values', () => {
      const result = billHouseholdTwo(tariffs as any, 10000, 5000);
      expect(result.final_bill).toBeGreaterThan(0);
      expect(Number.isFinite(result.final_bill)).toBe(true);
      expect(result.blocks.a1_block1_kwh + result.blocks.a2_block1_kwh).toBe(800);
      expect(result.blocks.a1_block2_kwh + result.blocks.a2_block2_kwh).toBe(14200);
    });

    it('should round values correctly to 2 decimal places', () => {
      const result = billHouseholdTwo(tariffs as any, 123.456, 78.912);
      expect(result.inputs.a1_kwh).toBe(123.46);
      expect(result.inputs.a2_kwh).toBe(78.91);
      
      // Check that all monetary values are properly rounded
      expect(result.fixed_fee % 0.01).toBeCloseTo(0, 10);
      expect(result.energy_cost % 0.01).toBeCloseTo(0, 10);
      expect(result.tax % 0.01).toBeCloseTo(0, 10);
      expect(result.final_bill % 0.01).toBeCloseTo(0, 10);
    });

    it('should handle decimal inputs correctly', () => {
      const result = billHouseholdOne(tariffs as any, 799.99);
      expect(result.blocks.block1_kwh).toBe(799.99);
      expect(result.blocks.block2_kwh).toBe(0);
      
      const result2 = billHouseholdOne(tariffs as any, 800.01);
      expect(result2.blocks.block1_kwh).toBe(800);
      expect(result2.blocks.block2_kwh).toBe(0.01);
    });

    it('should maintain mathematical consistency', () => {
      const result = billHouseholdTwo(tariffs as any, 400, 600);
      
      // Energy cost should equal sum of all block costs
      const totalBlockCosts = 
        result.blocks.a1_block1_cost + result.blocks.a2_block1_cost +
        result.blocks.a1_block2_cost + result.blocks.a2_block2_cost;
      
      expect(result.energy_cost).toBeCloseTo(totalBlockCosts, 2);
      
      // Net amount should equal fixed fee + energy cost (+ demand/reactive if applicable)
      expect(result.net_amount).toBeCloseTo(result.fixed_fee + result.energy_cost, 2);
      
      // Tax should be 8% of net amount
      expect(result.tax).toBeCloseTo(result.net_amount * 0.08, 2);
      
      // Final bill should equal net amount + tax
      expect(result.final_bill).toBeCloseTo(result.net_amount + result.tax, 2);
    });

    it('should handle zero values gracefully', () => {
      const results = [
        billHouseholdTwo(tariffs as any, 0, 100),
        billHouseholdTwo(tariffs as any, 100, 0),
        billHouseholdOne(tariffs as any, 0),
        billSingleRateNoBlocks(tariffs as any, 'group_4', 0)
      ];

      results.forEach(result => {
        expect(result.final_bill).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result.final_bill)).toBe(true);
        expect(result.fixed_fee).toBeGreaterThan(0); // Fixed fee should always be present
      });
    });
  });

  describe('Tariff structure validation', () => {
    it('should use correct tariff rates from JSON', () => {
      const result = billHouseholdTwo(tariffs as any, 100, 100);
      
      // Verify we're using the correct tariff group
      expect(result.fixed_fee).toBe(tariffs.group_5.fixed_fee);
      
      // Check that rates are correctly applied (convert cents to euros)
      const expectedA1Cost = 100 * (tariffs.group_5.block_1.high / 100);
      const expectedA2Cost = 100 * (tariffs.group_5.block_1.low / 100);
      
      expect(result.blocks.a1_block1_cost).toBeCloseTo(expectedA1Cost, 2);
      expect(result.blocks.a2_block1_cost).toBeCloseTo(expectedA2Cost, 2);
    });

    it('should apply 8% tax rate consistently', () => {
      const testCases = [
        billHouseholdTwo(tariffs as any, 300, 200),
        billHouseholdOne(tariffs as any, 600),
        billSingleRateNoBlocks(tariffs as any, 'group_4', 800)
      ];

      testCases.forEach(result => {
        expect(result.tax / result.net_amount).toBeCloseTo(0.08, 10);
      });
    });
  });
});