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

// --- IMPORT COMPONENTI ESTERNI ---
import { GlassCard, GlassView } from '../../components/GlassView'; 
import { useApp } from '../../context/AppContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height } = Dimensions.get('window');

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

const PRICES_API_URL = 'https://prezzi-carburante.onrender.com/api/distributori';
const CACHE_KEY_PREFIX = 'stations_v64_stable_ui_';

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
    if (text.includes("SARNI")) return "Sarni";
    if (text.includes("CONAD")) return "Conad";
    if (text.includes("COOP")) return "Enercoop";
    if (text.includes("COSTANTIN")) return "Costantin";
    if (text.includes("VEGA")) return "Vega";
    if (rawBrand && rawBrand.length > 2) return rawBrand;
    return "Pompa Bianca"; 
};

const extractCity = (address) => {
    if (!address) return "Altro";
    const parts = address.split(',');
    if (parts.length > 1) {
        let cityPart = parts[parts.length - 1].trim();
        cityPart = cityPart.replace(/[0-9]{5}/g, '').replace(/\([A-Z]{2}\)/g, '').trim();
        return cityPart.length > 1 ? cityPart : "Zona Sconosciuta";
    }
    return "Altro";
};

const getStationStatus = (lastUpdate) => {
    const now = new Date();
    const hour = now.getHours();
    const updateDate = new Date(lastUpdate);
    const daysOld = (now - updateDate) / (1000 * 60 * 60 * 24);
    if (daysOld > 7) return { text: "Prezzi vecchi", color: "#FF3B30", sub: "Verifica prima" };
    const isDayTime = hour >= 7 && hour < 20; 
    if (isDayTime) return { text: "Aperto", color: "#34C759", sub: "Servito o Self" };
    return { text: "Aperto 24h", color: "#34C759", sub: "Solo Self Service" }; 
};

// --- COMPONENTI UI ---
const RainbowSpinner = () => {
    const spinValue = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(Animated.timing(spinValue, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })).start();
    }, []);
    const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return <Animated.View style={{ transform: [{ rotate: spin }] }}><Ionicons name="sync" size={24} color="#007AFF" /></Animated.View>;
};

const FuelChip = ({ type, isSelected, onPress, theme }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{marginRight: 8}}>
        <GlassView glassEffectStyle={isSelected ? 'prominent' : 'regular'} style={[styles.chip, isSelected && { borderWidth: 1, borderColor: ALL_FUELS[type].color, backgroundColor: ALL_FUELS[type].color + '20' }]} isInteractive={true}>
          <MaterialCommunityIcons name={ALL_FUELS[type].icon} size={18} color={isSelected ? ALL_FUELS[type].color : theme.subText} />
          <Text style={[styles.chipText, { color: isSelected ? ALL_FUELS[type].color : theme.text }]}>{ALL_FUELS[type].label}</Text>
        </GlassView>
    </TouchableOpacity>
);

