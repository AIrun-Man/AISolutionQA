import { z } from "zod";

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  username: z.string().optional()
});

export const UserListSchema = z.array(UserSchema);
