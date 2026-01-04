import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';
import colors from '../config/colors';
import campus from '../config/campus';
import { useAuth } from '../context/AuthContext';
import { createBus, fetchBuses, updateBus, deleteBus } from '../api/buses';
import { createAnnouncement, getAllBusAnnouncements, deleteAnnouncement } from '../api/announcements';

const statusOrder = ['On Time', 'Delayed', 'Cancelled'];

const createEmptyForm = () => ({
  routeName: '',
  busNumber: '',
  driverName: '',
  driverPhone: '',
  departureTime: '',
  currentStop: '',
  endLocation: {
    name: '',
    latitude: '',
    longitude: ''
  },
  stops: []
});

const createEmptyStop = () => ({
  name: '',
  latitude: '',
  longitude: '',
  arrivalTime: ''
});

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState(createEmptyForm());
  const [newStop, setNewStop] = useState(createEmptyStop());
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [selectedBusForAnnouncement, setSelectedBusForAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [busAnnouncements, setBusAnnouncements] = useState({});
  const [loadingAnnouncements, setLoadingAnnouncements] = useState({});

  const loadBuses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchBuses();
      setBuses(data.buses || []);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Unable to load buses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuses();
  }, [loadBuses]);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateDestination = (field, value) =>
    setForm((prev) => ({
      ...prev,
      endLocation: { ...prev.endLocation, [field]: value }
    }));

  const parseCoordinate = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const normalizeLocation = (location) => {
    if (!location) return null;
    const latitude = parseCoordinate(location.latitude);
    const longitude = parseCoordinate(location.longitude);
    if (latitude === null || longitude === null) return null;
    return {
      name: location.name?.trim() || 'Unnamed location',
      latitude,
      longitude,
      address: location.address?.trim()
    };
  };

  const handleAddStop = () => {
    if (!newStop.name || !newStop.latitude || !newStop.longitude) {
      Alert.alert('Missing data', 'Stop name and coordinates are required');
      return;
    }
    const latitude = parseCoordinate(newStop.latitude);
    const longitude = parseCoordinate(newStop.longitude);
    if (latitude === null || longitude === null) {
      Alert.alert('Invalid data', 'Please enter valid latitude and longitude values');
      return;
    }
    setForm((prev) => ({
      ...prev,
      stops: [
        ...prev.stops,
        { name: newStop.name.trim(), latitude, longitude, arrivalTime: newStop.arrivalTime.trim() }
      ]
    }));
    setNewStop(createEmptyStop());
  };

  const handleRemoveStop = (index) => {
    setForm((prev) => ({ ...prev, stops: prev.stops.filter((_, idx) => idx !== index) }));
  };

  const handleCreateBus = async () => {
    if (!form.routeName || !form.busNumber || !form.driverName) {
      Alert.alert('Missing data', 'Route name, bus number and driver are required');
      return;
    }

    const endLocation = normalizeLocation(form.endLocation);
    if (!endLocation) {
      Alert.alert('Destination required', 'Enter a valid destination name and coordinates');
      return;
    }

    const stopsPayload = form.stops.map((stop, index) => {
      const latitude = parseCoordinate(stop.latitude);
      const longitude = parseCoordinate(stop.longitude);
      if (latitude === null || longitude === null)
        throw new Error(`Stop ${stop.name || index + 1} is missing valid coordinates`);
      return { ...stop, latitude, longitude, order: index, name: stop.name.trim(), arrivalTime: stop.arrivalTime.trim() };
    });

    setSaving(true);
    try {
      await createBus({ ...form, endLocation, stops: stopsPayload });
      setForm(createEmptyForm());
      setNewStop(createEmptyStop());
      loadBuses();
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || error.message || 'Unable to create bus');
    } finally {
      setSaving(false);
    }
  };

  const handleCycleStatus = async (bus) => {
    const currentIndex = statusOrder.indexOf(bus.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    try {
      await updateBus(bus._id, { status: nextStatus });
      loadBuses();
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Unable to update status');
    }
  };

  const handleOpenAnnouncementForm = (bus) => {
    setSelectedBusForAnnouncement(bus);
    setAnnouncementForm({ title: '', message: '' });
    setShowAnnouncementForm(true);
  };

  const handleCloseAnnouncementForm = () => {
    setShowAnnouncementForm(false);
    setSelectedBusForAnnouncement(null);
    setAnnouncementForm({ title: '', message: '' });
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      Alert.alert('Missing data', 'Title and message are required');
      return;
    }

    setSavingAnnouncement(true);
    try {
      await createAnnouncement(
        selectedBusForAnnouncement._id,
        announcementForm.title.trim(),
        announcementForm.message.trim()
      );
      Alert.alert('Success', 'Announcement created successfully');
      handleCloseAnnouncementForm();
      loadBuses();
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Unable to create announcement');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleDeleteBus = (bus) => {
    Alert.alert(
      'Delete Bus',
      `Are you sure you want to delete ${bus.routeName} (Bus #${bus.busNumber})? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBus(bus._id);
              Alert.alert('Success', 'Bus deleted successfully');
              loadBuses();
            } catch (error) {
              Alert.alert('Error', error?.response?.data?.message || 'Unable to delete bus');
            }
          }
        }
      ]
    );
  };

  const handleLoadAnnouncements = async (busId) => {
    if (busAnnouncements[busId]) {
      // Already loaded, just toggle visibility
      setBusAnnouncements((prev) => ({ ...prev, [busId]: null }));
      return;
    }

    setLoadingAnnouncements((prev) => ({ ...prev, [busId]: true }));
    try {
      const response = await getAllBusAnnouncements(busId);
      setBusAnnouncements((prev) => ({ ...prev, [busId]: response.data.announcements || [] }));
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Unable to load announcements');
    } finally {
      setLoadingAnnouncements((prev) => ({ ...prev, [busId]: false }));
    }
  };

  const handleDeleteAnnouncement = (announcement) => {
    Alert.alert(
      'Delete Announcement',
      `Are you sure you want to delete "${announcement.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAnnouncement(announcement._id);
              Alert.alert('Success', 'Announcement deleted successfully');
              // Reload announcements for the bus
              if (announcement.bus?._id || announcement.bus) {
                const busId = announcement.bus._id || announcement.bus;
                const response = await getAllBusAnnouncements(busId);
                setBusAnnouncements((prev) => ({ ...prev, [busId]: response.data.announcements || [] }));
              }
            } catch (error) {
              Alert.alert('Error', error?.response?.data?.message || 'Unable to delete announcement');
            }
          }
        }
      ]
    );
  };

  const renderBus = ({ item }) => {
    const announcements = busAnnouncements[item._id];
    const isLoadingAnnouncements = loadingAnnouncements[item._id];
    
    return (
      <View style={styles.busCard}>
        <View style={styles.busCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.busTitle}>{item.routeName}</Text>
            <Text style={styles.busMeta}>Bus #{item.busNumber}</Text>
            <Text style={styles.busMeta}>Driver: {item.driverName}</Text>
            {item.departureTime ? <Text style={styles.busMeta}>Departs: {item.departureTime}</Text> : null}
            {item.currentStop ? <Text style={styles.busMeta}>Current stop: {item.currentStop}</Text> : null}
          </View>
          <TouchableOpacity style={styles.statusPill} onPress={() => handleCycleStatus(item)}>
            <Text style={styles.statusText}>{item.status}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.busActions}>
          <TouchableOpacity 
            style={styles.announcementBtn} 
            onPress={() => handleOpenAnnouncementForm(item)}
          >
            <Text style={styles.announcementBtnText}>📢 Announce</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.viewAnnouncementsBtn} 
            onPress={() => handleLoadAnnouncements(item._id)}
          >
            <Text style={styles.viewAnnouncementsBtnText}>
              {announcements ? '📋 Hide' : '📋 View'} Announcements
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteBtn} 
            onPress={() => handleDeleteBus(item)}
          >
            <Text style={styles.deleteBtnText}>🗑️ Delete Bus</Text>
          </TouchableOpacity>
        </View>
        {announcements && (
          <View style={styles.announcementsList}>
            <Text style={styles.announcementsListTitle}>Announcements:</Text>
            {isLoadingAnnouncements ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
            ) : announcements.length > 0 ? (
              announcements.map((ann) => (
                <View key={ann._id} style={styles.announcementItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.announcementItemTitle}>{ann.title}</Text>
                    <Text style={styles.announcementItemMessage}>{ann.message}</Text>
                    <Text style={styles.announcementItemTime}>
                      {new Date(ann.createdAt).toLocaleString()}
                      {ann.isActive ? ' • Active' : ' • Inactive'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteAnnouncementBtn}
                    onPress={() => handleDeleteAnnouncement(ann)}
                  >
                    <Text style={styles.deleteAnnouncementBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.noAnnouncementsText}>No announcements for this bus</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Welcome back, {user?.name}</Text>
          <Text style={styles.subHeading}>Manage buses and monitor live statuses</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add a bus</Text>
            <View style={styles.formGrid}>
              <TextInput placeholderTextColor="#888" style={styles.input} placeholder="Route name" value={form.routeName} onChangeText={(text) => updateForm('routeName', text)} />
              <TextInput placeholderTextColor="#888" style={styles.input} placeholder="Bus number" value={form.busNumber} onChangeText={(text) => updateForm('busNumber', text)} />
              <TextInput placeholderTextColor="#888" style={styles.input} placeholder="Driver name" value={form.driverName} onChangeText={(text) => updateForm('driverName', text)} />
              <TextInput placeholderTextColor="#888" style={styles.input} placeholder="Driver phone" keyboardType="phone-pad" value={form.driverPhone} onChangeText={(text) => updateForm('driverPhone', text)} />
              <TextInput placeholderTextColor="#888" style={styles.input} placeholder="Departure time" value={form.departureTime} onChangeText={(text) => updateForm('departureTime', text)} />
              <TextInput placeholderTextColor="#888" style={styles.input} placeholder="Current stop" value={form.currentStop} onChangeText={(text) => updateForm('currentStop', text)} />
            </View>

    <View style={styles.routeSection}>
            <Text style={styles.subHeadingLabel}>Start point (fixed)</Text>
            <View style={styles.campusCard}>
              <Text style={styles.campusName}>{campus.name}</Text>
              <Text style={styles.campusMeta}>
                {campus.latitude}, {campus.longitude}
              </Text>
              {campus.address ? <Text style={styles.campusMeta}>{campus.address}</Text> : null}
              <Text style={styles.campusHint}>All routes depart from campus and head to a single destination.</Text>
            </View>

            <Text style={styles.subHeadingLabel}>Destination</Text>
            <TextInput
              style={styles.input}
               placeholderTextColor="#888"  
              placeholder="Destination name"
              value={form.endLocation.name}
              onChangeText={(text) => updateDestination('name', text)}
            />
            <View style={styles.inlineInputs}>
              <TextInput
                style={[styles.input, styles.inlineInput]}
                placeholder="Latitude"
                 placeholderTextColor="#888"  
                keyboardType="numeric"
                value={form.endLocation.latitude?.toString() || ''}
                onChangeText={(text) => updateDestination('latitude', text)}
              />
              <TextInput
               placeholderTextColor="#888"  
                style={[styles.input, styles.inlineInput]}
                placeholder="Longitude"
                keyboardType="numeric"
                value={form.endLocation.longitude?.toString() || ''}
                onChangeText={(text) => updateDestination('longitude', text)}
              />
            </View>

            <View style={styles.stopsHeader}>
              <Text style={styles.subHeadingLabel}>Route stops</Text>
              {form.stops.length ? <Text style={styles.stopsCount}>{form.stops.length} added</Text> : null}
            </View>

            {form.stops.length === 0 ? (
              <Text style={styles.stopsHint}>Add intermediate stops to see them on the student map.</Text>
            ) : (
              form.stops.map((stop, index) => (
                <View key={`${stop.name}-${index}`} style={styles.stopCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopTitle}>
                      {index + 1}. {stop.name || 'Unnamed stop'}
                    </Text>
                    <Text style={styles.stopMeta}>
                      {stop.latitude}, {stop.longitude}
                    </Text>
                    {stop.arrivalTime ? <Text style={styles.stopMeta}>ETA: {stop.arrivalTime}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveStop(index)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={styles.stopForm}>
              <TextInput
               placeholderTextColor="#888"  
                style={styles.input}
                placeholder="Stop name"
                value={newStop.name}
                onChangeText={(text) => setNewStop((prev) => ({ ...prev, name: text }))}
              />
              <View style={styles.inlineInputs}>
                <TextInput
                 placeholderTextColor="#888"  
                  style={[styles.input, styles.inlineInput]}
                  placeholder="Latitude"
                  keyboardType="numeric"
                  value={newStop.latitude}
                  onChangeText={(text) => setNewStop((prev) => ({ ...prev, latitude: text }))}
                />
                <TextInput
                 placeholderTextColor="#888"  
                  style={[styles.input, styles.inlineInput]}
                  placeholder="Longitude"
                  keyboardType="numeric"
                  value={newStop.longitude}
                  onChangeText={(text) => setNewStop((prev) => ({ ...prev, longitude: text }))}
                />
              </View>
              <TextInput
               placeholderTextColor="#888"  
                style={styles.input}
                placeholder="Arrival time (optional)"
                value={newStop.arrivalTime}
                onChangeText={(text) => setNewStop((prev) => ({ ...prev, arrivalTime: text }))}
              />
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleAddStop}>
                <Text style={styles.secondaryBtnText}>Add stop</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, saving && styles.disabled]} onPress={handleCreateBus} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Create bus'}</Text>
          </TouchableOpacity>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Active buses</Text>
            <TouchableOpacity onPress={loadBuses}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : buses.length === 0 ? (
            <Text style={styles.emptyText}>No buses added yet.</Text>
          ) : (
            <View>
              {buses.map((bus, index) => (
                <View key={bus._id}>
                  {index > 0 && <View style={{ height: 12 }} />}
                  {renderBus({ item: bus })}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {showAnnouncementForm && selectedBusForAnnouncement && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Announcement</Text>
            <Text style={styles.modalSubtitle}>
              For: {selectedBusForAnnouncement.routeName} (Bus #{selectedBusForAnnouncement.busNumber})
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Announcement title (e.g., Bus Delay)"
              placeholderTextColor="#888"
              value={announcementForm.title}
              onChangeText={(text) => setAnnouncementForm((prev) => ({ ...prev, title: text }))}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Message (e.g., Bus will be delayed by 15 minutes due to traffic)"
              placeholderTextColor="#888"
              value={announcementForm.message}
              onChangeText={(text) => setAnnouncementForm((prev) => ({ ...prev, message: text }))}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={handleCloseAnnouncementForm}
                disabled={savingAnnouncement}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleCreateAnnouncement}
                disabled={savingAnnouncement}
              >
                {savingAnnouncement ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 28, fontWeight: '700', color: colors.text },
  subHeading: { color: colors.muted, marginBottom: 20 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontWeight: '700', fontSize: 16, marginBottom: 12, color: colors.text },
  formGrid: { marginBottom: 4 },
  routeSection: { marginTop: 8 },
  subHeadingLabel: { fontWeight: '600', color: colors.text, marginTop: 8, marginBottom: 6 },
  campusCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, backgroundColor: '#f8fafc', marginBottom: 12 },
  campusName: { fontWeight: '700', color: colors.text, fontSize: 16 },
  campusMeta: { color: colors.muted, marginTop: 2 },
  campusHint: { color: colors.muted, marginTop: 8, fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, color: '#000', backgroundColor: '#fff', marginBottom: 12 },
  inlineInputs: { flexDirection: 'row', columnGap: 12 },
  inlineInput: { flex: 1 },
  stopsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stopsCount: { color: colors.muted, fontWeight: '600' },
  stopsHint: { color: colors.muted, marginBottom: 12 },
  stopCard: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, marginBottom: 8 },
  stopTitle: { fontWeight: '600', color: colors.text },
  stopMeta: { color: colors.muted },
  removeText: { color: colors.danger, fontWeight: '600' },
  stopForm: { marginTop: 8 },
  secondaryBtn: { marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.primary, alignItems: 'center' },
  secondaryBtnText: { color: colors.primary, fontWeight: '600' },
  primaryBtn: { marginTop: 12, backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.7 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  refreshText: { color: colors.primary, fontWeight: '600' },
  busCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  busCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  busTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  busMeta: { color: colors.muted, fontSize: 12 },
  busActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#e0f2fe' },
  statusText: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  announcementBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff3cd', borderWidth: 1, borderColor: '#ffc107' },
  announcementBtnText: { color: colors.text, fontWeight: '600', fontSize: 11 },
  viewAnnouncementsBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: colors.primary },
  viewAnnouncementsBtnText: { color: colors.primary, fontWeight: '600', fontSize: 11 },
  deleteBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: colors.danger },
  deleteBtnText: { color: colors.danger, fontWeight: '600', fontSize: 11 },
  announcementsList: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  announcementsListTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  announcementItem: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 8, alignItems: 'flex-start' },
  announcementItemTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  announcementItemMessage: { fontSize: 12, color: colors.text, marginBottom: 4 },
  announcementItemTime: { fontSize: 11, color: colors.muted },
  deleteAnnouncementBtn: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fee2e2', borderRadius: 6 },
  deleteAnnouncementBtnText: { color: colors.danger, fontWeight: '600', fontSize: 11 },
  noAnnouncementsText: { fontSize: 12, color: colors.muted, fontStyle: 'italic', textAlign: 'center', padding: 12 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: colors.muted, marginBottom: 20 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, minWidth: 100, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  modalBtnCancelText: { color: colors.text, fontWeight: '600' },
  modalBtnPrimary: { backgroundColor: colors.primary },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: colors.muted, marginTop: 12 },
  logoutBtn: { alignItems: 'center', marginTop: 12 },
  logoutText: { color: colors.danger, fontWeight: '600' }
});