const StationMarker = ({ station, fuelType, onPress, isDark, theme, isCheapest }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const p = station.prices[fuelType];
    if (!p) return null;
    const color = ALL_FUELS[fuelType].color;

    const handlePress = () => {
      onPress(station);
      if (Platform.OS === 'ios') Haptics.selectionAsync();
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
      ]).start();
    };
    
    const logoUrl = BRAND_LOGOS[station.brand];

    return (
      <Marker coordinate={{ latitude: station.latitude, longitude: station.longitude }} onPress={(e) => e.stopPropagation()} zIndex={isCheapest ? 100 : 1}>
        <TouchableOpacity activeOpacity={1} onPress={handlePress}>
            <Animated.View style={[styles.markerWrapper, { transform: [{ scale: scaleAnim }] }]}>
                {isCheapest && <View style={styles.bestBadge}><Text style={styles.bestText}>BEST</Text></View>}
                <GlassCard glassEffectStyle="regular" style={[styles.markerPill, { borderColor: isCheapest ? '#34C759' : (isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.1)'), borderWidth: isCheapest ? 2 : 1 }]} isInteractive={false}>
                    {logoUrl ? 
                        <Image source={{uri: logoUrl}} style={{width: 16, height: 16, marginRight: 6, resizeMode:'contain'}} /> :
                        <FontAwesome5 name="gas-pump" size={14} color={color} style={{ marginRight: 6 }} />
                    }
                    <View>
                        <Text style={[styles.markerTitle, { color: theme.text }]} numberOfLines={1}>{station.brand}</Text>
                        <Text style={[styles.markerPrice, { color: color }]}>{p.toFixed(3)}€</Text>
                    </View>
                </GlassCard>
                <View style={[styles.markerArrow, { borderTopColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.9)' }]} />
            </Animated.View>
        </TouchableOpacity>
      </Marker>
    );
};

// --- MAIN SCREEN ---
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

  // Gesture Constants
  const SNAP_CLOSED = 0; 
  const SNAP_HALF = -height * 0.55; 
  const SNAP_FULL = -(height - insets.top - 120); 

  const sheetTranslateY = useRef(new Animated.Value(SNAP_CLOSED)).current;
  const lastGestureDy = useRef(SNAP_CLOSED);
  const cardAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => { navigation.setOptions({ headerShown: false, tabBarStyle: { display: 'none' } }); }, [navigation]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 });
      if (!settings.fuelType || settings.fuelType === 'electric') updateSetting('fuelType', 'diesel');
      fetchStations(loc.coords.latitude, loc.coords.longitude, 15000, settings.fuelType || 'diesel');
    })();
  }, []);

  useEffect(() => {
      if (location) {
          setLoading(true);
          fetchStations(location.latitude, location.longitude, 15000, settings.fuelType).then(() => setLoading(false));
      }
  }, [settings.fuelType]);

  const fetchStations = async (lat, lng, radius = 15000, activeFuelType = 'diesel') => {
      const apiFuelCode = ALL_FUELS[activeFuelType].apiCode;
      const cacheKey = `${CACHE_KEY_PREFIX}_${activeFuelType}_${lat.toFixed(2)}`;
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
          const queryUrl = `${PRICES_API_URL}?latitude=${lat}&longitude=${lng}&distance=${radius/1000}&fuel=${apiFuelCode}&results=50`;
          const res = await fetch(queryUrl);
          if (res.ok) {
              const data = await res.json();
              const mappedData = data.map((item, index) => {
                  if (!item || !item.latitudine || !item.longitudine) return null;
                  const priceVal = parseFloat(item.prezzo);
                  if (isNaN(priceVal)) return null;
                  const safeId = item.id ? item.id.toString() : `temp_${index}_${Date.now()}`;
                  const realBrand = getCleanBrand(item.name || "", item.bandiera || item.gestore);
                  return {
                      id: safeId,
                      brand: realBrand,
                      title: item.name,
                      address: item.indirizzo || "Indirizzo sconosciuto",
                      latitude: parseFloat(item.latitudine),
                      longitude: parseFloat(item.longitudine),
                      prices: { [activeFuelType]: priceVal },
                      lastUpdate: item.dtComu || new Date().toISOString(),
                  };
              }).filter(Boolean);
              if (mappedData.length > 0) {
                  setStations(mappedData);
                  AsyncStorage.setItem(cacheKey, JSON.stringify({ data: mappedData, timestamp: Date.now() }));
              }
              return mappedData;
          }
      } catch (e) { console.warn("API Error:", e); }
      return [];
  };

  const panResponder = useRef(PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
      onPanResponderGrant: () => { 
          sheetTranslateY.stopAnimation((value) => { lastGestureDy.current = value; });
      },
      onPanResponderMove: (_, { dy }) => { 
          let newY = lastGestureDy.current + dy;
          if (newY < SNAP_FULL) newY = SNAP_FULL + (newY - SNAP_FULL) * 0.15;
          if (newY > 0) newY = newY * 0.15;
          sheetTranslateY.setValue(newY); 
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const currentY = lastGestureDy.current + dy;
        let target = SNAP_CLOSED;
        if (vy < -0.5) target = SNAP_FULL; 
        else if (vy > 0.5) target = SNAP_CLOSED;
        else {
            if (currentY < SNAP_FULL + 150) target = SNAP_FULL;
            else if (currentY < SNAP_HALF + 100) target = SNAP_HALF;
            else target = SNAP_CLOSED;
        }
        snapTo(target);
      }
  })).current;

  const snapTo = (value) => {
      lastGestureDy.current = value; 
      Animated.spring(sheetTranslateY, { toValue: value, damping: 20, stiffness: 100, useNativeDriver: true }).start();
      if (value === SNAP_CLOSED) Keyboard.dismiss();
  };

  const handleTextChange = (text) => {
      setSearchText(text);
      if (text.length > 0 && !isSearching) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsSearching(true);
          snapTo(SNAP_HALF);
      }
      if (text.length > 1) {
          const lower = text.toLowerCase();
          const results = stations.filter(s => 
             (s.brand && s.brand.toLowerCase().includes(lower)) || 
             (s.title && s.title.toLowerCase().includes(lower))
          );
          setSuggestions(results.slice(0, 15));
      } else {
          setSuggestions([]);
      }
  };

  // Funzione focus: apre il pannello e restringe la barra SENZA nascondere i chip
  const handleSearchFocus = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsSearching(true);
      snapTo(SNAP_HALF);
  };

  const handleSelectSuggestion = (station) => {
      Keyboard.dismiss();
      snapTo(SNAP_CLOSED); 
      if (mapRef.current) {
          const offsetLat = station.latitude - 0.0025;
          mapRef.current.animateToRegion({
              latitude: offsetLat,
              longitude: station.longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015
          }, 600);
      }
      setTimeout(() => {
          openCard(station);
      }, 100);
      setSearchText(station.brand);
      setSuggestions([]);
  };

  const cancelSearch = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSearchText('');
      setSuggestions([]);
      setIsSearching(false);
      snapTo(SNAP_CLOSED);
  };

  const handleRecenter = () => {
      if (location && mapRef.current) {
          mapRef.current.animateToRegion(location, 500);
      }
  };

  const openCard = (s) => {
    setSelectedStation(s);
    Animated.spring(cardAnim, { toValue: 0, damping: 20, useNativeDriver: true }).start();
  };

  const closeDetailCard = (shouldReopenList = false) => {
    Animated.timing(cardAnim, { toValue: height, duration: 250, useNativeDriver: true }).start(() => {
        setSelectedStation(null);
        if (shouldReopenList) {
            snapTo(SNAP_HALF);
        }
    });
  };

  const safeToggleFavorite = () => {
      if(selectedStation && toggleFavorite) {
          toggleFavorite(selectedStation);
      }
  };

  const groupedFavorites = useMemo(() => {
      const groups = {};
      if (!favorites || favorites.length === 0) return {};
      favorites.forEach(fav => {
          const city = extractCity(fav.address);
          if (!groups[city]) groups[city] = [];
          groups[city].push(fav);
      });
      return groups; 
  }, [favorites]);

  const contentOpacity = sheetTranslateY.interpolate({ inputRange: [SNAP_HALF, SNAP_CLOSED], outputRange: [1, 0], extrapolate: 'clamp' });
  const isFav = selectedStation && favorites ? favorites.some(f => f.id === selectedStation.id) : false;
  const cheapestId = stations.length > 0 ? stations.sort((a,b) => a.prices[settings.fuelType] - b.prices[settings.fuelType])[0].id : null;
  const statusInfo = selectedStation ? getStationStatus(selectedStation.lastUpdate) : null;

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
            <StationMarker key={s.id} station={s} fuelType={settings.fuelType} onPress={openCard} isDark={isDark} theme={theme} isCheapest={s.id === cheapestId} />
          ))}
        </MapView>
      )}

      {/* TASTI MAPPA */}
      <TouchableOpacity style={[styles.roundBtn, { top: insets.top + 10, right: 16 }]} onPress={handleRecenter} activeOpacity={0.8}>
          <GlassView glassEffectStyle="regular" style={styles.iconBtn}><Ionicons name="locate" size={24} color={theme.tint} /></GlassView>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.roundBtn, { top: insets.top + 70, right: 16 }]} onPress={() => setShowSettings(true)}>
         <GlassView glassEffectStyle="regular" style={styles.iconBtn}><Ionicons name="options-outline" size={24} color={theme.text} /></GlassView>
      </TouchableOpacity>

      {/* BOTTOM SHEET */}
      <Animated.View style={[styles.floatingSheetContainer, { transform: [{ translateY: sheetTranslateY }] }]}>
          
          {/* I CHIP SONO SEMPRE VISIBILI - NESSUNA CONDIZIONE DI NASCONDIMENTO */}
          <View style={styles.chipsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }} keyboardShouldPersistTaps="handled">
                {Object.keys(ALL_FUELS).map(k => (
                    <FuelChip key={k} type={k} isSelected={settings.fuelType === k} theme={theme} onPress={() => { if (Platform.OS === 'ios') Haptics.selectionAsync(); updateSetting('fuelType', k); }} />
                ))}
            </ScrollView>
          </View>

          <View style={styles.headerRow}>
              <View style={{flex: 1}} {...panResponder.panHandlers}>
                  <GlassCard glassEffectStyle="prominent" style={styles.searchPill} isInteractive={true}>
                      {loading ? <View style={{marginLeft: 14}}><RainbowSpinner /></View> : <Ionicons name="search" size={22} color={theme.subText} style={{marginLeft: 14}} />}
                      <TextInput 
                          style={[styles.input, { color: theme.text }]}
                          placeholder={loading ? "Caricamento..." : "Cerca distributore..."}
                          placeholderTextColor={theme.subText}
                          value={searchText}
                          onChangeText={handleTextChange}
                          // IMPORTANTE: ON FOCUS TRIGGERA L'ANIMAZIONE "STRINGERSI"
                          onFocus={handleSearchFocus}
                      />
                  </GlassCard>
              </View>
              {isSearching && (
                  <TouchableOpacity onPress={cancelSearch} style={{marginLeft: 10}}>
                      <GlassView style={styles.glassBtnCircle} glassEffectStyle="regular"><Ionicons name="close" size={24} color="#FF3B30" /></GlassView>
                  </TouchableOpacity>
              )}
          </View>

          <GlassCard glassEffectStyle="prominent" style={[styles.contentCard]} isInteractive={true}>
              <View style={styles.dragHandle} />
              <Animated.View style={{ flex: 1, paddingHorizontal: 20, opacity: contentOpacity }}>
                 <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        {isSearching ? "Risultati Ricerca" : "I tuoi Preferiti"}
                    </Text>
                    
                    {isSearching && suggestions.length > 0 ? suggestions.map(item => (
                        <TouchableOpacity key={item.id} style={styles.suggestionRow} onPress={() => handleSelectSuggestion(item)}>
                            {BRAND_LOGOS[item.brand] ? 
                                <Image source={{uri: BRAND_LOGOS[item.brand]}} style={{width:32, height:32, marginRight: 12, resizeMode:'contain'}} /> :
                                <View style={styles.iconBox}><FontAwesome5 name="gas-pump" size={16} color={theme.text}/></View>
                            }
                            <View style={{flex:1}}>
                                <Text style={{color:theme.text, fontWeight:'600'}}>{item.brand}</Text>
                                <Text style={{color:theme.subText, fontSize:12}}>{item.address} • {item.prices[settings.fuelType]?.toFixed(3)}€</Text>
                            </View>
                        </TouchableOpacity>
                    )) : null}

                    {!isSearching && (
                        <View style={{paddingBottom: 40}}>
                            {Object.keys(groupedFavorites).length > 0 ? Object.keys(groupedFavorites).map((city) => (
                                <View key={city} style={styles.groupContainer}>
                                    <View style={styles.groupHeaderContainer}>
                                        <Text style={[styles.groupHeaderTitle, {color: theme.tint}]}>{city}</Text>
                                        <View style={[styles.groupSeparator, {backgroundColor: theme.subText}]} />
                                    </View>
                                    <View style={styles.groupGrid}>
                                        {groupedFavorites[city].map(fav => {
                                            const safeTitle = fav.title || fav.brand || "Distributore";
                                            const logo = BRAND_LOGOS[fav.brand];
                                            const initial = safeTitle.length > 0 ? safeTitle.charAt(0) : "?";
                                            return (
                                                <TouchableOpacity key={fav.id} style={[styles.favCardGrid, {backgroundColor: isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.04)'}]} onPress={() => handleSelectSuggestion(fav)}>
                                                    <View style={{marginBottom: 8}}>
                                                        {logo ? 
                                                            <Image source={{uri: logo}} style={{width: 36, height: 36, resizeMode:'contain'}}/> :
                                                            <View style={[styles.favIconCircle, {backgroundColor: ALL_FUELS[settings.fuelType].color}]}>
                                                                <Text style={{color:'white', fontWeight:'bold'}}>{initial}</Text>
                                                            </View>
                                                        }
                                                    </View>
                                                    <Text style={[styles.favTextGrid, {color:theme.text}]} numberOfLines={1}>{safeTitle}</Text>
                                                    <Text style={{color: theme.subText, fontSize: 10}} numberOfLines={1}>{fav.brand}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )) : (
                                <View style={{alignItems:'center', marginTop: 20}}>
                                    <Ionicons name="heart-outline" size={48} color={theme.subText} style={{opacity:0.5}} />
                                    <Text style={{color:theme.subText, marginTop:10}}>Non hai ancora salvato preferiti.</Text>
                                </View>
                            )}
                        </View>
                    )}
                 </ScrollView>
              </Animated.View>
          </GlassCard>
      </Animated.View>

      {/* DETAIL CARD */}
      <Animated.View style={[styles.detailCardWrapper, { transform: [{ translateY: cardAnim }] }]}>
          <GlassCard glassEffectStyle="prominent" style={styles.detailCard} isInteractive={true}>
            <View style={{paddingTop: 15}} />
            {selectedStation && (
                <>
                <View style={styles.dcHeader}>
                    <View style={styles.logoContainer}>
                         {BRAND_LOGOS[selectedStation.brand] ? 
                             <Image source={{uri: BRAND_LOGOS[selectedStation.brand]}} style={styles.logoImage} /> :
                             <View style={[styles.logoPlaceholder, {backgroundColor: theme.tint}]}>
                                 <Text style={{color:'white', fontSize: 24, fontWeight:'bold'}}>{selectedStation.brand.charAt(0)}</Text>
                             </View>
                         }
                    </View>
                    <View style={{flex: 1, paddingRight: 10}}>
                        <Text style={[styles.dcTitle, { color: theme.text }]} numberOfLines={1}>{selectedStation.brand}</Text>
                        <Text style={{color: theme.subText, fontSize: 14, marginTop: 4, lineHeight: 18}}>
                            {selectedStation.address}
                        </Text>
                        {statusInfo && (
                            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                                <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: statusInfo.color, marginRight: 6}} />
                                <Text style={{color: statusInfo.color, fontWeight: '700', fontSize: 12}}>{statusInfo.text}</Text>
                                <Text style={{color: theme.subText, fontSize: 12, marginLeft: 6}}>{statusInfo.sub}</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => closeDetailCard(true)} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEE' }]}>
                        <Ionicons name="close" size={20} color={theme.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.dcPricesGrid}>
                    {Object.keys(ALL_FUELS).map((k) => selectedStation.prices[k] ? (
                        <View key={k} style={[styles.dcPriceItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }]}>
                            <Text style={{color: ALL_FUELS[k].color, fontSize: 14, fontWeight:'900', textTransform:'uppercase', marginBottom: 2}}>
                                {ALL_FUELS[k].label}
                            </Text>
                            <Text style={{fontSize: 24, fontWeight:'900', color: theme.text}}>
                                {selectedStation.prices[k].toFixed(3)}<Text style={{fontSize:16}}>€</Text>
                            </Text>
                        </View>
                    ) : null)}
                </View>
                <View style={styles.dcActions}>
                    <TouchableOpacity style={[styles.dcHeartBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEE' }]} onPress={safeToggleFavorite}>
                        <Ionicons name={isFav?"heart":"heart-outline"} size={26} color={isFav?"#FF2D55":theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.dcNavBtn, { backgroundColor: theme.tint }]} onPress={() => {
                        const url = Platform.select({ ios: `maps:0,0?daddr=${selectedStation.latitude},${selectedStation.longitude}&dirflg=d`, android: `google.navigation:q=${selectedStation.latitude},${selectedStation.longitude}` });
                        Linking.openURL(url);
                    }}>
                        <Text style={{color:'white', fontSize: 16, fontWeight:'700'}}>Naviga</Text>
                    </TouchableOpacity>
                </View>
                </>
            )}
          </GlassCard>
      </Animated.View>

      {/* MODAL IMPOSTAZIONI */}
      <Modal animationType="slide" transparent={true} visible={showSettings} onRequestClose={() => setShowSettings(false)}>
          <View style={styles.modalOverlay}>
              <GlassCard glassEffectStyle="prominent" style={[styles.modalContent, {backgroundColor: isDark ? '#1c1c1e' : 'white'}]}>
                  <View style={styles.modalHeader}>
                      <Text style={{fontSize: 20, fontWeight: 'bold', color: theme.text}}>Impostazioni</Text>
                      <TouchableOpacity onPress={() => setShowSettings(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
                  </View>
                  <View style={styles.settingRow}>
                      <View style={{flex:1}}>
                          <Text style={{fontSize: 16, fontWeight: '600', color: theme.text}}>Avviso Prossimità</Text>
                          <Text style={{fontSize: 12, color: theme.subText, marginTop:2}}>Notifica se un distributore è a meno di 1.5km</Text>
                      </View>
                      <Switch value={proximityAlertEnabled} onValueChange={setProximityAlertEnabled} trackColor={{false: '#767577', true: '#34C759'}} />
                  </View>
              </GlassCard>
          </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  markerWrapper: { alignItems: 'center', justifyContent: 'center' },
  markerPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  markerTitle: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  markerPrice: { fontSize: 16, fontWeight: '900' },
  bestBadge: { position: 'absolute', top: -8, backgroundColor: '#34C759', paddingHorizontal: 4, borderRadius: 4, zIndex: 10 },
  bestText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  markerArrow: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -1 },
  roundBtn: { position: 'absolute', zIndex: 40 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  
  // MODIFICATO: Posizione iniziale del sheet più alta
  floatingSheetContainer: { position: 'absolute', left: 12, right: 12, bottom: -height + 220, height: height, zIndex: 50 },
  
  chipsRow: { height: 50, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  chipText: { marginLeft: 8, fontSize: 14, fontWeight: '600' },
  headerRow: { flexDirection: 'row', alignItems: 'center', height: 60, marginBottom: 12 },
  searchPill: { flex: 1, borderRadius: 30, overflow: 'hidden', height: '100%', flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontSize: 16, fontWeight: '600', marginLeft: 10, height: '100%' },
  glassBtnCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  contentCard: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderRadius: 32, overflow: 'hidden', marginBottom: 40 },
  dragHandle: { width: 40, height: 5, backgroundColor: 'rgba(128,128,128,0.3)', borderRadius: 3, alignSelf: 'center', marginVertical: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 15, marginTop: 5, letterSpacing: -0.5 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(128,128,128,0.1)' },
  iconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: 'rgba(128,128,128,0.1)' },
  groupContainer: { marginBottom: 20 },
  groupHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  groupHeaderTitle: { fontSize: 18, fontWeight: '700' },
  groupSeparator: { flex: 1, height: 1, marginLeft: 10, opacity: 0.1 },
  groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  favCardGrid: { width: '31%', padding: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  favIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  favTextGrid: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  detailCardWrapper: { position: 'absolute', bottom: Platform.OS === 'ios' ? 30 : 20, left: 12, right: 12, height: 300, zIndex: 100, shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 15 },
  detailCard: { flex: 1, borderRadius: 32, paddingHorizontal: 0 },
  dcHeader: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 2, alignItems: 'flex-start' },
  logoContainer: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', marginRight: 12, marginTop: 4, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EEE' },
  logoImage: { width: 40, height: 40, resizeMode: 'contain' },
  logoPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  dcTitle: { fontSize: 22, fontWeight: '800' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  dcPricesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingTop: 15, gap: 10, justifyContent: 'space-between' },
  dcPriceItem: { width: '48%', padding: 10, borderRadius: 16, justifyContent: 'center' },
  dcActions: { position: 'absolute', bottom: 15, left: 20, right: 20, flexDirection: 'row', gap: 12 },
  dcHeartBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  dcNavBtn: { flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  settingRow: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});