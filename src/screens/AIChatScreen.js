import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSecurity } from '../state/SecurityProvider';
import { LinearGradient } from 'expo-linear-gradient';

export default function AIChatScreen() {
  const { aiChat, sendMessageToAI } = useSecurity();
  const [inputMessage, setInputMessage] = useState('');
  const scrollViewRef = useRef();

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      await sendMessageToAI(inputMessage.trim());
      setInputMessage('');
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderMessage = (message) => {
    const isAI = message.sender === 'ai';
    
    return (
      <View key={message.id} style={[styles.messageContainer, isAI ? styles.aiMessage : styles.userMessage]}>
        <View style={[styles.messageBubble, isAI ? styles.aiBubble : styles.userBubble]}>
          <Text style={[styles.messageText, isAI ? styles.aiText : styles.userText]}>
            {message.text}
          </Text>
          <View style={styles.messageTime}>
            <Text style={styles.timeText}>
              {new Date(message.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderQuickPrompts = () => {
    const prompts = [
      'What network threats do I have?',
      'How can I improve my security score?',
      'Tell me about my vulnerabilities',
      'Analyze my installed apps',
      'What suspicious activity is detected?',
    ];

    return (
      <View style={styles.quickPromptsContainer}>
        <Text style={styles.quickPromptsTitle}>Quick Questions:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptsScroll}>
          {prompts.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.promptButton}
              onPress={() => {
                setInputMessage(prompt);
                handleSendMessage();
              }}
            >
              <Text style={styles.promptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#4CAF50" />
            <Text style={styles.headerTitle}>AI Security Assistant</Text>
          </View>
          <View style={styles.aiStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>AI Active</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
        >
          {aiChat.messages.length === 0 && (
            <View style={styles.welcomeContainer}>
              <Ionicons name="shield-checkmark" size={64} color="#4CAF50" />
              <Text style={styles.welcomeTitle}>AI Security Assistant</Text>
              <Text style={styles.welcomeText}>
                I'm here to help you understand and improve your device's security. 
                Ask me anything about vulnerabilities, threats, network traffic, or apps.
              </Text>
              {renderQuickPrompts()}
            </View>
          )}
          
          {aiChat.messages.map(renderMessage)}
          
          {aiChat.isTyping && (
            <View style={[styles.messageContainer, styles.aiMessage]}>
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <View style={styles.typingIndicator}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={[styles.messageText, styles.aiText]}>AI is analyzing...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Ask about your security..."
              placeholderTextColor="#888"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputMessage.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputMessage.trim() || aiChat.isTyping}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={inputMessage.trim() ? "#fff" : "#666"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  aiStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messagesContent: {
    paddingVertical: 15,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  quickPromptsContainer: {
    width: '100%',
  },
  quickPromptsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  promptsScroll: {
    marginBottom: 20,
  },
  promptButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  promptText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  messageContainer: {
    marginVertical: 5,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#4CAF50',
  },
  aiBubble: {
    backgroundColor: '#2a2a3e',
    borderWidth: 1,
    borderColor: '#444',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#fff',
  },
  messageTime: {
    marginTop: 5,
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#2a2a3e',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#444',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    maxHeight: 100,
    paddingVertical: 5,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
}); 