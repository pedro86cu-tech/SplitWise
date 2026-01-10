import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { X, Camera as CameraIcon, Check, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams } from '@/hooks/useTeams';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function ScanReceiptScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<any>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { teams, loading: teamsLoading } = useTeams();

  useEffect(() => {
    if (!permission && showCamera) {
      requestPermission();
    }
  }, [permission, showCamera]);

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    setShowCamera(true);
  };

  if (!showCamera) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          style={styles.teamSelectionContainer}
        >
          <View style={styles.teamSelectionHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <X size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.teamSelectionTitle}>Seleccionar Equipo</Text>
            <View style={{ width: 28 }} />
          </View>

          <Text style={styles.teamSelectionSubtitle}>
            Elige el equipo para este gasto
          </Text>

          <ScrollView style={styles.teamSelectionList} showsVerticalScrollIndicator={false}>
            {teamsLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Cargando equipos...</Text>
              </View>
            ) : teams.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={64} color="#64748b" />
                <Text style={styles.emptyStateText}>No tienes equipos</Text>
                <Text style={styles.emptyStateSubtext}>
                  Crea un equipo primero para poder agregar gastos
                </Text>
                <TouchableOpacity
                  style={styles.createTeamButton}
                  onPress={() => router.push('/create-team')}
                >
                  <Text style={styles.createTeamButtonText}>Crear Equipo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={styles.teamCard}
                  onPress={() => handleSelectTeam(team.id)}
                >
                  <View style={styles.teamCardIcon}>
                    <Users size={24} color="#10b981" />
                  </View>
                  <View style={styles.teamCardContent}>
                    <Text style={styles.teamCardName}>{team.name}</Text>
                    <Text style={styles.teamCardMembers}>
                      {team.member_count} {team.member_count === 1 ? 'miembro' : 'miembros'}
                    </Text>
                  </View>
                  <CameraIcon size={20} color="#94a3b8" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          style={styles.permissionContainer}
        >
          <CameraIcon size={64} color="#64748b" />
          <Text style={styles.permissionText}>Necesitamos acceso a tu cámara</Text>
          <Text style={styles.permissionSubtext}>Para escanear recibos y extraer el monto</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Otorgar permiso</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });

        setCapturedImage(photo.uri);
        processReceipt(photo.base64);
      } catch (error: any) {
        Alert.alert('Error', 'No se pudo tomar la foto');
      }
    }
  };

  const processReceipt = async (base64Image: string | undefined) => {
    if (!base64Image) {
      Alert.alert('Error', 'No se pudo capturar la imagen');
      setCapturedImage(null);
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/process-receipt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: base64Image }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setAmount(data.amount ? data.amount.toString() : '');
      setDescription(data.description || 'Gasto escaneado');
      setShowExpenseForm(true);

      if (!data.amount || data.amount === 0) {
        Alert.alert(
          'Procesamiento Manual',
          'No se pudo extraer el monto automáticamente. Por favor ingresa el monto manualmente.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error processing receipt:', error);
      Alert.alert(
        'Error',
        `No se pudo procesar el recibo: ${error.message || 'Error desconocido'}. Por favor ingresa el monto manualmente.`
      );
      setAmount('');
      setDescription('Gasto escaneado');
      setShowExpenseForm(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!selectedTeam || !amount || !description || !user) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          team_id: selectedTeam,
          description,
          total_amount: parseFloat(amount),
          paid_by: user.id,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', selectedTeam);

      if (teamMembers && teamMembers.length > 0) {
        const splitAmount = parseFloat(amount) / teamMembers.length;
        const splits = teamMembers.map(member => ({
          expense_id: expense.id,
          user_id: member.user_id,
          amount: splitAmount,
          is_settled: member.user_id === user.id,
        }));

        await supabase.from('expense_splits').insert(splits);
      }

      Alert.alert('Éxito', 'Gasto agregado correctamente', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear el gasto');
    }
  };

  const selectedTeamData = teams.find(t => t.id === selectedTeam);

  return (
    <View style={styles.container}>
      {!capturedImage ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setShowCamera(false);
                    setSelectedTeam(null);
                  }}
                >
                  <X size={28} color="#ffffff" />
                </TouchableOpacity>

                {selectedTeamData && (
                  <View style={styles.selectedTeamBadge}>
                    <Users size={16} color="#10b981" />
                    <Text style={styles.selectedTeamText}>{selectedTeamData.name}</Text>
                  </View>
                )}
              </View>

              <View style={styles.scanFrame} />

              <Text style={styles.instructionText}>
                Centra el recibo en el marco
              </Text>
            </View>
          </CameraView>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.processingContainer}>
          <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.processingContent}
          >
            {processing ? (
              <>
                <CameraIcon size={64} color="#10b981" />
                <Text style={styles.processingText}>Procesando recibo...</Text>
                <Text style={styles.processingSubtext}>Extrayendo información con AI</Text>
              </>
            ) : null}
          </LinearGradient>
        </View>
      )}

      <Modal visible={showExpenseForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() => {
              setShowExpenseForm(false);
              setCapturedImage(null);
              router.back();
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar Gasto</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowExpenseForm(false);
                  setCapturedImage(null);
                  router.back();
                }}
              >
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descripción</Text>
                <TextInput
                  style={styles.formInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Descripción del gasto"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Monto</Text>
                <TextInput
                  style={styles.formInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                />
              </View>

              {selectedTeamData && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Equipo</Text>
                  <View style={styles.teamDisplay}>
                    <Users size={20} color="#10b981" />
                    <Text style={styles.teamDisplayText}>{selectedTeamData.name}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitButton, !amount && styles.submitButtonDisabled]}
                onPress={handleCreateExpense}
                disabled={!amount}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.submitButtonGradient}
                >
                  <Check size={20} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Crear Gasto</Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  teamSelectionContainer: {
    flex: 1,
    paddingTop: 60,
  },
  teamSelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  backButton: {
    width: 28,
    height: 28,
  },
  teamSelectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  teamSelectionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  teamSelectionList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  teamCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamCardContent: {
    flex: 1,
  },
  teamCardName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  teamCardMembers: {
    fontSize: 14,
    color: '#94a3b8',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 20,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTeamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  selectedTeamText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  scanFrame: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: 300,
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 16,
  },
  instructionText: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  permissionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
  },
  processingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  processingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  processingSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalBody: {
    paddingHorizontal: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  teamDisplay: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  teamDisplayText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  createTeamButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  createTeamButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
