import { cellToParent, latLngToCell } from "h3-js";

export const maxResolution = 14;

export function indexLatLong(coordinates: {
  latitude: number;
  longitude: number;
}) {
  const leafCell = latLngToCell(
    coordinates.latitude,
    coordinates.longitude,
    15
  );
  if (leafCell === null) {
    throw new Error("Invalid coordinates");
  }
  // H3 cells are 8 bytes encoded as hex => at most 16 characters.
  // Our maximum token length is 32 UTF-8 bytes.
  // Note that because of fuzzy matching, we'll need to post filter.
  const h3Cells = [];
  for (let resolution = maxResolution; resolution >= 0; resolution--) {
    const parentCell = cellToParent(leafCell, resolution);
    if (parentCell === null) {
      throw new Error("Invalid resolution");
    }
    h3Cells.push(parentCell);
  }
  return h3Cells.join(" ");
}
