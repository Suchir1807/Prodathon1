import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(/^[a-z0-9_]+$/, "Use only letters, numbers, and underscores.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.");

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Enter your password."),
}).strict();

const signupBaseSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  confirm: z.string(),
}).strict();

export const signupSchema = signupBaseSchema
  .refine((values) => values.password === values.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export const signupRequestSchema = signupBaseSchema.pick({
  username: true,
  password: true,
});

export const profileSchema = z.object({
  displayName: z.string().trim().max(60, "Display name must be 60 characters or fewer."),
  skillsHave: z.array(z.string().trim().min(1).max(80)).max(30),
  skillsLearn: z.array(z.string().trim().min(1).max(80)).max(30),
  domainInterests: z.array(z.string().trim().min(1).max(80)).max(30),
}).strict();

export const barterSchema = z.object({
  skillOffered: z.string().trim().min(1, "Enter the skill you offer.").max(80),
  skillNeeded: z.string().trim().min(1, "Enter the skill you need.").max(80),
  description: z.string().trim().min(1, "Describe the exchange.").max(300),
}).strict();

export const beaconSchema = z.object({
  eventLocation: z.string().trim().min(1, "Enter an event name or location.").max(120),
  missingSkill: z.string().trim().min(1, "Enter the required skill.").max(100),
  urgency: z.enum(["High", "Critical"]),
}).strict();

export const workspaceTaskSchema = z.object({
  title: z.string().trim().min(1, "Enter a task title.").max(160),
}).strict();

export const generatedWorkspaceTasksSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().trim().min(1, "Enter a task title.").max(160),
    status: z.enum(["todo", "doing", "done"]),
    priority: z.number().int().min(1).max(5),
  }).strict()).length(5),
}).strict();

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type BarterValues = z.infer<typeof barterSchema>;
export type BeaconValues = z.infer<typeof beaconSchema>;
export type WorkspaceTaskValues = z.infer<typeof workspaceTaskSchema>;
