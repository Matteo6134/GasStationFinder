import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, Platform } from 'react-native';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const colorScheme = useColorScheme(); // Monitora il sistema
  const isDark = colorScheme === 'dark';

  const [favorites, setFavorites] = useState([]);
  const [settings, setSettings] = useState({
    fuelType: 'unleaded',
    notifPrice: true,
    notifProximity: true,
    language: 'it',
  });

  useEffect(() => {
    (async () => {
      const favs = await AsyncStorage.getItem('user_favorites_v3');
      const sets = await AsyncStorage.getItem('user_settings_v3');
      if (favs) setFavorites(JSON.parse(favs));
      if (sets) setSettings(JSON.parse(sets));
    })();
  }, []);

  const toggleFavorite = async (station) => {
    const newFavs = favorites.some(f => f.id === station.id)
      ? favorites.filter(f => f.id !== station.id)
      : [...favorites, station];
    setFavorites(newFavs);
    await AsyncStorage.setItem('user_favorites_v3', JSON.stringify(newFavs));
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await AsyncStorage.setItem('user_settings_v3', JSON.stringify(newSettings));
  };

  const theme = {
    isDark,
    colorScheme, // 'light' o 'dark'
    text: isDark ? '#FFFFFF' : '#000000',
    subText: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    tint: isDark ? '#0A84FF' : '#007AFF',
    bg: isDark ? '#000000' : '#F2F2F7',
    fontBold: Platform.OS === 'ios' ? 'System' : 'Roboto',
  };

  return (
    <AppContext.Provider value={{ favorites, toggleFavorite, settings, updateSetting, theme }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);