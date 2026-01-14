import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, UserPlus, UserMinus, Crown, History, Trash2 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTeamDetails } from '@/hooks/useTeamDetails';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TeamDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const teamId = params.teamId as string;

  const { team, loading, removeMember, addMember } = useTeamDetails(teamId);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Eliminar miembro',
      `¿Estás seguro de eliminar a ${memberName} del equipo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const success = await removeMember(memberId);
            if (success) {
              Alert.alert('Éxito', 'Miembro eliminado del equipo');
            } else {
              Alert.alert('Error', 'No se pudo eliminar el miembro');
            }
          },
        },
      ]
    );
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    setAddingMember(true);
    const result = await addMember(newMemberEmail);
    setAddingMember(false);

    if (result.success) {
      const message = result.warning
        ? 'Miembro agregado. ' + result.warning
        : 'Miembro agregado al equipo correctamente. Los gastos existentes se han recalculado para incluir al nuevo miembro.';

      Alert.alert('Éxito', message);
      setShowAddMember(false);
      setNewMemberEmail('');
    } else {
      Alert.alert('Error', result.error || 'No se pudo agregar el miembro');
    }
  };

  const handleDeleteTeam = () => {
    Alert.alert(
      'Eliminar equipo',
      '¿Estás seguro que quieres eliminar este equipo? Se eliminarán todos los gastos y splits asociados. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', teamId);

              if (error) throw error;

              Alert.alert('Equipo eliminado', 'El equipo ha sido eliminado correctamente', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(tabs)/teams'),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo eliminar el equipo: ' + error.message);
            }
          },
        },
      ]
    );
  };

  if (loading || !team) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cargando...</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{team.name}</Text>
          {team.description && (
            <Text style={styles.headerSubtitle}>{team.description}</Text>
          )}
          <View style={styles.memberCount}>
            <Text style={styles.memberCountText}>
              {team.memberCount} {team.memberCount === 1 ? 'miembro' : 'miembros'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteTeam}>
          <Trash2 size={22} color="#ef4444" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => router.push({
              pathname: '/team-history',
              params: { teamId: team.id, teamName: team.name },
            })}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.historyButtonGradient}
            >
              <History size={20} color="#ffffff" />
              <Text style={styles.historyButtonText}>Ver Historial de Gastos</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Miembros del equipo</Text>
            {team.isCreator && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddMember(true)}
              >
                <UserPlus size={20} color="#10b981" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.membersList}>
            {team.members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <View style={styles.memberIcon}>
                    <User size={20} color="#10b981" />
                  </View>
                  <View style={styles.memberDetails}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.userName}</Text>
                      {member.userId === team.createdBy && (
                        <View style={styles.creatorBadge}>
                          <Crown size={12} color="#f59e0b" />
                        </View>
                      )}
                      {member.isCurrentUser && (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>Tú</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberEmail}>{member.userEmail}</Text>
                    <Text style={styles.memberDate}>
                      Miembro desde {new Date(member.joinedAt).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                </View>
                {team.isCreator && !member.isCurrentUser && member.userId !== team.createdBy && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMember(member.id, member.userName)}
                  >
                    <UserMinus size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showAddMember}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMember(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddMember(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Agregar miembro</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa el email del usuario que quieres agregar
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email del usuario"
              placeholderTextColor="#64748b"
              value={newMemberEmail}
              onChangeText={setNewMemberEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddMember(false);
                  setNewMemberEmail('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addModalButton]}
                onPress={handleAddMember}
                disabled={addingMember}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.addModalButtonGradient}
                >
                  {addingMember ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.addModalButtonText}>Agregar</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    marginBottom: 16,
    marginRight: 12,
  },
  headerContent: {
    gap: 8,
    flex: 1,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 24,
  },
  memberCount: {
    marginTop: 8,
  },
  memberCountText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  historyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  historyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberDetails: {
    flex: 1,
    gap: 4,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  creatorBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  memberEmail: {
    fontSize: 14,
    color: '#94a3b8',
  },
  memberDate: {
    fontSize: 12,
    color: '#64748b',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: '#334155',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  addModalButton: {
    flex: 1,
  },
  addModalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
