import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import colors from '../config/colors';
import { useAuth } from '../context/AuthContext';
import logo from '../../assets/images/FUUAST.png';


export default function LoginScreen({ navigation }) {
  const { login, authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    try {
      await login(email.trim(), password);
    } catch (err) {
      const message = err?.response?.data?.message || 'Invalid credentials';
      setError(message);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} />
        </View>
        <Text style={styles.title}>Bus Management System</Text>
       <Text style={styles.subtitle}>Sign in to manage routes and track buses</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.btn, authLoading && styles.btnDisabled]} onPress={handleLogin} disabled={authLoading}>
          {authLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.linkBtn}>
          <Text style={styles.linkText}>New here? Create an account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.background },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.muted, marginBottom: 24 },
  logoContainer: {
  alignItems: 'center',
  marginBottom: 20,
},

logo: {
  width: 140,
  height: 140,
  resizeMode: 'contain',
},
  input: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  error: { color: colors.danger, marginBottom: 12 },
  btn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  btnDisabled: {
    opacity: 0.7
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkBtn: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.primary, fontWeight: '600' }
});
