import { useMemo, useRef, useState } from "react";
import "./App.css";
import { api } from "../convex/_generated/api";

import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  UNITS,
  cellToVertexes,
  degsToRads,
  getHexagonEdgeLengthAvg,
  greatCircleDistance,
  vertexToLatLng,
} from "h3-js";
import { LatLng } from "leaflet";
import { useQuery } from "convex/react";
import { Doc } from "../convex/_generated/dataModel";
import { Button, Dropdown, MenuProps } from "antd";

// https://superface.ai/blog/google-maps-clone
// https://react-leaflet.js.org/docs/example-events/
// https://github.com/rspiro9/NYC-Restaurant-Yelp-and-Inspection-Analysis/

const manhattan = [40.746, -73.985];

// // <Polygon pathOptions={{ color: "red" }} positions={polygon} />
// const polygon = [
//   [40.76075, -73.9932],
//   [40.76278, -73.99098],
//   [40.76149, -73.98772],
//   [40.75817, -73.98959],
// ];

// const tiling = [
//   "8a2a10725b17fff",
//   "8a2a10725b0ffff",
//   "8a2a10725b07fff",
//   "8a2a1072586ffff",
//   "8a2a10725b37fff",
//   "8a2a10725b2ffff",
//   "8a2a10725b27fff",
// ];
// const tilingPolygons = [];
// for (const cell of tiling) {
//   const polygon = [];
//   for (const vertex of cellToVertexes(cell)) {
//     const coords = vertexToLatLng(vertex);
//     polygon.push(coords);
//   }
//   tilingPolygons.push(polygon);
// }

// https://www.yelp.com/dataset/download
// Text search: name + category name
// Geospatial: within viewport, maybe drag a rectangle?
// Filters:
// - Is open
// - price: 1, 2, 3, 4
// - rating: 4.5+, 4+
// - category:
//
// UI: Render category, phone, image, price, name, rating, review count, transactions, url, neighborhood...

function LocationSearch(props: { rating?: string; price?: string }) {
  const map = useMap();
  const [bounds, setBounds] = useState(map.getBounds());
  useMapEvents({
    moveend: (e) => {
      setBounds(map.getBounds());
    },
  });
  const queryPolygon = useMemo(() => {
    const latLongtoArray = (latLong: LatLng) => [latLong.lat, latLong.lng];
    return [
      latLongtoArray(bounds.getSouthWest()),
      latLongtoArray(bounds.getNorthWest()),
      latLongtoArray(bounds.getNorthEast()),
      latLongtoArray(bounds.getSouthEast()),
    ];
  }, [bounds]);
  console.log(props.price, props.rating);
  const results = useQuery(api.search.default, {
    polygon: queryPolygon,
    maxRows: 100,
    price: props.price,
    minimumRating: props.rating ? parseFloat(props.rating) : undefined,
  });

  // const p1 = queryPolygon[0];
  // const p2 = queryPolygon[1];
  // const width = greatCircleDistance(p1, p2, UNITS.m);
  // console.log({
  //   viewportWidth: width,
  //   hex6: getHexagonEdgeLengthAvg(6, UNITS.m) / width,
  //   hex7: getHexagonEdgeLengthAvg(7, UNITS.m) / width,
  //   hex8: getHexagonEdgeLengthAvg(8, UNITS.m) / width,
  //   hex9: getHexagonEdgeLengthAvg(9, UNITS.m) / width,
  //   hex10: getHexagonEdgeLengthAvg(10, UNITS.m) / width,
  // });

  const stickyResults = useRef(results);
  if (results !== undefined) {
    stickyResults.current = results;
  }
  if (stickyResults.current === undefined) {
    return null;
  }
  const tilingPolygons: number[][][] = [];
  for (const cell of stickyResults.current.h3Cells) {
    const polygon = [];
    for (const vertex of cellToVertexes(cell)) {
      const coords = vertexToLatLng(vertex);
      polygon.push(coords);
    }
    tilingPolygons.push(polygon);
  }
  return (
    <>
      {tilingPolygons.map((polygon, i) => (
        <Polygon key={i} pathOptions={{ color: "blue" }} positions={polygon} />
      ))}
      {stickyResults.current.rows.map((row) => (
        <SearchResult key={row._id} row={row} />
      ))}
    </>
  );
}

