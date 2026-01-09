import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { MOCK_STATIONS } from '../constants/MockData';

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [stations, setStations] = useState([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });

      const calculatedStations = MOCK_STATIONS.map(s => ({
        ...s,
        latitude: loc.coords.latitude + s.latOffset,
        longitude: loc.coords.longitude + s.lngOffset
      }));
      setStations(calculatedStations);
    })();
  }, []);

  return { location, stations };
};