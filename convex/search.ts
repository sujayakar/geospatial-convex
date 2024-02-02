import { v } from "convex/values";
import { query } from "./_generated/server";
import { encodeH3Cell, maxResolution } from "./h3";
import {
  UNITS,
  getHexagonEdgeLengthAvg,
  greatCircleDistance,
  gridDisk,
  polygonToCells,
} from "h3-js";

type Point = [number, number];

function polygonContains(point: Point, polygon: Array<Point>) {
  let contains = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersect) {
      contains = !contains;
    }
  }
  return contains;
}

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
    const h3CellSet = new Set<string>();
    for (const cell of polygonToCells(args.polygon, resolution)) {
      h3CellSet.add(cell);
      for (const neighbor of gridDisk(cell, 1)) {
        h3CellSet.add(neighbor);
      }
    }
    let h3Cells = [...h3CellSet];
    if (h3Cells.length > 16) {
      console.warn("Too many cells", h3Cells.length, "reducing to 16");
      h3Cells = h3Cells.slice(0, 16);
    }

    const convexCells = await Promise.all([...h3Cells].map(encodeH3Cell));
    console.timeLog("search", "done encoding");
    const searchQuery = ctx.db
      .query("locationIndex")
      .withSearchIndex("index", (q) => {
        let search = q.search("geospatial", convexCells.join(" "));
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
      });

    const indexRows = [];
    for await (const indexRow of searchQuery) {
      if (indexRows.length === 0) {
        console.timeLog("search", "first result");
      }
      indexRows.push(indexRow);
      if (indexRows.length >= 1023) {
        break;
      }
    }
    console.timeLog("search", `loaded ${indexRows.length} from search index`);

    const rows = [];
    let skipped = 0;
    for (const indexRow of indexRows) {
      if (rows.length >= (args.maxRows ?? 100)) {
        break;
      }
      const location = await ctx.db.get(indexRow.locationId);
      if (location === null) {
        throw new Error(`Invalid locationId: ${indexRow.locationId}`);
      }
      const p: Point = [
        location.coordinates.latitude,
        location.coordinates.longitude,
      ];
      if (!polygonContains(p, args.polygon as any)) {
        skipped += 1;
        continue;
      }
      rows.push(location);
    }
    console.timeLog(
      "search",
      `Returning ${rows.length} results (skipped ${skipped})`
    );
    return {
      h3Cells: [...h3Cells],
      rows,
    };
  },
});
