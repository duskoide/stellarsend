// Prefixed id generator (e.g. "usr_", "tf_", "clq_").
export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}
