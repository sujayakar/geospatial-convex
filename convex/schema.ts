import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  locations2: defineTable({
    name: v.string(),
    alias: v.string(),
    imageUrl: v.optional(v.string()),
  }),
});
