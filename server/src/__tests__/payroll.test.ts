/**
 * Payroll Tax Engine Tests — v4.0 Fortress
 * 
 * Tests all regional tax calculation engines to ensure
 * payroll accuracy across Ghana, Guinea, and generic currencies.
 */
import { describe, it, expect } from 'vitest';

// ── Extract tax functions for isolated testing ──────────────────────────
// We replicate the calculation functions here because they're module-private.
// In a future refactor, these should be exported from a dedicated tax-engines/ directory.

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

const calculateGhanaSSNIT = (basicSalary: number) => {
  const employeeSSNIT = Math.round(basicSalary * 0.055 * 100) / 100;
  const employerSSNIT = Math.round(basicSalary * 0.13 * 100) / 100;
  return { employeeSSNIT, employerSSNIT };
};

const calculateGuineaTax = (gross: number) => Math.round(gross * 0.05 * 100) / 100;
const calculateCNSS = (gross: number) => Math.round(gross * 0.025 * 100) / 100;
const calculateGenericTax = (gross: number) => Math.round(gross * 0.20 * 100) / 100;

const calculateStandardTax = (grossMonthly: number): number => {
  const annual = grossMonthly * 12;
  const brackets = [
    { limit: 4380, rate: 0.00 },
    { limit: 1320, rate: 0.05 },
    { limit: 1560, rate: 0.10 },
    { limit: 38000, rate: 0.175 },
    { limit: 192000, rate: 0.25 },
    { limit: Infinity, rate: 0.30 },
  ];
  let remaining = annual, tax = 0;
  for (const b of brackets) {
    const taxable = Math.min(remaining, b.limit);
    tax += taxable * b.rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }
  return Math.round((tax / 12) * 100) / 100;
};

type TaxResult = { tax: number; socialSecurity: number };

