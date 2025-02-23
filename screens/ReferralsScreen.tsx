import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Modal, 
  TextInput, 
  Alert,
  Share,
  ActivityIndicator 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Clipboard from '@react-native-clipboard/clipboard';

// Referral Interface matching the database schema
interface Referral {
  id: string;
  user_id: string;
  referred_user_id: string;
  status: 'pending' | 'completed' | 'expired';
  reward_amount?: number;
  reward_type?: string;
  referral_code?: string;
  expires_at?: string;
  created_at: string;
}

// Interface for displaying referral information
interface ReferralDisplay extends Referral {
  referred_user_name?: string;
}

const ReferralsScreen = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<ReferralDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  // Fetch user's referrals and generate referral code
  useEffect(() => {
    const fetchReferralsAndGenerateCode = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        
        // Fetch referrals with potential user details
        const { data: referralsData, error: referralsError } = await supabase
          .from('referrals')
          .select(`
            *,
            referred_user:users(id, name)
          `)
          .eq('user_id', user.id);

        if (referralsError) throw referralsError;

        // Transform referrals to include referred user name
        const transformedReferrals = referralsData?.map(ref => ({
          ...ref,
          referred_user_name: ref.referred_user?.name || 'Unknown User'
        })) || [];

        setReferrals(transformedReferrals);

        // Generate or fetch existing referral code
        const referralCode = await generateUniqueReferralCode();
        setReferralCode(referralCode || '');
      } catch (error) {
        console.error('Error fetching referrals:', error);
        Alert.alert('Error', 'Could not fetch referral information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferralsAndGenerateCode();
  }, [user?.id]);

// Add this method to the ReferralsScreen component
const generateUniqueReferralCode = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return null;
    }
  
    try {
      // Generate a more complex unique code
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newReferralCode = `REF-${user.id.slice(0, 4)}-${randomString}`;
  
      // Check if the referral code already exists
      const { data: existingCode, error: checkError } = await supabase
        .from('referrals')
        .select('referral_code')
        .eq('referral_code', newReferralCode)
        .single();
  
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
  
      // If code exists, regenerate
      if (existingCode) {
        return generateUniqueReferralCode();
      }
  
      // Upsert the referral code for the user
      const { error: upsertError } = await supabase
        .from('referrals')
        .upsert({
          user_id: user.id,
          referral_code: newReferralCode,
          status: 'pending', // Initial status
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
  
      if (upsertError) throw upsertError;
  
      return newReferralCode;
    } catch (error) {
      console.error('Error generating referral code:', error);
      Alert.alert('Error', 'Could not generate referral code');
      return null;
    }
  };
  
  // Modify the useEffect to use this method
  useEffect(() => {
    const fetchReferralCode = async () => {
      if (!user?.id) return;
  
      try {
        setIsLoading(true);
        
        // First, try to fetch existing referral code for the user
        const { data: existingReferral, error: fetchError } = await supabase
          .from('referrals')
          .select('referral_code')
          .eq('user_id', user.id)
          .single();
  
        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }
  
        // If no existing referral code, generate a new one
        const referralCode = existingReferral?.referral_code 
          || await generateUniqueReferralCode();
  
        setReferralCode(referralCode || '');
  
        // Fetch user's referrals
        const { data: referralsData, error: referralsError } = await supabase
          .from('referrals')
          .select(`
            *,
            referred_user:users(id, name)
          `)
          .eq('user_id', user.id);
  
        if (referralsError) throw referralsError;
  
        // Transform referrals to include referred user name
        const transformedReferrals = referralsData?.map(ref => ({
          ...ref,
          referred_user_name: ref.referred_user?.name || 'Unknown User'
        })) || [];
  
        setReferrals(transformedReferrals);
  
      } catch (error) {
        console.error('Error fetching referral information:', error);
        Alert.alert('Error', 'Could not fetch referral information');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchReferralCode();
  }, [user?.id]);

  // Share referral code
  const shareReferralCode = async () => {
    try {
      const result = await Share.share({
        message: `Join me and get rewards! Use my referral code: ${referralCode}`,
        title: 'Referral Invitation'
      });

      if (result.action === Share.sharedAction) {
        setIsShareModalVisible(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not share referral code');
    }
  };

  // Copy referral code to clipboard
  const copyReferralCode = () => {
    Clipboard.setString(referralCode);
    Alert.alert('Copied', 'Referral code copied to clipboard');
  };

  // Render loader if data is loading
  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4630EB" />
      </View>
    );
  }

  // Get referral status color
  const getReferralStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500'; // Orange
      case 'completed': return '#4CAF50'; // Green
      case 'expired': return '#F44336'; // Red
      default: return '#9E9E9E'; // Gray
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Referral Program</Text>

      {/* Referral Code Section */}
      <View style={styles.referralCodeContainer}>
        <Text style={styles.referralCodeTitle}>Your Referral Code</Text>
        <View style={styles.referralCodeBox}>
          <Text style={styles.referralCode}>{referralCode}</Text>
          <View style={styles.referralCodeActions}>
            <TouchableOpacity 
              style={styles.referralCodeButton}
              onPress={copyReferralCode}
            >
              <Text style={styles.referralCodeButtonText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.referralCodeButton}
              onPress={() => setIsShareModalVisible(true)}
            >
              <Text style={styles.referralCodeButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Referral History */}
      <View style={styles.referralsSection}>
        <Text style={styles.sectionTitle}>Referral History</Text>
        
        {referrals.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              No referrals yet. Start inviting friends!
            </Text>
          </View>
        ) : (
          referrals.map((referral) => (
            <View key={referral.id} style={styles.referralItem}>
              <View style={styles.referralItemHeader}>
                <Text style={styles.referredUserName}>
                  {referral.referred_user_name || 'Unknown User'}
                </Text>
                <View 
                  style={[
                    styles.statusBadge, 
                    { backgroundColor: getReferralStatusColor(referral.status) }
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {referral.status}
                  </Text>
                </View>
              </View>
              <View style={styles.referralDetailsContainer}>
                {referral.reward_amount && referral.reward_type && (
                  <Text style={styles.referralReward}>
                    Reward: {referral.reward_amount} {referral.reward_type}
                  </Text>
                )}
                <Text style={styles.referralDate}>
                  Referred on: {new Date(referral.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Share Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isShareModalVisible}
        onRequestClose={() => setIsShareModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share Referral Code</Text>
            <Text style={styles.modalDescription}>
              Invite friends and earn rewards!
            </Text>
            <View style={styles.modalCodeBox}>
              <Text style={styles.modalCode}>{referralCode}</Text>
            </View>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={styles.modalShareButton}
                onPress={shareReferralCode}
              >
                <Text style={styles.modalShareButtonText}>Share Now</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setIsShareModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 15
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  referralCodeContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  referralCodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  referralCodeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 10
  },
  referralCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4630EB'
  },
  referralCodeActions: {
    flexDirection: 'row'
  },
  referralCodeButton: {
    backgroundColor: '#4630EB',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 10
  },
  referralCodeButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  referralsSection: {
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  emptyStateContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center'
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16
  },
  referralItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  referralItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  referredUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    textTransform: 'capitalize'
  },
  referralDetailsContainer: {
    flexDirection: 'column'
  },
  referralReward: {
    color: '#4CAF50',
    marginBottom: 5
  },
  referralDate: {
    color: '#666'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  },
  modalDescription: {
    color: '#666',
    marginBottom: 20,
    textAlign: 'center'
  },
  modalCodeBox: {
    backgroundColor: '#F0F0F0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  modalCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4630EB',
    textAlign: 'center'
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  modalShareButton: {
    backgroundColor: '#4630EB',
    borderRadius: 10,
    padding: 15,
    flex: 1,
    marginRight: 10
  },
  modalShareButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  modalCancelButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    padding: 15,
    flex: 1
  },
  modalCancelButtonText: {
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold'
  }
});

export default ReferralsScreen;