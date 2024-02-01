import { v } from "convex/values";
import { query } from "./_generated/server";
import { maxResolution } from "./h3";
import {
  UNITS,
  getHexagonEdgeLengthAvg,
  greatCircleDistance,
  polygonToCells,
} from "h3-js";

export default query({
  args: {
    polygon: v.array(v.array(v.number())),

    isClosed: v.optional(v.boolean()),
    price: v.optional(v.string()),
    minimumRating: v.optional(v.number()),

    maxRows: v.optional(v.number()),
  },
  async handler(ctx, args) {
    console.time("search");
    const polygonWidth = greatCircleDistance(
      args.polygon[0],
      args.polygon[1],
      UNITS.m
    );
    let resolution = maxResolution;
    for (; resolution >= 0; resolution--) {
      const hexWidth = getHexagonEdgeLengthAvg(resolution, UNITS.m);
      if (hexWidth / polygonWidth > 0.25) {
        break;
      }
    }
    console.log("resolution", resolution);
    const h3Cells = polygonToCells(args.polygon, resolution);
    if (h3Cells.length > 16) {
      throw new Error("Too many cells");
    }
    const indexRows = await ctx.db
      .query("locationIndex")
      .withSearchIndex("index", (q) => {
        let search = q.search("geospatial", h3Cells.join(" "));
        if (args.isClosed !== undefined) {
          search = search.eq("isClosed", args.isClosed);
        }
        if (args.price !== undefined) {
          console.log("price", args.price);
          search = search.eq("price", args.price);
        }
        if (args.minimumRating !== undefined) {
          if (args.minimumRating === 2) {
            search = search.eq("greaterThan20", true);
          } else if (args.minimumRating === 2.5) {
            search = search.eq("greaterThan25", true);
          } else if (args.minimumRating === 3) {
            search = search.eq("greaterThan30", true);
          } else if (args.minimumRating === 3.5) {
            search = search.eq("greaterThan35", true);
          } else if (args.minimumRating === 4) {
            search = search.eq("greaterThan40", true);
          } else if (args.minimumRating === 4.5) {
            search = search.eq("greaterThan45", true);
          } else {
            throw new Error(`Invalid minimum rating: ${args.minimumRating}`);
          }
        }
        return search;
      })
      .take(args.maxRows ?? 10);

    const rows = [];
    let skipped = 0;
    for (const indexRow of indexRows) {
      if (!h3Cells.find((c) => indexRow.geospatial.includes(c))) {
        skipped += 1;
        continue;
      }
      const location = await ctx.db.get(indexRow.locationId);
      if (location === null) {
        throw new Error(`Invalid locationId: ${indexRow.locationId}`);
      }
      rows.push(location);
    }
    if (skipped > 0) {
      console.warn(`Skipping ${skipped} post-filter match(es)`);
    }
    console.timeEnd("search");
    return {
      h3Cells,
      rows,
    };
  },
});
