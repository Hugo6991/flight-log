import { readFileSync, writeFileSync } from "node:fs";
import { stateSchema } from "../shared/model.ts";

const read = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../data/example/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
const routes = read("routes");
const itinerary = read("itinerary");
const flights = itinerary.flatMap((trip) =>
  trip.departure_dates.map((date, i) => {
    const from = trip.airports[i],
      to = trip.airports[i + 1];
    const route = routes.find(
      (r) => r.from_airport === from && r.to_airport === to,
    );
    if (!route) throw new Error(`Missing verified route: ${from} to ${to}`);
    return {
      id: `${trip.id}-${i + 1}`,
      date,
      from,
      to,
      flight: route.flight,
      departure: "",
      arrival: "",
      status: "flown",
      note: `虛構示範資料，並非任何人的真實旅行紀錄。${trip.title}。日期與搭乘狀態皆為模擬，班號僅參考公開航線，不代表當日執飛；未模擬疫情入境限制。Fictional journey; dates and flown status are synthetic, not historical operations.`,
      sources: [
        { type: "demo", label: `虛構示範資料 · ${trip.title}` },
        {
          type: "route_reference",
          label: `${route.airline} · 僅核對班號與航線 · ${route.checked_on}`,
          url: route.source_url,
        },
      ],
    };
  }),
);
const state = stateSchema.parse({ schema_version: 1, flights });
writeFileSync(
  new URL("../data/example/demo.json", import.meta.url),
  JSON.stringify(state, null, 2) + "\n",
);
console.log(`Generated ${flights.length} fictional flight segments`);
