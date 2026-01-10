import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CheckCircle, Receipt, User } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTeamDebtDetails } from '@/hooks/useTeamDebtDetails';

export default function TeamDebtDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const teamId = params.teamId as string;
  const teamName = params.teamName as string;

  const { details, loading, markAsSettled } = useTeamDebtDetails(teamId);

  const handleMarkAsSettled = (splitId: string, userName: string, amount: number) => {
    Alert.alert(
      'Confirmar pago',
      `¿${userName} te pagó $${amount.toFixed(2)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, pagó',
          onPress: async () => {
            const success = await markAsSettled(splitId);
            if (success) {
              Alert.alert('Pago registrado', 'La deuda ha sido marcada como pagada');
            } else {
              Alert.alert('Error', 'No se pudo registrar el pago');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  const groupByUser = (debts: typeof details.owedToMe) => {
    const grouped = new Map<string, { userName: string; debts: typeof details.owedToMe; total: number }>();

    debts.forEach((debt) => {
      const existing = grouped.get(debt.userId);
      if (existing) {
        existing.debts.push(debt);
        existing.total += debt.amount;
      } else {
        grouped.set(debt.userId, {
          userName: debt.userName,
          debts: [debt],
          total: debt.amount,
        });
      }
    });

    return Array.from(grouped.values());
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

  const owedToMeGrouped = groupByUser(details.owedToMe);
  const iOweGrouped = groupByUser(details.iOwe);

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
                      <Text style={styles.userTotal}>Total: ${group.total.toFixed(2)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.debtsList}>
                  {group.debts.map((debt) => (
                    <View key={debt.splitId} style={styles.debtItem}>
                      <View style={styles.debtInfo}>
                        <View style={styles.receiptIcon}>
                          <Receipt size={16} color="#94a3b8" />
                        </View>
                        <View style={styles.debtDetails}>
                          <Text style={styles.debtDescription}>{debt.expenseDescription}</Text>
                          <Text style={styles.debtDate}>{formatDate(debt.expenseDate)}</Text>
                        </View>
                      </View>
                      <View style={styles.debtActions}>
                        <Text style={styles.debtAmount}>${debt.amount.toFixed(2)}</Text>
                        <TouchableOpacity
                          style={styles.markButton}
                          onPress={() => handleMarkAsSettled(debt.splitId, group.userName, debt.amount)}
                        >
                          <CheckCircle size={20} color="#10b981" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {iOweGrouped.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debes</Text>
            {iOweGrouped.map((group) => (
              <View key={group.debts[0]?.expenseId} style={styles.userCard}>
                <View style={styles.debtsList}>
                  {group.debts.map((debt) => (
                    <View key={debt.splitId} style={styles.debtItem}>
                      <View style={styles.debtInfo}>
                        <View style={styles.receiptIcon}>
                          <Receipt size={16} color="#94a3b8" />
                        </View>
                        <View style={styles.debtDetails}>
                          <Text style={styles.debtDescription}>{debt.expenseDescription}</Text>
                          <Text style={styles.debtDate}>{formatDate(debt.expenseDate)}</Text>
                        </View>
                      </View>
                      <Text style={[styles.debtAmount, styles.negativeAmount]}>
                        -${debt.amount.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total que debes:</Text>
                    <Text style={[styles.totalAmount, styles.negativeAmount]}>
                      ${group.total.toFixed(2)}
                    </Text>
                  </View>
                </View>
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
  debtDetails: {
    flex: 1,
    gap: 4,
  },
  debtDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
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
  debtAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  negativeAmount: {
    color: '#ef4444',
  },
  markButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
});
