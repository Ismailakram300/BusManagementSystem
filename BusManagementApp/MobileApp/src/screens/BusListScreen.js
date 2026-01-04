import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import colors from '../config/colors';
import { fetchBuses } from '../api/buses';
import { useAuth } from '../context/AuthContext';

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

export default function BusListScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [buses, setBuses] = useState([]);

  const loadBuses = async (showLoader = true) => {
    showLoader ? setLoading(true) : setRefreshing(true);
    setError('');
    try {
      const { data } = await fetchBuses();
      setBuses(data.buses || []);
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to load buses';
      setError(message);
    } finally {
      showLoader ? setLoading(false) : setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBuses();
    }, [])
  );

  const renderBus = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('TrackBus', { busId: item._id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.busIconContainer}>
            <Text style={styles.busIcon}>🚌</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.title}>{item.routeName}</Text>
            <Text style={styles.busNumber}>Bus #{item.busNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>👤</Text>
            <Text style={styles.detailText}>{item.driverName}</Text>
          </View>
          
          {item.endLocation?.name && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText} numberOfLines={1}>{item.endLocation.name}</Text>
            </View>
          )}

          {item.stops?.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🛑</Text>
              <Text style={styles.detailText}>{item.stops.length} stops</Text>
            </View>
          )}

          {item.currentStop && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🚏</Text>
              <Text style={styles.detailText} numberOfLines={1}>Current: {item.currentStop}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailsText}>Tap to view details →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading buses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>🚌</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Available Buses</Text>
            <Text style={styles.headerSubtitle}>
              {buses.length} {buses.length === 1 ? 'bus' : 'buses'} available
            </Text>
          </View>
        </View>
        <Text style={styles.description}>
          {user?.role === 'admin' 
            ? 'Tap a bus to edit live tracking details' 
            : 'Tap a bus to view live status and track location'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={buses}
        keyExtractor={(item) => item._id}
        renderItem={renderBus}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadBuses(false)} 
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚌</Text>
            <Text style={styles.emptyTitle}>No buses available</Text>
            <Text style={styles.emptyText}>Check back later or contact admin</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 14
  },
  // Header Styles
  header: {
    backgroundColor: colors.primary,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  headerIcon: {
    fontSize: 28
  },
  headerText: {
    flex: 1
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)'
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18
  },
  // Error Styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 12
  },
  error: {
    flex: 1,
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600'
  },
  // List Styles
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24
  },
  // Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  cardContent: {
    padding: 20
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  busIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  busIcon: {
    fontSize: 24
  },
  cardHeaderText: {
    flex: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4
  },
  busNumber: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  // Card Details
  cardDetails: {
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 24
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500'
  },
  // Card Footer
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  viewDetailsText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'right'
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center'
  }
});
