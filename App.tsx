/**
 * Minimal Test App - Debugging black screen
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

function App() {
  console.log('App is rendering!');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>MuscleUp</Text>
        <Text style={styles.subtitle}>Test Version</Text>
        <Text style={styles.text}>
          If you can see this text, the app is working!
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    color: '#888888',
    marginBottom: 40,
  },
  text: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 28,
  },
});

export default App;
