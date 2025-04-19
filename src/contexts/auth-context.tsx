
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserSession, getUserByEmail, createSession, deleteSession, updateSessionActivity } from '../services/db';
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

  useEffect(() => {
    // Recuperar sessão do sessionStorage
    const storedSession = sessionStorage.getItem('currentSession');
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        setSession(parsedSession);
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          // Atualizar atividade da sessão
          updateSessionActivity(parsedSession.id).catch(console.error);
        }
      } catch (error) {
        console.error('Erro ao recuperar sessão:', error);
        sessionStorage.removeItem('currentSession');
        sessionStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
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
        // Criar nova sessão
        const newSession = await createSession(foundUser.id);
        setUser(foundUser);
        setSession(newSession);
        
        // Armazenar na sessão
        sessionStorage.setItem('currentUser', JSON.stringify(foundUser));
        sessionStorage.setItem('currentSession', JSON.stringify(newSession));
        
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
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentSession');
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
