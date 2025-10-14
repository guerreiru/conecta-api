/**
 * Verifica se o valor informado é um número válido maior que zero.
 * @param value Valor a ser validado.
 * @returns true se for um número válido > 0, caso contrário false.
 */
export function isValidPrice(value: unknown): boolean {
  if (typeof value === "string") {
    value = value.trim().replace(",", ".");
  }

  const num = Number(value);
  return !isNaN(num) && isFinite(num) && num > 0;
}
