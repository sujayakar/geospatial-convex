import { defineComponent } from "convex/server";
import { v } from "convex/values";

export default defineComponent("geospatial", {
  args: {
    maxResolution: v.optional(v.number()),
  },
});
