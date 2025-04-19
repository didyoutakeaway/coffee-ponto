
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, getUserByEmail } from '../services/db';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se o usuário está logado (sessionStorage)
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Erro ao recuperar usuário da sessão:', error);
        sessionStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const foundUser = await getUserByEmail(email);
      
      if (foundUser && foundUser.password === password) {
        // Em produção, usar um método seguro de comparação de senhas
        setUser(foundUser);
        // Armazenar na sessão
        sessionStorage.setItem('currentUser', JSON.stringify(foundUser));
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

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('currentUser');
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
