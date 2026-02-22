import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Button, Divider, Avatar } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text size={80} label={user?.name.substring(0, 2).toUpperCase() || 'U'} />
        <List.Item
          title={user?.name}
          description={user?.email}
          titleStyle={styles.name}
          descriptionStyle={styles.email}
        />
      </View>

      <Divider />

      <List.Section>
        <List.Item
          title="Settings"
          left={(props) => <List.Icon {...props} icon="cog" />}
          onPress={() => console.log('Settings')}
        />
        <List.Item
          title="Notifications"
          left={(props) => <List.Icon {...props} icon="bell" />}
          onPress={() => console.log('Notifications')}
        />
        <List.Item
          title="Security"
          left={(props) => <List.Icon {...props} icon="shield-check" />}
          onPress={() => console.log('Security')}
        />
        <List.Item
          title="Help & Support"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          onPress={() => console.log('Help')}
        />
      </List.Section>

      <View style={styles.footer}>
        <Button mode="contained" onPress={logout} style={styles.logoutButton}>
          Logout
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  footer: {
    padding: 20,
    marginTop: 'auto',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
  },
});
