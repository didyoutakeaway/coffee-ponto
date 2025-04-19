
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, User } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function MainLayout() {
  const { user, logout } = useAuth();
  
  // Função para obter as iniciais do nome do usuário
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">Ponto Local</span>
              </div>
              <SidebarTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SidebarTrigger>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3 py-2">
            <SidebarNav />

            <div className="absolute bottom-0 left-0 right-0 p-4">
              <Separator className="my-4" />
              {user && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-sidebar-foreground/70">{user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Gerente' : 'Funcionário'}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <User className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer" onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 max-h-screen overflow-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}

// Função para o ícone de relógio, já que não podemos importar de lucide-react
function Clock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
