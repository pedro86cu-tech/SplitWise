import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { X, Camera as CameraIcon, Check, Users, Edit3, MapPin, Calendar, Tag, Upload, ImageIcon, FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams } from '@/hooks/useTeams';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

export default function ScanReceiptScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [documentFile, setDocumentFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('general');
  const [location, setLocation] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [teamSelected, setTeamSelected] = useState(false);
  const [statementData, setStatementData] = useState<any>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const cameraRef = useRef<any>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { teams, loading: teamsLoading } = useTeams();

  const CATEGORIES = [
    { value: 'general', label: 'General' },
    { value: 'food', label: 'Comida' },
    { value: 'transport', label: 'Transporte' },
    { value: 'entertainment', label: 'Entretenimiento' },
    { value: 'shopping', label: 'Compras' },
    { value: 'utilities', label: 'Servicios' },
    { value: 'health', label: 'Salud' },
    { value: 'other', label: 'Otro' },
  ];

  const CURRENCIES = [
    { value: 'USD', label: 'USD ($)', symbol: '$' },
    { value: 'UYU', label: 'UYU ($)', symbol: '$' },
    { value: 'ARS', label: 'ARS ($)', symbol: '$' },
    { value: 'EUR', label: 'EUR (€)', symbol: '€' },
    { value: 'BRL', label: 'BRL (R$)', symbol: 'R$' },
  ];

  useEffect(() => {
    if (!permission && showCamera) {
      requestPermission();
    }
  }, [permission, showCamera]);

  const handleSelectTeam = (teamId: string, manual: boolean = false) => {
    setSelectedTeam(teamId);
    setManualEntry(manual);
    setTeamSelected(true);
    if (!manual) {
      setShowCamera(true);
    }
  };

  if (!teamSelected) {
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
                <View key={team.id} style={styles.teamCardWrapper}>
                  <View style={styles.teamCardHeader}>
                    <View style={styles.teamCardIcon}>
                      <Users size={24} color="#10b981" />
                    </View>
                    <View style={styles.teamCardContent}>
                      <Text style={styles.teamCardName}>{team.name}</Text>
                      <Text style={styles.teamCardMembers}>
                        {team.member_count} {team.member_count === 1 ? 'miembro' : 'miembros'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.teamCardActions}>
                    <TouchableOpacity
                      style={[styles.teamActionButton, styles.scanButton]}
                      onPress={() => handleSelectTeam(team.id, false)}
                    >
                      <CameraIcon size={18} color="#ffffff" />
                      <Text style={styles.teamActionButtonText}>Escanear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.teamActionButton, styles.manualButton]}
                      onPress={() => handleSelectTeam(team.id, true)}
                    >
                      <Edit3 size={18} color="#ffffff" />
                      <Text style={styles.teamActionButtonText}>Manual</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  if (!manualEntry) {
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
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });

        setCapturedImage(photo.uri);
        processReceipt(photo.base64, 'image');
      } catch (error: any) {
        Alert.alert('Error', 'No se pudo tomar la foto');
      }
    }
  };

  const pickDocumentOrImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType || '';

      if (mimeType.startsWith('image/')) {
        setCapturedImage(asset.uri);
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });
        processReceipt(base64, 'image');
      } else {
        setDocumentFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: mimeType,
        });
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });
        processReceipt(base64, mimeType);
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar el archivo: ' + error.message);
    }
  };

  const takePhotoForManual = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar la foto');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      if (result.assets[0].base64) {
        processReceipt(result.assets[0].base64, 'image');
      }
    }
  };

  const processReceipt = async (base64Data: string | undefined, fileType: string = 'image') => {
    if (!base64Data) {
      Alert.alert('Error', 'No se pudo capturar el archivo');
      setCapturedImage(null);
      setDocumentFile(null);
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
          body: JSON.stringify({
            image: base64Data,
            fileType: fileType
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Edge function response:', data);

      // Check if there's an error from the edge function
      if (data.error) {
        console.error('Edge function error:', data.error);
        Alert.alert(
          'Error al procesar',
          data.error + '\n\nPuedes ingresar los datos manualmente.',
          [{ text: 'OK' }]
        );
        setAmount('');
        setDescription(data.description || 'Gasto procesado');
        setShowExpenseForm(true);
        return;
      }

      // Check if it's a credit card statement with multiple cardholders
      if (data.type === 'statement' && data.expenses) {
        console.log('Statement detected with', data.expenses.length, 'cardholders');
        setStatementData(data.expenses);
        setShowExpenseForm(true);
      } else {
        // Single receipt
        console.log('Single receipt detected. Amount:', data.amount, 'Description:', data.description, 'Currency:', data.currency);
        setAmount(data.amount ? data.amount.toString() : '');
        setDescription(data.description || 'Gasto procesado');
        setCurrency(data.currency || 'USD');
        setShowExpenseForm(true);

        if (!data.amount || data.amount === 0) {
          Alert.alert(
            'Procesamiento Manual',
            'No se pudo extraer el monto automáticamente. Por favor ingresa el monto manualmente.\n\nRevisa los logs en Supabase para más detalles.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('Error processing receipt:', error);
      Alert.alert(
        'Error',
        `No se pudo procesar el archivo: ${error.message || 'Error desconocido'}.\n\nRevisa los logs en Supabase Dashboard.`
      );
      setAmount('');
      setDescription('Gasto procesado');
      setShowExpenseForm(true);
    } finally {
      setProcessing(false);
    }
  };

  const matchCardholderToMember = (cardholderName: string, teamMembers: any[]) => {
    const cleanCardholder = cardholderName.toUpperCase().trim();
    const cardholderParts = cleanCardholder.split(/\s+/);

    let bestMatch = null;
    let bestScore = 0;

    for (const member of teamMembers) {
      const displayName = (member.profiles?.display_name || '').toUpperCase().trim();
      const email = (member.profiles?.email || '').toUpperCase().trim();
      const emailName = email.split('@')[0];

      const nameParts = displayName.split(/\s+/);

      let score = 0;

      for (const cardPart of cardholderParts) {
        if (displayName.includes(cardPart)) score += 2;
        if (nameParts.some(np => np === cardPart)) score += 3;
        if (emailName.includes(cardPart.toLowerCase())) score += 1;
      }

      for (const namePart of nameParts) {
        if (cleanCardholder.includes(namePart)) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = member;
      }
    }

    return bestMatch;
  };

  const handleCreateStatementExpenses = async () => {
    if (!selectedTeam || !statementData || selectedTransactions.size === 0 || !user) {
      Alert.alert('Error', 'Por favor selecciona al menos una transacción');
      return;
    }

    try {
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id, profiles(display_name, email)')
        .eq('team_id', selectedTeam);

      if (!teamMembers || teamMembers.length === 0) {
        Alert.alert(
          'Error',
          'Este team no tiene miembros. Por favor agrega los usuarios que aparecen en el estado de cuenta al team antes de procesar.'
        );
        return;
      }

      const expensesToCreate = [];
      const unmatchedCardholders = [];

      for (const txId of selectedTransactions) {
        const [cardIndex, txIndex] = txId.split('-').map(Number);
        const cardholderData = statementData[cardIndex];
        const transaction = cardholderData.transactions[txIndex];

        const cardholderName = cardholderData.cardholder;
        const matchedMember = matchCardholderToMember(cardholderName, teamMembers);

        if (matchedMember) {
          expensesToCreate.push({
            transaction,
            cardholderName,
            paidBy: matchedMember.user_id,
            matchedTo: matchedMember.profiles?.display_name || matchedMember.profiles?.email
          });
        } else {
          if (!unmatchedCardholders.includes(cardholderName)) {
            unmatchedCardholders.push(cardholderName);
          }
          expensesToCreate.push({
            transaction,
            cardholderName,
            paidBy: user.id,
            matchedTo: 'No encontrado - asignado a ti'
          });
        }
      }

      if (unmatchedCardholders.length > 0) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Usuarios No Encontrados',
            `No se encontraron matches para:\n\n${unmatchedCardholders.join('\n')}\n\nEstos gastos se asignarán a ti. Los miembros del team son:\n\n${teamMembers.map(m => `• ${m.profiles?.display_name || m.profiles?.email}`).join('\n')}\n\n¿Continuar?`,
            [
              { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Continuar', onPress: () => resolve(true) }
            ]
          );
        });

        if (!proceed) return;
      }

      for (const { transaction, cardholderName, paidBy } of expensesToCreate) {
        const transactionAmount = parseFloat(transaction.amount);
        const transactionCurrency = transaction.currency || 'USD';

        const { data: expense, error: expenseError } = await supabase
          .from('expenses')
          .insert({
            team_id: selectedTeam,
            description: `${cardholderName} - ${transaction.description}`,
            total_amount: transactionAmount,
            currency: transactionCurrency,
            paid_by: paidBy,
            receipt_image_url: documentFile?.uri || null,
            category: 'general',
            location: null,
            expense_date: transaction.date || expenseDate,
          })
          .select()
          .single();

        if (expenseError) throw expenseError;

        const { error: splitError } = await supabase
          .from('expense_splits')
          .insert({
            expense_id: expense.id,
            user_id: paidBy,
            amount: transactionAmount,
            currency: transactionCurrency,
            is_settled: false,
          });

        if (splitError) throw splitError;
      }

      Alert.alert('Éxito', `${expensesToCreate.length} gastos agregados correctamente`, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear los gastos');
    }
  };

  const handleCreateExpense = async () => {
    if (!selectedTeam || !amount || !description || !user) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      const totalAmount = parseFloat(amount);

      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          team_id: selectedTeam,
          description,
          total_amount: totalAmount,
          currency,
          paid_by: user.id,
          receipt_image_url: capturedImage,
          category,
          location: location || null,
          expense_date: expenseDate,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', selectedTeam);

      if (teamMembers && teamMembers.length > 0) {
        const splitAmount = totalAmount / teamMembers.length;
        const splits = teamMembers.map(member => ({
          expense_id: expense.id,
          user_id: member.user_id,
          amount: splitAmount,
          currency,
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
      {manualEntry && !capturedImage && !processing && !showExpenseForm ? (
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          style={styles.manualEntryContainer}
        >
          <View style={styles.manualHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedTeam(null);
                setTeamSelected(false);
                setManualEntry(false);
              }}
            >
              <X size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.manualTitle}>Crear Gasto</Text>
            <View style={{ width: 28 }} />
          </View>

          {selectedTeamData && (
            <View style={styles.selectedTeamBadgeManual}>
              <Users size={20} color="#10b981" />
              <Text style={styles.selectedTeamTextManual}>{selectedTeamData.name}</Text>
            </View>
          )}

          <Text style={styles.manualSubtitle}>¿Cómo quieres agregar el gasto?</Text>

          <View style={styles.manualOptions}>
            <TouchableOpacity
              style={styles.manualOptionCard}
              onPress={pickDocumentOrImage}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.manualOptionGradient}
              >
                <View style={styles.manualOptionIcon}>
                  <FileText size={48} color="#ffffff" strokeWidth={1.5} />
                </View>
                <Text style={styles.manualOptionTitle}>Cargar Archivo</Text>
                <Text style={styles.manualOptionSubtitle}>
                  Cargar imagen, PDF o documento y procesar con IA
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualOptionCard}
              onPress={takePhotoForManual}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.manualOptionGradient}
              >
                <View style={styles.manualOptionIcon}>
                  <CameraIcon size={48} color="#ffffff" strokeWidth={1.5} />
                </View>
                <Text style={styles.manualOptionTitle}>Tomar Foto</Text>
                <Text style={styles.manualOptionSubtitle}>
                  Fotografiar recibo y procesar con IA
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualOptionCard}
              onPress={() => setShowExpenseForm(true)}
            >
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                style={styles.manualOptionGradient}
              >
                <View style={styles.manualOptionIcon}>
                  <Edit3 size={48} color="#ffffff" strokeWidth={1.5} />
                </View>
                <Text style={styles.manualOptionTitle}>Entrada Manual</Text>
                <Text style={styles.manualOptionSubtitle}>
                  Ingresar datos sin imagen
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      ) : manualEntry && processing ? (
        <View style={styles.processingContainer}>
          <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.processingContent}
          >
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.processingText}>Procesando recibo...</Text>
            <Text style={styles.processingSubtext}>Extrayendo información con IA</Text>
            {capturedImage && (
              <Image
                source={{ uri: capturedImage }}
                style={styles.processingImage}
                resizeMode="contain"
              />
            )}
          </LinearGradient>
        </View>
      ) : !manualEntry && !capturedImage ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setShowCamera(false);
                    setSelectedTeam(null);
                    setTeamSelected(false);
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
              <Text style={styles.modalTitle}>
                {statementData ? 'Estado de Cuenta' : 'Confirmar Gasto'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowExpenseForm(false);
                  setCapturedImage(null);
                  setDocumentFile(null);
                  setStatementData(null);
                  setSelectedTransactions(new Set());
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
              {statementData ? (
                <View>
                  <Text style={styles.statementSubtitle}>
                    Selecciona las transacciones a importar por titular
                  </Text>
                  {statementData.map((cardholderData: any, cardIndex: number) => {
                    const cardholderTxIds = cardholderData.transactions.map((_: any, txIndex: number) => `${cardIndex}-${txIndex}`);
                    const allSelected = cardholderTxIds.every((txId: string) => selectedTransactions.has(txId));
                    const someSelected = cardholderTxIds.some((txId: string) => selectedTransactions.has(txId));

                    const selectedTeamData = teams?.find(t => t.id === selectedTeam);
                    const getMatchPreview = async () => {
                      if (!selectedTeam) return null;
                      const { data: teamMembers } = await supabase
                        .from('team_members')
                        .select('user_id, profiles(display_name, email)')
                        .eq('team_id', selectedTeam);

                      if (!teamMembers) return null;
                      const matched = matchCardholderToMember(cardholderData.cardholder, teamMembers);
                      return matched?.profiles?.display_name || matched?.profiles?.email || null;
                    };

                    return (
                      <View key={cardIndex} style={styles.cardholderSection}>
                        <View style={styles.cardholderHeader}>
                          <Users size={20} color="#3b82f6" />
                          <View style={styles.cardholderInfo}>
                            <Text style={styles.cardholderName}>{cardholderData.cardholder}</Text>
                            {selectedTeam && (
                              <Text style={styles.cardholderMatch}>
                                Team: {selectedTeamData?.name}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.transactionCount}>
                            {cardholderData.transactions.length} tx
                          </Text>
                          <TouchableOpacity
                            style={styles.selectAllButton}
                            onPress={() => {
                              const newSelected = new Set(selectedTransactions);
                              if (allSelected) {
                                cardholderTxIds.forEach((txId: string) => newSelected.delete(txId));
                              } else {
                                cardholderTxIds.forEach((txId: string) => newSelected.add(txId));
                              }
                              setSelectedTransactions(newSelected);
                            }}
                          >
                            <Text style={styles.selectAllText}>
                              {allSelected ? 'Deseleccionar' : someSelected ? 'Seleccionar resto' : 'Seleccionar todas'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      {cardholderData.transactions.map((transaction: any, txIndex: number) => {
                        const txId = `${cardIndex}-${txIndex}`;
                        const isSelected = selectedTransactions.has(txId);
                        return (
                          <TouchableOpacity
                            key={txId}
                            style={[styles.transactionCard, isSelected && styles.transactionCardSelected]}
                            onPress={() => {
                              const newSelected = new Set(selectedTransactions);
                              if (isSelected) {
                                newSelected.delete(txId);
                              } else {
                                newSelected.add(txId);
                              }
                              setSelectedTransactions(newSelected);
                            }}
                          >
                            <View style={[styles.transactionCheckbox, isSelected && styles.transactionCheckboxSelected]}>
                              {isSelected && <Check size={16} color="#ffffff" />}
                            </View>
                            <View style={styles.transactionDetails}>
                              <Text style={styles.transactionDescription}>{transaction.description}</Text>
                              <Text style={styles.transactionDate}>{transaction.date}</Text>
                            </View>
                            <Text style={styles.transactionAmount}>
                              {transaction.currency && transaction.currency !== 'USD'
                                ? `${transaction.currency} ${transaction.amount}`
                                : `$${transaction.amount}`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    );
                  })}

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
                    style={[
                      styles.submitButton,
                      selectedTransactions.size === 0 && styles.submitButtonDisabled
                    ]}
                    onPress={handleCreateStatementExpenses}
                    disabled={selectedTransactions.size === 0}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      style={styles.submitButtonGradient}
                    >
                      <Check size={20} color="#ffffff" />
                      <Text style={styles.submitButtonText}>
                        {selectedTransactions.size === 0
                          ? 'Selecciona transacciones'
                          : `Crear ${selectedTransactions.size} Gasto${selectedTransactions.size !== 1 ? 's' : ''}`}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descripción *</Text>
                <TextInput
                  style={styles.formInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Descripción del gasto"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Monto *</Text>
                <View style={styles.amountInputWrapper}>
                  <Text style={styles.currencySymbol}>
                    {CURRENCIES.find(c => c.value === currency)?.symbol || '$'}
                  </Text>
                  <TextInput
                    style={[styles.formInput, styles.amountInput]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Moneda</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {CURRENCIES.map((curr) => (
                    <TouchableOpacity
                      key={curr.value}
                      style={[
                        styles.categoryChip,
                        currency === curr.value && styles.categoryChipActive
                      ]}
                      onPress={() => setCurrency(curr.value)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        currency === curr.value && styles.categoryChipTextActive
                      ]}>
                        {curr.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryChip,
                        category === cat.value && styles.categoryChipActive
                      ]}
                      onPress={() => setCategory(cat.value)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        category === cat.value && styles.categoryChipTextActive
                      ]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Fecha</Text>
                <View style={styles.inputWithIcon}>
                  <Calendar size={18} color="#94a3b8" />
                  <TextInput
                    style={[styles.formInput, styles.inputWithIconField]}
                    value={expenseDate}
                    onChangeText={setExpenseDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Lugar (opcional)</Text>
                <View style={styles.inputWithIcon}>
                  <MapPin size={18} color="#94a3b8" />
                  <TextInput
                    style={[styles.formInput, styles.inputWithIconField]}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Dónde se realizó el gasto"
                    placeholderTextColor="#64748b"
                  />
                </View>
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

              {capturedImage && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {manualEntry ? 'Recibo cargado' : 'Recibo escaneado'}
                  </Text>
                  <View style={styles.receiptPreviewContainer}>
                    <Image
                      source={{ uri: capturedImage }}
                      style={styles.receiptPreview}
                      resizeMode="cover"
                    />
                    <View style={styles.receiptBadge}>
                      <CameraIcon size={16} color="#10b981" />
                      <Text style={styles.receiptBadgeText}>
                        {manualEntry ? 'Procesado con IA' : 'Imagen guardada'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {documentFile && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Documento cargado</Text>
                  <View style={styles.documentPreviewContainer}>
                    <View style={styles.documentPreview}>
                      <FileText size={48} color="#10b981" />
                      <Text style={styles.documentName} numberOfLines={1}>
                        {documentFile.name}
                      </Text>
                      <Text style={styles.documentType}>
                        {documentFile.mimeType.includes('pdf') ? 'PDF' :
                         documentFile.mimeType.includes('doc') ? 'DOC' :
                         'Documento'}
                      </Text>
                    </View>
                    <View style={styles.receiptBadge}>
                      <FileText size={16} color="#10b981" />
                      <Text style={styles.receiptBadgeText}>Procesado con IA</Text>
                    </View>
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
                </View>
              )}
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
  teamCardWrapper: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
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
  teamCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  teamActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scanButton: {
    backgroundColor: '#10b981',
  },
  manualButton: {
    backgroundColor: '#3b82f6',
  },
  teamActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
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
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingLeft: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputWithIconField: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 12,
  },
  receiptPreviewContainer: {
    gap: 12,
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  receiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  receiptBadgeText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  manualEntryContainer: {
    flex: 1,
    paddingTop: 60,
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  manualTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  manualSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 32,
    marginTop: 16,
  },
  selectedTeamBadgeManual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  selectedTeamTextManual: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  manualOptions: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 16,
  },
  manualOptionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  manualOptionGradient: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  manualOptionIcon: {
    marginBottom: 16,
  },
  manualOptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  manualOptionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
  processingImage: {
    width: 200,
    height: 200,
    marginTop: 24,
    borderRadius: 12,
  },
  documentPreviewContainer: {
    gap: 12,
  },
  documentPreview: {
    width: '100%',
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    maxWidth: '100%',
  },
  documentType: {
    fontSize: 14,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statementSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  cardholderSection: {
    marginBottom: 24,
  },
  cardholderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  cardholderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  cardholderInfo: {
    flex: 1,
    marginLeft: 8,
  },
  cardholderMatch: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  transactionCardSelected: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  transactionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionCheckboxSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  transactionCount: {
    fontSize: 12,
    color: '#64748b',
  },
  selectAllButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 6,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
});
