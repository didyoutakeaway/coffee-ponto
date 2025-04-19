
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Redirecionar para o dashboard se estiver autenticado
    // Ou para a página de login se não estiver
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Esta página é apenas para redirecionamento, não vai ser exibida
  return null;
};

export default Index;
