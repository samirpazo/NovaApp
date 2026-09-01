import { z } from 'zod';

const SecOptionSchemaBase = z.object({
  OptID: z.number().int().positive(),
  TypeOption: z.number().int(),
  OptCode: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  OptName: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  OptIcon: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  OptIsMobile: z.boolean(),
  OptParent: z
    .number()
    .int()
    .nullish()
    .transform((value) => value ?? null),
  OptOrder: z.number().int(),
});

export type SecOption = z.infer<typeof SecOptionSchemaBase> & {
  Children: SecOption[];
};

export const SecOptionSchema: z.ZodType<SecOption> = SecOptionSchemaBase.extend(
  {
    Children: z
      .array(z.lazy(() => SecOptionSchema))
      .nullish()
      .transform((value) => value ?? []),
  },
);
