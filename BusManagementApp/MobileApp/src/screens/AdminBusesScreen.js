import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import colors from '../config/colors';
import { fetchBuses, updateBus, deleteBus } from '../api/buses';
import { createAnnouncement, getAllBusAnnouncements, deleteAnnouncement } from '../api/announcements';

const statusOrder = ['On Time', 'Delayed', 'Cancelled'];

export default function AdminBusesScreen() {
  const navigation = useNavigation();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [selectedBusForAnnouncement, setSelectedBusForAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [busAnnouncements, setBusAnnouncements] = useState({});
  const [loadingAnnouncements, setLoadingAnnouncements] = useState({});

  const loadBuses = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const { data } = await fetchBuses();
      setBuses(data.buses || []);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Unable to load buses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBuses();
  }, [loadBuses]);

  const handleCycleStatus = async (bus) => {
    const currentIndex = statusOrder.indexOf(bus.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    try {
      await updateBus(bus._id, { status: nextStatus });
      loadBuses(true);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Unable to update status');
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
              loadBuses(true);
            } catch (error) {
              Alert.alert('Error', error?.response?.data?.message || 'Unable to delete bus');
            }
          }
        }
      ]
    );
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
      loadBuses(true);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Unable to create announcement');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleLoadAnnouncements = async (busId) => {
    if (busAnnouncements[busId]) {
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
    const statusColors = {
      'On Time': '#10b981',
      'Delayed': '#f59e0b',
      'Cancelled': '#ef4444'
    };

    return (
      <View style={styles.busCard}>
        <View style={styles.busCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.busTitle}>{item.routeName}</Text>
            <Text style={styles.busMeta}>Bus #{item.busNumber}</Text>
            <Text style={styles.busMeta}>Driver: {item.driverName}</Text>
            {item.departureTime ? <Text style={styles.busMeta}>Departs: {item.departureTime}</Text> : null}
            {item.currentStop ? <Text style={styles.busMeta}>Current: {item.currentStop}</Text> : null}
          </View>
          <TouchableOpacity
            style={[styles.statusPill, { backgroundColor: statusColors[item.status] + '20' }]}
            onPress={() => handleCycleStatus(item)}
          >
            <Text style={[styles.statusText, { color: statusColors[item.status] }]}>{item.status}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.busActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleOpenAnnouncementForm(item)}
          >
            <Text style={styles.actionBtnText}>📢 Announce</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleLoadAnnouncements(item._id)}
          >
            <Text style={styles.actionBtnText}>
              {announcements ? '📋 Hide' : '📋 View'} Announcements
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDeleteBus(item)}
          >
            <Text style={[styles.actionBtnText, styles.deleteBtnText]}>🗑️ Delete</Text>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Buses</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreateBus')}>
          <Text style={styles.addButtonText}>➕ Add Bus</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : buses.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🚌</Text>
          <Text style={styles.emptyText}>No buses added yet</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('CreateBus')}
          >
            <Text style={styles.emptyButtonText}>Create Your First Bus</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={buses}
          renderItem={renderBus}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadBuses(true)} />}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No buses found</Text>
            </View>
          }
        />
      )}

      {showAnnouncementForm && selectedBusForAnnouncement && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Announcement</Text>
            <Text style={styles.modalSubtitle}>
              For: {selectedBusForAnnouncement.routeName} (Bus #{selectedBusForAnnouncement.busNumber})
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Announcement title (e.g., Bus Delay)"
              placeholderTextColor="#888"
              value={announcementForm.title}
              onChangeText={(text) => setAnnouncementForm((prev) => ({ ...prev, title: text }))}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Message (e.g., Bus will be delayed by 15 minutes)"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 18,
    color: colors.muted,
    marginBottom: 20,
    textAlign: 'center'
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  listContent: {
    padding: 16
  },
  busCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  busCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  busTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4
  },
  busMeta: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12
  },
  busActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  actionBtn: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  actionBtnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 12
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
    borderColor: colors.danger
  },
  deleteBtnText: {
    color: colors.danger
  },
  announcementsList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  announcementsListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12
  },
  announcementItem: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  announcementItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4
  },
  announcementItemMessage: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4
  },
  announcementItemTime: {
    fontSize: 11,
    color: colors.muted
  },
  deleteAnnouncementBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 6
  },
  deleteAnnouncementBtnText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 11
  },
  noAnnouncementsText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 12
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 20
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center'
  },
  modalBtnCancel: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  modalBtnCancelText: {
    color: colors.text,
    fontWeight: '600'
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    backgroundColor: '#fff',
    marginBottom: 12
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontWeight: '700'
  }
});

