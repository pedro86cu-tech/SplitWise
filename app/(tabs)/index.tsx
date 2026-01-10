import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, TrendingUp, TrendingDown, DollarSign, Users, Camera } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useDebts } from '@/hooks/useDebts';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { debts, loading, refresh } = useDebts();
  const [refreshing, setRefreshing] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const totalBalance = debts.reduce((sum, debt) => sum + debt.netBalance, 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hola, {profile?.full_name || 'Usuario'}</Text>
            <Text style={styles.subtitle}>Tus deudas activas</Text>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Balance total</Text>
            <Text style={[
              styles.balanceAmount,
              totalBalance > 0 ? styles.positive : totalBalance < 0 ? styles.negative : styles.neutral
            ]}>
              ${Math.abs(totalBalance).toFixed(2)}
            </Text>
            {totalBalance !== 0 && (
              <Text style={styles.balanceType}>
                {totalBalance > 0 ? 'Te deben' : 'Debes'}
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen por equipo</Text>

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Cargando...</Text>
            </View>
          ) : debts.length === 0 ? (
            <View style={styles.emptyState}>
              <DollarSign size={48} color="#64748b" />
              <Text style={styles.emptyText}>No tienes deudas activas</Text>
              <Text style={styles.emptySubtext}>Crea un equipo y agrega gastos para empezar</Text>
            </View>
          ) : (
            debts.map((debt) => (
              <View key={debt.teamId} style={styles.debtCard}>
                <View style={styles.debtHeader}>
                  <Text style={styles.teamName}>{debt.teamName}</Text>
                  {debt.netBalance > 0 ? (
                    <TrendingUp size={20} color="#10b981" />
                  ) : (
                    <TrendingDown size={20} color="#ef4444" />
                  )}
                </View>

                <View style={styles.debtDetails}>
                  {debt.totalOwedToMe > 0 && (
                    <View style={styles.debtRow}>
                      <Text style={styles.debtLabel}>Te deben:</Text>
                      <Text style={styles.debtPositive}>+${debt.totalOwedToMe.toFixed(2)}</Text>
                    </View>
                  )}
                  {debt.totalOwed > 0 && (
                    <View style={styles.debtRow}>
                      <Text style={styles.debtLabel}>Debes:</Text>
                      <Text style={styles.debtNegative}>-${debt.totalOwed.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={[styles.debtRow, styles.netRow]}>
                    <Text style={styles.netLabel}>Balance neto:</Text>
                    <Text style={[
                      styles.netAmount,
                      debt.netBalance > 0 ? styles.positive : styles.negative
                    ]}>
                      {debt.netBalance > 0 ? '+' : '-'}${Math.abs(debt.netBalance).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowActionMenu(true)}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.fabGradient}
        >
          <Plus size={28} color="#ffffff" strokeWidth={2.5} />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={styles.actionMenu}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setShowActionMenu(false);
                router.push('/create-team');
              }}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.actionButtonGradient}
              >
                <Users size={24} color="#ffffff" strokeWidth={2} />
                <Text style={styles.actionButtonText}>Crear Equipo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setShowActionMenu(false);
                router.push('/scan-receipt');
              }}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.actionButtonGradient}
              >
                <Camera size={24} color="#ffffff" strokeWidth={2} />
                <Text style={styles.actionButtonText}>Escanear Recibo</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  headerContent: {
    gap: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  balanceContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
  },
  balanceType: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
  neutral: {
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  debtCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  debtDetails: {
    gap: 12,
  },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  debtPositive: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  debtNegative: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  netRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  netLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  netAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    gap: 16,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 320,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
});
