import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import colors from '../config/colors';
import campus from '../config/campus';
import { createBus } from '../api/buses';

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

export default function CreateBusScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState(createEmptyForm());
  const [newStop, setNewStop] = useState(createEmptyStop());
  const [saving, setSaving] = useState(false);
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showArrivalPicker, setShowArrivalPicker] = useState(false);
  const [departureDate, setDepartureDate] = useState(new Date());
  const [arrivalDate, setArrivalDate] = useState(new Date());

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

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleDepartureTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDeparturePicker(false);
    }
    if (event.type !== 'dismissed' && selectedDate) {
      setDepartureDate(selectedDate);
      updateForm('departureTime', formatTime(selectedDate));
    }
  };

  const handleArrivalTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowArrivalPicker(false);
    }
    if (event.type !== 'dismissed' && selectedDate) {
      setArrivalDate(selectedDate);
      setNewStop((prev) => ({ ...prev, arrivalTime: formatTime(selectedDate) }));
    }
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
      Alert.alert('Success', 'Bus created successfully', [
        {
          text: 'OK',
          onPress: () => {
            setForm(createEmptyForm());
            setNewStop(createEmptyStop());
            navigation.goBack();
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || error.message || 'Unable to create bus');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create New Bus</Text>
          <Text style={styles.headerSubtitle}>Fill in the details to add a new bus route</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <TextInput
            placeholderTextColor="#888"
            style={styles.input}
            placeholder="Route name *"
            value={form.routeName}
            onChangeText={(text) => updateForm('routeName', text)}
          />
          <TextInput
            placeholderTextColor="#888"
            style={styles.input}
            placeholder="Bus number *"
            value={form.busNumber}
            onChangeText={(text) => updateForm('busNumber', text)}
          />
          <TextInput
            placeholderTextColor="#888"
            style={styles.input}
            placeholder="Driver name *"
            value={form.driverName}
            onChangeText={(text) => updateForm('driverName', text)}
          />
          <TextInput
            placeholderTextColor="#888"
            style={styles.input}
            placeholder="Driver phone"
            keyboardType="phone-pad"
            value={form.driverPhone}
            onChangeText={(text) => updateForm('driverPhone', text)}
          />
          <TouchableOpacity
            style={styles.timeInput}
            onPress={() => setShowDeparturePicker(true)}
          >
            <Text style={[styles.timeInputText, !form.departureTime && styles.timeInputPlaceholder]}>
              {form.departureTime || 'Select departure time'}
            </Text>
            <Text style={styles.timeInputIcon}>🕐</Text>
          </TouchableOpacity>
          {showDeparturePicker && (
            <DateTimePicker
              value={departureDate}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDepartureTimeChange}
            />
          )}
          <TextInput
            placeholderTextColor="#888"
            style={styles.input}
            placeholder="Current stop"
            value={form.currentStop}
            onChangeText={(text) => updateForm('currentStop', text)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Information</Text>
          <View style={styles.campusCard}>
            <Text style={styles.campusLabel}>Start Point (Fixed)</Text>
            <Text style={styles.campusName}>{campus.name}</Text>
            <Text style={styles.campusMeta}>
              {campus.latitude}, {campus.longitude}
            </Text>
            {campus.address ? <Text style={styles.campusMeta}>{campus.address}</Text> : null}
          </View>

          <Text style={styles.label}>Destination *</Text>
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
              placeholder="Latitude *"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={form.endLocation.latitude?.toString() || ''}
              onChangeText={(text) => updateDestination('latitude', text)}
            />
            <TextInput
              placeholderTextColor="#888"
              style={[styles.input, styles.inlineInput]}
              placeholder="Longitude *"
              keyboardType="numeric"
              value={form.endLocation.longitude?.toString() || ''}
              onChangeText={(text) => updateDestination('longitude', text)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.stopsHeader}>
            <Text style={styles.sectionTitle}>Route Stops</Text>
            {form.stops.length > 0 && <Text style={styles.stopsCount}>{form.stops.length} added</Text>}
          </View>

          {form.stops.length === 0 ? (
            <Text style={styles.hint}>Add intermediate stops to see them on the student map.</Text>
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
            <TouchableOpacity
              style={styles.timeInput}
              onPress={() => setShowArrivalPicker(true)}
            >
              <Text style={[styles.timeInputText, !newStop.arrivalTime && styles.timeInputPlaceholder]}>
                {newStop.arrivalTime || 'Select arrival time (optional)'}
              </Text>
              <Text style={styles.timeInputIcon}>🕐</Text>
            </TouchableOpacity>
            {showArrivalPicker && (
              <DateTimePicker
                value={arrivalDate}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleArrivalTimeChange}
              />
            )}
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleAddStop}>
              <Text style={styles.secondaryBtnText}>Add Stop</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.disabled]}
          onPress={handleCreateBus}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Create Bus</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  contentContainer: {
    padding: 20
  },
  header: {
    marginBottom: 24
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.muted
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    backgroundColor: '#fff',
    marginBottom: 12,
    fontSize: 15
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  timeInputText: {
    fontSize: 15,
    color: colors.text,
    flex: 1
  },
  timeInputPlaceholder: {
    color: '#888'
  },
  timeInputIcon: {
    fontSize: 18
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: 12
  },
  inlineInput: {
    flex: 1
  },
  campusCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f8fafc',
    marginBottom: 16
  },
  campusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  campusName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4
  },
  campusMeta: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 8
  },
  stopsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  stopsCount: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600'
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
    fontStyle: 'italic'
  },
  stopCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center'
  },
  stopTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4
  },
  stopMeta: {
    fontSize: 12,
    color: colors.muted
  },
  removeText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13
  },
  stopForm: {
    marginTop: 12
  },
  secondaryBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  secondaryBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  disabled: {
    opacity: 0.6
  }
});

