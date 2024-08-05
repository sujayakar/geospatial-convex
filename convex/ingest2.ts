import { v } from "convex/values";
import { app, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const loadRestaurants = internalAction({
  handler: async (ctx) => {
    const response = await fetch(
      "https://raw.githubusercontent.com/sujayakar/geospatial-convex/main/restaurants_cleaned.ndjson"
    );
    if (!response.ok || !response.body) {
      throw new Error(`Failed to load restaurants: ${response.statusText}`);
    }
    const decoder = new TextDecoderStream("utf-8", {
      fatal: true,
      ignoreBOM: true,
    });

    let buffered = "";
    const newlineSplitter = new TransformStream<string, string>({
      transform(chunk, controller) {
        if (!chunk) {
          return;
        }
        const lines = chunk.split("\n");
        switch (lines.length) {
          case 0:
            return;
          case 1:
            buffered += lines[0];
            return;
          default: {
            const first = lines[0];
            controller.enqueue(buffered + first);
            for (const line of lines.slice(1, -1)) {
              controller.enqueue(line);
            }
            buffered = lines[lines.length - 1];
            break;
          }
        }
      },
      flush(controller) {
        if (buffered) {
          controller.enqueue(buffered);
        }
        controller.terminate();
      },
    });
    const lineStream = response.body
      .pipeThrough(decoder)
      .pipeThrough(newlineSplitter);

    let batch: any[] = [];
    for await (const line of lineStream as any as AsyncIterable<string>) {
      const obj = JSON.parse(line);
      batch.push(obj);
      if (batch.length >= 100) {
        await ctx.runMutation(internal.ingest2.flushBatch, { batch });
        batch = [];
      }
    }
    if (batch.length > 0) {
      await ctx.runMutation(internal.ingest2.flushBatch, { batch });
    }
  },
});

export const flushBatch = internalMutation({
  args: {
    batch: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    for (const row of args.batch) {
      const id = await ctx.db.insert("locations2", {
        name: row.name,
        alias: row.alias,
        imageUrl: row.image_url,
      });
      await ctx.runMutation(app.geospatial.insert, {
        key: id,
        coordinates: row.coordinates,
      });
    }
  },
});
