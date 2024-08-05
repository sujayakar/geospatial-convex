import geospatial from "../geospatial/component.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.install(geospatial, {});
export default app;
