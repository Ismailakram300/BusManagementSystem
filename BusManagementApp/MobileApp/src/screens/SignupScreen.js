import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import colors from '../config/colors';
import { useAuth } from '../context/AuthContext';

export default function SignupScreen() {
  const { signup, authLoading } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    rollNumber: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [error, setError] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setError('');
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        rollNumber: form.role === 'student' ? form.rollNumber.trim() : undefined
      });
    } catch (err) {
      let message = 'Unable to sign up';
      
      if (err?.response?.data?.message) {
        message = err.response.data.message;
      } else if (err?.message) {
        message = err.message;
      } else if (err?.code === 'ECONNREFUSED' || err?.code === 'NETWORK_ERROR') {
        message = 'Cannot connect to server. Please check if the server is running.';
      } else if (err?.response?.status === 500) {
        message = 'Server error. Please try again later.';
      }
      
      console.error('Signup error:', err);
      setError(message);
      Alert.alert('Signup failed', message);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Register as a student or administrator</Text>

        <TextInput
          style={styles.input}
          placeholder="Full name"
          value={form.name}
          onChangeText={(text) => update('name', text)}
        />

        <TextInput
          style={styles.input}
          placeholder="Email address"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(text) => update('email', text)}
        />

        {form.role === 'student' && (
          <TextInput
            style={styles.input}
            placeholder="Roll number"
            value={form.rollNumber}
            onChangeText={(text) => update('rollNumber', text)}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={form.password}
          onChangeText={(text) => update('password', text)}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          secureTextEntry
          value={form.confirmPassword}
          onChangeText={(text) => update('confirmPassword', text)}
        />

        <View style={styles.roleSwitch}>
          {['student', 'admin'].map((role, index) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.roleButton,
                index === 0 && styles.roleButtonSpacing,
                form.role === role && styles.roleButtonActive
              ]}
              onPress={() => update('role', role)}
            >
              <Text style={[styles.roleText, form.role === role && styles.roleTextActive]}>
                {role === 'student' ? 'Student' : 'Admin'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.primaryButton, authLoading && styles.disabled]} onPress={handleSubmit} disabled={authLoading}>
          <Text style={styles.primaryButtonText}>{authLoading ? 'Creating account...' : 'Sign up'}</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>You will be redirected automatically after successful signup.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: colors.background
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text
  },
  subtitle: {
    color: colors.muted,
    marginBottom: 24
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  roleSwitch: {
    flexDirection: 'row',
    marginVertical: 10
  },
  roleButtonSpacing: {
    marginRight: 12
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.muted,
    alignItems: 'center'
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  roleText: {
    color: colors.muted,
    fontWeight: '600'
  },
  roleTextActive: {
    color: '#fff'
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  disabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  error: {
    color: colors.danger,
    marginBottom: 12
  },
  hint: {
    color: colors.muted,
    marginTop: 16,
    textAlign: 'center'
  }
});

