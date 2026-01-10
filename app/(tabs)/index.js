import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, 
  Platform, Dimensions, StatusBar, TextInput, Animated, 
  Switch, useColorScheme, Keyboard, PanResponder, LayoutAnimation, UIManager, Easing, Modal, Image
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { BlurView } from 'expo-blur'; // <--- IMPORTANTE: Importiamo BlurView nativo

// --- IMPORT COMPONENTI ESTERNI ---
import { GlassCard, GlassView } from '../../components/GlassView'; 
import { useApp } from '../../context/AppContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// --- LOGHI BRAND ---
const BRAND_LOGOS = {
    "Eni": "https://cdn.brandfetch.io/id07a97M3H/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1749533701893",
    "Q8": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Q8_logo.svg/200px-Q8_logo.svg.png",
    "Esso": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Esso_text_logo.svg/200px-Esso_text_logo.svg.png",
    "IP": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/IP_Gruppo_API_logo.svg/200px-IP_Gruppo_API_logo.svg.png",
    "Tamoil": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Tamoil_logo.svg/200px-Tamoil_logo.svg.png",
    "Shell": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Shell_logo.svg/200px-Shell_logo.svg.png",
    "TotalErg": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9b/Total_S.A._logo.svg/200px-Total_S.A._logo.svg.png",
    "Repsol": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Repsol_logo.svg/200px-Repsol_logo.svg.png"
};

const ALL_FUELS = {
  diesel: { label: 'Diesel', icon: 'gas-station', color: '#FF9500', apiCode: 'gasolio' },
  unleaded: { label: 'Benzina', icon: 'water', color: '#34C759', apiCode: 'benzina' },
  gpl: { label: 'GPL', icon: 'fire', color: '#007AFF', apiCode: 'gpl' },
  cng: { label: 'Metano', icon: 'leaf', color: '#5856D6', apiCode: 'metano' }
};

const RANK_COLORS = {
    1: { color: '#FFD700', label: '1° BEST', border: 3, z: 100 }, 
    2: { color: '#C0C0C0', label: '2° TOP', border: 2, z: 90 },   
    3: { color: '#CD7F32', label: '3° GOOD', border: 2, z: 80 }   
};

const PRICES_API_URL = 'https://prezzi-carburante.onrender.com/api/distributori';
const CACHE_KEY_PREFIX = 'stations_v110_glass_settings_';

// --- HELPER FUNZIONI ---
const getCleanBrand = (rawName, rawBrand) => {
    const text = (rawName + " " + (rawBrand || "")).toUpperCase();
    if (text.includes("ENI") || text.includes("AGIP")) return "Eni";
    if (text.includes("Q8") || text.includes("KUWAIT")) return "Q8";
    if (text.includes("ESSO")) return "Esso";
    if (text.includes("IP ") || text.includes("GRUPPO API") || text.includes("API")) return "IP";
    if (text.includes("TAMOIL")) return "Tamoil";
    if (text.includes("SHELL")) return "Shell";
    if (text.includes("TOTAL") || text.includes("ERG")) return "TotalErg";
    if (text.includes("REPSOL")) return "Repsol";
    if (rawBrand && rawBrand.length > 2) return rawBrand;
    return "Pompa Bianca"; 
};

// ESTRAE SOLO LA CITTÀ (Pulizia aggressiva dell'indirizzo)
const extractCity = (address) => {
    if (!address) return "ALTRO";
    // Rimuove CAP, Prov, numeri civici strani
    let clean = address.replace(/[0-9]{5}/g, '').replace(/\([A-Z]{2}\)/g, '').replace(/\([a-z]{2}\)/g, '');
    const parts = clean.split(',');
    
    // Cerca la parte che sembra una città (non numerica, non vuota) partendo dalla fine
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].trim();
        if (part.length > 2 && isNaN(part)) {
            return part.toUpperCase();
        }
    }
    return "ZONA";
};

const getStationStatus = (lastUpdate) => {
    const now = new Date();
    const updateDate = new Date(lastUpdate);
    const daysOld = (now - updateDate) / (1000 * 60 * 60 * 24);
    if (daysOld > 7) return { text: "Prezzi vecchi", color: "#FF3B30" };
    return { text: "Aperto", color: "#34C759" }; 
};

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = deg2rad(lat2-lat1); 
  const dLon = deg2rad(lon2-lon1); 
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}
const deg2rad = (deg) => deg * (Math.PI/180);

// --- COMPONENTI UI ---
const RainbowSpinner = () => {
    const spinValue = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.loop(Animated.timing(spinValue, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })).start(); }, []);
    return <Animated.View style={{ transform: [{ rotate: spinValue.interpolate({inputRange:[0,1], outputRange:['0deg','360deg']}) }] }}><Ionicons name="sync" size={24} color="#007AFF" /></Animated.View>;
};

