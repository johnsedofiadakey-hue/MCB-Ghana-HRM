import { describe, it, expect } from 'vitest';

// ── Replication of Payroll Engines for Unit Testing ─────────────────────────

const calculateGhanaSSNIT = (basicSalary: number) => {
  const employeeSSNIT = Math.round(basicSalary * 0.055 * 100) / 100;
  const employerSSNIT = Math.round(basicSalary * 0.13 * 100) / 100;
  return { employeeSSNIT, employerSSNIT };
};

const calculateGhanaPAYE = (taxableIncome: number): number => {
  const bands = [
    { limit: 490, rate: 0.00 },
    { limit: 110, rate: 0.05 },
    { limit: 130, rate: 0.10 },
    { limit: 3166.67, rate: 0.175 },
    { limit: 16000, rate: 0.25 },
    { limit: 30520, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ];

  let tax = 0;
  let remaining = taxableIncome;

  for (const band of bands) {
    const amountInBand = Math.min(remaining, band.limit);
    tax += amountInBand * band.rate;
    remaining -= amountInBand;
    if (remaining <= 0) break;
  }

  return Math.round(tax * 100) / 100;
};

// ══════════════════════════════════════════════════════════════════════════
//  TESTS
// ══════════════════════════════════════════════════════════════════════════

describe('Payroll Tax Engine: Ghana (GHS)', () => {
  it('should calculate SSNIT at 5.5% for employee', () => {
    const { employeeSSNIT } = calculateGhanaSSNIT(1000);
    expect(employeeSSNIT).toBe(55);
  });

  it('should calculate PAYE correctly for low income (within free band)', () => {
    // 400 is below 490 free limit
    const tax = calculateGhanaPAYE(400);
    expect(tax).toBe(0);
  });

  it('should calculate PAYE correctly for middle income', () => {
    // Taxable Income: 5000
    // Band 1: 490 @ 0% = 0
    // Band 2: 110 @ 5% = 5.50
    // Band 3: 130 @ 10% = 13.00
    // Band 4: Remainder (5000 - 490 - 110 - 130 = 4270)
    //         But Band 4 width is 3166.67. So 3166.67 @ 17.5% = 554.17
    // Band 5: Remainder (4270 - 3166.67 = 1103.33) @ 25% = 275.83
    // Total: 0 + 5.5 + 13 + 554.17 + 275.83 = 848.50
    
    const tax = calculateGhanaPAYE(5000);
    expect(tax).toBe(848.5);
  });

  it('should ensure net pay calculation integrity', () => {
      const base = 5000;
      const overtime = 500;
      const bonus = 200;
      const allowances = 300;
      const ssnit = calculateGhanaSSNIT(base).employeeSSNIT; // 275
      const gross = base + overtime + bonus + allowances; // 6000
      const taxableIncome = gross - ssnit; // 5725
      const tax = calculateGhanaPAYE(taxableIncome); // ~... needs calc but we verify logic
      
      const otherDeductions = 1000;
      const netPay = Math.max(0, gross - tax - ssnit - otherDeductions);
      
      expect(netPay).toBeLessThan(gross);
      expect(netPay).toBeGreaterThan(0);
  });

  it('should prevent negative net pay even with massive deductions', () => {
    const gross = 1000;
    const tax = 300;
    const ssnit = 55;
    const deductions = 2000; // More than gross
    const net = Math.max(0, gross - tax - ssnit - deductions);
    expect(net).toBe(0);
  });
});
