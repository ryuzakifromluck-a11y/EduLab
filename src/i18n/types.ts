/** Translation files for other languages must mirror the English shape exactly. */
export type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> }
