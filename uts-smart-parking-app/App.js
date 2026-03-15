import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  Image, TextInput, Alert 
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- DATA MODEL ---
const initialParkingData = [
  { id: "surau", name: "Surau Carpark", img: require('./assets/images/Surau.jpeg'), type: "open", capacity: 40, available: 15 },
  { id: "gate2", name: "Gate 2 Carpark", img: require('./assets/images/gate2.jpeg'), type: "open", capacity: 60, available: 20 },
  { id: "block5", name: "Block 5 Carpark", img: require('./assets/images/block5.jpeg'), type: "open", capacity: 30, available: 2 },
  { id: "cafeteria", name: "Cafeteria Carpark", img: require('./assets/images/cafeteria.jpeg'), type: "open", capacity: 50, available: 25 },
  { 
    id: "multistory", name: "Multistory Carpark", img: require('./assets/images/multistory.jpeg'), type: "covered", capacity: 200, available: 120,
    levels: [
      { label: "Level 1a", free: 5 }, { label: "Level 1b", free: 0 },
      { label: "Level 2a", free: 12 }, { label: "Level 2b", free: 15 }
    ]
  },
  { 
    id: "hornbill", name: "Hornbill Hall Carpark", img: require('./assets/images/Hornbillhall.jpeg'), type: "mixed", capacity: 80, available: 30,
    levels: [
      { label: "Ground Floor", free: 5 }, { label: "Mezzanine", free: 25 }
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRaining, setIsRaining] = useState(false);
  const [parkingData, setParkingData] = useState(initialParkingData);
  
  // Plan Parking States
  const [destination, setDestination] = useState('Block 5');
  const [recommendation, setRecommendation] = useState(null);

  // Find My Car States
  const [savedSpot, setSavedSpot] = useState(null);
  const [selectedCarpark, setSelectedCarpark] = useState('');
  const [spotNote, setSpotNote] = useState('');

  // Load saved car on start
  useEffect(() => {
    loadSavedCar();
    // In a real app, you'd put the setInterval for simulated updates here.
  }, []);

  const toggleWeather = () => {
    const newWeather = !isRaining;
    setIsRaining(newWeather);
    // Recalculate recommendation if it exists
    if (recommendation) {
      findBestParking(newWeather, destination);
    }
  };

  const findBestParking = (rainingState = isRaining, dest = destination) => {
    let bestLot = null;
    let distance = '';

    if (rainingState) {
      bestLot = parkingData.find(p => (p.id === 'multistory' || p.id === 'hornbill') && p.available > 0);
      distance = "450m (Preferred due to Rain - Covered)";
    } else {
      switch(dest) {
        case 'Block 5':
          bestLot = parkingData.find(p => p.id === 'block5' && p.available > 0);
          distance = "50m (1 min walk)";
          break;
        case 'Gate 2':
          bestLot = parkingData.find(p => p.id === 'gate2' && p.available > 0);
          distance = "100m (2 min walk)";
          break;
        case 'Cafeteria':
          bestLot = parkingData.find(p => p.id === 'cafeteria' && p.available > 0);
          distance = "20m (Immediate)";
          break;
        default:
          bestLot = parkingData.find(p => p.available > 10);
          distance = "300m (5 min walk)";
      }
    }

    if (!bestLot && !rainingState) {
      bestLot = parkingData.find(p => p.available > 0);
      distance = "Further Walk (Other lots full)";
    }

    setRecommendation({ lot: bestLot, distance });
  };

  const loadSavedCar = async () => {
    try {
      const saved = await AsyncStorage.getItem('savedCar');
      if (saved) setSavedSpot(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  };

  const saveMyCar = async () => {
    if (!selectedCarpark) {
      Alert.alert("Error", "Please select a carpark first.");
      return;
    }
    const lot = parkingData.find(p => p.id === selectedCarpark);
    const data = {
      name: lot.name,
      note: spotNote || "No note",
      time: new Date().toLocaleTimeString()
    };
    try {
      await AsyncStorage.setItem('savedCar', JSON.stringify(data));
      setSavedSpot(data);
      setSelectedCarpark('');
      setSpotNote('');
    } catch (e) {
      console.error(e);
    }
  };

  const clearMyCar = async () => {
    try {
      await AsyncStorage.removeItem('savedCar');
      setSavedSpot(null);
    } catch (e) {
      console.error(e);
    }
  };

  // --- RENDERERS ---

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        <FontAwesome5 name="parking" size={24} color="white" />
        <Text style={styles.headerTitle}>UTS Smart Parking</Text>
      </View>
      <TouchableOpacity style={styles.weatherWidget} onPress={toggleWeather}>
        <Text style={styles.weatherText}>{isRaining ? 'Raining' : 'Sunny'}</Text>
        <FontAwesome5 name={isRaining ? 'cloud-rain' : 'sun'} size={16} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      {[
        { id: 'dashboard', icon: 'th-large', label: 'Live' },
        { id: 'planning', icon: 'route', label: 'Plan' },
        { id: 'find-my-car', icon: 'car', label: 'Find Car' },
      ].map(tab => (
        <TouchableOpacity 
          key={tab.id} 
          style={[styles.tabBtn, activeTab === tab.id && styles.activeTabBtn]}
          onPress={() => setActiveTab(tab.id)}
        >
          <FontAwesome5 name={tab.icon} size={16} color={activeTab === tab.id ? '#3498db' : '#666'} />
          <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDashboard = () => {
    const totalFree = parkingData.reduce((sum, lot) => sum + lot.available, 0);

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>Live Updates: Active</Text>
          <Text style={styles.statusText}>Total Free: {totalFree}</Text>
        </View>

        {parkingData.map(lot => {
          const percentFree = (lot.available / lot.capacity) * 100;
          let badgeColor = percentFree > 50 ? '#27ae60' : (percentFree > 10 ? '#f39c12' : '#c0392b');
          let statusText = lot.available === 0 ? 'FULL' : (percentFree < 10 ? 'Busy' : 'Available');

          return (
            <View key={lot.id} style={styles.card}>
              <View style={styles.cardImageContainer}>
                <Image source={lot.img} style={styles.cardImage} />
                <View style={[styles.badge, { backgroundColor: badgeColor, position: 'absolute', top: 10, right: 10 }]}>
                  <Text style={styles.badgeText}>{statusText}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{lot.name}</Text>
                <Text style={styles.cardDetails}>Free: {lot.available} / {lot.capacity}</Text>
                <Text style={styles.cardDetails}>Type: {lot.type.toUpperCase()}</Text>
                
                {lot.levels && (
                  <View style={styles.levels}>
                    {lot.levels.map((lvl, idx) => (
                      <View key={idx} style={styles.levelItem}>
                        <Text style={styles.levelText}>{lvl.label}</Text>
                        <Text style={[styles.levelText, { color: lvl.free === 0 ? 'red' : 'green', fontWeight: 'bold' }]}>
                          {lvl.free} free
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderPlanning = () => {
    const destinations = [
      { id: 'Block 5', label: 'Block 5 (Academic)' },
      { id: 'Gate 2', label: 'Gate 2 Entrance' },
      { id: 'Cafeteria', label: 'Student Cafeteria' },
      { id: 'Admin', label: 'Admin Building' },
      { id: 'Library', label: 'Library' }
    ];

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Where are you going?</Text>
          <Text style={styles.label}>Select Destination Block:</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
            {destinations.map(dest => (
              <TouchableOpacity 
                key={dest.id}
                style={[styles.pickerBtn, destination === dest.id && styles.pickerBtnActive]}
                onPress={() => setDestination(dest.id)}
              >
                <Text style={[styles.pickerBtnText, destination === dest.id && styles.pickerBtnTextActive]}>
                  {dest.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.actionBtn} onPress={() => findBestParking(isRaining, destination)}>
            <Text style={styles.actionBtnText}>Find Nearest Parking</Text>
          </TouchableOpacity>
        </View>

        {recommendation && (
          <View style={styles.resultCard}>
            <View style={styles.recHeader}>
              <View style={styles.recTitleRow}>
                <FontAwesome5 name="star" size={18} color="#f39c12" />
                <Text style={styles.recTitle}>Best Options</Text>
              </View>
              {isRaining && (
                <View style={[styles.badge, { backgroundColor: '#34495e' }]}>
                  <Text style={styles.badgeText}>Rain Mode Active</Text>
                </View>
              )}
            </View>
            
            {recommendation.lot ? (
              <View style={styles.recContent}>
                <View style={styles.recInfo}>
                  <Text style={styles.recLotName}>Recommended: {recommendation.lot.name}</Text>
                  <Text style={styles.recText}>Distance to {destination}: <Text style={{fontWeight: 'bold'}}>{recommendation.distance}</Text></Text>
                  <Text style={styles.recText}>Available Spots: <Text style={{fontWeight: 'bold'}}>{recommendation.lot.available}</Text></Text>
                </View>
                <FontAwesome5 name="map-marked-alt" size={40} color="#3498db" />
              </View>
            ) : (
              <Text style={{color: 'red'}}>No close parking found. Try Multistory.</Text>
            )}
            <Text style={styles.recFooterText}>Walking path calculated via Main Walkway.</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderFindMyCar = () => (
    <View style={styles.content}>
      <View style={styles.box}>
        <Text style={styles.boxTitle}>Parked your car? Save location.</Text>
        
        {/* Simple alternative to a dropdown picker for iOS/Android consistency */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
          {parkingData.map(lot => (
            <TouchableOpacity 
              key={lot.id}
              style={[styles.pickerBtn, selectedCarpark === lot.id && styles.pickerBtnActive]}
              onPress={() => setSelectedCarpark(lot.id)}
            >
              <Text style={[styles.pickerBtnText, selectedCarpark === lot.id && styles.pickerBtnTextActive]}>
                {lot.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          style={styles.input}
          placeholder="Note (e.g., Level 2a, Bay 45)"
          value={spotNote}
          onChangeText={setSpotNote}
        />
        <TouchableOpacity style={styles.actionBtn} onPress={saveMyCar}>
          <Text style={styles.actionBtnText}>Save Location</Text>
        </TouchableOpacity>
      </View>

      {savedSpot && (
        <View style={styles.savedCard}>
          <Text style={styles.savedTitle}>Your Saved Spot 🚗</Text>
          <Text style={styles.savedName}>{savedSpot.name}</Text>
          <Text style={styles.savedNote}>{savedSpot.note}</Text>
          <Text style={styles.savedTime}>Saved at: {savedSpot.time}</Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#c0392b' }]} onPress={clearMyCar}>
            <Text style={styles.actionBtnText}>Leave Spot</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'planning' && renderPlanning()}
      {activeTab === 'find-my-car' && renderFindMyCar()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f6', paddingTop: 40 },
  header: { 
    backgroundColor: '#2c3e50', padding: 15, flexDirection: 'row', 
    justifyContent: 'space-between', alignItems: 'center' 
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  weatherWidget: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, gap: 5
  },
  weatherText: { color: 'white', fontSize: 12, marginRight: 5 },
  tabs: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
  tabBtn: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  activeTabBtn: { borderColor: '#3498db' },
  tabText: { marginTop: 5, color: '#666', fontSize: 12 },
  activeTabText: { color: '#3498db', fontWeight: 'bold' },
  content: { padding: 15 },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statusText: { fontWeight: 'bold', color: '#333' },
  card: { backgroundColor: 'white', borderRadius: 10, marginBottom: 15, elevation: 2, overflow: 'hidden' },
  cardImageContainer: { height: 150, backgroundColor: '#ddd', position: 'relative' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardBody: { padding: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  cardDetails: { fontSize: 14, color: '#555', marginBottom: 5 },
  levels: { marginTop: 10, borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 },
  levelItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  levelText: { fontSize: 13, color: '#333' },
  box: { backgroundColor: 'white', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 20 },
  boxTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#2c3e50' },
  label: { fontSize: 14, color: '#555', marginBottom: 10, fontWeight: '600' },
  pickerRow: { flexDirection: 'row', marginBottom: 15 },
  pickerBtn: { padding: 10, backgroundColor: '#eee', borderRadius: 20, marginRight: 10 },
  pickerBtnActive: { backgroundColor: '#3498db' },
  pickerBtnText: { color: '#555' },
  pickerBtnTextActive: { color: 'white', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 15 },
  actionBtn: { backgroundColor: '#27ae60', padding: 15, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  savedCard: { backgroundColor: '#e8f8f5', padding: 20, borderRadius: 10, alignItems: 'center', borderColor: '#27ae60', borderWidth: 1, gap: 10 },
  savedTitle: { fontSize: 16, fontWeight: 'bold', color: '#27ae60' },
  savedName: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  savedNote: { fontSize: 16, color: '#555', fontStyle: 'italic' },
  savedTime: { fontSize: 12, color: '#888', marginBottom: 10 },
  // Planning Tab Styles
  resultCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, elevation: 2, borderColor: '#3498db', borderWidth: 1 },
  recHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 10 },
  recTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  recContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  recInfo: { flex: 1, paddingRight: 10 },
  recLotName: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 8 },
  recText: { color: '#555', fontSize: 14, marginBottom: 4 },
  recFooterText: { fontSize: 12, color: '#888', fontStyle: 'italic' }
});
