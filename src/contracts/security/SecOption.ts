import { z } from 'zod';

const SecOptionOperationSchema = z.object({
  TypeOperation: z.number().int().min(1).max(5),
});

const SecOptionLevelSchema = z.object({ TypeLevel: z.number().int() });
const SecOptionPermissionSchema = z.object({ OspPermission: z.string() });

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
  Operations: z
    .array(SecOptionOperationSchema)
    .nullish()
    .transform((value) => value ?? []),
  Levels: z
    .array(SecOptionLevelSchema)
    .nullish()
    .transform((value) => value ?? []),
  SpecialPermissions: z
    .array(SecOptionPermissionSchema)
    .nullish()
    .transform((value) => value ?? []),
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
