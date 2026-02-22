import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title } from 'react-native-paper';

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Total Balance</Title>
            <Text style={styles.balance}>$0.00</Text>
            <Text style={styles.subtitle}>Across all accounts</Text>
          </Card.Content>
        </Card>

        <View style={styles.row}>
          <Card style={[styles.card, styles.halfCard]}>
            <Card.Content>
              <Text style={styles.label}>Income</Text>
              <Text style={styles.income}>+$0.00</Text>
              <Text style={styles.period}>This month</Text>
            </Card.Content>
          </Card>

          <Card style={[styles.card, styles.halfCard]}>
            <Card.Content>
              <Text style={styles.label}>Expenses</Text>
              <Text style={styles.expense}>-$0.00</Text>
              <Text style={styles.period}>This month</Text>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Recent Transactions</Title>
            <Text style={styles.placeholder}>No transactions yet</Text>
            <Text style={styles.subtitle}>Start by adding an account and recording transactions</Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 15,
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  balance: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#0ea5e9',
    marginVertical: 10,
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCard: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  income: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 5,
  },
  expense: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 5,
  },
  period: {
    fontSize: 12,
    color: '#999',
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    textAlign: 'center',
  },
});
