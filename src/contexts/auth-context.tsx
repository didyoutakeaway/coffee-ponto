
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserSession, getUserByEmail, createSession, deleteSession, updateSessionActivity, getAllSessions, removeInactiveSessions } from '../services/db';
import { toast } from '@/components/ui/use-toast';

interface AuthContextProps {
  user: User | null;
  isAdmin: boolean;
  isManager: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Gerar um ID exclusivo para o dispositivo atual
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  // Limpar sessões inativas periodicamente
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      removeInactiveSessions(24).catch(console.error); // Remove sessões inativas há mais de 24 horas
    }, 60 * 60 * 1000); // A cada hora
    
    return () => clearInterval(cleanupInterval);
  }, []);

  useEffect(() => {
    // Recuperar sessão do localStorage (não sessionStorage para persistir entre abas)
    const storedSessionId = localStorage.getItem('currentSessionId');
    if (storedSessionId) {
      try {
        // Carregar a sessão e usuário do IndexedDB em vez do localStorage
        const deviceId = getDeviceId();
        
        getAllSessions()
          .then(sessions => {
            const currentSession = sessions.find(s => 
              s.id === storedSessionId && s.deviceId === deviceId
            );
            
            if (currentSession) {
              setSession(currentSession);
              // Atualizar atividade da sessão
              updateSessionActivity(currentSession.id).catch(console.error);
              
              // Buscar usuário associado à sessão
              getUserByEmail(currentSession.userEmail)
                .then(foundUser => {
                  if (foundUser) {
                    setUser(foundUser);
                  } else {
                    // Se o usuário não for encontrado, limpar sessão
                    localStorage.removeItem('currentSessionId');
                    setSession(null);
                  }
                  setIsLoading(false);
                })
                .catch(err => {
                  console.error('Erro ao buscar usuário:', err);
                  setIsLoading(false);
                });
            } else {
              // Sessão não encontrada ou inválida
              localStorage.removeItem('currentSessionId');
              setIsLoading(false);
            }
          })
          .catch(err => {
            console.error('Erro ao buscar sessões:', err);
            setIsLoading(false);
          });
      } catch (error) {
        console.error('Erro ao recuperar sessão:', error);
        localStorage.removeItem('currentSessionId');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // Atualizar atividade da sessão periodicamente
  useEffect(() => {
    if (session) {
      const interval = setInterval(() => {
        updateSessionActivity(session.id).catch(console.error);
      }, 5 * 60 * 1000); // A cada 5 minutos
      return () => clearInterval(interval);
    }
  }, [session]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const foundUser = await getUserByEmail(email);
      
      if (foundUser && foundUser.password === password) {
        // Criar nova sessão com o deviceId atual
        const deviceId = getDeviceId();
        const newSession = await createSession({
          id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: foundUser.id,
          userEmail: foundUser.email, // Adicionando email para facilitar recuperação
          deviceId: deviceId,
          lastActive: new Date(),
          createdAt: new Date()
        });
        
        setUser(foundUser);
        setSession(newSession);
        
        // Armazenar apenas o ID da sessão no localStorage
        localStorage.setItem('currentSessionId', newSession.id);
        
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo(a), ${foundUser.name}!`,
        });
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Erro de autenticação",
          description: "Email ou senha incorretos.",
        });
        return false;
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      toast({
        variant: "destructive",
        title: "Erro de login",
        description: "Ocorreu um erro ao tentar fazer login.",
      });
      return false;
    }
  };

  const logout = async () => {
    if (session) {
      try {
        await deleteSession(session.id);
      } catch (error) {
        console.error('Erro ao encerrar sessão:', error);
      }
    }
    setUser(null);
    setSession(null);
    localStorage.removeItem('currentSessionId');
    toast({
      title: "Logout realizado",
      description: "Você saiu do sistema com sucesso.",
    });
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        isAdmin: user?.role === 'admin',
        isManager: user?.role === 'manager' || user?.role === 'admin',
        isLoading,
        login, 
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
