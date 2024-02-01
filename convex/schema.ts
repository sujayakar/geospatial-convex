import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  locationIndex: defineTable({
    locationId: v.id("locations"),

    geospatial: v.string(),

    isClosed: v.boolean(),
    price: v.optional(v.string()),

    greaterThan45: v.boolean(),
    greaterThan40: v.boolean(),
    greaterThan35: v.boolean(),
    greaterThan30: v.boolean(),
    greaterThan25: v.boolean(),
    greaterThan20: v.boolean(),

    category: v.union(v.string(), v.null()),
  }).searchIndex("index", {
    searchField: "geospatial",
    filterFields: [
      "isClosed",
      "price",
      "greaterThan45",
      "greaterThan40",
      "greaterThan35",
      "greaterThan30",
      "greaterThan25",
      "greaterThan20",
      "category",
    ],
  }),

  locations: defineTable({
    name: v.string(),
    alias: v.string(),
    imageUrl: v.string(),

    neighborhood: v.string(),
    category: v.union(
      v.object({
        alias: v.string(),
        title: v.string(),
      }),
      v.null()
    ),
    price: v.optional(v.string()),
    rating: v.number(),
    reviewCount: v.number(),
    url: v.string(),

    coordinates: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),

    displayPhone: v.string(),
    displayAddress: v.array(v.string()),

    isClosed: v.boolean(),
  }),
});
