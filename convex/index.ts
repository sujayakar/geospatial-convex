import { GeospatialIndex } from "../geospatial/client";
import { app } from "./_generated/server";

export const geospatial = new GeospatialIndex(app.geospatial);
