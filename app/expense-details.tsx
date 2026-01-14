import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Image, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Receipt, User, CircleCheck as CheckCircle, Circle as XCircle, FileText, Calendar, DollarSign, Tag, X, Download, Trash2 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useExpensePaymentDetails } from '@/hooks/useExpensePaymentDetails';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ExpenseDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const expenseId = params.expenseId as string;

  const { details, loading } = useExpensePaymentDetails(expenseId);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handleViewProof = (proofUrl: string) => {
    setViewingProofUrl(proofUrl);
    setShowProofModal(true);
  };

  const handleViewReceipt = (receiptUrl: string) => {
    setViewingReceiptUrl(receiptUrl);
    setShowReceiptModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  const isImageUrl = (url: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext));
  };

  const handleOpenDocument = (url: string) => {
    Linking.openURL(url);
  };

  const handleDeleteExpense = () => {
    Alert.alert(
      'Eliminar gasto',
      '¿Estás seguro que quieres eliminar este gasto? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenseId);

              if (error) throw error;

              Alert.alert('Gasto eliminado', 'El gasto ha sido eliminado correctamente', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo eliminar el gasto: ' + error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles del Gasto</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Cargando detalles...</Text>
        </View>
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles del Gasto</Text>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se encontró el gasto</Text>
        </View>
      </View>
    );
  }

  const totalPaid = details.payments.filter(p => p.isSettled).reduce((sum, p) => sum + p.amount, 0);
  const totalPending = details.payments.filter(p => !p.isSettled).reduce((sum, p) => sum + p.amount, 0);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del Gasto</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteExpense}>
          <Trash2 size={22} color="#ef4444" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.expenseInfoCard}>
          <View style={styles.expenseHeader}>
            <View style={styles.receiptIconLarge}>
              <Receipt size={24} color="#10b981" />
            </View>
            <View style={styles.expenseHeaderInfo}>
              <Text style={styles.expenseDescription}>{details.description}</Text>
              <View style={styles.categoryBadge}>
                <Tag size={14} color="#64748b" />
                <Text style={styles.categoryText}>{details.category}</Text>
              </View>
            </View>
          </View>

          <View style={styles.expenseMetadata}>
            <View style={styles.metadataRow}>
              <Calendar size={16} color="#64748b" />
              <Text style={styles.metadataText}>{formatDate(details.createdAt)}</Text>
            </View>
            <View style={styles.metadataRow}>
              <User size={16} color="#64748b" />
              <Text style={styles.metadataText}>Pagado por {details.paidByName}</Text>
            </View>
            <View style={styles.metadataRow}>
              <DollarSign size={16} color="#10b981" />
              <Text style={styles.metadataTextAmount}>${details.totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {details.receiptUrl && (
            <TouchableOpacity
              style={styles.receiptButton}
              onPress={() => handleViewReceipt(details.receiptUrl!)}
            >
              <Receipt size={16} color="#3b82f6" />
              <Text style={styles.receiptButtonText}>Ver recibo original</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen de Pagos</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Pagado:</Text>
            <Text style={[styles.summaryAmount, styles.paidAmount]}>${totalPaid.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Pendiente:</Text>
            <Text style={[styles.summaryAmount, styles.pendingAmount]}>${totalPending.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.paymentsSection}>
          <Text style={styles.sectionTitle}>Transacciones ({details.payments.length})</Text>

          {details.payments.map((payment) => (
            <View key={payment.splitId} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <User size={20} color="#64748b" />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{payment.userName}</Text>
                    <Text style={styles.userEmail}>{payment.userEmail}</Text>
                  </View>
                </View>
                <View style={styles.paymentAmount}>
                  <Text style={styles.amountText}>${payment.amount.toFixed(2)}</Text>
                  {payment.isSettled ? (
                    <View style={styles.statusBadgePaid}>
                      <CheckCircle size={16} color="#10b981" />
                      <Text style={styles.statusTextPaid}>Pagado</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadgePending}>
                      <XCircle size={16} color="#ef4444" />
                      <Text style={styles.statusTextPending}>Pendiente</Text>
                    </View>
                  )}
                </View>
              </View>

              {payment.isSettled && (
                <View style={styles.paymentFooter}>
                  {payment.settledAt && (
                    <Text style={styles.settledDate}>
                      Pagado el {formatShortDate(payment.settledAt)}
                    </Text>
                  )}
                  {payment.paymentProofUrl && (
                    <TouchableOpacity
                      style={styles.viewProofButton}
                      onPress={() => handleViewProof(payment.paymentProofUrl!)}
                    >
                      <FileText size={16} color="#3b82f6" />
                      <Text style={styles.viewProofText}>Ver comprobante</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={showProofModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProofModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comprobante de Pago</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowProofModal(false);
                  setViewingProofUrl(null);
                }}
              >
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {viewingProofUrl && (
              isImageUrl(viewingProofUrl) ? (
                <Image
                  source={{ uri: viewingProofUrl }}
                  style={styles.proofImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.documentPreviewModal}>
                  <FileText size={64} color="#10b981" />
                  <Text style={styles.documentModalText}>Documento adjunto</Text>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleOpenDocument(viewingProofUrl)}
                  >
                    <Download size={20} color="#ffffff" />
                    <Text style={styles.downloadButtonText}>Abrir documento</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReceiptModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recibo Original</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowReceiptModal(false);
                  setViewingReceiptUrl(null);
                }}
              >
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {viewingReceiptUrl && (
              isImageUrl(viewingReceiptUrl) ? (
                <Image
                  source={{ uri: viewingReceiptUrl }}
                  style={styles.proofImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.documentPreviewModal}>
                  <FileText size={64} color="#10b981" />
                  <Text style={styles.documentModalText}>Documento adjunto</Text>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleOpenDocument(viewingReceiptUrl)}
                  >
                    <Download size={20} color="#ffffff" />
                    <Text style={styles.downloadButtonText}>Abrir documento</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </View>
        </View>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  expenseInfoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  receiptIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseHeaderInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  expenseMetadata: {
    gap: 12,
    marginBottom: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  metadataTextAmount: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '700',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  receiptButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  paidAmount: {
    color: '#10b981',
  },
  pendingAmount: {
    color: '#ef4444',
  },
  paymentsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  paymentCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#64748b',
  },
  paymentAmount: {
    alignItems: 'flex-end',
    gap: 8,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusBadgePaid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextPaid: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextPending: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  paymentFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settledDate: {
    fontSize: 12,
    color: '#64748b',
  },
  viewProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewProofText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proofImage: {
    width: '100%',
    height: 400,
  },
  documentPreviewModal: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  documentModalText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
  },
  downloadButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});
