import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, RefreshControl, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Filter, X, Calendar, MapPin, Tag, Receipt, User, FileImage } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTeamExpenses } from '@/hooks/useTeamExpenses';
import { useState } from 'react';

const CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'general', label: 'General' },
  { value: 'food', label: 'Comida' },
  { value: 'transport', label: 'Transporte' },
  { value: 'entertainment', label: 'Entretenimiento' },
  { value: 'shopping', label: 'Compras' },
  { value: 'utilities', label: 'Servicios' },
  { value: 'health', label: 'Salud' },
  { value: 'other', label: 'Otro' },
];

export default function TeamHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const teamId = params.teamId as string;
  const teamName = params.teamName as string;

  const { expenses, loading, filters, updateFilters, clearFilters, refresh, hasActiveFilters } = useTeamExpenses(teamId);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(cat => cat.value === value)?.label || value;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      food: '#f59e0b',
      transport: '#3b82f6',
      entertainment: '#ec4899',
      shopping: '#8b5cf6',
      utilities: '#06b6d4',
      health: '#ef4444',
      general: '#10b981',
      other: '#6b7280',
    };
    return colors[category] || colors.general;
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{teamName}</Text>
          <Text style={styles.headerSubtitle}>Historial de gastos</Text>
          <View style={styles.headerStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{expenses.length}</Text>
              <Text style={styles.statLabel}>Gastos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>${totalExpenses.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Filter size={20} color={hasActiveFilters ? '#10b981' : '#94a3b8'} />
          <Text style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}>
            Filtros
          </Text>
          {hasActiveFilters && <View style={styles.filterBadge} />}
        </TouchableOpacity>
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <X size={16} color="#ef4444" />
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Cargando...</Text>
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Receipt size={48} color="#64748b" />
            <Text style={styles.emptyText}>
              {hasActiveFilters ? 'No se encontraron gastos con estos filtros' : 'No hay gastos registrados'}
            </Text>
            <Text style={styles.emptySubtext}>
              {hasActiveFilters ? 'Intenta ajustar los filtros' : 'Agrega un gasto para comenzar'}
            </Text>
          </View>
        ) : (
          <View style={styles.expensesList}>
            {expenses.map((expense) => (
              <View key={expense.id} style={styles.expenseCard}>
                <View style={styles.expenseHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(expense.category)}20` }]}>
                    <Tag size={14} color={getCategoryColor(expense.category)} />
                    <Text style={[styles.categoryText, { color: getCategoryColor(expense.category) }]}>
                      {getCategoryLabel(expense.category)}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>${expense.totalAmount.toFixed(2)}</Text>
                </View>

                <Text style={styles.expenseDescription}>{expense.description}</Text>

                <View style={styles.expenseMeta}>
                  <View style={styles.metaItem}>
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.metaText}>{formatDate(expense.expenseDate)}</Text>
                  </View>
                  {expense.location && (
                    <View style={styles.metaItem}>
                      <MapPin size={14} color="#64748b" />
                      <Text style={styles.metaText}>{expense.location}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.expenseFooter}>
                  <View style={styles.paidBy}>
                    <User size={14} color="#94a3b8" />
                    <Text style={styles.paidByText}>
                      Pagado por {expense.isUserPayer ? 'ti' : expense.paidByName}
                    </Text>
                  </View>
                  {expense.receiptImageUrl && (
                    <TouchableOpacity
                      style={styles.receiptButton}
                      onPress={() => setSelectedReceipt(expense.receiptImageUrl)}
                    >
                      <FileImage size={16} color="#10b981" />
                      <Text style={styles.receiptButtonText}>Ver recibo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryChip,
                        filters.category === cat.value && styles.categoryChipActive
                      ]}
                      onPress={() => updateFilters({ category: cat.value })}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        filters.category === cat.value && styles.categoryChipTextActive
                      ]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Fecha desde</Text>
                <TextInput
                  style={styles.filterInput}
                  value={filters.dateFrom}
                  onChangeText={(text) => updateFilters({ dateFrom: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Fecha hasta</Text>
                <TextInput
                  style={styles.filterInput}
                  value={filters.dateTo}
                  onChangeText={(text) => updateFilters({ dateTo: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Lugar</Text>
                <TextInput
                  style={styles.filterInput}
                  value={filters.location}
                  onChangeText={(text) => updateFilters({ location: text })}
                  placeholder="Buscar por lugar"
                  placeholderTextColor="#64748b"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.applyButtonGradient}
              >
                <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedReceipt}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReceipt(null)}
      >
        <TouchableOpacity
          style={styles.receiptModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedReceipt(null)}
        >
          <View style={styles.receiptModalContent}>
            <TouchableOpacity
              style={styles.closeReceiptButton}
              onPress={() => setSelectedReceipt(null)}
            >
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
            {selectedReceipt && (
              <Image
                source={{ uri: selectedReceipt }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            )}
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
  headerContent: {
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#334155',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterButtonActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterButtonTextActive: {
    color: '#10b981',
  },
  filterBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
  expensesList: {
    padding: 20,
    gap: 12,
  },
  expenseCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  expenseMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  paidBy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paidByText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  receiptButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
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
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  filterInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
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
  applyButton: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  receiptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeReceiptButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  receiptImage: {
    width: '90%',
    height: '80%',
  },
});
