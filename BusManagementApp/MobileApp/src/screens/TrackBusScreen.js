import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList, KeyboardAvoidingView, Platform, Linking, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import colors from '../config/colors';
import { fetchBusById } from '../api/buses';
import { getBusMessages, sendMessage } from '../api/chat';
import { useAuth } from '../context/AuthContext';
import campus from '../config/campus';

const sortStops = (stops = []) => [...stops].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

const toCoordinate = (location, type) => {
  if (!location) {
    return null;
  }
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return {
    latitude,
    longitude,
    name: location.name,
    description: location.address,
    type,
    arrivalTime: location.arrivalTime
  };
};

export default function TrackBusScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const busId = route.params?.busId;
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(!!busId);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const flatListRef = useRef(null);
  const sortedStops = useMemo(() => sortStops(bus?.stops || []), [bus]);
  const routeCoordinates = useMemo(() => {
    const points = [];
    const start = toCoordinate(bus?.startLocation || campus, 'start');
    if (start) {
      points.push(start);
    }
    sortedStops.forEach((stop) => {
      const coord = toCoordinate(stop, 'stop');
      if (coord) {
        points.push({ ...coord, name: stop.name, arrivalTime: stop.arrivalTime });
      }
    });
    const end = toCoordinate(bus?.endLocation, 'end');
    if (end) {
      points.push(end);
    }
    return points;
  }, [bus, sortedStops]);

  const mapRegion = useMemo(() => {
    if (!routeCoordinates.length) {
      return {
        latitude: campus.latitude || 0,
        longitude: campus.longitude || 0,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      };
    }
    const lats = routeCoordinates.map((pt) => pt.latitude);
    const lngs = routeCoordinates.map((pt) => pt.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Calculate deltas with padding to show all points clearly
    const latPadding = (maxLat - minLat) * 0.3; // 30% padding
    const lngPadding = (maxLng - minLng) * 0.3; // 30% padding
    
    const latitudeDelta = Math.max((maxLat - minLat) + latPadding * 2, 0.02);
    const longitudeDelta = Math.max((maxLng - minLng) + lngPadding * 2, 0.02);
    
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta,
      longitudeDelta
    };
  }, [routeCoordinates]);

  const mapKey = routeCoordinates.map((pt) => `${pt.latitude}-${pt.longitude}`).join('|') || 'fallback';

  const loadBus = async () => {
    if (!busId) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await fetchBusById(busId);
      setBus(data.bus);
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to load bus';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (busId) {
      loadBus();
    }
  }, [busId]);

  useEffect(() => {
    if (busId && showChat) {
      loadMessages();
      // Poll for new messages every 5 seconds when chat is open
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [busId, showChat]);

  const loadMessages = async () => {
    if (!busId) return;
    try {
      setLoadingMessages(true);
      const response = await getBusMessages(busId);
      if (response.data.messages) {
        setMessages(response.data.messages);
        // Scroll to bottom after loading
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !busId || sending) return;
    
    setSending(true);
    try {
      await sendMessage(busId, newMessage.trim());
      setNewMessage('');
      await loadMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleCallDriver = () => {
    if (!bus.driverPhone) {
      Alert.alert('No Phone Number', 'Driver phone number is not available');
      return;
    }

    const phoneNumber = bus.driverPhone.replace(/[^0-9+]/g, ''); // Clean phone number
    const url = `tel:${phoneNumber}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        }
      })
      .catch((err) => {
        console.error('Error making phone call:', err);
        Alert.alert('Error', 'Unable to make phone call');
      });
  };

  if (!busId) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Select a bus from the list to start live tracking.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={loadBus}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const routeLabel = `${bus.startLocation?.name || campus.name} → ${bus.endLocation?.name || 'Destination'}`;
  const lastUpdated = bus.lastUpdated || bus.updatedAt || bus.createdAt;
  const lastUpdatedLabel = lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'N/A';
  const getPinColor = (type) => {
    if (type === 'start') return colors.primary;
    if (type === 'end') return colors.danger;
    return '#0ea5e9';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'On Time':
        return '#22c55e';
      case 'Delayed':
        return '#f59e0b';
      case 'Cancelled':
        return '#ef4444';
      default:
        return colors.muted;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.busIconContainer}>
              <Text style={styles.busIcon}>🚌</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{bus.routeName}</Text>
              <Text style={styles.subtitle}>Bus #{bus.busNumber}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(bus.status)}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(bus.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(bus.status) }]}>
              {bus.status}
            </Text>
          </View>
        </View>

      {/* <View style={styles.mapSection}>
        {routeCoordinates.length ? (
          <MapView key={mapKey} style={styles.map} initialRegion={mapRegion}>
            <Polyline coordinates={routeCoordinates} strokeColor={colors.primary} strokeWidth={4} />
            {routeCoordinates.map((point, index) => (
              <Marker
                key={`${point.type}-${index}`}
                coordinate={{ latitude: point.latitude, longitude: point.longitude }}
                title={point.name || (point.type === 'start' ? 'Campus' : point.type === 'end' ? 'Destination' : `Stop ${index}`)}
                description={point.type === 'stop' && point.arrivalTime ? `ETA: ${point.arrivalTime}` : point.description}
                pinColor={getPinColor(point.type)}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.meta}>Route coordinates not available yet.</Text>
          </View>
        )}
      </View> */}

        {/* Map Section with Route */}
        <View style={styles.mapSection}>
          {routeCoordinates.length >= 2 ? (
            <View style={{ flex: 1 }}>
              <MapView 
                key={mapKey} 
                style={styles.map} 
                initialRegion={mapRegion}
                showsUserLocation={false}
                showsMyLocationButton={false}
                mapType="standard"
                loadingEnabled={true}
                toolbarEnabled={false}
              >
                {/* Main Route Line - connects all points in sequence */}
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor={colors.primary}
                  strokeWidth={6}
                  lineCap="round"
                  lineJoin="round"
                  geodesic={true}
                />

                {/* All Markers with proper colors */}
                {routeCoordinates.map((point, index) => {
                  let markerTitle = point.name;
                  let markerDescription = '';
                  let markerColor = getPinColor(point.type);

                  if (point.type === 'start') {
                    markerTitle = markerTitle || 'Start Point (Campus)';
                    markerDescription = 'Route starting point';
                  } else if (point.type === 'end') {
                    markerTitle = markerTitle || 'Destination';
                    markerDescription = 'Final destination';
                  } else if (point.type === 'stop') {
                    markerTitle = markerTitle || `Stop ${index}`;
                    markerDescription = point.arrivalTime ? `ETA: ${point.arrivalTime}` : 'Route stop';
                  }

                  return (
                    <Marker
                      key={`${point.type}-${index}-${point.latitude}-${point.longitude}`}
                      coordinate={{
                        latitude: point.latitude,
                        longitude: point.longitude
                      }}
                      title={markerTitle}
                      description={markerDescription}
                      pinColor={markerColor}
                    />
                  );
                })}
              </MapView>
              
              {/* Route Legend Overlay */}
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>Start</Text>
                </View>
                {sortedStops.length > 0 && (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#0ea5e9' }]} />
                    <Text style={styles.legendText}>Stops ({sortedStops.length})</Text>
                  </View>
                )}
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                  <Text style={styles.legendText}>End</Text>
                </View>
              </View>
            </View>
          ) : routeCoordinates.length === 1 ? (
            <MapView 
              style={styles.map} 
              initialRegion={{
                latitude: routeCoordinates[0].latitude,
                longitude: routeCoordinates[0].longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
              }}
              showsUserLocation={false}
              showsMyLocationButton={false}
            >
              <Marker
                coordinate={routeCoordinates[0]}
                title={routeCoordinates[0].name || 'Location'}
                pinColor={colors.primary}
              />
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderIcon}>📍</Text>
              <Text style={styles.mapPlaceholderText}>Route coordinates not available</Text>
              <Text style={styles.mapPlaceholderSubtext}>Please add route stops to see the map</Text>
            </View>
          )}
        </View>

        {/* Route Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>📍</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Route</Text>
              <Text style={styles.infoValue}>{routeLabel}</Text>
            </View>
          </View>
        </View>

        {/* Driver Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>👤</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Driver</Text>
              <Text style={styles.infoValue}>{bus.driverName}</Text>
              {bus.driverPhone ? (
                <View style={styles.phoneContainer}>
                  <Text style={styles.infoMeta}>📞 {bus.driverPhone}</Text>
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={handleCallDriver}
                  >
                    <Text style={styles.callButtonIcon}>📞</Text>
                    <Text style={styles.callButtonText}>Call</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.infoMeta}>No phone number available</Text>
              )}
            </View>
          </View>
        </View>

        {/* Current Stop & Departure Time */}
        {(bus.currentStop || bus.departureTime) && (
          <View style={styles.infoGrid}>
            {bus.currentStop && (
              <View style={styles.infoGridItem}>
                <View style={styles.infoGridIconContainer}>
                  <Text style={styles.infoGridIcon}>🚏</Text>
                </View>
                <Text style={styles.infoGridLabel}>Current Stop</Text>
                <Text style={styles.infoGridValue}>{bus.currentStop}</Text>
              </View>
            )}
            {bus.departureTime && (
              <View style={styles.infoGridItem}>
                <View style={styles.infoGridIconContainer}>
                  <Text style={styles.infoGridIcon}>🕐</Text>
                </View>
                <Text style={styles.infoGridLabel}>Departure</Text>
                <Text style={styles.infoGridValue}>{bus.departureTime}</Text>
              </View>
            )}
          </View>
        )}

        {/* Stops Section */}
        <View style={styles.stopsCard}>
          <View style={styles.stopsHeader}>
            <View style={styles.stopsHeaderContent}>
              <Text style={styles.stopsIcon}>🛑</Text>
              <Text style={styles.stopsTitle}>Route Stops</Text>
              {sortedStops.length > 0 && (
                <View style={styles.stopsBadge}>
                  <Text style={styles.stopsBadgeText}>{sortedStops.length}</Text>
                </View>
              )}
            </View>
          </View>
          {sortedStops.length ? (
            <View style={styles.stopsList}>
              {sortedStops.map((stop, index) => (
                <View key={`${stop.name}-${index}`} style={styles.stopItem}>
                  <View style={styles.stopItemLeft}>
                    <View style={styles.stopNumber}>
                      <Text style={styles.stopNumberText}>{index + 1}</Text>
                    </View>
                    {index < sortedStops.length - 1 && <View style={styles.stopLine} />}
                  </View>
                  <View style={styles.stopItemContent}>
                    <Text style={styles.stopName}>{stop.name}</Text>
                    {stop.arrivalTime && (
                      <View style={styles.stopEta}>
                        <Text style={styles.stopEtaIcon}>⏰</Text>
                        <Text style={styles.stopEtaText}>ETA: {stop.arrivalTime}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStops}>
              <Text style={styles.emptyStopsIcon}>📍</Text>
              <Text style={styles.emptyStopsText}>No intermediate stops added</Text>
            </View>
          )}
        </View>

        {/* Last Updated */}
        <View style={styles.lastUpdatedContainer}>
          <Text style={styles.lastUpdatedIcon}>🔄</Text>
          <Text style={styles.lastUpdated}>Last updated {lastUpdatedLabel}</Text>
        </View>

      {/* Group Chat Section */}
      <View style={styles.chatSection}>
        <TouchableOpacity 
          style={styles.chatHeader} 
          onPress={() => setShowChat(!showChat)}
        >
          <View style={styles.chatHeaderContent}>
            <Text style={styles.chatHeaderIcon}>💬</Text>
            <Text style={styles.chatHeaderTitle}>Group Chat</Text>
            {messages.length > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>{messages.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.chatToggleIcon}>{showChat ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {showChat && (
          <View style={styles.chatContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const isMyMessage = item.sender._id === user?._id;
                return (
                  <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
                    {!isMyMessage && (
                      <Text style={styles.senderName}>{item.sender.name}</Text>
                    )}
                    <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
                      <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
                        {item.message}
                      </Text>
                      <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
                        {formatTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              }}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <View style={styles.emptyChatContainer}>
                  <Text style={styles.emptyChatText}>No messages yet</Text>
                  <Text style={styles.emptyChatSubtext}>Start the conversation!</Text>
                </View>
              }
              refreshing={loadingMessages}
              onRefresh={loadMessages}
            />
            
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor={colors.muted}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.chatSendButton, (!newMessage.trim() || sending) && styles.chatSendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.chatSendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

        {/* Refresh Button */}
        <TouchableOpacity style={styles.refreshBtn} onPress={loadBus}>
          <Text style={styles.refreshIcon}>🔄</Text>
          <Text style={styles.refreshBtnText}>Refresh Bus Info</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 24,
    backgroundColor: colors.background
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 24, 
    backgroundColor: colors.background 
  },
  // Header Styles
  header: {
    backgroundColor: colors.primary,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  busIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  busIcon: {
    fontSize: 32
  },
  headerText: {
    flex: 1
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#fff',
    marginBottom: 4
  },
  subtitle: { 
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  // Map Styles
  mapSection: {
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 2,
    borderColor: '#fff'
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc'
  },
  mapPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4
  },
  mapPlaceholderSubtext: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center'
  },
  // Map Legend Styles
  mapLegend: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text
  },
  // Info Card Styles
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  infoIcon: {
    fontSize: 24
  },
  infoContent: {
    flex: 1
  },
  infoLabel: {
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  infoMeta: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6
  },
  callButtonIcon: {
    fontSize: 14
  },
  callButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13
  },
  // Info Grid Styles
  infoGrid: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 12
  },
  infoGridItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  infoGridIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  infoGridIcon: {
    fontSize: 20
  },
  infoGridLabel: {
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4
  },
  infoGridValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center'
  },
  // Stops Card Styles
  stopsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  stopsHeader: {
    marginBottom: 16
  },
  stopsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stopsIcon: {
    fontSize: 20,
    marginRight: 8
  },
  stopsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  stopsBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8
  },
  stopsBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  stopsList: {
    marginTop: 8
  },
  stopItem: {
    flexDirection: 'row',
    marginBottom: 16
  },
  stopItemLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 32
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stopNumberText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14
  },
  stopLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginTop: 4,
    marginBottom: 4
  },
  stopItemContent: {
    flex: 1,
    paddingTop: 4
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4
  },
  stopEta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  stopEtaIcon: {
    fontSize: 12,
    marginRight: 4
  },
  stopEtaText: {
    fontSize: 13,
    color: colors.muted
  },
  emptyStops: {
    alignItems: 'center',
    paddingVertical: 24
  },
  emptyStopsIcon: {
    fontSize: 40,
    marginBottom: 8
  },
  emptyStopsText: {
    fontSize: 14,
    color: colors.muted
  },
  // Last Updated
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginBottom: 16
  },
  lastUpdatedIcon: {
    fontSize: 14,
    marginRight: 6
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.muted
  },
  // Refresh Button
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  refreshIcon: {
    fontSize: 18,
    marginRight: 8
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  info: { color: colors.muted, textAlign: 'center', fontSize: 16 },
  error: { color: colors.danger, marginBottom: 12, textAlign: 'center' },
  // Chat Styles
  chatSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  chatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  chatHeaderIcon: {
    fontSize: 22,
    marginRight: 10
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  chatBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  chatToggleIcon: {
    fontSize: 14,
    color: colors.muted
  },
  chatContainer: {
    maxHeight: 400
  },
  messagesList: {
    maxHeight: 300
  },
  messagesContent: {
    padding: 12
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start'
  },
  myMessageContainer: {
    alignItems: 'flex-end'
  },
  senderName: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
    marginLeft: 12
  },
  messageBubble: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 10,
    maxWidth: '75%',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  myMessageBubble: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4
  },
  myMessageText: {
    color: '#fff'
  },
  messageTime: {
    fontSize: 10,
    color: colors.muted,
    alignSelf: 'flex-end'
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)'
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end'
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 80,
    fontSize: 14,
    color: colors.text
  },
  chatSendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60
  },
  chatSendButtonDisabled: {
    opacity: 0.5
  },
  chatSendButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  emptyChatContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30
  },
  emptyChatText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4
  },
  emptyChatSubtext: {
    fontSize: 12,
    color: colors.muted
  }
});
