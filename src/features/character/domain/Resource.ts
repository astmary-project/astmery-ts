import { z } from "zod";
import { FormulaSchema } from "../../../domain/values/mechanics";

export const ResourceSchema = z.object({
    id: z.string(),
    name: z.string(),
    max: FormulaSchema.optional(),
    min: FormulaSchema.optional(),
    initial: FormulaSchema.default('0'),
    resetMode: z.enum(['initial', 'none']).default('initial'),
});

export type Resource = z.infer<typeof ResourceSchema>;
export type ResourceEntity = Resource;