function SearchResult(props: { row: Doc<"locations"> }) {
  const { row } = props;
  const { latitude, longitude } = row.coordinates;
  return (
    <Marker position={[latitude, longitude]}>
      <Popup>
        <h2>
          <a href={row.url}>{row.name}</a>
        </h2>
        <img width={100} src={row.imageUrl} alt={row.name} />
        <ul>
          {row.isClosed && (
            <li>
              <i>Closed</i>
            </li>
          )}
          {row.category && <li>Category: {row.category?.title}</li>}
          <li>Neighborhood: {row.neighborhood}</li>
          <li>Phone: {row.displayPhone}</li>
          <li>Price: {row.price}</li>
          <li>
            Rating: {row.rating} ({row.reviewCount} reviews)
          </li>
        </ul>
      </Popup>
    </Marker>
  );
}
function App() {
  const [price, setPrice] = useState<string | undefined>();
  const priceOnClick: MenuProps["onClick"] = ({ key }) => {
    setPrice(key === "any" ? undefined : key);
  };
  const priceItems: MenuProps["items"] = [
    {
      key: "any",
      label: "Any",
    },
    {
      key: "$",
      label: "$",
    },
    {
      key: "$$",
      label: "$$",
    },
    {
      key: "$$$",
      label: "$$$",
    },
    {
      key: "$$$$",
      label: "$$$$",
    },
  ];
  const [rating, setRating] = useState<string | undefined>();
  const ratingOnClick: MenuProps["onClick"] = ({ key }) => {
    setRating(key === "any" ? undefined : key);
  };
  const ratingItems: MenuProps["items"] = [
    {
      key: "any",
      label: "Any",
    },
    {
      key: "2.0",
      label: "2.0 ★★☆☆☆",
    },
    {
      key: "2.5",
      label: "2.5 ★★✺☆☆",
    },
    {
      key: "3.0",
      label: "3.0 ★★★☆☆",
    },
    {
      key: "3.5",
      label: "3.5 ★★★✺☆",
    },
    {
      key: "4.0",
      label: "4.0 ★★★★☆",
    },
    {
      key: "4.5",
      label: "4.5 ★★★★✺",
    },
  ];
  return (
    <>
      <h1>Convex Maps</h1>
      <div>
        <Dropdown
          menu={{ items: priceItems, onClick: priceOnClick }}
          placement="bottomLeft"
          arrow
        >
          <Button>💸 Price {price ? `(${price})` : ""}</Button>
        </Dropdown>
        <Dropdown
          menu={{ items: ratingItems, onClick: ratingOnClick }}
          placement="bottomLeft"
          arrow
        >
          <Button>⭐ Minimum Rating {rating ? `(${rating}+)` : ""}</Button>
        </Dropdown>
      </div>

      <MapContainer center={manhattan} id="mapId" zoom={15}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationSearch price={price} rating={rating} />
      </MapContainer>
    </>
  );
}

export default App;

{
  /* <DropdownMenu.Root>
<DropdownMenu.Trigger>
  💸 Price <TriangleDownIcon />
</DropdownMenu.Trigger>
<DropdownMenu.Content>
  <DropdownMenu.Item>🤷 Any</DropdownMenu.Item>
  <DropdownMenu.Item>$</DropdownMenu.Item>
  <DropdownMenu.Item>$$</DropdownMenu.Item>
  <DropdownMenu.Item>$$$</DropdownMenu.Item>
  <DropdownMenu.Item>$$$$</DropdownMenu.Item>
</DropdownMenu.Content>
</DropdownMenu.Root>
<DropdownMenu.Root>
<DropdownMenu.Trigger>
  ⭐ Rating <TriangleDownIcon />
</DropdownMenu.Trigger>
<DropdownMenu.Content>
  <DropdownMenu.Item>
    <CheckIcon />
    🤷 Any
  </DropdownMenu.Item>
  <DropdownMenu.Item>
    2.0 <StarFilledIcon /> <StarFilledIcon /> <StarIcon />{" "}
    <StarIcon /> <StarIcon />
  </DropdownMenu.Item>
  <DropdownMenu.Item>
    2.5 <StarFilledIcon /> <StarFilledIcon /> <CrumpledPaperIcon />{" "}
    <StarIcon /> <StarIcon />
  </DropdownMenu.Item>
  <DropdownMenu.Item>
    3.0 <StarFilledIcon /> <StarFilledIcon /> <StarFilledIcon />{" "}
    <StarIcon /> <StarIcon />
  </DropdownMenu.Item>
  <DropdownMenu.Item>
    3.5 <StarFilledIcon /> <StarFilledIcon />
    <StarFilledIcon /> <CrumpledPaperIcon /> <StarIcon />
  </DropdownMenu.Item>
  <DropdownMenu.Item>
    4.0 <StarFilledIcon /> <StarFilledIcon /> <StarFilledIcon />{" "}
    <StarFilledIcon /> <StarIcon />
  </DropdownMenu.Item>
  <DropdownMenu.Item>
    4.5 <StarFilledIcon /> <StarFilledIcon />
    <StarFilledIcon /> <StarFilledIcon /> <CrumpledPaperIcon />
  </DropdownMenu.Item>
</DropdownMenu.Content>
</DropdownMenu.Root>
<Select.Root>
<Select.Trigger className="SelectTrigger">
  <Select.Icon className="SelectIcon">
    😋 Category <TriangleDownIcon />
  </Select.Icon>
</Select.Trigger>
<Select.Portal>
  <Select.Content className="SelectContent">
    <Select.ScrollUpButton className="SelectScrollButton">
      <ChevronUpIcon />
    </Select.ScrollUpButton>
    <Select.Viewport className="SelectViewport">
      <Select.SelectItem value="all" key="all">
        🤷 Any
      </Select.SelectItem>
      {popularCategories.map((c) => {
        return (
          <Select.SelectItem value={c.alias} key={c.alias}>
            {c.emoji} {c.title}
          </Select.SelectItem>
        );
      })}
    </Select.Viewport>
    <Select.ScrollDownButton className="SelectScrollButton">
      <ChevronDownIcon />
    </Select.ScrollDownButton>
  </Select.Content>
</Select.Portal>
</Select.Root> */
}
