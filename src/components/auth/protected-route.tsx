
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children,
  adminOnly = false
}) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  // Se ainda estiver carregando, mostrar um estado de carregamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-[300px] space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[250px]" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, redirecionar para o login
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Se a rota for apenas para admin e o usuário não for admin
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  // Se tudo estiver ok, mostrar a rota protegida
  return <>{children}</>;
};
