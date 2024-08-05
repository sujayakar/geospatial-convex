import { useMemo, useRef, useState } from "react";
import "./App.css";
import { api } from "../convex/_generated/api";

import "leaflet/dist/leaflet.css";
import markerUrl from "leaflet/dist/images/marker-icon.png";
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
import { Icon, LatLng } from "leaflet";
import { useQuery } from "convex/react";
import { Doc } from "../convex/_generated/dataModel";
import { Button, Dropdown, MenuProps } from "antd";
import { Point } from "../geospatial/types";

// https://superface.ai/blog/google-maps-clone
// https://react-leaflet.js.org/docs/example-events/
// https://github.com/rspiro9/NYC-Restaurant-Yelp-and-Inspection-Analysis/

const manhattan = [40.746, -73.985];

function LocationSearch(props: { setLoading: (loading: boolean) => void }) {
  const map = useMap();
  const [bounds, setBounds] = useState(map.getBounds());
  useMapEvents({
    moveend: (e) => {
      setBounds(map.getBounds());
    },
  });
  const queryPolygon = useMemo(() => {
    const latLongToObj = (latLong: LatLng) => ({
      latitude: latLong.lat,
      longitude: latLong.lng,
    });
    return [
      latLongToObj(bounds.getSouthWest()),
      latLongToObj(bounds.getNorthWest()),
      latLongToObj(bounds.getNorthEast()),
      latLongToObj(bounds.getSouthEast()),
    ];
  }, [bounds]);
  const results = useQuery(api.search.default, {
    polygon: queryPolygon,
    maxRows: 256,
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
        <Polygon
          key={i}
          pathOptions={{ color: "blue" }}
          positions={polygon as any}
        />
      ))}
      {stickyResults.current.rows.map((row) => (
        <SearchResult key={row._id} row={row} />
      ))}
    </>
  );
}

const icon = new Icon({
  iconUrl: markerUrl,
});

function SearchResult(props: {
  row: Doc<"locations2"> & { coordinates: Point };
}) {
  const { row } = props;
  const { latitude, longitude } = row.coordinates;
  return (
    <Marker position={[latitude, longitude]} icon={icon}>
      <Popup>
        <h2>
          <a>{row.name}</a>
        </h2>
      </Popup>
    </Marker>
  );
}
function App() {
  const [loading, setLoading] = useState(true);
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
        <LocationSearch setLoading={setLoading} />
      </MapContainer>
    </>
  );
}

export default App;
