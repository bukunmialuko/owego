import { z } from 'zod';

export const beneficiaryIdSchema = z.string().regex(/^[A-Za-z0-9-]{1,128}$/);
