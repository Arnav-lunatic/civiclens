import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface AdminResolutionMapProps {
  issueLat: number;
  issueLng: number;
  issueTitle?: string;
  adminLat: number | null;
  adminLng: number | null;
  distance: number | null; // meters
  isMatched: boolean;
}

export const AdminResolutionMap: React.FC<AdminResolutionMapProps> = ({
  issueLat,
  issueLng,
  issueTitle = 'Grievance Location',
  adminLat,
  adminLng,
  distance,
  isMatched,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([issueLat, issueLng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear previous dynamic layers
    layerGroup.clearLayers();

    // 1. Issue Location Pin (Red/Amber Target Marker)
    const issueIcon = L.divIcon({
      className: 'custom-issue-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; padding: 5px 8px; border-radius: 8px; font-size: 10px; font-weight: 800; font-family: sans-serif; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; gap: 4px;">
            <span>📍 Issue Location</span>
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #b91c1c; margin-top: -1px;"></div>
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); margin-top: 1px;"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    L.marker([issueLat, issueLng], { icon: issueIcon })
      .bindPopup(`<strong>${issueTitle}</strong><br/>Issue GPS: ${issueLat.toFixed(5)}, ${issueLng.toFixed(5)}<br/>500m geofence active`)
      .addTo(layerGroup);

    // 2. 500-meter allowable resolution geofence circle
    L.circle([issueLat, issueLng], {
      radius: 500,
      color: isMatched ? '#10b981' : '#f59e0b',
      fillColor: isMatched ? '#34d399' : '#fbbf24',
      fillOpacity: isMatched ? 0.15 : 0.12,
      weight: 2,
      dashArray: isMatched ? undefined : '6, 6',
    }).addTo(layerGroup);

    // 3. Admin Detected Location Pin (if available)
    if (adminLat !== null && adminLng !== null) {
      const adminColor = isMatched ? '#059669' : '#dc2626';
      const adminIcon = L.divIcon({
        className: 'custom-admin-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
            <div style="background: ${isMatched ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'}; color: white; padding: 5px 8px; border-radius: 8px; font-size: 10px; font-weight: 800; font-family: sans-serif; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; gap: 4px;">
              <span>${isMatched ? '👤 You (Verified On-Site)' : '👤 Your GPS (Out of Range)'}</span>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${adminColor}; margin-top: -1px;"></div>
            <div style="position: relative; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; margin-top: 1px;">
              <div style="position: absolute; width: 16px; height: 16px; border-radius: 50%; background-color: ${adminColor}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${adminColor}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      L.marker([adminLat, adminLng], { icon: adminIcon })
        .bindPopup(`<strong>Your Detected GPS Location</strong><br/>Lat: ${adminLat.toFixed(5)}, Lng: ${adminLng.toFixed(5)}<br/>Distance: ${distance !== null ? (distance >= 1000 ? (distance / 1000).toFixed(2) + ' km' : distance + ' m') : 'N/A'}`)
        .addTo(layerGroup);

      // 4. Connecting dashed polyline between Issue and Admin
      L.polyline(
        [
          [issueLat, issueLng],
          [adminLat, adminLng],
        ],
        {
          color: isMatched ? '#10b981' : '#ef4444',
          weight: 3,
          dashArray: '5, 8',
          opacity: 0.8,
        }
      ).addTo(layerGroup);

      // Fit bounds to show both pins
      const bounds = L.latLngBounds([[issueLat, issueLng], [adminLat, adminLng]]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    } else {
      map.setView([issueLat, issueLng], 16);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [issueLat, issueLng, issueTitle, adminLat, adminLng, distance, isMatched]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-sm h-64 sm:h-72 w-full z-10 bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Floating Telemetry Status Banner */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[400] pointer-events-none flex flex-wrap gap-2 justify-between items-center">
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[10px] font-mono shadow-md border border-slate-700/80 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>Issue GPS: {issueLat.toFixed(5)}, {issueLng.toFixed(5)}</span>
        </div>

        {adminLat !== null && adminLng !== null && (
          <div
            className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold shadow-md border flex items-center gap-1.5 ${
              isMatched
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/80'
                : 'bg-red-950/90 text-red-300 border-red-600/80'
            }`}
          >
            {isMatched ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>MATCHED: {distance !== null ? `${distance}m away (Within 500m)` : 'On-Site'}</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span>
                  MISMATCH: {distance !== null ? (distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance}m`) : ''} away (Max 500m allowed)
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-2 left-2.5 right-2.5 z-[400] pointer-events-none flex justify-between items-end text-[10px]">
        <div className="bg-white/95 backdrop-blur-md text-slate-800 px-3 py-1.5 rounded-xl shadow-md border border-slate-200 space-y-0.5">
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            <span>Red Marker: Grievance Location (500m Geofence)</span>
          </div>
          <div className="flex items-center gap-2 font-semibold">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${isMatched ? 'bg-emerald-500' : 'bg-red-600 animate-pulse'}`}></span>
            <span>{isMatched ? 'Green Marker: Your Verified Location' : 'Detected Marker: Your Current Location'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
