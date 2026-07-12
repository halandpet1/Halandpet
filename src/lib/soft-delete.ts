export function withActiveFilter<T extends Record<string, unknown>>(where: T = {} as T) {
  return { ...where, deletedAt: null } as T & { deletedAt: null };
}
