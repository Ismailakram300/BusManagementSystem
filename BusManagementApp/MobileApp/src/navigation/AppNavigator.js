import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import StudentDashboard from '../screens/StudentDashboard';
import AdminHomeScreen from '../screens/AdminHomeScreen';
import AdminBusesScreen from '../screens/AdminBusesScreen';
import CreateBusScreen from '../screens/CreateBusScreen';
import BusListScreen from '../screens/BusListScreen';
import TrackBusScreen from '../screens/TrackBusScreen';
import ChatScreen from '../screens/ChatScreen';
import AdminDrawer from '../components/AdminDrawer';
import { useAuth } from '../context/AuthContext';
import colors from '../config/colors';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: colors.primary
  },
  headerTintColor: '#fff',
  contentStyle: {
    backgroundColor: colors.background
  }
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Create account' }} />
    </Stack.Navigator>
  );
}

function AdminDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <AdminDrawer {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700'
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.text,
        drawerStyle: {
          backgroundColor: '#fff',
          width: 280
        }
      }}
    >
      <Drawer.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ 
          title: 'Admin Dashboard', 
          headerShown: true,
          drawerLabel: 'Home',
          drawerIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>
        }}
      />
      <Drawer.Screen
        name="AdminBuses"
        component={AdminBusesScreen}
        options={{ 
          title: 'Active Buses', 
          headerShown: true,
          drawerLabel: 'Active Buses',
          drawerIcon: () => <Text style={{ fontSize: 20 }}>🚌</Text>
        }}
      />
      <Drawer.Screen
        name="CreateBus"
        component={CreateBusScreen}
        options={{ 
          title: 'Create Bus', 
          headerShown: true, 
          drawerItemStyle: { display: 'none' }
        }}
      />
    </Drawer.Navigator>
  );
}

function AppStack({ role }) {
  if (role === 'admin') {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="AdminMain"
          component={AdminDrawerNavigator}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions} initialRouteName="StudentDashboard">
      <Stack.Screen
        name="StudentDashboard"
        component={StudentDashboard}
        options={{ title: 'Student dashboard', headerBackVisible: false }}
      />
      <Stack.Screen name="BusList" component={BusListScreen} options={{ title: 'Buses' }} />
      <Stack.Screen name="TrackBus" component={TrackBusScreen} options={{ title: 'Track bus' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Bus Chat' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { initializing, user } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack role={user.role} /> : <AuthStack />}
    </NavigationContainer>
  );
}
