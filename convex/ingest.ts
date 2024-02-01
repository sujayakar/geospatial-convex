import { v } from "convex/values";
import { MutationCtx, internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { categoryCounts, prices } from "./constants";
import { indexLatLong } from "./h3";
import { Doc } from "./_generated/dataModel";

export const ingestMany = mutation({
  args: {
    rows: v.array(v.any()),
  },
  async handler(ctx, args) {
    for (const row of args.rows) {
      await ingestRestaurant(ctx, { row });
    }
  },
});

const INDEX_BATCH_SIZE = 100;

export const indexPage = internalMutation({
  args: {
    completed: v.number(),
    cursor: v.union(v.string(), v.null()),
  },
  async handler(ctx, args) {
    console.time("indexPage");
    const results = await ctx.db
      .query("locations")
      .paginate({ cursor: args.cursor, numItems: INDEX_BATCH_SIZE });
    for (const location of results.page) {
      const locationIndex = {
        locationId: location._id,
        geospatial: indexLatLong(location.coordinates),

        isClosed: location.isClosed,
        price: location.price,

        greaterThan45: location.rating > 4.5,
        greaterThan40: location.rating > 4.0,
        greaterThan35: location.rating > 3.5,
        greaterThan30: location.rating > 3.0,
        greaterThan25: location.rating > 2.5,
        greaterThan20: location.rating > 2.0,

        category: location.category?.alias || null,
      };
      await ctx.db.insert("locationIndex", locationIndex);
    }
    const completed = args.completed + results.page.length;
    console.log(
      `Indexed ${results.page.length} locations (${completed} total)`
    );
    console.timeEnd("indexPage");
    if (!results.isDone) {
      await ctx.scheduler.runAfter(0, internal.ingest.indexPage, {
        completed,
        cursor: results.continueCursor,
      });
    }
  },
});

export const ingestRestaurant = mutation({
  args: {
    row: v.any(),
  },
  async handler(ctx, args) {
    if (!prices.includes(args.row.price)) {
      throw new Error(`Invalid price: ${args.row.price}`);
    }
    if (args.row.rating < 0 || args.row.rating > 5) {
      throw new Error(`Invalid rating: ${args.row.rating}`);
    }
    args.row.categories.sort((a: any, b: any) => {
      const aCount = (categoryCounts as any)[a["alias"]];
      const bCount = (categoryCounts as any)[b["alias"]];
      if (aCount === undefined || bCount === undefined) {
        throw new Error(`Invalid category: ${a["alias"]} or ${b["alias"]}`);
      }
      bCount - aCount;
    });
    let category = null;
    if (args.row.categories.length > 0) {
      category = args.row.categories[0];
    }
    const location = {
      name: args.row.name,
      alias: args.row.alias,
      imageUrl: args.row.image_url,
      neighborhood: args.row.neighborhood,
      category,
      price: args.row.price,
      rating: args.row.rating,
      reviewCount: args.row.review_count,
      url: args.row.url,
      coordinates: {
        latitude: args.row.coordinates.latitude,
        longitude: args.row.coordinates.longitude,
      },
      displayPhone: args.row.display_phone,
      displayAddress: args.row.location.display_address,
      isClosed: args.row.is_closed,
    };
    const locationId = await ctx.db.insert("locations", location);

    const locationIndex = {
      locationId,
      geospatial: indexLatLong(location.coordinates),

      isClosed: location.isClosed,
      price: location.price,

      greaterThan45: location.rating > 4.5,
      greaterThan40: location.rating > 4.0,
      greaterThan35: location.rating > 3.5,
      greaterThan30: location.rating > 3.0,
      greaterThan25: location.rating > 2.5,
      greaterThan20: location.rating > 2.0,

      category: location.category?.alias || null,
    };
    await ctx.db.insert("locationIndex", locationIndex);

    return locationId;
  },
});
