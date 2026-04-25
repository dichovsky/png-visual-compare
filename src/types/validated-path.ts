declare const __validatedPath: unique symbol;

export type ValidatedPath = string & { readonly [__validatedPath]: never };
