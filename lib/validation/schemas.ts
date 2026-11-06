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
  skillsHave: z.array(z.string().trim().min(1).max(80)).min(1, "Add at least one skill you can offer.").max(30),
  skillsLearn: z.array(z.string().trim().min(1).max(80)).min(1, "Add at least one skill you want to learn.").max(30),
  domainInterests: z.array(z.string().trim().min(1).max(80)).max(30),
}).strict();

export const askSchema = z.object({
  skillOffered: z.string().trim().min(1).max(80),
  skillWanted: z.string().trim().min(1).max(80),
  note: z.string().trim().min(10).max(1000),
}).strict();

export const beaconSchema = z.object({
  eventLocation: z.string().trim().min(1, "Enter an event name or location.").max(120),
  missingSkill: z.string().trim().min(1, "Enter the required skill.").max(100),
  urgency: z.enum(["High", "Critical"]),
}).strict();

const idempotencyKeySchema = z.string().trim().min(8).max(100).optional();

export const exchangeInviteSchema = z.object({
  recipientId: z.string().regex(/^[a-f\d]{24}$/i),
  idempotencyKey: z.string().trim().min(8).max(100),
}).strict();

export const exchangeInviteResponseSchema = z.object({
  requestId: z.string().regex(/^[a-f\d]{24}$/i),
  action: z.enum(["accept", "decline"]),
  idempotencyKey: idempotencyKeySchema,
}).strict();

export const exchangeUpdateSchema = z.object({
  weeklyGoal: z.string().trim().max(1000).optional(),
  status: z.enum(["active", "paused", "ended"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export const sessionBookingSchema = z.object({
  exchangeId: z.string().regex(/^[a-f\d]{24}$/i),
  teacherId: z.string().regex(/^[a-f\d]{24}$/i),
  topic: z.string().trim().min(3).max(200),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(180),
  idempotencyKey: z.string().trim().min(8).max(100),
}).strict();

export const sessionStatusSchema = z.object({
  status: z.enum(["completed", "cancelled"]),
}).strict();

export const sessionRoomUpdateSchema = z.object({
  notes: z.string().max(20_000),
  expectedRevision: z.number().int().min(0),
}).strict();

export const sessionReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().min(10).max(2000),
  skills: z.array(z.string().trim().min(1).max(80)).max(12).default([])
    .refine((skills) => new Set(skills).size === skills.length, "Skills must be unique."),
}).strict();

export const messageCreateSchema = z.object({
  receiverId: z.string().regex(/^[a-f\d]{24}$/i),
  content: z.string().trim().min(1).max(5000),
  sessionRoomId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
}).strict();

export const askCloseSchema = z.object({
  askId: z.string().regex(/^[a-f\d]{24}$/i),
  action: z.literal("close"),
}).strict();

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type AskValues = z.infer<typeof askSchema>;
export type BeaconValues = z.infer<typeof beaconSchema>;
