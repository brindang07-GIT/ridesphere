
import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Sample Bengaluru route for demonstration.
// The final point is a simulated college arrival location.
const route = [
  [12.9716, 77.5946],
  [12.9730, 77.5970],
  [12.9750, 77.5990],
  [12.9770, 77.6010],
  [12.9790, 77.6030],
  [12.9810, 77.6050]
];

// Keep the map centered on the moving bus.
function MapUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    map.panTo(position);
  }, [map, position]);

  return null;
}

function BusMap({ onArrival }) {
  const [busIndex, setBusIndex] = useState(0);
  const [busStatus, setBusStatus] = useState("On Route");

  const indexRef = useRef(0);
  const arrivalHandledRef = useRef(false);
  const onArrivalRef = useRef(onArrival);

  // Always use the latest callback from App.jsx.
  onArrivalRef.current = onArrival;

  // Simulate bus movement and stop at the destination.
  useEffect(() => {
    const timer = setInterval(() => {
      if (arrivalHandledRef.current) {
        clearInterval(timer);
        return;
      }

      const nextIndex = indexRef.current + 1;

      if (nextIndex >= route.length - 1) {
        indexRef.current = route.length - 1;

        setBusIndex(route.length - 1);
        setBusStatus("Arrived at CMR University");

        // Ensure arrival is handled only once.
        arrivalHandledRef.current = true;
        clearInterval(timer);

        onArrivalRef.current?.();
      } else {
        indexRef.current = nextIndex;
        setBusIndex(nextIndex);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const busPosition = route[busIndex];

  return (
    <div className="bus-map-container">
      <h3>📍 Live Bus Tracking (Simulation)</h3>

      <p>
        <strong>Bus:</strong> CMR UNIVERSITY
      </p>

      <p>
        <strong>Route:</strong> Route-08
      </p>

      <p>
        <strong>Status:</strong>{" "}
        <span
          style={{
            color:
              busStatus === "On Route" ? "green" : "blue",
            fontWeight: "bold"
          }}
        >
          {busStatus}
        </span>
      </p>

      <p>
        <strong>GPS Coordinates:</strong>{" "}
        {busPosition[0].toFixed(4)},{" "}
        {busPosition[1].toFixed(4)}
      </p>

      {busStatus === "Arrived at CMR University" && (
        <p style={{ color: "green", fontWeight: "bold" }}>
          ✅ Bus arrived. Automatic exit attendance triggered.
        </p>
      )}

      <MapContainer
        center={route[0]}
        zoom={15}
        scrollWheelZoom={true}
        style={{
          height: "400px",
          width: "100%",
          borderRadius: "14px"
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polyline
          positions={route}
          pathOptions={{
            color: "blue",
            weight: 5
          }}
        />

        <MapUpdater position={busPosition} />

        <Marker position={busPosition}>
          <Popup>
            CMR UNIVERSITY BUS
            <br />
            Status: {busStatus}
            <br />
            Tracking: Simulated GPS
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default BusMap;