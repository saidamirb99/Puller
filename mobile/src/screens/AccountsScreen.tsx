import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, FAB } from 'react-native-paper';

export default function AccountsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>No accounts yet</Text>
      <Text style={styles.subtitle}>Tap + to add your first account</Text>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => console.log('Add account')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 18,
    color: '#999',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#0ea5e9',
  },
});