// CHIP CARBURANTE
const FuelChip = ({ type, isSelected, onPress, theme }) => (
    <TouchableOpacity onPress={() => { if (Platform.OS === 'ios') Haptics.selectionAsync(); onPress(); }} activeOpacity={0.7} style={{marginRight: 8}}>
        <GlassView 
            glassEffectStyle={isSelected ? 'prominent' : 'regular'} 
            style={[
                styles.chip, 
                isSelected && { borderWidth: 1, borderColor: ALL_FUELS[type].color, backgroundColor: ALL_FUELS[type].color + '20' }
            ]} 
            isInteractive={true}
        >
          <MaterialCommunityIcons name={ALL_FUELS[type].icon} size={18} color={isSelected ? ALL_FUELS[type].color : theme.subText} />
          <Text style={[styles.chipText, { color: isSelected ? ALL_FUELS[type].color : theme.text }]}>{ALL_FUELS[type].label}</Text>
        </GlassView>
    </TouchableOpacity>
);

const StationMarker = ({ station, fuelType, onPress, isDark, theme, rank }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const p = station.prices[fuelType];
    if (!p) return null;
    
    const rankData = RANK_COLORS[rank];
    const borderColor = rankData ? rankData.color : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)');
    const borderWidth = rankData ? rankData.border : 1;
    const zIndex = rankData ? rankData.z : 1;
    const fuelColor = ALL_FUELS[fuelType].color;
    const logoUrl = BRAND_LOGOS[station.brand];

    const handlePress = () => {
      onPress(station);
      if (Platform.OS === 'ios') Haptics.selectionAsync();
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
      ]).start();
    };

    return (
      <Marker coordinate={{ latitude: station.latitude, longitude: station.longitude }} onPress={(e) => e.stopPropagation()} zIndex={zIndex}>
        <TouchableOpacity activeOpacity={1} onPress={handlePress}>
            <Animated.View style={[styles.markerWrapper, { transform: [{ scale: scaleAnim }] }]}>
                {rankData && (
                    <View style={[styles.rankBadge, { backgroundColor: rankData.color }]}>
                        <Text style={styles.rankText}>{rankData.label}</Text>
                    </View>
                )}
                <GlassCard glassEffectStyle="regular" style={[styles.markerPill, { borderColor: borderColor, borderWidth: borderWidth }]} isInteractive={false}>
                    {logoUrl ? <Image source={{uri: logoUrl}} style={{width: 16, height: 16, marginRight: 6, resizeMode:'contain'}} /> : <FontAwesome5 name="gas-pump" size={14} color={fuelColor} style={{ marginRight: 6 }} />}
                    <View>
                        <Text style={[styles.markerTitle, { color: theme.text }]} numberOfLines={1}>{station.brand}</Text>
                        <Text style={[styles.markerPrice, { color: fuelColor }]}>{p.toFixed(3)}€</Text>
                    </View>
                </GlassCard>
                <View style={[styles.markerArrow, { borderTopColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.9)' }]} />
            </Animated.View>
        </TouchableOpacity>
      </Marker>
    );
};

export default function MapScreen() {
  const isDark = useColorScheme() === 'dark';
  const { theme, settings, favorites, toggleFavorite, updateSetting } = useApp();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [proximityAlertEnabled, setProximityAlertEnabled] = useState(false);
  const [searchRadius, setSearchRadius] = useState(15); 

  // --- GESTURE & ANIMATION ---
  const BOTTOM_SHEET_PEEK_HEIGHT = 200; 
  const TOP_MARGIN = insets.top + 60;   
  const SNAP_CLOSED = 0; 
  const SNAP_HALF = -height * 0.5; 
  const SNAP_FULL = -(height - BOTTOM_SHEET_PEEK_HEIGHT - TOP_MARGIN); 

  const sheetTranslateY = useRef(new Animated.Value(SNAP_CLOSED)).current;
  const lastGestureDy = useRef(SNAP_CLOSED);
  const cardAnim = useRef(new Animated.Value(height)).current; 

  // --- MODIFICA ALPHA: Interpolazione per rendere lo sfondo MOLTO più evidente ---
  const backgroundOpacity = sheetTranslateY.interpolate({
      inputRange: [SNAP_HALF * 0.8, SNAP_CLOSED],
      outputRange: [1, 0], 
      extrapolate: 'clamp'
  });

  const contentOpacity = sheetTranslateY.interpolate({ inputRange: [SNAP_HALF, SNAP_CLOSED], outputRange: [1, 0], extrapolate: 'clamp' });
  const animatedMargin = sheetTranslateY.interpolate({ inputRange: [SNAP_FULL, SNAP_HALF], outputRange: [0, 12], extrapolate: 'clamp' });
  const fixedBorderRadius = 32;

  useEffect(() => { navigation.setOptions({ headerShown: false, tabBarStyle: { display: 'none' } }); }, [navigation]);

  useEffect(() => {
      AsyncStorage.getItem('user_radius').then(r => { if(r) setSearchRadius(parseInt(r)); });
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 });
      if (!settings.fuelType || settings.fuelType === 'electric') updateSetting('fuelType', 'diesel');
      fetchStations(loc.coords.latitude, loc.coords.longitude, searchRadius, settings.fuelType || 'diesel');
    })();
  }, []);

  useEffect(() => {
      if (location) {
          setLoading(true);
          fetchStations(location.latitude, location.longitude, searchRadius, settings.fuelType).then(() => setLoading(false));
      }
  }, [settings.fuelType, searchRadius]);

  const fetchStations = async (lat, lng, radiusKm, activeFuelType = 'diesel') => {
      const apiFuelCode = ALL_FUELS[activeFuelType].apiCode;
      const cacheKey = `${CACHE_KEY_PREFIX}_${activeFuelType}_${radiusKm}km_${lat.toFixed(2)}`;
      
      try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
              const { data, timestamp } = JSON.parse(cached);
              if (Date.now() - timestamp < 3600000 && data.length > 0) {
                  setStations(data);
                  setLoading(false);
                  return data;
              }
          }
          
          const queryUrl = `${PRICES_API_URL}?latitude=${lat}&longitude=${lng}&distance=${radiusKm}&fuel=${apiFuelCode}&results=200`;
          const res = await fetch(queryUrl);
          
          if (res.ok) {
              const data = await res.json();
              const mappedData = data.map((item, index) => {
                  if (!item || !item.latitudine || !item.longitudine) return null;
                  const priceVal = parseFloat(item.prezzo);
                  if (isNaN(priceVal)) return null;
                  const safeId = item.id ? item.id.toString() : `id_${index}_${Date.now()}`;
                  
                  const stationLat = parseFloat(item.latitudine);
                  const stationLng = parseFloat(item.longitudine);
                  const realDist = getDistanceFromLatLonInKm(lat, lng, stationLat, stationLng);

                  return {
                      id: safeId,
                      brand: getCleanBrand(item.name || "", item.bandiera || item.gestore),
                      title: item.name,
                      address: item.indirizzo || "Indirizzo sconosciuto",
                      latitude: stationLat,
                      longitude: stationLng,
                      prices: { [activeFuelType]: priceVal },
                      lastUpdate: item.dtComu || new Date().toISOString(),
                      distance: realDist
                  };
              }).filter(Boolean);

              if (mappedData.length > 0) {
                  setStations(mappedData);
                  AsyncStorage.setItem(cacheKey, JSON.stringify({ data: mappedData, timestamp: Date.now() }));
              } else {
                  setStations([]); 
              }
              return mappedData;
          }
      } catch (e) { console.warn("API Error:", e); }
      return [];
  };

  const handleRecenter = async () => {
      try {
          if (Platform.OS === 'ios') Haptics.selectionAsync();
          let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const newRegion = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 };
          setLocation(newRegion);
          if (mapRef.current) mapRef.current.animateToRegion(newRegion, 600);
          setLoading(true);
          fetchStations(newRegion.latitude, newRegion.longitude, searchRadius, settings.fuelType).then(() => setLoading(false));
      } catch (error) { console.log(error); }
  };

  const updateRadius = (r) => {
      if (Platform.OS === 'ios') Haptics.selectionAsync();
      setSearchRadius(r);
      AsyncStorage.setItem('user_radius', r.toString());
  };

  const panResponder = useRef(PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
      onPanResponderGrant: () => { sheetTranslateY.stopAnimation((value) => { lastGestureDy.current = value; }); },
      onPanResponderMove: (_, { dy }) => { 
          let newY = lastGestureDy.current + dy;
          if (newY < SNAP_FULL) {
              newY = SNAP_FULL + (newY - SNAP_FULL) * 0.05;
              if (newY < SNAP_FULL - 40) newY = SNAP_FULL - 40;
          } else if (newY > 0) newY = newY * 0.15;
          sheetTranslateY.setValue(newY); 
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const currentY = lastGestureDy.current + dy;
        let target = SNAP_CLOSED;
        if (vy < -0.5) target = SNAP_FULL; 
        else if (vy > 0.5) target = currentY < SNAP_HALF ? SNAP_HALF : SNAP_CLOSED;
        else {
            if (currentY < (SNAP_FULL + SNAP_HALF) / 2) target = SNAP_FULL;
            else if (currentY < (SNAP_HALF + SNAP_CLOSED) / 2) target = SNAP_HALF;
            else target = SNAP_CLOSED;
        }
        snapTo(target);
      }
  })).current;

  const cardPanResponder = useRef(PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
      onPanResponderMove: (_, { dy }) => {
          if (dy > 0) cardAnim.setValue(dy);
          else cardAnim.setValue(dy * 0.1);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
          if (dy > 100 || vy > 0.5) closeDetailCard();
          else Animated.spring(cardAnim, { toValue: 0, friction: 5, useNativeDriver: true }).start();
      }
  })).current;

  const snapTo = (value) => {
      lastGestureDy.current = value; 
      Animated.spring(sheetTranslateY, { 
          toValue: value, 
          damping: 25, 
          stiffness: 150, 
          useNativeDriver: false 
      }).start();
      if (value === SNAP_CLOSED) Keyboard.dismiss();
  };

  const openCard = (s) => {
    setSelectedStation(s);
    cardAnim.setValue(height);
    Animated.spring(cardAnim, { toValue: 0, damping: 20, useNativeDriver: true }).start();
  };

  const closeDetailCard = (shouldReopenList = false) => {
    Animated.timing(cardAnim, { toValue: height, duration: 250, useNativeDriver: true }).start(() => {
        setSelectedStation(null);
        if (shouldReopenList) snapTo(SNAP_HALF);
    });
  };

  const safeToggleFavorite = () => { 
      if (Platform.OS === 'ios') Haptics.selectionAsync();
      if(selectedStation && toggleFavorite) toggleFavorite(selectedStation); 
  };

  const groupedFavorites = useMemo(() => {
      const groups = {};
      if (!favorites) return {};
      favorites.forEach(fav => {
          const city = extractCity(fav.address);
          if (!groups[city]) groups[city] = [];
          groups[city].push(fav);
      });
      return groups; 
  }, [favorites]);

  const isFav = selectedStation && favorites ? favorites.some(f => f.id === selectedStation.id) : false;
  const statusInfo = selectedStation ? getStationStatus(selectedStation.lastUpdate) : null;

  const sortedStations = useMemo(() => {
      return [...stations].sort((a,b) => a.prices[settings.fuelType] - b.prices[settings.fuelType]);
  }, [stations, settings.fuelType]);

  const top3Ids = useMemo(() => {
      if (sortedStations.length === 0) return {};
      return { [sortedStations[0]?.id]: 1, [sortedStations[1]?.id]: 2, [sortedStations[2]?.id]: 3 };
  }, [sortedStations]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {location && (
        <MapView 
          ref={mapRef} 
          style={StyleSheet.absoluteFill} 
          initialRegion={location}
          showsUserLocation
          showsMyLocationButton={false}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
          onPress={() => { closeDetailCard(false); snapTo(SNAP_CLOSED); Keyboard.dismiss(); }}
        >
          {stations.map(s => (
            <StationMarker key={s.id} station={s} fuelType={settings.fuelType} onPress={openCard} isDark={isDark} theme={theme} rank={top3Ids[s.id]} />
          ))}
        </MapView>
      )}

      {/* --- PULSANTI MAPPA --- */}
      <View style={[styles.mapButtons, { top: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleRecenter} activeOpacity={0.7} style={styles.iconBtnWrapper}>
              <GlassView glassEffectStyle="regular" style={styles.iconBtn} isInteractive={true}>
                  <Ionicons name="locate" size={24} color={theme.tint} />
              </GlassView>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)} activeOpacity={0.7} style={styles.iconBtnWrapper}>
             <GlassView glassEffectStyle="regular" style={styles.iconBtn} isInteractive={true}>
                 <Ionicons name="options-outline" size={24} color={theme.text} />
             </GlassView>
          </TouchableOpacity>
      </View>

      {/* --- BOTTOM SHEET --- */}
      <Animated.View style={[
          styles.floatingSheetContainer, 
          { 
              transform: [{ translateY: sheetTranslateY }],
              left: animatedMargin,
              right: animatedMargin 
          }
      ]}>
          {/* SFONDO CON BLURVIEW NATIVO (EFFETTO VETRO REALE) */}
          <Animated.View style={[
              StyleSheet.absoluteFill, 
              { 
                  zIndex: 0,
                  borderRadius: fixedBorderRadius,
                  overflow: 'hidden',
                  opacity: backgroundOpacity, // Sparisce se chiuso
              }
          ]} pointerEvents="none">
             <BlurView 
                intensity={80} // Intensità alta per effetto solido
                tint={isDark ? 'dark' : 'light'} 
                style={StyleSheet.absoluteFill}
             >
                {/* Overlay colore per aumentare la leggibilità (Alpha alto 0.5+) */}
                <View style={{
                    flex: 1, 
                    backgroundColor: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.6)'
                }} />
             </BlurView>
          </Animated.View>

          {/* CONTENUTO */}
          <View style={{ flex: 1, zIndex: 10, width: '100%', alignSelf: 'center' }}>
            <View {...panResponder.panHandlers} style={[styles.dragArea, { paddingHorizontal: 16 }]}>
                <View style={styles.dragHandle} />
                
                 {/* ... dentro il Render, nel Bottom Sheet ... */}

