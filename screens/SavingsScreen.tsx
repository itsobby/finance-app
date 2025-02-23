import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface MonthlySavings {
  month: string;
  amount: number;
}

interface SavingsData {
  balance: number;
  monthly_savings: MonthlySavings[];
}

const SavingsScreen = () => {
  const { user } = useAuth();
  const [savingsData, setSavingsData] = useState<SavingsData | null>(null);
  const [statementModalVisible, setStatementModalVisible] = useState(false);

  useEffect(() => {
    fetchSavingsData();
  }, []);

  const fetchSavingsData = async () => {
    try {
      const { data, error } = await supabase
        .from('savings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setSavingsData(data);
    } catch (error) {
      console.error('Fetch savings error:', error);
    }
  };

  const prepareChartData = () => {
    // If no monthly savings or insufficient data, return a default chart data
    const defaultMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const defaultData = [0, 0, 0, 0, 0, 0];

    if (!savingsData?.monthly_savings || savingsData.monthly_savings.length === 0) {
      return {
        labels: defaultMonths,
        datasets: [{
          data: defaultData,
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
          strokeWidth: 2
        }]
      };
    }

    const sortedSavings = [...savingsData.monthly_savings]
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months

    // Ensure we always have 6 data points
    const chartData = sortedSavings.length < 6
      ? [...Array(6 - sortedSavings.length).fill({ month: '', amount: 0 }), ...sortedSavings]
      : sortedSavings;

    return {
      labels: chartData.map(item => 
        item.month 
          ? new Date(item.month).toLocaleString('default', { month: 'short' }) 
          : ''
      ),
      datasets: [{
        data: chartData.map(item => item.amount),
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  const handleDeposit = async (amount: number) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const { data, error } = await supabase
        .from('savings')
        .update({ 
          balance: (savingsData?.balance || 0) + amount,
          monthly_savings: savingsData?.monthly_savings 
            ? [...savingsData.monthly_savings, { month: currentMonth, amount }]
            : [{ month: currentMonth, amount }],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      setSavingsData(data);
    } catch (error) {
      console.error('Deposit error:', error);
    }
  };

  const renderStatementModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={statementModalVisible}
      onRequestClose={() => setStatementModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Savings Statement</Text>
          <FlatList
            data={savingsData?.monthly_savings || []}
            keyExtractor={(item) => item.month}
            renderItem={({ item }) => (
              <View style={styles.statementItem}>
                <Text>{item.month}</Text>
                <Text>${item.amount.toFixed(2)}</Text>
              </View>
            )}
          />
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setStatementModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const chartConfig = {
    backgroundColor: '#e26a00',
    backgroundGradientFrom: '#fb8c00',
    backgroundGradientTo: '#ffa726',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '6', strokeWidth: '2', stroke: '#ffa726' }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Savings Dashboard</Text>

      {/* Current Balance */}
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>
          ${savingsData?.balance?.toFixed(2) || '0.00'}
        </Text>
      </View>

      {/* Savings Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Monthly Savings Trend</Text>
        <LineChart
          data={prepareChartData()}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeposit(100)} // Example fixed deposit amount
        >
          <Text style={styles.actionButtonText}>Deposit $100</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setStatementModalVisible(true)}
        >
          <Text style={styles.actionButtonText}>View Statements</Text>
        </TouchableOpacity>
      </View>

      {renderStatementModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
  balanceContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  balanceLabel: {
    fontSize: 18,
    color: '#666'
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333'
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    backgroundColor: '#4630EB',
    padding: 15,
    borderRadius: 10,
    flex: 0.48
  },
  actionButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '70%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center'
  },
  statementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#4630EB',
    borderRadius: 5
  },
  closeButtonText: {
    color: 'white',
    textAlign: 'center'
  }
});

export default SavingsScreen;