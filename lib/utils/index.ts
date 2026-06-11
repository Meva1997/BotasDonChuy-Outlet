export function formatPrice(amount: number) {
  return `$${amount.toLocaleString("es-MX")}`;
}
