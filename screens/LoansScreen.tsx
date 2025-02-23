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
  ActivityIndicator 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Enhanced Loan interface with more detailed fields
interface Loan {
  id: string;
  user_id: string;
  principal_amount: number;
  interest_rate: number;
  loan_status: 'pending' | 'approved' | 'rejected' | 'active' | 'paid';
  created_at: string;
  loan_term: number;
  purpose: string;
  monthly_payment?: number;
  total_interest?: number;
}

// Loan calculation utility
const calculateLoanDetails = (principal: number, interestRate: number, term: number) => {
  const monthlyInterestRate = interestRate / 100 / 12;
  const numberOfPayments = term * 12;
  
  // Calculate monthly payment using standard amortization formula
  const monthlyPayment = principal * 
    (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
  
  const totalInterest = (monthlyPayment * numberOfPayments) - principal;
  
  return {
    monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2))
  };
};

const LoanScreen = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isApplyModalVisible, setIsApplyModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // Loan application form state
  const [loanForm, setLoanForm] = useState({
    principal_amount: '',
    loan_term: '3', // Default to 3-year term
    purpose: ''
  });

  // Fetch user's loans on component mount
  useEffect(() => {
    fetchLoans();
  }, [user?.id]);

  // Fetch loans for the current user with loading state
  const fetchLoans = async () => {
    setIsLoading(true);
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Calculate loan details for each loan
      const enrichedLoans = data?.map(loan => ({
        ...loan,
        ...calculateLoanDetails(
          loan.principal_amount, 
          loan.interest_rate, 
          loan.loan_term || 3
        )
      })) || [];

      setLoans(enrichedLoans);
    } catch (error) {
      console.error('Fetch loans error:', error);
      Alert.alert('Error', 'Could not fetch loan information');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply for a new loan with more comprehensive validation
  const applyForLoan = async () => {
    // Validate inputs with more comprehensive checks
    const amount = parseFloat(loanForm.principal_amount);
    const term = parseFloat(loanForm.loan_term);

    // Validation rules
    if (isNaN(amount) || amount < 1000 || amount > 50000) {
      Alert.alert(
        'Invalid Amount', 
        'Loan amount must be between $1,000 and $50,000'
      );
      return;
    }

    if (isNaN(term) || term < 1 || term > 7) {
      Alert.alert(
        'Invalid Term', 
        'Loan term must be between 1 and 7 years'
      );
      return;
    }

    if (!loanForm.purpose.trim()) {
      Alert.alert('Missing Information', 'Please provide a detailed loan purpose');
      return;
    }

    // Dynamically calculate interest rate based on loan parameters
    const calculateInterestRate = () => {
      // Simple interest rate calculation logic
      if (amount < 10000) return 7.5;
      if (amount < 25000) return 6.5;
      return 5.5;
    };

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('loans')
        .insert({
          user_id: user?.id,
          principal_amount: amount,
          interest_rate: calculateInterestRate(),
          loan_status: 'pending',
          loan_term: term,
          purpose: loanForm.purpose
        })
        .select()
        .single();

      if (error) throw error;

      // Enrich the new loan with calculated details
      const newLoan = {
        ...data,
        ...calculateLoanDetails(data.principal_amount, data.interest_rate, term)
      };

      // Update local state
      setLoans(prevLoans => [newLoan, ...prevLoans]);
      
      // Reset form and close modal
      setLoanForm({
        principal_amount: '',
        loan_term: '3',
        purpose: ''
      });
      setIsApplyModalVisible(false);

      Alert.alert('Success', 'Loan application submitted successfully');
    } catch (error) {
      console.error('Loan application error:', error);
      Alert.alert('Error', 'Could not submit loan application');
    } finally {
      setIsLoading(false);
    }
  };

  // Open detailed loan view
  const openLoanDetails = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsDetailModalVisible(true);
  };

  // Render loan details modal
  const renderLoanDetailsModal = () => {
    if (!selectedLoan) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDetailModalVisible}
        onRequestClose={() => setIsDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Loan Details</Text>
            
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Amount:</Text>
              <Text style={styles.loanDetailValue}>
                ${selectedLoan.principal_amount.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Interest Rate:</Text>
              <Text style={styles.loanDetailValue}>
                {selectedLoan.interest_rate}%
              </Text>
            </View>
            
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Monthly Payment:</Text>
              <Text style={styles.loanDetailValue}>
                ${selectedLoan.monthly_payment?.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Total Interest:</Text>
              <Text style={styles.loanDetailValue}>
                ${selectedLoan.total_interest?.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Purpose:</Text>
              <Text style={styles.loanDetailValue}>
                {selectedLoan.purpose}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setIsDetailModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Render loader if data is loading
  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4630EB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Loan Management</Text>

      {/* Apply for Loan Button */}
      <TouchableOpacity 
        style={styles.applyLoanButton}
        onPress={() => setIsApplyModalVisible(true)}
      >
        <Text style={styles.applyLoanButtonText}>+ Apply for Loan</Text>
      </TouchableOpacity>

      {/* Loan Application Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isApplyModalVisible}
        onRequestClose={() => setIsApplyModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apply for a Loan</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Loan Amount ($1,000 - $50,000)"
              keyboardType="numeric"
              value={loanForm.principal_amount}
              onChangeText={(text) => setLoanForm(prev => ({
                ...prev, 
                principal_amount: text
              }))}
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Loan Term:</Text>
              <View style={styles.termButtonContainer}>
                {[1, 3, 5, 7].map((years) => (
                  <TouchableOpacity
                    key={years}
                    style={[
                      styles.termButton,
                      loanForm.loan_term === years.toString() 
                        ? styles.selectedTermButton 
                        : {}
                    ]}
                    onPress={() => setLoanForm(prev => ({
                      ...prev, 
                      loan_term: years.toString()
                    }))}
                  >
                    <Text style={styles.termButtonText}>{years} Years</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Loan Purpose (e.g., Home Renovation, Education)"
              multiline
              numberOfLines={4}
              value={loanForm.purpose}
              onChangeText={(text) => setLoanForm(prev => ({
                ...prev, 
                purpose: text
              }))}
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={applyForLoan}
              >
                <Text style={styles.modalButtonText}>Submit Application</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setIsApplyModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loan History */}
      <View style={styles.loansContainer}>
        <Text style={styles.sectionTitle}>Your Loan Applications</Text>
        
        {loans.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              No loan applications found
            </Text>
          </View>
        ) : (
          loans.map((loan) => (
            <TouchableOpacity 
              key={loan.id} 
              style={styles.loanItem}
              onPress={() => openLoanDetails(loan)}
            >
              <View style={styles.loanItemHeader}>
                <Text style={styles.loanAmount}>
                  ${loan.principal_amount.toFixed(2)}
                </Text>
                <View 
                  style={[
                    styles.statusBadge, 
                    { backgroundColor: getLoanStatusColor(loan.loan_status) }
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {loan.loan_status}
                  </Text>
                </View>
              </View>
              <Text style={styles.loanDate}>
                Applied on: {new Date(loan.created_at).toLocaleDateString()}
              </Text>
              <Text style={styles.loanInterestRate}>
                Interest Rate: {loan.interest_rate}%
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Loan Details Modal */}
      {renderLoanDetailsModal()}
    </ScrollView>
  );
};

// Utility function for status color
const getLoanStatusColor = (status: Loan['loan_status']) => {
  const statusColors = {
    pending: '#FFA500', // Orange
    approved: '#4CAF50', // Green
    rejected: '#F44336', // Red
    active: '#2196F3', // Blue
    paid: '#9E9E9E' // Gray
  };
  return statusColors[status];
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
    applyLoanButton: {
      backgroundColor: '#4630EB',
      padding: 15,
      borderRadius: 10,
      marginBottom: 20,
      alignItems: 'center'
    },
    applyLoanButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold'
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center'
    },
    input: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 12,
      marginBottom: 15,
      fontSize: 16
    },
    multilineInput: {
      height: 100,
      textAlignVertical: 'top'
    },
    modalButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    modalButton: {
      backgroundColor: '#4630EB',
      padding: 15,
      borderRadius: 10,
      flex: 1,
      marginRight: 10
    },
    modalButtonText: {
      color: 'white',
      textAlign: 'center',
      fontWeight: 'bold'
    },
    modalCancelButton: {
      backgroundColor: '#F0F0F0',
      padding: 15,
      borderRadius: 10,
      flex: 1
    },
    modalCancelButtonText: {
      color: '#333',
      textAlign: 'center',
      fontWeight: 'bold'
    },
    loansContainer: {
      marginTop: 20
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15
    },
    emptyStateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: '#F9F9F9',
      borderRadius: 10
    },
    emptyStateText: {
      color: '#888',
      fontSize: 16
    },
    loanItem: {
      backgroundColor: 'white',
      borderRadius: 10,
      padding: 15,
      marginBottom: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 3
    },
    loanItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10
    },
    loanAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333'
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 15,
      alignItems: 'center'
    },
    statusBadgeText: {
      color: 'white',
      fontSize: 12,
      textTransform: 'capitalize'
    },
    loanDate: {
      color: '#666',
      marginBottom: 5
    },
    loanInterestRate: {
      color: '#666'
    },
    pickerContainer: {
      marginBottom: 15
    },
    pickerLabel: {
      fontSize: 16,
      marginBottom: 10
    },
    termButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    termButton: {
      backgroundColor: '#f0f0f0',
      padding: 10,
      borderRadius: 5,
      width: '22%'
    },
    selectedTermButton: {
      backgroundColor: '#4630EB'
    },
    termButtonText: {
      textAlign: 'center',
      color: '#333'
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    loanDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
      paddingVertical: 5,
      borderBottomWidth: 1,
      borderBottomColor: '#eee'
    },
    loanDetailLabel: {
      fontWeight: 'bold',
      color: '#666'
    },
    loanDetailValue: {
      color: '#333'
    },
    modalCloseButton: {
      marginTop: 20,
      backgroundColor: '#4630EB',
      padding: 15,
      borderRadius: 10
    },
    modalCloseButtonText: {
      color: 'white',
      textAlign: 'center',
      fontWeight: 'bold'
    }
  });

export default LoanScreen;