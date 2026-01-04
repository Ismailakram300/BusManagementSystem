import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getBusMessages, sendMessage } from '../api/chat';
import { getMyAssignment } from '../api/assignments';
import { getBusAnnouncements } from '../api/announcements';
import colors from '../config/colors';

export default function ChatScreen({ route, navigation }) {
  const { user } = useAuth();
  const { busId, busName } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadData();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [busId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentRes, messagesRes, announcementsRes] = await Promise.all([
        getMyAssignment(),
        busId ? getBusMessages(busId) : Promise.resolve({ data: { messages: [] } }),
        busId ? getBusAnnouncements(busId) : Promise.resolve({ data: { announcements: [] } })
      ]);
      
      if (assignmentRes.data.assignment) {
        setAssignment(assignmentRes.data.assignment);
        const assignedBusId = assignmentRes.data.assignment.bus._id;
        if (!busId) {
          // Navigate to chat for assigned bus
          navigation.replace('Chat', {
            busId: assignedBusId,
            busName: assignmentRes.data.assignment.bus.routeName
          });
          return;
        }
      }
      
      if (messagesRes.data.messages) {
        setMessages(messagesRes.data.messages);
      }
      
      if (announcementsRes.data.announcements) {
        setAnnouncements(announcementsRes.data.announcements);
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Unable to load chat');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!busId) return;
    try {
      const response = await getBusMessages(busId);
      if (response.data.messages) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      // Silently fail for polling
      console.error('Failed to refresh messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !busId) return;
    
    setSending(true);
    try {
      await sendMessage(busId, newMessage.trim());
      setNewMessage('');
      await loadMessages();
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Unable to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender._id === user?._id;
    
    return (
      <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
        {!isMyMessage && (
          <Text style={styles.senderName}>{item.sender.name}</Text>
        )}
        <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {item.message}
          </Text>
          <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const renderAnnouncement = (announcement) => (
    <View key={announcement._id} style={styles.announcementCard}>
      <View style={styles.announcementHeader}>
        <Text style={styles.announcementIcon}>📢</Text>
        <Text style={styles.announcementTitle}>{announcement.title}</Text>
      </View>
      <Text style={styles.announcementMessage}>{announcement.message}</Text>
      <Text style={styles.announcementTime}>
        {new Date(announcement.createdAt).toLocaleString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!busId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No bus assigned</Text>
        <Text style={styles.emptySubtext}>Please contact admin to get assigned to a bus</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{busName || 'Bus Chat'}</Text>
      </View>

      {announcements.length > 0 && (
        <View style={styles.announcementsContainer}>
          <FlatList
            data={announcements}
            renderItem={({ item }) => renderAnnouncement(item)}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.announcementsList}
          />
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.muted}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  announcementsContainer: {
    backgroundColor: '#fff3cd',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  announcementsList: {
    padding: 12
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 280,
    borderWidth: 1,
    borderColor: '#ffc107'
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  announcementIcon: {
    fontSize: 20,
    marginRight: 8
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1
  },
  announcementMessage: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 8
  },
  announcementTime: {
    fontSize: 11,
    color: colors.muted
  },
  messagesList: {
    flex: 1
  },
  messagesContent: {
    padding: 16
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start'
  },
  myMessageContainer: {
    alignItems: 'flex-end'
  },
  senderName: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
    marginLeft: 12
  },
  messageBubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    maxWidth: '75%',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  myMessageBubble: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  messageText: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 4
  },
  myMessageText: {
    color: '#fff'
  },
  messageTime: {
    fontSize: 11,
    color: colors.muted,
    alignSelf: 'flex-end'
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
    color: colors.text
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.muted
  }
});

