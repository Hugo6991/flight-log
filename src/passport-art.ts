import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { Airport, Flight } from "../shared/model";
import { greatCircle, routeKey } from "./map-geometry";
import land from "./assets/land.json";

// A geographic keepsake, rendered from the same airport coordinates as the live map.
export function passportArt(
  flights: Flight[],
  airports: Record<string, Airport>,
) {
  const flown = flights.filter(
    (f) => f.status === "flown" && airports[f.from] && airports[f.to],
  );
  const projection = geoNaturalEarth1()
    .rotate([-135, 0])
    .fitExtent(
      [
        [12, 20],
        [468, 284],
      ],
      { type: "Sphere" },
    );
  const path = geoPath(projection);
  const codes = new Set(flown.flatMap((f) => [f.from, f.to]));
  const routes = [...new Map(flown.map((f) => [routeKey(f), f])).values()].map(
    (f) => ({
      key: routeKey(f),
      path:
        path({
          type: "LineString",
          coordinates: greatCircle(airports[f.from], airports[f.to]),
        }) || "",
    }),
  );
  return {
    land: path(land as GeoPermissibleObjects) || "",
    routes,
    airports: [...codes].map((code) => ({
      code,
      point: projection([airports[code].lon, airports[code].lat])!,
    })),
  };
}

export async function savePassportImage(svg: SVGSVGElement, period: string) {
  const image = new Image();
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("image"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1440;
    canvas.height = 1980;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("export"))),
        "image/png",
      ),
    );
    const download = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = download;
    a.download = `flight-log-passport-${period}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(download), 60000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
