import { v } from "convex/values";
import { query } from "./_generated/server";
import { Point, point } from "../geospatial/types.js";
import { Id } from "./_generated/dataModel";
import { geospatial } from ".";

export default query({
  args: {
    polygon: v.array(point),
    maxRows: v.number(),
  },
  async handler(ctx, args) {
    const { results, h3Cells } = await geospatial.queryRectangle(
      ctx,
      args.polygon,
      args.maxRows
    );
    const coordinatesByKey = new Map<string, Point>();
    const rowFetches = [];
    for (const result of results) {
      rowFetches.push(ctx.db.get(result.key as Id<"locations2">));
      coordinatesByKey.set(result.key, result.coordinates);
    }
    const rows = [];
    for (const row of await Promise.all(rowFetches)) {
      if (!row) {
        throw new Error("Invalid locationId");
      }
      const coordinates = coordinatesByKey.get(row._id)!;
      rows.push({ coordinates, ...row });
    }
    return {
      h3Cells,
      rows,
    };
  },
});
