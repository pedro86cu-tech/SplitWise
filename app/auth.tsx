import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Fingerprint, Check } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const CREDENTIALS_KEY = 'saved_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    checkBiometricAvailability();
    loadSavedCredentials();
  }, []);

  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setIsBiometricAvailable(compatible && enrolled);

    if (compatible && enrolled) {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(enabled === 'true');
    }
  };

  const loadSavedCredentials = async () => {
    try {
      const saved = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      if (saved) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
        setEmail(savedEmail);
        setPassword(savedPassword);
        setSaveCredentials(true);

        const biometricEnabledValue = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        if (biometricEnabledValue === 'true') {
          attemptBiometricAuth(savedEmail, savedPassword);
        }
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const attemptBiometricAuth = async (savedEmail: string, savedPassword: string) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticarse con biometría',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar contraseña',
      });

      if (result.success) {
        setLoading(true);
        try {
          await signIn(savedEmail, savedPassword);
          router.replace('/(tabs)');
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Error al iniciar sesión');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    }
  };

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !fullName)) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);

        if (saveCredentials) {
          await SecureStore.setItemAsync(
            CREDENTIALS_KEY,
            JSON.stringify({ email, password })
          );
          await SecureStore.setItemAsync(
            BIOMETRIC_ENABLED_KEY,
            biometricEnabled.toString()
          );
        } else {
          await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
          await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
        }
      } else {
        await signUp(email, password, fullName);
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Ocurrio un error');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Debes tener credenciales guardadas para usar la autenticación biométrica');
      return;
    }

    await attemptBiometricAuth(email, password);
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.formContainer}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Juan Pérez"
                  placeholderTextColor="#94a3b8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {isLogin && (
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setSaveCredentials(!saveCredentials)}
                >
                  <View style={[styles.checkbox, saveCredentials && styles.checkboxChecked]}>
                    {saveCredentials && <Check size={16} color="#ffffff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Guardar credenciales</Text>
                </TouchableOpacity>

                {isBiometricAvailable && saveCredentials && (
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setBiometricEnabled(!biometricEnabled)}
                  >
                    <View style={[styles.checkbox, biometricEnabled && styles.checkboxChecked]}>
                      {biometricEnabled && <Check size={16} color="#ffffff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Habilitar Face ID/Touch ID</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {isLogin && isBiometricAvailable && saveCredentials && email && password && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                <Fingerprint size={24} color="#10b981" />
                <Text style={styles.biometricButtonText}>Usar Face ID/Touch ID</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchText}>
                {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <Text style={styles.switchTextBold}>
                  {isLogin ? 'Regístrate' : 'Inicia Sesión'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoImage: {
    width: '100%',
    maxWidth: 320,
    height: 120,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  switchText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  switchTextBold: {
    color: '#10b981',
    fontWeight: '700',
  },
  optionsContainer: {
    gap: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#e2e8f0',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  biometricButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
});
