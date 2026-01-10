import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Users, Plus, Trash2, Calendar, Tag, Search, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';

const CATEGORIES = [
  { id: 'restaurantes', label: 'Restaurantes', emoji: '🍽️' },
  { id: 'viajes', label: 'Viajes', emoji: '✈️' },
  { id: 'casa', label: 'Casa', emoji: '🏠' },
  { id: 'entretenimiento', label: 'Entretenimiento', emoji: '🎬' },
  { id: 'compras', label: 'Compras', emoji: '🛍️' },
  { id: 'transporte', label: 'Transporte', emoji: '🚗' },
  { id: 'otros', label: 'Otros', emoji: '📋' },
];

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CreateTeamScreen() {
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('otros');
  const [eventDate, setEventDate] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .or(`full_name.ilike.%${searchQuery}%`)
      .limit(10);

    if (data) {
      const filtered = data.filter(
        profile => !selectedMembers.find(m => m.id === profile.id)
      );
      setSearchResults(filtered);
    }
  };

  const addMember = (profile: Profile) => {
    setSelectedMembers([...selectedMembers, profile]);
    setSearchQuery('');
    setShowUserSearch(false);
  };

  const removeMember = (profileId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== profileId));
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el equipo');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          description: description || null,
          category: category,
          event_date: eventDate || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      const memberIds = [user.id, ...selectedMembers.map(m => m.id)];
      const members = memberIds.map(id => ({
        team_id: team.id,
        user_id: id,
      }));

      await supabase.from('team_members').insert(members);

      Alert.alert('Éxito', 'Equipo creado correctamente', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear el equipo');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (day: number, month: number, year: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return { year, month: month - 1, day };
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
    const days = [];
    const selectedDate = parseDate(eventDate);

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate?.year === calendarYear &&
                        selectedDate?.month === calendarMonth &&
                        selectedDate?.day === day;

      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
          onPress={() => {
            const dateStr = formatDate(day, calendarMonth, calendarYear);
            setEventDate(dateStr);
            setShowDatePicker(false);
          }}
        >
          <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const changeMonth = (delta: number) => {
    let newMonth = calendarMonth + delta;
    let newYear = calendarYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  };

  const selectedCategory = CATEGORIES.find(c => c.id === category);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.iconWrapper}>
            <Users size={32} color="#10b981" strokeWidth={2} />
          </View>
          <Text style={styles.title}>Crear Equipo</Text>
          <Text style={styles.subtitle}>Agrega amigos para dividir gastos</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Nombre del equipo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Viaje a la playa"
              placeholderTextColor="#64748b"
              value={teamName}
              onChangeText={setTeamName}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Categoría</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Tag size={20} color="#10b981" />
              <Text style={styles.selectorText}>
                {selectedCategory?.emoji} {selectedCategory?.label}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Fecha del evento (opcional)</Text>
            <View style={styles.dateInputContainer}>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={20} color="#10b981" />
                <Text style={styles.dateSelectorText}>
                  {eventDate || 'Seleccionar fecha'}
                </Text>
              </TouchableOpacity>
              {eventDate && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => setEventDate('')}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="O escribe: AAAA-MM-DD"
              placeholderTextColor="#64748b"
              value={eventDate}
              onChangeText={setEventDate}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Agrega una descripción..."
              placeholderTextColor="#64748b"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Miembros del equipo</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowUserSearch(true)}
              >
                <Plus size={16} color="#10b981" />
                <Text style={styles.addButtonText}>Buscar</Text>
              </TouchableOpacity>
            </View>

            {selectedMembers.length === 0 ? (
              <Text style={styles.helperText}>
                Busca y agrega usuarios registrados en la aplicación
              </Text>
            ) : (
              selectedMembers.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>
                      {member.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.memberName}>{member.full_name}</Text>
                  <TouchableOpacity
                    style={styles.removeMemberButton}
                    onPress={() => removeMember(member.id)}
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createButton, loading && styles.buttonDisabled]}
            onPress={handleCreateTeam}
            disabled={loading}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Creando...' : 'Crear Equipo'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showCategoryPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Categoría</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.categoryList}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    category === cat.id && styles.categoryOptionSelected
                  ]}
                  onPress={() => {
                    setCategory(cat.id);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  {category === cat.id && (
                    <Check size={20} color="#10b981" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showDatePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calendarArrow}>
                  <ChevronLeft size={24} color="#10b981" />
                </TouchableOpacity>
                <Text style={styles.calendarHeaderText}>
                  {MONTHS[calendarMonth]} {calendarYear}
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calendarArrow}>
                  <ChevronRight size={24} color="#10b981" />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarDaysHeader}>
                {DAYS.map(day => (
                  <Text key={day} style={styles.calendarDayHeaderText}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {renderCalendar()}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showUserSearch} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() => {
              setShowUserSearch(false);
              setSearchQuery('');
            }}
          />
          <View style={styles.searchModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buscar Usuarios</Text>
              <TouchableOpacity onPress={() => {
                setShowUserSearch(false);
                setSearchQuery('');
              }}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={20} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            <ScrollView style={styles.userList} keyboardShouldPersistTaps="handled">
              {searchResults.length === 0 && searchQuery.trim().length > 0 && (
                <Text style={styles.noResultsText}>No se encontraron usuarios</Text>
              )}
              {searchResults.map((profile) => (
                <TouchableOpacity
                  key={profile.id}
                  style={styles.userOption}
                  onPress={() => addMember(profile)}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userInitial}>
                      {profile.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.userName}>{profile.full_name}</Text>
                  <Plus size={20} color="#10b981" />
                </TouchableOpacity>
              ))}
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
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selector: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  dateInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateSelector: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  clearDateButton: {
    width: 56,
    height: 56,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  memberCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  memberName: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  removeMemberButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
  searchModalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 20,
    maxHeight: '70%',
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
  categoryList: {
    paddingHorizontal: 24,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryOptionSelected: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  calendarContainer: {
    paddingHorizontal: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarArrow: {
    padding: 8,
  },
  calendarHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  calendarDayHeaderText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  calendarDaySelected: {
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#ffffff',
  },
  calendarDayTextSelected: {
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  userList: {
    paddingHorizontal: 24,
    maxHeight: 300,
  },
  noResultsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
});
