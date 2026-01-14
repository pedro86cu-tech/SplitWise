import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Receipt, Clock, ChevronRight, Filter } from 'lucide-react-native';
import { useExpenses } from '@/hooks/useExpenses';
import { useTeams } from '@/hooks/useTeams';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function HistoryScreen() {
  const router = useRouter();
  const { expenses, loading, refresh } = useExpenses();
  const { teams } = useTeams();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filteredExpenses = selectedTeam
    ? expenses.filter(exp => {
        const teamName = exp.team.name.toLowerCase();
        const selectedTeamName = teams?.find(t => t.id === selectedTeam)?.name.toLowerCase();
        return teamName === selectedTeamName;
      })
    : expenses;

  const groupedExpenses = filteredExpenses.reduce((groups: { [key: string]: typeof expenses }, expense) => {
    const teamName = expense.team.name;
    if (!groups[teamName]) {
      groups[teamName] = [];
    }
    groups[teamName].push(expense);
    return groups;
  }, {});

  const handleExpensePress = (expenseId: string) => {
    router.push({
      pathname: '/expense-details',
      params: { expenseId },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Hoy';
    if (diffInDays === 1) return 'Ayer';
    if (diffInDays < 7) return `Hace ${diffInDays} días`;

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Historial</Text>
          <Text style={styles.subtitle}>
            {selectedTeam
              ? teams?.find(t => t.id === selectedTeam)?.name
              : 'Todas tus transacciones'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedTeam && styles.filterChipActive]}
            onPress={() => setSelectedTeam(null)}
          >
            <Text style={[styles.filterChipText, !selectedTeam && styles.filterChipTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          {teams?.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[styles.filterChip, selectedTeam === team.id && styles.filterChipActive]}
              onPress={() => setSelectedTeam(team.id)}
            >
              <Text style={[styles.filterChipText, selectedTeam === team.id && styles.filterChipTextActive]}>
                {team.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
        ) : filteredExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={48} color="#64748b" />
            <Text style={styles.emptyText}>No hay transacciones</Text>
            <Text style={styles.emptySubtext}>Los gastos que agregues aparecerán aquí</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {Object.entries(groupedExpenses).map(([teamName, teamExpenses]) => (
              <View key={teamName} style={styles.teamSection}>
                {!selectedTeam && (
                  <View style={styles.teamHeader}>
                    <Text style={styles.teamName}>{teamName}</Text>
                    <Text style={styles.teamCount}>{teamExpenses.length} gastos</Text>
                  </View>
                )}
                {teamExpenses.map((expense) => (
              <TouchableOpacity
                key={expense.id}
                style={styles.expenseCard}
                onPress={() => handleExpensePress(expense.id)}
                activeOpacity={0.7}
              >
                <View style={styles.expenseIcon}>
                  <Receipt size={20} color="#10b981" />
                </View>

                <View style={styles.expenseDetails}>
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                  <Text style={styles.expenseTeam}>{expense.team.name}</Text>
                  <View style={styles.expenseMeta}>
                    <Text style={styles.expenseMetaText}>
                      {expense.is_paid_by_me ? 'Pagaste' : `Pagó ${expense.paid_by_profile.full_name}`}
                    </Text>
                    <Text style={styles.expenseDot}>•</Text>
                    <Text style={styles.expenseMetaText}>{formatDate(expense.created_at)}</Text>
                  </View>
                </View>

                <View style={styles.expenseAmounts}>
                  <Text style={styles.expenseTotal}>
                    ${expense.total_amount.toFixed(2)}
                  </Text>
                  {expense.my_split && (
                    <View style={styles.splitBadge}>
                      <Text style={[
                        styles.splitAmount,
                        expense.my_split.is_settled && styles.splitSettled
                      ]}>
                        Tu parte: ${expense.my_split.amount.toFixed(2)}
                      </Text>
                      {expense.my_split.is_settled ? (
                        <Text style={styles.settledText}>Pagado</Text>
                      ) : (
                        <Text style={styles.pendingText}>Pendiente</Text>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.chevronIcon}>
                  <ChevronRight size={20} color="#64748b" />
                </View>
              </TouchableOpacity>
                ))}
              </View>
            ))}
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
  headerContent: {
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  content: {
    flex: 1,
  },
  filterSection: {
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#334155',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#10b981',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  teamSection: {
    marginBottom: 24,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  teamCount: {
    fontSize: 14,
    color: '#64748b',
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
  list: {
    padding: 20,
    gap: 12,
  },
  expenseCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseDetails: {
    flex: 1,
    gap: 4,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  expenseTeam: {
    fontSize: 14,
    color: '#94a3b8',
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expenseMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  expenseDot: {
    fontSize: 12,
    color: '#64748b',
  },
  expenseAmounts: {
    alignItems: 'flex-end',
    gap: 4,
  },
  expenseTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  splitBadge: {
    alignItems: 'flex-end',
  },
  splitAmount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  splitSettled: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  settledText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
  },
  pendingText: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
    marginTop: 2,
  },
  chevronIcon: {
    marginLeft: 8,
  },
});