<View style={styles.headerRow}>
    {/* --- MODIFICA QUI: Sostituito View con GlassView --- */}
    <GlassView 
        glassEffectStyle="regular" 
        style={styles.searchPillWrapper} 
        isInteractive={true}
    >
        {loading ? 
            <View style={{marginLeft: 14}}><RainbowSpinner /></View> : 
            <Ionicons name="search" size={20} color={theme.subText} style={{marginLeft: 14}} />
        }
        <TextInput 
            style={[styles.input, { color: theme.text }]}
            placeholder={loading ? "Caricamento..." : "Cerca distributore..."}
            placeholderTextColor={theme.subText}
            value={searchText}
            onChangeText={(t) => {
                setSearchText(t);
                if(t.length > 1) {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsSearching(true);
                    snapTo(SNAP_HALF);
                    setSuggestions(stations.filter(s => s.brand.toLowerCase().includes(t.toLowerCase())).slice(0,10));
                }
            }}
            onFocus={() => { 
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); 
                setIsSearching(true); 
                snapTo(SNAP_HALF); 
            }}
        />
    </GlassView>
    
    {isSearching && (
        <TouchableOpacity onPress={() => { setIsSearching(false); Keyboard.dismiss(); snapTo(SNAP_CLOSED); setSearchText(''); }} activeOpacity={0.7} style={{marginLeft: 10}}>
            <GlassView style={styles.glassBtnCircle} glassEffectStyle="regular" isInteractive={true}>
                <Ionicons name="close" size={24} color="#FF3B30" />
            </GlassView>
        </TouchableOpacity>
    )}
