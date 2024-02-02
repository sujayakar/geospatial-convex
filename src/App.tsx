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

function LocationSearch(props: {
  rating?: string;
  price?: string;
  setLoading: (loading: boolean) => void;
}) {
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
    maxRows: 256,
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
  props.setLoading(results === undefined);

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
  const [loading, setLoading] = useState(true);
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
      <div
        style={{
          marginBottom: "10px",
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          position: "relative",
        }}
      >
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
        {loading && (
          <span style={{ position: "absolute", right: 0 }}>
            <i>Loading...</i>
          </span>
        )}
      </div>

      <MapContainer center={manhattan} id="mapId" zoom={15}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationSearch price={price} rating={rating} setLoading={setLoading} />
      </MapContainer>
    </>
  );
}

export default App;
