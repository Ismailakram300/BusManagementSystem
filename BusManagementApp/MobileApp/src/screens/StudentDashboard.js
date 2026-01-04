import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import colors from '../config/colors';
import { useAuth } from '../context/AuthContext';
import { getMyAssignment } from '../api/assignments';
import { getAllAnnouncements } from '../api/announcements';

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

export default function StudentDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    // Auto-refresh announcements every 30 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Load assignment (for showing assigned bus info)
      try {
        const assignmentRes = await getMyAssignment();
        console.log('Assignment response:', assignmentRes.data);
        
        if (assignmentRes.data && assignmentRes.data.assignment) {
          setAssignment(assignmentRes.data.assignment);
        } else {
          setAssignment(null);
        }
      } catch (error) {
        console.error('Failed to load assignment:', error);
        setAssignment(null);
      }
      
      // Load all announcements (no assignment required)
      try {
        const announcementsRes = await getAllAnnouncements();
        console.log('Announcements API response:', announcementsRes);
        console.log('Announcements data:', announcementsRes.data);
        
        if (announcementsRes.data && announcementsRes.data.announcements) {
          const anns = announcementsRes.data.announcements;
          console.log(`✅ Loaded ${anns.length} announcements:`, anns);
          setAnnouncements(anns);
        } else {
          console.log('⚠️ No announcements array in response');
          setAnnouncements([]);
        }
      } catch (error) {
        console.error('❌ Failed to load announcements:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error message:', error.message);
        setAnnouncements([]);
        Alert.alert('Error', `Failed to load announcements: ${error.response?.data?.message || error.message}`);
      }
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadData(true);
  };

  const handleChatPress = () => {
    if (assignment?.bus) {
      navigation.navigate('Chat', {
        busId: assignment.bus._id,
        busName: assignment.bus.routeName
      });
    } else {
      Alert.alert('No Bus Assigned', 'Please contact admin to get assigned to a bus');
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'S'}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.welcome}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name || 'Student'} 👋</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Stay updated with your bus routes and announcements</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Loading your dashboard...</Text>
        </View>
      ) : (
        <>
          {/* Assigned Bus Card */}
          {assignment?.bus ? (
            <View style={styles.busCard}>
              <View style={styles.busCardHeader}>
                <View style={styles.busIconContainer}>
                  <Text style={styles.busIcon}>🚌</Text>
                </View>
                <View style={styles.busInfo}>
                  <Text style={styles.busLabel}>Your Assigned Bus</Text>
                  <Text style={styles.busRouteName}>{assignment.bus.routeName}</Text>
                  <Text style={styles.busNumber}>Bus #{assignment.bus.busNumber}</Text>
                </View>
              </View>
              <View style={styles.busCardFooter}>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(assignment.bus.status)}15` }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(assignment.bus.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(assignment.bus.status) }]}>
                    {assignment.bus.status}
                  </Text>
                </View>
                {assignment.bus.driverName && (
                  <Text style={styles.driverText}>👤 {assignment.bus.driverName}</Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.noBusCard}>
              <Text style={styles.noBusIcon}>🚌</Text>
              <Text style={styles.noBusTitle}>No Bus Assigned</Text>
              <Text style={styles.noBusText}>Contact your admin to get assigned to a bus route</Text>
            </View>
          )}

          {/* Announcements Section */}
          <View style={styles.announcementsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionIcon}>📢</Text>
                <Text style={styles.sectionTitle}>Announcements</Text>
                {announcements.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{announcements.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <Text style={styles.refreshIcon}>🔄</Text>
              </TouchableOpacity>
            </View>
            
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <View key={announcement._id} style={styles.announcementCard}>
                  <View style={styles.announcementCardHeader}>
                    <View style={styles.announcementIconContainer}>
                      <Text style={styles.announcementIcon}>📣</Text>
                    </View>
                    <View style={styles.announcementHeaderContent}>
                      <Text style={styles.announcementTitle}>{announcement.title}</Text>
                      {announcement.bus && (
                        <View style={styles.announcementBusBadge}>
                          <Text style={styles.announcementBusText}>
                            🚌 {announcement.bus.routeName} (#{announcement.bus.busNumber})
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.announcementMessage}>{announcement.message}</Text>
                  <View style={styles.announcementFooter}>
                    <Text style={styles.announcementTime}>
                      🕐 {new Date(announcement.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyAnnouncementCard}>
                <Text style={styles.emptyAnnouncementIcon}>📭</Text>
                <Text style={styles.emptyAnnouncementText}>No announcements at this time</Text>
                <Text style={styles.emptyAnnouncementHint}>Pull down to refresh or check back later</Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.actionsTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonPrimary]} 
                onPress={() => navigation.navigate('BusList')}
              >
                <Text style={styles.actionButtonIcon}>🚌</Text>
                <Text style={[styles.actionButtonText, styles.actionButtonTextWhite]}>View All Buses</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonSecondary]} 
                onPress={() => navigation.navigate('TrackBus')}
              >
                <Text style={styles.actionButtonIcon}>📍</Text>
                <Text style={styles.actionButtonText}>Track Bus</Text>
              </TouchableOpacity>

              {assignment?.bus && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonChat]} 
                  onPress={handleChatPress}
                >
                  <Text style={styles.actionButtonIcon}>💬</Text>
                  <Text style={[styles.actionButtonText, styles.actionButtonTextWhite]}>Bus Chat</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* User Info Card */}
          <View style={styles.userInfoCard}>
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>📋 Roll Number</Text>
              <Text style={styles.userInfoValue}>{user?.rollNumber || 'Not provided'}</Text>
            </View>
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>📧 Email</Text>
              <Text style={styles.userInfoValue}>{user?.email || 'Not provided'}</Text>
            </View>
          </View>
        </>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  contentContainer: {
    paddingBottom: 24
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  loaderText: {
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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary
  },
  headerText: {
    flex: 1
  },
  welcome: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff'
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20
  },
  // Bus Card Styles
  busCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  busCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  busIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  busIcon: {
    fontSize: 28
  },
  busInfo: {
    flex: 1
  },
  busLabel: {
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  busRouteName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4
  },
  busNumber: {
    fontSize: 14,
    color: colors.muted
  },
  busCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  driverText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500'
  },
  noBusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed'
  },
  noBusIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  noBusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8
  },
  noBusText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center'
  },
  // Announcements Styles
  announcementsSection: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  refreshButton: {
    padding: 8
  },
  refreshIcon: {
    fontSize: 20
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 24,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  announcementCardHeader: {
    flexDirection: 'row',
    marginBottom: 12
  },
  announcementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  announcementIcon: {
    fontSize: 20
  },
  announcementHeaderContent: {
    flex: 1
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6
  },
  announcementBusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  announcementBusText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600'
  },
  announcementMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  announcementTime: {
    fontSize: 12,
    color: colors.muted
  },
  emptyAnnouncementCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  emptyAnnouncementIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyAnnouncementText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6
  },
  emptyAnnouncementHint: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center'
  },
  // Actions Styles
  actionsSection: {
    marginBottom: 24,
    paddingHorizontal: 24
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.primary
  },
  actionButtonChat: {
    backgroundColor: colors.secondary
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  actionButtonTextWhite: {
    color: '#fff'
  },
  // User Info Styles
  userInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  userInfoLabel: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500'
  },
  userInfoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600'
  },
  // Logout Styles
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 16
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: 8
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 16
  }
});