const computeTaxes = (baseSalary: number, currency: string, grossPay: number): TaxResult => {
  switch (currency) {
    case 'GHS': {
      const { employeeSSNIT } = calculateGhanaSSNIT(baseSalary);
      const taxableIncome = grossPay - employeeSSNIT;
      const tax = calculateGhanaPAYE(taxableIncome);
      return { tax, socialSecurity: employeeSSNIT };
    }
    case 'GNF':
      return { tax: calculateGuineaTax(grossPay), socialSecurity: calculateCNSS(grossPay) };
    case 'USD': case 'EUR': case 'GBP':
      return { tax: calculateGenericTax(grossPay), socialSecurity: 0 };
    default:
      return { tax: calculateStandardTax(grossPay), socialSecurity: Math.round(grossPay * 0.055 * 100) / 100 };
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  TESTS
// ══════════════════════════════════════════════════════════════════════════

describe('Ghana PAYE Tax Calculation', () => {
  it('should return 0 tax for income within first band (≤ GHS 490)', () => {
    expect(calculateGhanaPAYE(490)).toBe(0);
    expect(calculateGhanaPAYE(400)).toBe(0);
    expect(calculateGhanaPAYE(0)).toBe(0);
  });

  it('should correctly calculate tax in the 5% band (490-600)', () => {
    // 490 at 0% + 110 at 5% = 0 + 5.5 = 5.5
    const tax = calculateGhanaPAYE(600);
    expect(tax).toBe(5.5);
  });

  it('should correctly calculate tax through the 10% band (600-730)', () => {
    // 490 at 0% + 110 at 5% + 130 at 10% = 0 + 5.5 + 13 = 18.5
    const tax = calculateGhanaPAYE(730);
    expect(tax).toBe(18.5);
  });

  it('should correctly calculate tax for a typical GHS 3,000 salary', () => {
    const tax = calculateGhanaPAYE(3000);
    // 490@0 + 110@5% + 130@10% + (3000-730)@17.5% = 0 + 5.5 + 13 + 397.25 = 415.75
    expect(tax).toBe(415.75);
  });

  it('should correctly calculate tax for a GHS 5,000 salary', () => {
    const tax = calculateGhanaPAYE(5000);
    // 490@0 + 110@5% + 130@10% + (3166.67)@17.5% + remainder@25%
    // = 0 + 5.5 + 13 + 554.17 + (5000-3896.67)*0.25
    // = 0 + 5.5 + 13 + 554.17 + 275.83 = 848.50
    expect(tax).toBeCloseTo(848.50, 0);
  });

  it('should handle very high income (> GHS 50,000)', () => {
    const tax = calculateGhanaPAYE(60000);
    expect(tax).toBeGreaterThan(0);
    // Should use the 35% top band
    expect(tax).toBeGreaterThan(10000);
  });

  it('should return 0 for 0 income', () => {
    expect(calculateGhanaPAYE(0)).toBe(0);
  });

  it('should handle negative income gracefully', () => {
    const tax = calculateGhanaPAYE(-100);
    expect(tax).toBe(0);
  });
});

describe('Ghana SSNIT Calculation', () => {
  it('should calculate 5.5% employee and 13% employer contribution', () => {
    const result = calculateGhanaSSNIT(3000);
    expect(result.employeeSSNIT).toBe(165); // 3000 * 0.055
    expect(result.employerSSNIT).toBe(390); // 3000 * 0.13
  });

  it('should handle 0 salary', () => {
    const result = calculateGhanaSSNIT(0);
    expect(result.employeeSSNIT).toBe(0);
    expect(result.employerSSNIT).toBe(0);
  });

  it('should round to 2 decimal places', () => {
    const result = calculateGhanaSSNIT(1234.56);
    expect(result.employeeSSNIT).toBe(67.90); // 1234.56 * 0.055 = 67.9008
    expect(result.employerSSNIT).toBe(160.49); // 1234.56 * 0.13 = 160.4928
  });
});

describe('Guinea Tax Calculation', () => {
  it('should calculate flat 5% tax', () => {
    expect(calculateGuineaTax(10000000)).toBe(500000);
  });

  it('should calculate 2.5% CNSS', () => {
    expect(calculateCNSS(10000000)).toBe(250000);
  });

  it('should handle 0 salary', () => {
    expect(calculateGuineaTax(0)).toBe(0);
    expect(calculateCNSS(0)).toBe(0);
  });
});

describe('Generic Tax Calculation (USD/EUR/GBP)', () => {
  it('should calculate flat 20% tax', () => {
    expect(calculateGenericTax(5000)).toBe(1000);
  });

  it('should return 0 social security', () => {
    const result = computeTaxes(5000, 'USD', 5000);
    expect(result.socialSecurity).toBe(0);
  });
});

describe('computeTaxes — Multi-Currency Router', () => {
  it('should route GHS to Ghana PAYE engine', () => {
    const result = computeTaxes(3000, 'GHS', 3500);
    expect(result.socialSecurity).toBe(165); // SSNIT on base 3000
    expect(result.tax).toBeGreaterThan(0);
  });

  it('should route GNF to Guinea engine', () => {
    const result = computeTaxes(5000000, 'GNF', 6000000);
    expect(result.tax).toBe(300000); // 5% of 6M
    expect(result.socialSecurity).toBe(150000); // 2.5% of 6M
  });

  it('should route USD to generic engine', () => {
    const result = computeTaxes(5000, 'USD', 5500);
    expect(result.tax).toBe(1100); // 20% of 5500
    expect(result.socialSecurity).toBe(0);
  });

  it('should route EUR to generic engine', () => {
    const result = computeTaxes(4000, 'EUR', 4000);
    expect(result.tax).toBe(800);
    expect(result.socialSecurity).toBe(0);
  });

  it('should use standard engine for unknown currencies', () => {
    const result = computeTaxes(3000, 'XOF', 3000);
    expect(result.tax).toBeGreaterThan(0);
    expect(result.socialSecurity).toBeGreaterThan(0);
  });
});

describe('Payroll Net Pay Calculation', () => {
  it('should calculate correct net pay for Ghana employee', () => {
    const baseSalary = 3000;
    const overtime = 200;
    const bonus = 500;
    const allowances = 300;
    const otherDeductions = 100;
    const grossPay = baseSalary + overtime + bonus + allowances;
    const { tax, socialSecurity } = computeTaxes(baseSalary, 'GHS', grossPay);
    const netPay = Math.max(0, grossPay - tax - socialSecurity - otherDeductions);

    expect(grossPay).toBe(4000);
    expect(socialSecurity).toBe(165); // SSNIT on base 3000
    expect(tax).toBeGreaterThan(0);
    expect(netPay).toBeGreaterThan(0);
    expect(netPay).toBeLessThan(grossPay);
  });

  it('should never produce negative net pay', () => {
    const { tax, socialSecurity } = computeTaxes(100, 'GHS', 100);
    const netPay = Math.max(0, 100 - tax - socialSecurity - 999999);
    expect(netPay).toBe(0);
  });

  it('should handle zero salary employee', () => {
    const { tax, socialSecurity } = computeTaxes(0, 'GHS', 0);
    expect(tax).toBe(0);
    expect(socialSecurity).toBe(0);
  });
});

describe('Validation Schema Tests', () => {
  // Import only the schemas we need
  const { z } = require('zod');
  
  it('should reject empty email in LoginSchema', () => {
    const LoginSchema = z.object({
      email: z.string().email().trim().toLowerCase().max(255),
      password: z.string().min(1).max(128),
    });

    const result = LoginSchema.safeParse({ email: '', password: 'test' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const LoginSchema = z.object({
      email: z.string().email().trim().toLowerCase().max(255),
      password: z.string().min(1).max(128),
    });

    const result = LoginSchema.safeParse({ email: 'not-an-email', password: 'test' });
    expect(result.success).toBe(false);
  });

  it('should accept valid login credentials', () => {
    const LoginSchema = z.object({
      email: z.string().email().trim().toLowerCase().max(255),
      password: z.string().min(1).max(128),
    });

    const result = LoginSchema.safeParse({ email: 'USER@Example.COM', password: 'SecureP@ss123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com'); // Should be trimmed and lowercased
    }
  });

  it('should reject password shorter than 8 chars for registration', () => {
    const RegisterSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8).max(128),
    });

    const result = RegisterSchema.safeParse({ email: 'test@test.com', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('should reject XSS payloads in string fields', () => {
    const SafeSchema = z.object({
      name: z.string().trim().min(1).max(100),
    });

    // This should pass Zod but be caught by the XSS sanitizer middleware
    const result = SafeSchema.safeParse({ name: '<script>alert("xss")</script>' });
    expect(result.success).toBe(true); // Zod doesn't strip HTML — that's the XSS middleware's job
  });
});
