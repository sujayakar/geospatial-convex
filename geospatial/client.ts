import {
  FunctionReference,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import { functions } from "./_generated/api";
import { Point } from "./types";

export const DEFAULT_MAX_RESOLUTION = 14;

type MapApiModule<T extends Record<string, FunctionReference<any, any>>> = {
  [K in keyof T]: T[K] extends FunctionReference<
    infer Type,
    any,
    infer Args,
    infer ReturnType
  >
    ? FunctionReference<Type, "internal", Args, ReturnType>
    : never;
};

type MapApi<
  T extends Record<string, Record<string, FunctionReference<any, any>>>,
> = {
  [K in keyof T]: MapApiModule<T[K]>;
};

type ComponentInterface = MapApi<typeof functions>;

export class GeospatialIndex {
  constructor(
    private client: ComponentInterface,
    private maxResolution: number = DEFAULT_MAX_RESOLUTION
  ) {}

  async insert(ctx: GenericMutationCtx<any>, key: string, coordinates: Point) {
    await ctx.runMutation(this.client.ops.insert, {
      key,
      coordinates,
      maxResolution: this.maxResolution,
    });
  }

  async get(ctx: GenericQueryCtx<any>, key: string): Promise<Point | null> {
    return await ctx.runQuery(this.client.ops.get, { key });
  }

  async remove(ctx: GenericMutationCtx<any>, key: string): Promise<boolean> {
    return await ctx.runMutation(this.client.ops.remove, {
      key,
      maxResolution: this.maxResolution,
    });
  }

  async queryRectangle(
    ctx: GenericQueryCtx<any>,
    rectangle: Point[],
    maxRows: number
  ): Promise<{
    results: { key: string; coordinates: Point }[];
    h3Cells: string[];
  }> {
    return await ctx.runQuery(this.client.ops.queryRectangle, {
      rectangle,
      maxRows,
      maxResolution: this.maxResolution,
    });
  }
}
