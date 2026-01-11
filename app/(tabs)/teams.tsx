import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Plus, Crown } from 'lucide-react-native';
import { useTeams } from '@/hooks/useTeams';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function TeamsScreen() {
  const { teams, loading, refresh } = useTeams();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Mis Equipos</Text>
          <Text style={styles.subtitle}>Gestiona tus grupos de gastos</Text>
        </View>
      </LinearGradient>

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
        ) : teams.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color="#64748b" />
            <Text style={styles.emptyText}>No tienes equipos todavía</Text>
            <Text style={styles.emptySubtext}>Crea un equipo para empezar a compartir gastos</Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => router.push('/create-team')}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.createFirstButtonGradient}
              >
                <Plus size={24} color="#ffffff" />
                <Text style={styles.createFirstButtonText}>Crear mi primer equipo</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.teamsList}>
            {teams.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={styles.teamCard}
                onPress={() => router.push({
                  pathname: '/team-details',
                  params: { teamId: team.id },
                })}
              >
                <View style={styles.teamIcon}>
                  <Users size={24} color="#10b981" />
                </View>
                <View style={styles.teamInfo}>
                  <View style={styles.teamHeader}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    {team.is_creator && (
                      <View style={styles.creatorBadge}>
                        <Crown size={14} color="#f59e0b" />
                      </View>
                    )}
                  </View>
                  {team.description && (
                    <Text style={styles.teamDescription}>{team.description}</Text>
                  )}
                  <View style={styles.teamMeta}>
                    <Text style={styles.teamMetaText}>
                      {team.member_count} {team.member_count === 1 ? 'miembro' : 'miembros'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-team')}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.fabGradient}
        >
          <Plus size={28} color="#ffffff" strokeWidth={2.5} />
        </LinearGradient>
      </TouchableOpacity>
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
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
  createFirstButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  createFirstButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  createFirstButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  teamsList: {
    padding: 20,
    gap: 12,
  },
  teamCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  teamIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInfo: {
    flex: 1,
    gap: 6,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  creatorBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  teamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamMetaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
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
});
