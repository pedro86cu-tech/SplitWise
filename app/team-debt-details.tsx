import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CheckCircle, Receipt, User, Upload, FileText, Camera, ImageIcon, DollarSign, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTeamDebtDetails } from '@/hooks/useTeamDebtDetails';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export default function TeamDebtDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const teamId = params.teamId as string;
  const teamName = params.teamName as string;

  const { details, loading, refresh, markAsSettled, uploadPaymentProof } = useTeamDebtDetails(teamId);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<{ id: string; amount: number; description: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showViewProofModal, setShowViewProofModal] = useState(false);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [viewingProofSplit, setViewingProofSplit] = useState<{ id: string; amount: number; userName: string } | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedPaymentGroup, setSelectedPaymentGroup] = useState<{ userId: string; userName: string; currency: string; total: number; debts: any[] } | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleMarkAsSettled = (splitId: string, userName: string, amount: number) => {
    Alert.alert(
      'Confirmar pago',
      `¿${userName} te pagó $${amount.toFixed(2)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, pagó',
          onPress: async () => {
            setMarkingPaid(true);
            try {
              const success = await markAsSettled(splitId);
              if (success) {
                Alert.alert('Pago registrado', 'La deuda ha sido marcada como pagada');
              } else {
                Alert.alert('Error', 'No se pudo registrar el pago');
              }
            } finally {
              setMarkingPaid(false);
            }
          },
        },
      ]
    );
  };

  const handleUploadProof = (splitId: string, amount: number, description: string) => {
    setSelectedSplit({ id: splitId, amount, description });
    setShowProofModal(true);
  };

  const handleViewProof = (proofUrl: string, splitId: string, amount: number, userName: string) => {
    setViewingProofUrl(proofUrl);
    setViewingProofSplit({ id: splitId, amount, userName });
    setShowViewProofModal(true);
  };

  const handleConfirmPaymentFromProof = async () => {
    if (!viewingProofSplit) return;

    setConfirmingPayment(true);
    try {
      const success = await markAsSettled(viewingProofSplit.id);
      if (success) {
        Alert.alert('Pago confirmado', 'La deuda ha sido marcada como pagada');
        setShowViewProofModal(false);
        setViewingProofUrl(null);
        setViewingProofSplit(null);
      } else {
        Alert.alert('Error', 'No se pudo confirmar el pago');
      }
    } finally {
      setConfirmingPayment(false);
    }
  };

  const pickImageFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para seleccionar el comprobante');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar la foto');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedImage || !selectedSplit) {
      Alert.alert('Error', 'Por favor selecciona una imagen del comprobante');
      return;
    }

    setUploading(true);

    try {
      const fileName = `payment_proof_${selectedSplit.id}_${Date.now()}.jpg`;

      const response = await fetch(selectedImage);
      const blob = await response.blob();

      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      const success = await uploadPaymentProof(selectedSplit.id, urlData.publicUrl);

      if (success) {
        Alert.alert('¡Pago confirmado!', 'Tu comprobante fue enviado y el pago quedó registrado');
        setShowProofModal(false);
        setSelectedImage(null);
        setSelectedSplit(null);
      } else {
        throw new Error('Failed to update payment proof');
      }
    } catch (error: any) {
      console.error('Error uploading proof:', error);
      Alert.alert('Error', 'No se pudo enviar el comprobante. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const handlePaymentOption = (userId: string, userName: string, currency: string, total: number, debts: any[]) => {
    setSelectedPaymentGroup({ userId, userName, currency, total, debts });
    setPaymentAmount(total.toFixed(2));
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedPaymentGroup || !paymentAmount) {
      Alert.alert('Error', 'Por favor ingresa un monto válido');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0');
      return;
    }

    if (amount > selectedPaymentGroup.total) {
      Alert.alert('Error', `El monto no puede ser mayor al total adeudado (${selectedPaymentGroup.currency} ${selectedPaymentGroup.total.toFixed(2)})`);
      return;
    }

    setProcessingPayment(true);
    try {
      let remainingAmount = amount;
      const debtsToProcess = selectedPaymentGroup.debts
        .filter(d => !d.isSettled)
        .sort((a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime());

      for (const debt of debtsToProcess) {
        if (remainingAmount <= 0) break;

        const amountForThisDebt = Math.min(remainingAmount, debt.amount);

        const { error } = await supabase
          .from('expense_splits')
          .update({
            amount_paid: amountForThisDebt,
            is_settled: amountForThisDebt >= debt.amount,
            settled_at: amountForThisDebt >= debt.amount ? new Date().toISOString() : null,
          })
          .eq('id', debt.splitId);

        if (error) throw error;

        remainingAmount -= amountForThisDebt;
      }

      Alert.alert(
        'Pago registrado',
        `Se registró un pago de ${selectedPaymentGroup.currency} ${amount.toFixed(2)}`,
        [{ text: 'OK', onPress: async () => {
          setShowPaymentModal(false);
          setSelectedPaymentGroup(null);
          setPaymentAmount('');
          await refresh();
        }}]
      );
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo procesar el pago: ' + error.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const groupByUserAndCurrency = (debts: typeof details.owedToMe) => {
    const grouped = new Map<string, {
      userName: string;
      byCurrency: Map<string, {
        currency: string;
        debts: typeof details.owedToMe;
        total: number;
        unpaidTotal: number;
      }>;
    }>();

    debts.forEach((debt) => {
      let userGroup = grouped.get(debt.userId);
      if (!userGroup) {
        userGroup = {
          userName: debt.userName,
          byCurrency: new Map(),
        };
        grouped.set(debt.userId, userGroup);
      }

      let currencyGroup = userGroup.byCurrency.get(debt.currency);
      if (!currencyGroup) {
        currencyGroup = {
          currency: debt.currency,
          debts: [],
          total: 0,
          unpaidTotal: 0,
        };
        userGroup.byCurrency.set(debt.currency, currencyGroup);
      }

      currencyGroup.debts.push(debt);
      currencyGroup.total += debt.amount;
      if (!debt.isSettled) {
        currencyGroup.unpaidTotal += debt.amount;
      }
    });

    return Array.from(grouped.values()).map(user => ({
      userName: user.userName,
      currencies: Array.from(user.byCurrency.values()),
    }));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{teamName}</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Cargando detalles...</Text>
        </View>
      </View>
    );
  }

  const owedToMeGrouped = groupByUserAndCurrency(details.owedToMe);
  const iOweGrouped = groupByUserAndCurrency(details.iOwe);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{teamName}</Text>
        <Text style={styles.subtitle}>Desglose de deudas</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {owedToMeGrouped.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Te deben</Text>
            {owedToMeGrouped.map((group) => (
              <View key={group.userName} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.userIcon}>
                      <User size={20} color="#10b981" />
                    </View>
                    <View>
                      <Text style={styles.userName}>{group.userName}</Text>
                      {group.currencies.map((currencyGroup) => (
                        <View key={currencyGroup.currency}>
                          <Text style={styles.userTotal}>
                            {currencyGroup.currency}: {currencyGroup.unpaidTotal.toFixed(2)} pendiente
                          </Text>
                          {currencyGroup.total !== currencyGroup.unpaidTotal && (
                            <Text style={styles.userTotalPaid}>
                              {currencyGroup.currency}: {(currencyGroup.total - currencyGroup.unpaidTotal).toFixed(2)} pagado
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {group.currencies.map((currencyGroup) => {
                  const groupKey = `${group.userName}-${currencyGroup.currency}`;
                  const isExpanded = expandedGroups.has(groupKey);

                  return (
                  <View key={currencyGroup.currency} style={styles.currencySection}>
                    <View style={styles.currencySectionHeader}>
                      <Text style={styles.currencyLabel}>{currencyGroup.currency}</Text>
                      <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => toggleGroup(groupKey)}
                      >
                        {isExpanded ? (
                          <ChevronUp size={20} color="#64748b" />
                        ) : (
                          <ChevronDown size={20} color="#64748b" />
                        )}
                      </TouchableOpacity>
                    </View>

                    {isExpanded && (
                    <View style={styles.debtsList}>
                      {currencyGroup.debts.map((debt) => (
                    <View key={debt.splitId} style={[styles.debtItem, debt.isSettled && styles.debtItemSettled]}>
                      <View style={styles.debtInfo}>
                        <View style={[styles.receiptIcon, debt.isSettled && styles.receiptIconSettled]}>
                          {debt.isSettled ? (
                            <CheckCircle size={16} color="#10b981" />
                          ) : (
                            <Receipt size={16} color="#94a3b8" />
                          )}
                        </View>
                        <View style={styles.debtDetails}>
                          <View style={styles.debtTitleRow}>
                            <Text style={[styles.debtDescription, debt.isSettled && styles.debtDescriptionSettled]}>
                              {debt.expenseDescription}
                            </Text>
                            {debt.isSettled && (
                              <View style={styles.paidBadge}>
                                <Text style={styles.paidBadgeText}>PAGADO</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.debtDate}>{formatDate(debt.expenseDate)}</Text>
                          {debt.paymentProofUrl && (
                            <TouchableOpacity
                              style={styles.proofBadge}
                              onPress={() => handleViewProof(debt.paymentProofUrl!, debt.splitId, debt.amount, group.userName)}
                            >
                              <FileText size={12} color="#3b82f6" />
                              <Text style={[styles.proofText, { color: '#3b82f6' }]}>
                                Ver comprobante
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <View style={styles.debtActions}>
                        <Text style={[styles.debtAmount, debt.isSettled && styles.debtAmountSettled]}>
                          ${debt.amount.toFixed(2)}
                        </Text>
                        {!debt.isSettled && (
                          <TouchableOpacity
                            style={styles.markButton}
                            onPress={() => handleMarkAsSettled(debt.splitId, group.userName, debt.amount)}
                            disabled={markingPaid}
                          >
                            {markingPaid ? (
                              <ActivityIndicator size="small" color="#10b981" />
                            ) : (
                              <CheckCircle size={20} color="#10b981" />
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                      ))}
                    </View>
                    )}
                  </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {iOweGrouped.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debes</Text>
            {iOweGrouped.map((group) => (
              <View key={group.userName} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userInfo}>
                    <View style={[styles.userIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                      <User size={20} color="#ef4444" />
                    </View>
                    <View>
                      <Text style={styles.userName}>{group.userName}</Text>
                      {group.currencies.map((currencyGroup) => (
                        <View key={currencyGroup.currency}>
                          <Text style={[styles.userTotal, { color: '#ef4444' }]}>
                            {currencyGroup.currency}: {currencyGroup.unpaidTotal.toFixed(2)} pendiente
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {group.currencies.map((currencyGroup) => {
                  const groupKey = `iowe-${group.userName}-${currencyGroup.currency}`;
                  const isExpanded = expandedGroups.has(groupKey);

                  return (
                  <View key={currencyGroup.currency} style={styles.currencySection}>
                    <View style={styles.currencySectionHeader}>
                      <Text style={styles.currencyLabel}>{currencyGroup.currency}</Text>
                      <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => toggleGroup(groupKey)}
                      >
                        {isExpanded ? (
                          <ChevronUp size={20} color="#64748b" />
                        ) : (
                          <ChevronDown size={20} color="#64748b" />
                        )}
                      </TouchableOpacity>
                    </View>

                    <View style={styles.paymentActions}>
                      <TouchableOpacity
                        style={styles.payAllButton}
                        onPress={() => handlePaymentOption('', group.userName, currencyGroup.currency, currencyGroup.unpaidTotal, currencyGroup.debts)}
                      >
                        <LinearGradient
                          colors={['#10b981', '#059669']}
                          style={styles.payAllButtonGradient}
                        >
                          <DollarSign size={18} color="#ffffff" />
                          <Text style={styles.payAllButtonText}>
                            Pagar ${currencyGroup.unpaidTotal.toFixed(2)}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.payPartialButton}
                        onPress={() => handlePaymentOption('', group.userName, currencyGroup.currency, currencyGroup.unpaidTotal, currencyGroup.debts)}
                      >
                        <DollarSign size={18} color="#3b82f6" />
                        <Text style={styles.payPartialButtonText}>Monto</Text>
                      </TouchableOpacity>
                    </View>

                    {isExpanded && (
                    <View style={styles.debtsList}>
                      {currencyGroup.debts.map((debt) => (
                    <View key={debt.splitId} style={[styles.debtItem, debt.isSettled && styles.debtItemSettled]}>
                      <View style={styles.debtInfo}>
                        <View style={[styles.receiptIcon, debt.isSettled && styles.receiptIconSettled]}>
                          {debt.isSettled ? (
                            <CheckCircle size={16} color="#10b981" />
                          ) : (
                            <Receipt size={16} color="#94a3b8" />
                          )}
                        </View>
                        <View style={styles.debtDetails}>
                          <View style={styles.debtTitleRow}>
                            <Text style={[styles.debtDescription, debt.isSettled && styles.debtDescriptionSettled]}>
                              {debt.expenseDescription}
                            </Text>
                            {debt.isSettled && (
                              <View style={styles.paidBadge}>
                                <Text style={styles.paidBadgeText}>PAGADO</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.debtDate}>{formatDate(debt.expenseDate)}</Text>
                          {debt.paymentProofUrl && (
                            <View style={styles.proofBadge}>
                              <FileText size={12} color="#10b981" />
                              <Text style={styles.proofText}>Comprobante enviado</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.debtActions}>
                        <Text style={[styles.debtAmount, styles.negativeAmount, debt.isSettled && styles.debtAmountSettled]}>
                          -${debt.amount.toFixed(2)}
                        </Text>
                        {!debt.isSettled && (
                          <View style={styles.actionButtons}>
                            <TouchableOpacity
                              style={styles.uploadButton}
                              onPress={() => handleUploadProof(debt.splitId, debt.amount, debt.expenseDescription)}
                            >
                              <Upload size={20} color="#3b82f6" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.payButton}
                              onPress={() => {
                                Alert.alert(
                                  'Confirmar pago',
                                  `¿Ya pagaste $${debt.amount.toFixed(2)}?`,
                                  [
                                    { text: 'Cancelar', style: 'cancel' },
                                    {
                                      text: 'Sí, pagué',
                                      onPress: async () => {
                                        const success = await markAsSettled(debt.splitId);
                                        if (success) {
                                          Alert.alert('Confirmado', 'El pago ha sido marcado como realizado');
                                        } else {
                                          Alert.alert('Error', 'No se pudo confirmar el pago');
                                        }
                                      },
                                    },
                                  ]
                                );
                              }}
                            >
                              <CheckCircle size={20} color="#10b981" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                      ))}
                    </View>
                    )}
                  </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {owedToMeGrouped.length === 0 && iOweGrouped.length === 0 && (
          <View style={styles.emptyState}>
            <Receipt size={48} color="#64748b" />
            <Text style={styles.emptyText}>No hay deudas pendientes</Text>
            <Text style={styles.emptySubtext}>Todos los gastos están saldados</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showProofModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowProofModal(false);
          setSelectedImage(null);
          setSelectedSplit(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowProofModal(false);
            setSelectedImage(null);
            setSelectedSplit(null);
          }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Subir comprobante de pago</Text>
            <Text style={styles.modalSubtitle}>
              {selectedSplit?.description} - ${selectedSplit?.amount.toFixed(2)}
            </Text>
            <Text style={styles.modalDescription}>
              Selecciona o toma una foto de tu comprobante de transferencia o pago
            </Text>

            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.removeImageText}>Cambiar imagen</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePickers}>
                <TouchableOpacity style={styles.imagePickerButton} onPress={takePhoto}>
                  <View style={styles.imagePickerIcon}>
                    <Camera size={32} color="#10b981" />
                  </View>
                  <Text style={styles.imagePickerText}>Tomar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImageFromGallery}>
                  <View style={styles.imagePickerIcon}>
                    <ImageIcon size={32} color="#3b82f6" />
                  </View>
                  <Text style={styles.imagePickerText}>Galería</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowProofModal(false);
                  setSelectedImage(null);
                  setSelectedSplit(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitProof}
                disabled={uploading || !selectedImage}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.submitButtonGradient}
                >
                  {uploading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Enviar</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showViewProofModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowViewProofModal(false);
          setViewingProofUrl(null);
          setViewingProofSplit(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowViewProofModal(false);
            setViewingProofUrl(null);
            setViewingProofSplit(null);
          }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Comprobante de pago</Text>
            <Text style={styles.modalSubtitle}>
              {viewingProofSplit?.userName} - ${viewingProofSplit?.amount.toFixed(2)}
            </Text>
            <Text style={styles.modalDescription}>
              Revisa el comprobante y confirma si recibiste el pago
            </Text>

            {viewingProofUrl && (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: viewingProofUrl }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowViewProofModal(false);
                  setViewingProofUrl(null);
                  setViewingProofSplit(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleConfirmPaymentFromProof}
                disabled={confirmingPayment}
              >
                <LinearGradient colors={['#10b981', '#059669']} style={styles.submitButtonGradient}>
                  {confirmingPayment ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <CheckCircle size={20} color="#ffffff" strokeWidth={2.5} />
                      <Text style={styles.confirmButtonText}>Confirmar pago</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPaymentModal(false);
          setSelectedPaymentGroup(null);
          setPaymentAmount('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowPaymentModal(false);
            setSelectedPaymentGroup(null);
            setPaymentAmount('');
          }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Registrar Pago</Text>
            {selectedPaymentGroup && (
              <>
                <Text style={styles.modalSubtitle}>
                  Para: {selectedPaymentGroup.userName}
                </Text>
                <View style={styles.paymentSummary}>
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>Total adeudado:</Text>
                    <Text style={styles.paymentSummaryAmount}>
                      {selectedPaymentGroup.currency} ${selectedPaymentGroup.total.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalDescription}>
                  Ingresa el monto que pagaste. Si es menor al total, se distribuirá entre las deudas más antiguas primero.
                </Text>

                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>{selectedPaymentGroup.currency}</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    selectTextOnFocus
                  />
                </View>

                <View style={styles.quickAmounts}>
                  <TouchableOpacity
                    style={styles.quickAmountButton}
                    onPress={() => setPaymentAmount((selectedPaymentGroup.total * 0.5).toFixed(2))}
                  >
                    <Text style={styles.quickAmountText}>50%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickAmountButton}
                    onPress={() => setPaymentAmount((selectedPaymentGroup.total * 0.75).toFixed(2))}
                  >
                    <Text style={styles.quickAmountText}>75%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickAmountButton}
                    onPress={() => setPaymentAmount(selectedPaymentGroup.total.toFixed(2))}
                  >
                    <Text style={styles.quickAmountText}>100%</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedPaymentGroup(null);
                  setPaymentAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleProcessPayment}
                disabled={processingPayment}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.submitButtonGradient}
                >
                  {processingPayment ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <DollarSign size={20} color="#ffffff" />
                      <Text style={styles.submitButtonText}>Registrar Pago</Text>
                    </>
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
  },
  backButton: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  userTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 2,
  },
  userTotalPaid: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
  },
  currencySection: {
    marginTop: 16,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  debtsList: {
    gap: 12,
  },
  debtItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
  },
  debtItemSettled: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  debtInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  receiptIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptIconSettled: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  debtDetails: {
    flex: 1,
    gap: 4,
  },
  debtTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  debtDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  debtDescriptionSettled: {
    color: '#94a3b8',
  },
  debtDate: {
    fontSize: 12,
    color: '#64748b',
  },
  debtActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  debtAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  debtAmountSettled: {
    color: '#64748b',
  },
  negativeAmount: {
    color: '#ef4444',
  },
  paidBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  markButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proofBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  proofText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  totalLabelPaid: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#475569',
    marginTop: 8,
    textAlign: 'center',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
    lineHeight: 20,
  },
  imagePickers: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  imagePickerButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  imagePickerIcon: {
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  imagePreviewContainer: {
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  removeImageButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
  },
  removeImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
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
  submitButton: {
    flex: 1,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
  },
  currencySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandButton: {
    padding: 8,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  payAllButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  payAllButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  payAllButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  payPartialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  payPartialButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3b82f6',
  },
  paymentSummary: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentSummaryLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  paymentSummaryAmount: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '700',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#10b981',
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
    marginRight: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
