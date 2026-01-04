import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext';
import colors from '../config/colors';

export default function AdminDrawer(props) {
  const { user, logout } = useAuth();

  return (
    <DrawerContentScrollView {...props} style={styles.drawer}>
      <View style={styles.drawerHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'A'}</Text>
        </View>
        <Text style={styles.drawerName}>{user?.name || 'Admin'}</Text>
        <Text style={styles.drawerEmail}>{user?.email || ''}</Text>
      </View>

      <View style={styles.drawerContent}>
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            props.navigation.navigate('AdminHome');
            props.navigation.closeDrawer();
          }}
        >
          <Text style={styles.drawerItemIcon}>🏠</Text>
          <Text style={styles.drawerItemText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            props.navigation.navigate('AdminBuses');
            props.navigation.closeDrawer();
          }}
        >
          <Text style={styles.drawerItemIcon}>🚌</Text>
          <Text style={styles.drawerItemText}>Active Buses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            props.navigation.navigate('CreateBus');
            props.navigation.closeDrawer();
          }}
        >
          <Text style={styles.drawerItemIcon}>➕</Text>
          <Text style={styles.drawerItemText}>Create Bus</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.drawerFooter}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  drawerHeader: {
    padding: 24,
    backgroundColor: colors.primary,
    paddingTop: 40
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary
  },
  drawerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4
  },
  drawerEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  drawerContent: {
    flex: 1,
    paddingTop: 8
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 24
  },
  drawerItemIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32
  },
  drawerItemText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600'
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 16
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 12
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 12
  },
  logoutText: {
    fontSize: 16,
    color: colors.danger,
    fontWeight: '700'
  }
});

