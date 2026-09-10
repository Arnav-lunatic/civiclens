export interface GeocodeResult {
  address: string;
  pincode: string;
  district: string;
  state: string;
  landmark?: string;
}

export interface FusedPosition {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  timestamp: number;
}

// Fast IP-based Geolocation fallback for laptops/desktops lacking physical GNSS GPS hardware
export const fetchFallbackLocation = async (): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return { lat: data.latitude, lng: data.longitude, accuracy: 1000 };
      }
    }
  } catch (e) {
    // Secondary fallback
  }

  try {
    const res2 = await fetch('https://ipapi.co/json/');
    if (res2.ok) {
      const data2 = await res2.json();
      if (typeof data2.latitude === 'number' && typeof data2.longitude === 'number') {
        return { lat: data2.latitude, lng: data2.longitude, accuracy: 1000 };
      }
    }
  } catch (e) {
    console.warn('IP fallback failed:', e);
  }

  return null;
};

export const GeoService = {
  // Dual-mode sensor: High-accuracy GPS with automatic standard-accuracy & network fallback for laptops
  startLiveTracking: (
    onUpdate: (pos: FusedPosition) => void,
    onError: (err: GeolocationPositionError) => void
  ): { watchId: number | null } => {
    const handleIpFallback = async (originalErr?: any) => {
      const fallback = await fetchFallbackLocation();
      if (fallback) {
        onUpdate({
          lat: fallback.lat,
          lng: fallback.lng,
          accuracy: fallback.accuracy,
          speed: null,
          heading: null,
          altitude: null,
          timestamp: Date.now(),
        });
      } else if (originalErr) {
        onError(originalErr);
      }
    };

    if (!navigator.geolocation) {
      handleIpFallback({
        code: 2,
        message: 'Geolocation hardware is not supported on this browser/device.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return { watchId: null };
    }

    const processSensorPosition = (pos: GeolocationPosition) => {
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy || 5),
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        altitude: pos.coords.altitude,
        timestamp: pos.timestamp,
      });
    };

    // 1. Initial Prompt & High-Accuracy Hardware Query
    navigator.geolocation.getCurrentPosition(
      processSensorPosition,
      (err) => {
        console.warn('[High-Accuracy GPS unavailable, falling back to standard positioning]:', err.code, err.message);
        // Fallback to standard accuracy (works on laptops via Wi-Fi triangulation)
        navigator.geolocation.getCurrentPosition(
          processSensorPosition,
          (err2) => {
            console.warn('[Standard Wi-Fi location failed, trying IP fallback]:', err2.code, err2.message);
            handleIpFallback(err2);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );

    // 2. Continuous Sensor Stream
    let watchId: number | null = null;
    try {
      watchId = navigator.geolocation.watchPosition(
        processSensorPosition,
        (err) => {
          console.warn('[GPS Hardware Watch Error]:', err.code, err.message);
        },
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 10000,
        }
      );
    } catch (e) {
      // Non-blocking watch fallback
    }

    return { watchId };
  },

  // High-Precision Reverse Geocoding
  reverseGeocode: async (lat: number, lng: number): Promise<GeocodeResult> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
      const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!response.ok) throw new Error("Reverse geocoding failed");
      const data = await response.json();

      const addr = data.address || {};
      const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';
      const district = addr.state_district || addr.county || addr.city || addr.suburb || addr.town || '';
      const state = addr.state || '';
      const landmark = addr.road || addr.suburb || addr.neighbourhood || addr.building || '';
      const formattedAddress = data.display_name || '';

      return { address: formattedAddress, pincode, district, state, landmark };
    } catch (error) {
      console.warn("Reverse Geocode Warning:", error);
      return { address: '', pincode: '', district: '', state: '' };
    }
  },

  // Calculate distance between two GPS coordinates in meters (Haversine formula)
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  },
};
