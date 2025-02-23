import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    username: '',
    phone: '',
    email: user?.email || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setProfile({
          username: data.username || '',
          phone: data.phone || '',
          email: user?.email || '',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch profile');
      console.error('Fetch profile error:', error);
    }
  };

  const updateProfile = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          phone: profile.phone,
        })
        .eq('id', user?.id);

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Profile Updated Successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      console.error('Update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      
      <Text style={styles.label}>Email</Text>
      <TextInput
        value={profile.email}
        editable={false}
        style={[styles.input, styles.disabledInput]}
      />

      <Text style={styles.label}>Username</Text>
      <TextInput
        placeholder="Enter username"
        value={profile.username}
        onChangeText={(text) => setProfile({...profile, username: text})}
        style={styles.input}
      />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        placeholder="Enter phone number"
        value={profile.phone}
        onChangeText={(text) => setProfile({...profile, phone: text})}
        style={styles.input}
        keyboardType="phone-pad"
      />

      <Button 
        title={isLoading ? "Updating..." : "Update Profile"} 
        onPress={updateProfile}
        disabled={isLoading}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#888',
  },
});

export default ProfileScreen;