</View>

                {/* CHIPS CARBURANTE */}
                <View style={styles.chipsRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 10 }} keyboardShouldPersistTaps="handled">
                      {Object.keys(ALL_FUELS).map(k => (
                          <FuelChip key={k} type={k} isSelected={settings.fuelType === k} theme={theme} onPress={() => { updateSetting('fuelType', k); }} />
                      ))}
                  </ScrollView>
                </View>
            </View>

            <Animated.View style={[styles.contentContainer, { opacity: contentOpacity }]}>
                  <ScrollView 
                    keyboardShouldPersistTaps="handled" 
                    showsVerticalScrollIndicator={false} 
                    scrollEnabled={lastGestureDy.current !== SNAP_CLOSED}
                    contentContainerStyle={{ paddingBottom: 120 }}
                  >
                      {isSearching && (
                          <>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Risultati Ricerca</Text>
                            {suggestions.length > 0 ? suggestions.map((item) => {
                                  const dist = location ? getDistanceFromLatLonInKm(location.latitude, location.longitude, item.latitude, item.longitude).toFixed(1) : "?";
                                  return (
                                      <TouchableOpacity key={item.id} style={styles.suggestionRow} onPress={() => { Keyboard.dismiss(); snapTo(SNAP_CLOSED); mapRef.current?.animateToRegion({latitude: item.latitude, longitude: item.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01}); setTimeout(()=>openCard(item),100); }}>
                                          {BRAND_LOGOS[item.brand] ? <Image source={{uri: BRAND_LOGOS[item.brand]}} style={{width:32, height:32, marginRight: 12, resizeMode:'contain'}} /> : <View style={styles.iconBox}><FontAwesome5 name="gas-pump" size={16} color={theme.text}/></View>}
                                          <View style={{flex:1}}>
                                              <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                                  <Text style={{color:theme.text, fontWeight:'600'}}>{item.brand}</Text>
                                                  <Text style={{color:theme.tint, fontWeight:'700'}}>{item.prices[settings.fuelType]?.toFixed(3)}€</Text>
                                              </View>
                                              {/* SOLO CITTÀ */}
                                              <Text style={{color:theme.subText, fontSize:12}}>{extractCity(item.address)} • {dist} km</Text>
                                          </View>
                                      </TouchableOpacity>
                                  );
                            }) : (
                                <View style={{alignItems:'center', marginTop: 40, opacity: 0.6}}>
                                    <Ionicons name="search-outline" size={48} color={theme.subText} />
                                    <Text style={{color: theme.text, marginTop: 10, fontSize: 16, fontWeight: '600'}}>Nessun distributore trovato</Text>
                                </View>
                            )}
                          </>
                      )}

                      {!isSearching && (
                          <View>
                              {sortedStations.length > 0 && (
                                  <View style={{marginBottom: 20}}>
                                      <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>Migliori Prezzi (entro {searchRadius}km)</Text>
                                      {sortedStations.slice(0, 3).map((item, idx) => {
                                          const rank = idx + 1;
                                          const rankData = RANK_COLORS[rank];
                                          const dist = location ? getDistanceFromLatLonInKm(location.latitude, location.longitude, item.latitude, item.longitude).toFixed(1) : "?";
                                          const sStatus = getStationStatus(item.lastUpdate);
                                          
                                          return (
                                              <TouchableOpacity key={item.id} style={styles.topPriceRow} onPress={() => { snapTo(SNAP_CLOSED); mapRef.current?.animateToRegion({latitude: item.latitude, longitude: item.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01}); setTimeout(()=>openCard(item),100); }}>
                                                  <View style={{width: 32, height: 32, borderRadius: 12, backgroundColor: rankData.color, justifyContent:'center', alignItems:'center', marginRight: 14}}>
                                                      <Text style={{fontSize: 16, fontWeight: 'bold', color: 'black'}}>{rank}</Text>
                                                  </View>
                                                  <View style={{flex:1, justifyContent:'center'}}>
                                                      <Text style={{color:theme.text, fontWeight:'800', fontSize: 18, marginBottom: 4}} numberOfLines={1}>{item.brand}</Text>
                                                      <View style={{flexDirection:'row', alignItems:'center'}}>
                                                          <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: sStatus.color, marginRight: 6}} />
                                                          <Text style={{color: theme.subText, fontSize: 13, fontWeight:'600'}}>
                                                              <Text style={{color: sStatus.color}}>{sStatus.text}</Text> • {dist} km
                                                          </Text>
                                                      </View>
                                                  </View>
                                                  <View style={{alignItems:'flex-end'}}>
                                                      <Text style={{color:rankData.color, fontWeight:'900', fontSize: 24}}>{item.prices[settings.fuelType]?.toFixed(3)}€</Text>
                                                  </View>
                                              </TouchableOpacity>
                                          );
                                      })}
                                  </View>
                              )}

                              <Text style={[styles.sectionTitle, { color: theme.text }]}>I tuoi Preferiti</Text>
                              {Object.keys(groupedFavorites).length > 0 ? Object.keys(groupedFavorites).map((city) => (
                                  <View key={city} style={styles.groupContainer}>
                                      <View style={styles.groupHeaderContainer}>
                                          {/* Solo Città/Zona */}
                                          <Text style={[styles.groupHeaderTitle, {color: theme.tint}]}>{city}</Text>
                                          <View style={[styles.groupSeparator, {backgroundColor: theme.subText}]} />
                                      </View>
                                      <View style={styles.groupGrid}>
                                          {groupedFavorites[city].map(fav => (
                                              <TouchableOpacity key={fav.id} style={[styles.favCardGrid, {backgroundColor: isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.04)'}]} onPress={() => { snapTo(SNAP_CLOSED); setTimeout(()=>openCard(fav),100); }}>
                                                  <View style={{marginBottom: 8}}>
                                                      {BRAND_LOGOS[fav.brand] ? <Image source={{uri: BRAND_LOGOS[fav.brand]}} style={{width: 36, height: 36, resizeMode:'contain'}}/> : <View style={[styles.favIconCircle, {backgroundColor: ALL_FUELS[settings.fuelType].color}]}><Text style={{color:'white', fontWeight:'bold'}}>{fav.brand.charAt(0)}</Text></View>}
                                                  </View>
                                                  <Text style={[styles.favTextGrid, {color:theme.text}]} numberOfLines={1}>{fav.brand}</Text>
                                              </TouchableOpacity>
                                          ))}
                                      </View>
                                  </View>
                              )) : (
                                  <View style={{alignItems:'center', marginTop: 20}}>
                                      <Ionicons name="heart-outline" size={48} color={theme.subText} style={{opacity:0.3}} />
                                      <Text style={{color:theme.subText, marginTop:10}}>Nessun preferito salvato</Text>
                                  </View>
                              )}
                          </View>
                      )}
                  </ScrollView>
            </Animated.View>
          </View>
      </Animated.View>

      <Animated.View 
        style={[styles.detailCardWrapper, { transform: [{ translateY: cardAnim }] }]}
        {...cardPanResponder.panHandlers}
      >
          <GlassCard glassEffectStyle="prominent" style={styles.detailCard} isInteractive={true}>
            {selectedStation && (
                <View style={{padding: 20, flex: 1}}>
                    <View style={styles.sheetHandle} />

                    <View style={styles.dcHeader}>
                        <View style={styles.logoContainer}>
                             {BRAND_LOGOS[selectedStation.brand] ? 
                                  <Image source={{uri: BRAND_LOGOS[selectedStation.brand]}} style={styles.logoImage} /> :
                                  <View style={[styles.logoPlaceholder, {backgroundColor: theme.tint}]}>
                                      <Text style={{color:'white', fontSize: 24, fontWeight:'bold'}}>{selectedStation.brand.charAt(0)}</Text>
                                  </View>
                             }
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={[styles.dcTitle, { color: theme.text }]} numberOfLines={1}>{selectedStation.brand}</Text>
                            {/* SOLO CITTÀ ANCHE QUI */}
                            <Text style={{color: theme.subText, fontSize: 13, marginTop: 2}} numberOfLines={1}>{extractCity(selectedStation.address)}</Text>
                            {statusInfo && (
                                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                                    <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: statusInfo.color, marginRight: 6}} />
                                    <Text style={{color: statusInfo.color, fontWeight: '700', fontSize: 12}}>{statusInfo.text}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    
                    <View style={styles.bigPriceContainer}>
                        <Text style={{color: ALL_FUELS[settings.fuelType].color, fontSize: 18, fontWeight:'800', textTransform:'uppercase', marginBottom: 5}}>
                            {ALL_FUELS[settings.fuelType].label}
                        </Text>
                        <Text style={{fontSize: 60, fontWeight:'900', color: theme.text, lineHeight: 64}}>
                            {selectedStation.prices[settings.fuelType]?.toFixed(3)}<Text style={{fontSize: 32}}>€</Text>
                        </Text>
                    </View>

                    <View style={styles.dcActions}>
                        <TouchableOpacity style={{width: 60, height: 60}} onPress={safeToggleFavorite} activeOpacity={0.7}>
                            <GlassView 
                                glassEffectStyle={isFav ? 'prominent' : 'regular'}
                                style={[
                                    styles.dcHeartBtn, 
                                    isFav ? { backgroundColor: '#FF2D5520', borderColor: '#FF2D55', borderWidth: 1 } : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                                ]}
                                isInteractive={true}
                            >
                                <Ionicons name={isFav?"heart":"heart-outline"} size={30} color={isFav?"#FF2D55":theme.text} />
                            </GlassView>
                        </TouchableOpacity>

                        <TouchableOpacity style={{flex: 1, height: 60}} onPress={() => {
                            const url = Platform.select({ ios: `maps:0,0?daddr=${selectedStation.latitude},${selectedStation.longitude}&dirflg=d`, android: `google.navigation:q=${selectedStation.latitude},${selectedStation.longitude}` });
                            Linking.openURL(url);
                        }} activeOpacity={0.7}>
                            <GlassView 
                                glassEffectStyle="prominent"
                                style={[styles.dcNavBtn, { backgroundColor: theme.tint + 'CC' }]} 
                                isInteractive={true}
                            >
                                <Ionicons name="navigate-circle" size={24} color="white" style={{marginRight: 8}}/>
                                <Text style={{color:'white', fontSize: 18, fontWeight:'800'}}>NAVIGA</Text>
                            </GlassView>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
          </GlassCard>
      </Animated.View>

      <Modal animationType="fade" transparent={true} visible={showSettings} onRequestClose={() => setShowSettings(false)}>
          <View style={styles.modalOverlay}>
              <GlassCard glassEffectStyle="prominent" style={styles.glassModalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={{fontSize: 26, fontWeight: '900', color: theme.text}}>Impostazioni</Text>
                      <TouchableOpacity onPress={() => setShowSettings(false)} activeOpacity={0.7}>
                          <GlassView glassEffectStyle="regular" style={styles.modalCloseBtn} isInteractive={true}>
                              <Ionicons name="close" size={24} color={theme.text} />
                          </GlassView>
                      </TouchableOpacity>
                  </View>
                  
                  <View style={styles.settingSection}>
                      <View style={{flexDirection:'row', alignItems:'center', marginBottom: 15}}>
                          <Ionicons name="map-outline" size={20} color={theme.subText} style={{marginRight: 8}}/>
                          <Text style={{fontSize: 16, fontWeight: '700', color: theme.text}}>Raggio di ricerca</Text>
                      </View>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
                          {[5, 10, 20, 50].map((r) => (
                              <TouchableOpacity key={r} onPress={() => updateRadius(r)} activeOpacity={0.7} style={{flex:1}}>
                                  <GlassView 
                                    glassEffectStyle={searchRadius === r ? 'prominent' : 'regular'} 
                                    style={[styles.glassChip, searchRadius === r && {backgroundColor: theme.tint + '50', borderColor: theme.tint}]}
                                    isInteractive={true}
                                  >
                                      <Text style={{fontWeight: '800', color: searchRadius === r ? 'white' : theme.text}}>{r}km</Text>
                                  </GlassView>
                              </TouchableOpacity>
                          ))}
                      </View>
                  </View>

                  <View style={styles.settingSection}>
                      <View style={{flexDirection:'row', alignItems:'center', marginBottom: 15}}>
                          <Ionicons name="color-filter-outline" size={20} color={theme.subText} style={{marginRight: 8}}/>
                          <Text style={{fontSize: 16, fontWeight: '700', color: theme.text}}>Carburante Predefinito</Text>
                      </View>
                      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>
                          {Object.keys(ALL_FUELS).map((k) => (
                              <TouchableOpacity key={k} onPress={() => updateSetting('fuelType', k)} activeOpacity={0.7} style={{width: '48%'}}>
                                  <GlassView 
                                    glassEffectStyle={settings.fuelType === k ? 'prominent' : 'regular'}
                                    style={[styles.glassChip, settings.fuelType === k && {backgroundColor: ALL_FUELS[k].color + '50', borderColor: ALL_FUELS[k].color}]}
                                    isInteractive={true}
                                  >
                                      <MaterialCommunityIcons name={ALL_FUELS[k].icon} size={18} color={settings.fuelType === k ? 'white' : theme.text} style={{marginRight: 8}} />
                                      <Text style={{fontWeight: '800', color: settings.fuelType === k ? 'white' : theme.text}}>{ALL_FUELS[k].label}</Text>
                                  </GlassView>
                              </TouchableOpacity>
                          ))}
                      </View>
                  </View>

                  <View style={[styles.settingRow, {marginTop: 10}]}>
                      <View style={{flex:1}}>
                          <Text style={{fontSize: 16, fontWeight: '700', color: theme.text}}>Avviso Prossimità</Text>
                          <Text style={{fontSize: 12, color: theme.subText, marginTop:4}}>Notifica se un distributore è &lt; 1.5km</Text>
                      </View>
                      <Switch value={proximityAlertEnabled} onValueChange={setProximityAlertEnabled} trackColor={{false: '#767577', true: theme.tint}} thumbColor={'white'} />
                  </View>
              </GlassCard>
          </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapButtons: { position: 'absolute', right: 16, zIndex: 40, gap: 12 },
  iconBtnWrapper: { borderRadius: 22, overflow: 'hidden' },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  markerWrapper: { alignItems: 'center', justifyContent: 'center' },
  markerPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  markerTitle: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  markerPrice: { fontSize: 16, fontWeight: '900' },
  rankBadge: { position: 'absolute', top: -16, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 10, shadowColor: "#000", shadowOffset: {width:0,height:2}, shadowOpacity:0.3, shadowRadius:2, elevation:3 },
  rankText: { color: 'black', fontSize: 11, fontWeight: '800' },
  markerArrow: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -1 },
  floatingSheetContainer: { 
      position: 'absolute', 
      bottom: -height + 200, 
      height: height, 
      zIndex: 50,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 20
  },
  unifiedBackground: { flex: 1, overflow: 'hidden' }, 
  dragArea: { paddingBottom: 10, zIndex: 2 },
  dragHandle: { width: 60, height: 6, backgroundColor: 'rgba(128,128,128,0.5)', borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 15 },
  chipsRow: { height: 50, marginBottom: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  chipText: { marginLeft: 8, fontSize: 14, fontWeight: '600' },
  headerRow: { flexDirection: 'row', alignItems: 'center', height: 50, marginBottom: 15 },
  searchPillWrapper: { flex: 1, borderRadius: 25, overflow: 'hidden', height: '100%', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  input: { flex: 1, fontSize: 16, fontWeight: '600', marginLeft: 10, height: '100%' },
  glassBtnCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 24, fontWeight: '900', marginBottom: 20, marginTop: 20, letterSpacing: -0.5 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128,128,128,0.1)' },
  topPriceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128,128,128,0.1)' },
  iconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: 'rgba(128,128,128,0.1)' },
  groupContainer: { marginBottom: 25 },
  groupHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  groupHeaderTitle: { fontSize: 20, fontWeight: '800' },
  groupSeparator: { flex: 1, height: 1, marginLeft: 12, opacity: 0.1 },
  groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  favCardGrid: { width: '31%', padding: 12, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  favIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  favTextGrid: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  detailCardWrapper: { position: 'absolute', bottom: 30, left: 12, right: 12, height: 350, zIndex: 100, shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 15 },
  detailCard: { flex: 1, borderRadius: 32, paddingHorizontal: 0 },
  sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor:'rgba(128,128,128,0.4)', alignSelf:'center', marginBottom: 10 },
  dcHeader: { flexDirection: 'row', marginTop: 5, alignItems: 'flex-start' },
  logoContainer: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', marginRight: 15, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EEE' },
  logoImage: { width: 45, height: 45, resizeMode: 'contain' },
  logoPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  dcTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  bigPriceContainer: { paddingVertical: 25, alignItems: 'center', justifyContent:'center' },
  dcActions: { position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', gap: 15 },
  dcHeartBtn: { width: '100%', height: '100%', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  dcNavBtn: { flex: 1, height: '100%', borderRadius: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  glassModalContent: { borderRadius: 32, padding: 25, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, alignItems: 'center' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, justifyContent:'center', alignItems:'center' },
  settingSection: { marginBottom: 30 },
  glassChip: { paddingVertical: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});