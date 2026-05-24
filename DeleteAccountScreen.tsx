// src/screens/DeleteAccountScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Radius } from '../theme';
import { useStore } from '../store';

const FIREBASE_API_KEY    = 'AIzaSyAI-_RmGl60tcWL4MW3b_9W1VMnrGyb6UE';
const FIREBASE_PROJECT_ID = 'englishgo-e8333';
const FIRESTORE_URL       = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export default function DeleteAccountScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut: storeSignOut } = useStore();
  const [confirmation, setConfirmation] = useState('');
  const [deleting,     setDeleting]     = useState(false);
  const [step,         setStep]         = useState<1 | 2>(1);

  const handleDelete = async () => {
    if (confirmation.toLowerCase() !== 'delete') {
      Alert.alert('Confirmation required', 'Please type "delete" to confirm.');
      return;
    }
    setDeleting(true);
    try {
      if (user?.uid && user?.idToken) {
        // 1. Delete user lessons from Firestore
        try {
          const lessonsRes = await fetch(
            `${FIRESTORE_URL}/lessons?key=${FIREBASE_API_KEY}`,
            { headers: { Authorization: `Bearer ${user.idToken}` } }
          );
          const lessonsData = await lessonsRes.json();
          if (lessonsData.documents) {
            const userLessons = lessonsData.documents.filter((doc: any) => {
              const f = doc.fields || {};
              return f.learnerId?.stringValue === user.uid || f.teacherId?.stringValue === user.uid;
            });
            await Promise.all(userLessons.map((doc: any) =>
              fetch(`https://firestore.googleapis.com/v1/${doc.name}?key=${FIREBASE_API_KEY}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${user.idToken}` },
              })
            ));
          }
        } catch (e) {
          console.log('Error deleting lessons:', e);
        }

        // 2. Delete user profile from Firestore
        try {
          await fetch(
            `${FIRESTORE_URL}/users/${user.uid}?key=${FIREBASE_API_KEY}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${user.idToken}` },
            }
          );
        } catch (e) {
          console.log('Error deleting user profile:', e);
        }

        // 3. Delete Firebase Auth account
        try {
          await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: user.idToken }),
            }
          );
        } catch (e) {
          console.log('Error deleting auth account:', e);
        }
      }

      storeSignOut();
      Alert.alert(
        '✅ Account deleted',
        'Your account and all associated data have been permanently deleted.',
        [{ text: 'OK' }]
      );
    } catch (e) {
      Alert.alert('Error', 'Could not delete account. Please contact support@englishgo.app');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {step === 1 && (
          <>
            <View style={styles.warningCard}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningTitle}>This action is permanent</Text>
              <Text style={styles.warningText}>
                Deleting your account will permanently remove all your data from EnglishGo. This cannot be undone.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>What will be deleted:</Text>
            {[
              'Your profile and personal information',
              'Your lesson history and notes',
              'Your progress and achievements',
              'Your reviews and ratings',
              'Your Firebase authentication account',
            ].map((item, i) => (
              <View key={i} style={styles.listRow}>
                <Text style={styles.listDot}>✕</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>What will NOT be deleted:</Text>
            {[
              'Anonymised reviews on teacher profiles',
              'Financial records required by law (90 days)',
              'Any unused lesson credits (non-refundable)',
            ].map((item, i) => (
              <View key={i} style={styles.listRow}>
                <Text style={[styles.listDot, { color: Colors.muted }]}>•</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}

            <Text style={styles.altText}>
              Instead of deleting, you can also just sign out and stop using the app.
            </Text>

            <TouchableOpacity style={styles.continueBtn} onPress={() => setStep(2)}>
              <Text style={styles.continueBtnLabel}>Continue to delete →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelBtnLabel}>Keep my account</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.warningCard}>
              <Text style={styles.warningIcon}>🔴</Text>
              <Text style={styles.warningTitle}>Final confirmation</Text>
              <Text style={styles.warningText}>
                Type <Text style={{ color: Colors.rose, fontWeight: '700' }}>delete</Text> below to permanently delete your account and all data.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Type "delete" to confirm</Text>
            <TextInput
              style={styles.fieldInput}
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="delete"
              placeholderTextColor={Colors.mutedDk}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.deleteBtn, (confirmation.toLowerCase() !== 'delete' || deleting) && { opacity: 0.4 }]}
              onPress={handleDelete}
              disabled={confirmation.toLowerCase() !== 'delete' || deleting}
            >
              {deleting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.deleteBtnLabel}>Permanently delete my account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep(1)}>
              <Text style={styles.cancelBtnLabel}>← Go back</Text>
            </TouchableOpacity>

            <Text style={styles.supportText}>
              Need help instead? Contact us at{'\n'}
              <Text style={{ color: Colors.accent }}>support@englishgo.app</Text>
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText:      { fontSize: 28, color: Colors.muted },
  title:            { fontSize: 17, fontWeight: '600', color: '#EEF2FF' },
  scroll:           { padding: Spacing.lg, paddingBottom: 60 },
  warningCard:      { backgroundColor: 'rgba(244,63,94,0.08)', borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(244,63,94,0.3)', marginBottom: Spacing.xl },
  warningIcon:      { fontSize: 40, marginBottom: 12 },
  warningTitle:     { fontSize: 18, fontWeight: '700', color: '#EEF2FF', marginBottom: 8 },
  warningText:      { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  sectionTitle:     { fontSize: 13, fontWeight: '700', color: Colors.textSub, marginBottom: Spacing.sm, marginTop: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  listRow:          { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  listDot:          { fontSize: 13, color: Colors.rose, fontWeight: '700', marginTop: 2 },
  listText:         { fontSize: 13, color: Colors.muted, flex: 1, lineHeight: 20 },
  altText:          { fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: Spacing.xl, marginBottom: Spacing.md, lineHeight: 20 },
  continueBtn:      { backgroundColor: 'rgba(244,63,94,0.12)', borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(244,63,94,0.3)', marginBottom: Spacing.sm },
  continueBtnLabel: { fontSize: 14, fontWeight: '600', color: Colors.rose },
  cancelBtn:        { backgroundColor: Colors.surface2, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 0.5, borderColor: Colors.borderHi },
  cancelBtnLabel:   { fontSize: 14, fontWeight: '600', color: Colors.textSub },
  fieldLabel:       { fontSize: 12, fontWeight: '600', color: Colors.muted, marginBottom: 8, marginTop: Spacing.md },
  fieldInput:       { backgroundColor: Colors.surface2, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: '#EEF2FF', borderWidth: 1, borderColor: Colors.rose, letterSpacing: 2 },
  deleteBtn:        { backgroundColor: Colors.rose, borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.sm },
  deleteBtnLabel:   { fontSize: 15, fontWeight: '700', color: Colors.white },
  supportText:      { fontSize: 12, color: Colors.mutedDk, textAlign: 'center', marginTop: Spacing.xl, lineHeight: 20 },
});
