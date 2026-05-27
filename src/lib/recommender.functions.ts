import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  eventType: z.string(),
  eventDate: z.string().optional(),
  location: z.string().optional(),
  outdoor: z.string(),
  guestCount: z.number().int().min(1).max(10000),
  setupType: z.string(),
  seated: z.string(),
  tableStyle: z.string(),
  food: z.string(),
  dancing: z.string(),
  extras: z.array(z.string()).max(20),
  rentals: z.array(z.string()).max(20),
  surface: z.string(),
  exposure: z.string(),
  sidewalls: z.string(),
  afterSunset: z.string(),
});

export type Pick = {
  category: string;
  item_id: string;
  item_name: string;
  quantity: number;
  reason: string;
};

export type AIRecommendation = {
  headline: string;
  summary: string;
  picks: Pick[];
  weather_notes: string[];
  tent_size: string;
  layout_caption: string;
  blueprint_prompt: string;
};

export const generateRecommendation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    // 1. Load inventory
    const { data: inventory, error: invErr } = await supabaseAdmin
      .from("pricing_items")
      .select("id, category, name, unit, notes, price_cents")
      .order("category")
      .order("sort_order");
    if (invErr) throw new Error(`Inventory load failed: ${invErr.message}`);

    const categories = Array.from(new Set((inventory ?? []).map((i) => i.category)));

    const inventoryByCategory = categories.map((cat) => ({
      category: cat,
      items: (inventory ?? [])
        .filter((i) => i.category === cat)
        .map((i) => ({ id: i.id, name: i.name, unit: i.unit, notes: i.notes })),
    }));

    const systemPrompt = `You are a senior event planner for Pacific North Events & Tents, an Oregon Coast event rental company. Given a customer's event details and the full rental inventory, recommend a thorough event setup.

RULES:
- Recommend items from EVERY category present in the inventory (Canopy, Canopy Options, Tables, Chairs, Specialty Items, Delivery, etc.). Push as much product as reasonably fits the event — be generous, not minimal.
- Only recommend items that exist in the provided inventory. Use the exact item_id from the inventory.
- Pick a tent (Canopy) large enough for the guest count, layout, dancing, and weather exposure. Size up for coastal weather, seated dining, dance floors, bars, and DJ/band.
- Include Canopy Options (sidewalls, lighting) when relevant (sunset, exposed sites).
- Pick the right Delivery zone based on the location text.
- Quantities: tables sized to ~8 per round/banquet; chairs equal to guest count + ~10%; add cocktail tables for mingling; add bar/dance floor/stage as needed.
- Provide a short "reason" per pick (1 sentence).
- "tent_size": short label of the chosen tent, e.g. "20×40 Frame Tent" or "20×60 Frame Tent".
- "layout_caption": ONE short line describing the floor plan, formatted like the references: e.g. "20×40 Frame Tent · 8 round tables · 64 chairs · dance floor".
- "blueprint_prompt": 1-2 sentences describing the top-down arrangement of tables, chairs, dance floor, bar, DJ/stage, and entrance inside the tent footprint.
- Do NOT include prices. Recommendation is an estimate; customer requests a final quote.`;

    const userPrompt = `EVENT DETAILS:
${JSON.stringify(data, null, 2)}

INVENTORY (grouped by category):
${JSON.stringify(inventoryByCategory, null, 2)}`;

    const recRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_recommendation",
              description: "Submit the event setup recommendation.",
              parameters: {
                type: "object",
                properties: {
                  headline: { type: "string" },
                  summary: { type: "string" },
                  picks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        item_id: { type: "string" },
                        item_name: { type: "string" },
                        quantity: { type: "number" },
                        reason: { type: "string" },
                      },
                      required: ["category", "item_id", "item_name", "quantity", "reason"],
                      additionalProperties: false,
                    },
                  },
                  weather_notes: { type: "array", items: { type: "string" } },
                  tent_size: { type: "string" },
                  layout_caption: { type: "string" },
                  blueprint_prompt: { type: "string" },
                },
                required: ["headline", "summary", "picks", "weather_notes", "tent_size", "layout_caption", "blueprint_prompt"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_recommendation" } },
      }),
    });

    if (!recRes.ok) {
      const txt = await recRes.text();
      if (recRes.status === 429) throw new Error("Rate limit reached, please try again in a moment.");
      if (recRes.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
      throw new Error(`AI recommendation failed (${recRes.status}): ${txt.slice(0, 200)}`);
    }

    const recJson = await recRes.json();
    const toolCall = recJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return a structured recommendation");
    }
    const recommendation = JSON.parse(toolCall.function.arguments) as AIRecommendation;

    // 2. Generate blueprint sketch (black line art on white, like reference rental layouts)
    let blueprintImage: string | null = null;
    try {
      const sketchPrompt = `A clean, hand-drafted top-down floor plan sketch in the style of an event rental layout diagram. STRICT STYLE: pure black line art on a plain white background, no color, no shading, no perspective, no people, no photographic detail — strictly schematic 2D blueprint.

Draw the tent as a single rectangle outline labeled with its dimensions (${recommendation.tent_size}). Inside the rectangle, render the arrangement from above: ${recommendation.blueprint_prompt}

Tables shown as simple top-down icons (circles for rounds, rectangles for banquet), each surrounded by small chair rectangles. Dance floor as a cross-hatched square grid. Label the bar, DJ, and stage zones with plain text if present.

Below the tent, center a short caption in a plain sans-serif font:
"${recommendation.layout_caption}"

The result must look like an architect's blueprint sketch — minimal, precise, fully contained on the white canvas with generous margins. Do not add any extra decoration, color, or background.`;

      const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: sketchPrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (imgRes.ok) {
        const imgJson = await imgRes.json();
        const d = imgJson.data?.[0];
        if (d?.b64_json) blueprintImage = `data:image/png;base64,${d.b64_json}`;
        else if (d?.url) blueprintImage = d.url;
      } else {
        console.error("Image generation failed:", imgRes.status, await imgRes.text());
      }
    } catch (e) {
      console.error("Image generation error:", e);
    }

    return { recommendation, blueprintImage };
  });
