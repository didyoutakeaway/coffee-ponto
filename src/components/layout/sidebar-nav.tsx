
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Calendar, Clock, FileText, Home, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  requiredRole?: 'employee' | 'manager' | 'admin';
}

export function SidebarNav() {
  const location = useLocation();
  const { isAdmin, isManager } = useAuth();

  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="w-5 h-5" />,
    },
    {
      title: 'Registro de Ponto',
      href: '/registro-ponto',
      icon: <Clock className="w-5 h-5" />,
    },
    {
      title: 'Meus Relatórios',
      href: '/relatorios',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      title: 'Escalas & Horários',
      href: '/escalas',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      title: 'Usuários',
      href: '/usuarios',
      icon: <Users className="w-5 h-5" />,
      requiredRole: 'admin',
    }
  ];

  // Filtrar itens de navegação com base na função do usuário
  const filteredNavItems = navItems.filter(item => {
    if (item.requiredRole === 'admin') return isAdmin;
    if (item.requiredRole === 'manager') return isManager;
    return true;
  });

  return (
    <nav className="space-y-1">
      {filteredNavItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            'flex items-center px-3 py-2 text-sm font-medium rounded-md',
            location.pathname === item.href
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          {item.icon}
          <span className="ml-3">{item.title}</span>
        </Link>
      ))}
    </nav>
  );
}
