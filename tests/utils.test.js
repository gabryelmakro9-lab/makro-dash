import { describe, it, expect } from "vitest";
import { parseValorMonetario, formatarMoeda, formatarData, converterDataExcel, normalizarBem, EMAIL_REGEX } from "../js/utils.js";

describe("parseValorMonetario", () => {
  it("deve retornar 0 para null/undefined", () => {
    expect(parseValorMonetario(null)).toBe(0);
    expect(parseValorMonetario(undefined)).toBe(0);
  });

  it("deve retornar o valor para numeros validos", () => {
    expect(parseValorMonetario(1000)).toBe(1000);
    expect(parseValorMonetario(0)).toBe(0);
    expect(parseValorMonetario(-50)).toBe(-50);
  });

  it("deve retornar 0 para NaN ou Infinity", () => {
    expect(parseValorMonetario(NaN)).toBe(0);
    expect(parseValorMonetario(Infinity)).toBe(0);
  });

  it("deve converter string com virgula como separador decimal", () => {
    expect(parseValorMonetario("1.500,50")).toBe(1500.50);
  });

  it("deve converter string com ponto como separador decimal", () => {
    expect(parseValorMonetario("1500.50")).toBe(1500.50);
  });

  it("deve converter string com ponto como separador de milhar", () => {
    expect(parseValorMonetario("1.500")).toBe(1500);
  });

  it("deve converter string com virgula e ponto (BR)", () => {
    expect(parseValorMonetario("1.234,56")).toBe(1234.56);
  });

  it("deve retornar 0 para string vazia", () => {
    expect(parseValorMonetario("")).toBe(0);
    expect(parseValorMonetario("   ")).toBe(0);
  });
});

describe("formatarMoeda", () => {
  it("deve formatar valor em moeda BRL", () => {
    const result = formatarMoeda(1234.56);
    expect(result).toContain("1.234");
    expect(result).toContain("56");
  });

  it("deve formatar zero", () => {
    expect(formatarMoeda(0)).toContain("0");
  });
});

describe("formatarData", () => {
  it("deve retornar string vazia para null/undefined", () => {
    expect(formatarData(null)).toBe("");
    expect(formatarData(undefined)).toBe("");
  });

  it("deve formatar Date para locale pt-BR", () => {
    const data = new Date(2024, 0, 15);
    expect(formatarData(data)).toBe("15/01/2024");
  });

  it("deve retornar string vazia para data invalida", () => {
    expect(formatarData(new Date("invalid"))).toBe("");
  });
});

describe("converterDataExcel", () => {
  it("deve converter numero serial do Excel", () => {
    const result = converterDataExcel(45340);
    expect(result instanceof Date).toBe(true);
    expect(result.getFullYear()).toBeGreaterThanOrEqual(2023);
    expect(result.getFullYear()).toBeLessThanOrEqual(2025);
  });

  it("deve retornar string vazia para falsy values", () => {
    expect(converterDataExcel(0)).toBe("");
    expect(converterDataExcel("")).toBe("");
  });

  it("deve converter string DD/MM/YYYY", () => {
    const result = converterDataExcel("15/01/2024");
    expect(result instanceof Date).toBe(true);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(0);
    expect(result.getFullYear()).toBe(2024);
  });

  it("deve converter string DD-MM-YYYY", () => {
    const result = converterDataExcel("15-01-2024");
    expect(result instanceof Date).toBe(true);
    expect(result.getDate()).toBe(15);
  });

  it("deve converter string ISO YYYY-MM-DD", () => {
    const result = converterDataExcel("2024-01-15");
    expect(result instanceof Date).toBe(true);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(0);
    expect(result.getFullYear()).toBe(2024);
  });
});

describe("normalizarBem", () => {
  it("deve remover espacos e converter para maiusculo", () => {
    expect(normalizarBem("  ABC-123  ")).toBe("ABC-123");
  });

  it("deve retornar string vazia para null", () => {
    expect(normalizarBem(null)).toBe("");
  });
});

describe("EMAIL_REGEX", () => {
  it("deve validar emails corretos", () => {
    expect(EMAIL_REGEX.test("teste@email.com")).toBe(true);
    expect(EMAIL_REGEX.test("nome.sobrenome@empresa.com.br")).toBe(true);
  });

  it("deve rejeitar emails invalidos", () => {
    expect(EMAIL_REGEX.test("invalido")).toBe(false);
    expect(EMAIL_REGEX.test("teste@")).toBe(false);
    expect(EMAIL_REGEX.test("")).toBe(false);
  });
});
