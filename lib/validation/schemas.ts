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

const idempotencyKeySchema = z.string().trim().min(8).max(100).optional();

export const partnerRequestSchema = z.object({
  recipientId: z.string().regex(/^[a-f\d]{24}$/i, "Choose a valid partner."),
  idempotencyKey: z.string().trim().min(8).max(100),
}).strict();

export const partnerRequestResponseSchema = z.object({
  requestId: z.string().regex(/^[a-f\d]{24}$/i),
  action: z.enum(["accept", "decline"]),
  idempotencyKey: idempotencyKeySchema,
}).strict();

export const questAcceptanceSchema = z.object({
  accepted: z.literal(true),
  idempotencyKey: idempotencyKeySchema,
}).strict();

export const generatedQuestSchema = z.object({
  title: z.string().trim().min(4).max(120),
  brief: z.string().trim().min(30).max(3000),
  roles: z.object({
    A: z.string().trim().min(5).max(300),
    B: z.string().trim().min(5).max(300),
  }).strict(),
  skillsUsed: z.array(z.string().trim().min(1).max(80)).min(2).max(12).refine(
    (skills) => new Set(skills).size === skills.length,
    "Skills must be unique.",
  ),
  tasks: z.array(z.object({
    title: z.string().trim().min(4).max(160),
    role: z.enum(["A", "B", "shared"]),
    priority: z.number().int().min(1).max(5),
  }).strict()).min(6).max(8),
  sharedSpec: z.string().trim().min(20).max(20_000),
  curveball: z.object({
    text: z.string().trim().min(10).max(500),
    unlockHour: z.number().int().min(1).max(71),
  }).strict(),
  stretchGoal: z.string().trim().min(10).max(500),
}).strict();

export const createQuestSchema = z.object({
  partnerRequestId: z.string().regex(/^[a-f\d]{24}$/i),
  quest: generatedQuestSchema,
  idempotencyKey: idempotencyKeySchema,
}).strict();

export const questTaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  role: z.enum(["A", "B", "shared"]).default("shared"),
  assigneeId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  idempotencyKey: z.string().trim().min(8).max(100),
}).strict();

export const questTaskReorderSchema = z.object({
  taskIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(100),
}).strict().refine((value) => new Set(value.taskIds).size === value.taskIds.length, {
  message: "A task can only appear once in the new order.",
});

export const questTaskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  role: z.enum(["A", "B", "shared"]).optional(),
  assigneeId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  order: z.number().int().min(0).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  idempotencyKey: idempotencyKeySchema,
}).strict().refine((value) => Object.keys(value).some((key) => key !== "idempotencyKey"), {
  message: "At least one task field must be updated.",
});

export const sharedSpecUpdateSchema = z.object({
  content: z.string().max(200_000),
  expectedRevision: z.number().int().min(0),
}).strict();

export const questMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  idempotencyKey: idempotencyKeySchema,
}).strict();

export const questHintSchema = z.object({
  blocker: z.string().trim().min(8).max(1000),
}).strict();

const webUrlSchema = z.string().url().max(500).refine((value) => {
  const parsed = new URL(value);
  return parsed.protocol === "https:" || parsed.protocol === "http:";
}, "Use a valid HTTP or HTTPS URL.");

export const submissionSchema = z.object({
  repositoryUrl: webUrlSchema,
  demoUrl: webUrlSchema,
  writeUp: z.string().trim().min(30).max(3000),
  idempotencyKey: idempotencyKeySchema,
}).strict();

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().min(10).max(2000),
  decision: z.enum(["approved", "changes_requested"]),
}).strict();

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type BarterValues = z.infer<typeof barterSchema>;
export type BeaconValues = z.infer<typeof beaconSchema>;
export type WorkspaceTaskValues = z.infer<typeof workspaceTaskSchema>;
export type GeneratedQuestValues = z.infer<typeof generatedQuestSchema>;
