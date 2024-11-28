import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/AppNavigation';

type HomeScreenProps = BottomTabScreenProps<MainTabParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Home</Text>
      {user && (
        <Text style={styles.subtitle}>
          Logged in as: {user.email}
        </Text>
      )}
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.buttonText}>Go to Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.button, styles.logoutButton]}
        onPress={signOut}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: 'gray',
  },
  button: {
    backgroundColor: 'blue',
    padding: 15,
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'red',
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});