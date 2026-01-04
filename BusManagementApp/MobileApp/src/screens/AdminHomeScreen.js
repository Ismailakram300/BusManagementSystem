import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import colors from '../config/colors';
import { useAuth } from '../context/AuthContext';

export default function AdminHomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome back,</Text>
        <Text style={styles.name}>{user?.name || 'Admin'} 👋</Text>
        <Text style={styles.subtitle}>Manage your bus management system</Text>
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity
          style={[styles.card, styles.primaryCard]}
          onPress={() => navigation.navigate('AdminBuses')}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>🚌</Text>
          </View>
          <Text style={styles.cardTitle}>Active Buses</Text>
          <Text style={styles.cardDescription}>View and manage all active buses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.secondaryCard]}
          onPress={() => navigation.navigate('CreateBus')}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>➕</Text>
          </View>
          <Text style={styles.cardTitle}>Create Bus</Text>
          <Text style={styles.cardDescription}>Add a new bus to the system</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.accentCard]}
          onPress={() => navigation.navigate('AdminBuses')}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>📊</Text>
          </View>
          <Text style={styles.cardTitle}>Manage Buses</Text>
          <Text style={styles.cardDescription}>Edit, delete, and manage bus routes</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
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
    marginBottom: 30,
    paddingTop: 10
  },
  welcome: {
    fontSize: 24,
    color: colors.muted,
    marginBottom: 4
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted
  },
  cardsContainer: {
    marginBottom: 24
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  primaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary
  },
  secondaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary
  },
  accentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b'
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  cardIconText: {
    fontSize: 32
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8
  },
  cardDescription: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20
  },
});

