
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { User, getAllUsers, createUser, updateUser, deleteUser, getUserById } from '@/services/db';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlusCircle, Pencil, Trash2, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Usuarios = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'employee'>('employee');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers.sort((a, b) => {
        if (a.role === 'admin') return -1;
        if (b.role === 'admin') return 1;
        if (a.role === 'manager') return -1;
        if (b.role === 'manager') return 1;
        return a.name.localeCompare(b.name);
      }));
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar a lista de usuários.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('employee');
    setOpenDialog(true);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // Não mostrar senha existente
    setRole(user.role);
    setOpenDialog(true);
  };

  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setOpenDeleteDialog(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser(userToDelete.id);
      toast({
        title: "Usuário excluído",
        description: `${userToDelete.name} foi removido com sucesso.`,
      });
      loadUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o usuário.",
      });
    } finally {
      setOpenDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || (!selectedUser && !password.trim())) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    try {
      if (selectedUser) {
        // Atualizar usuário existente
        const updatedUser: User = {
          ...selectedUser,
          name,
          email,
          role,
          // Atualizar senha apenas se uma nova foi fornecida
          ...(password ? { password } : {})
        };
        
        await updateUser(updatedUser);
        toast({
          title: "Usuário atualizado",
          description: `${name} foi atualizado com sucesso.`,
        });
      } else {
        // Criar novo usuário
        const newUser: User = {
          id: 'user-' + Date.now().toString(),
          name,
          email,
          password,
          role,
          createdAt: new Date()
        };
        
        await createUser(newUser);
        toast({
          title: "Usuário criado",
          description: `${name} foi criado com sucesso.`,
        });
      }
      
      setOpenDialog(false);
      loadUsers();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar o usuário.",
      });
    }
  };

  // Função para obter as iniciais do nome do usuário
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Função para obter a cor de fundo baseada na função
  const getRoleBgColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-700';
    }
  };

  // Função para obter o rótulo da função
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      default: return 'Funcionário';
    }
  };

  if (!isAdmin) {
    return (
      <div className="container py-6">
        <Alert className="mb-6">
          <AlertDescription>
            Você não tem permissão para acessar esta página. Esta seção é restrita a administradores.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários do sistema e suas permissões
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>
            Lista completa de usuários cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando usuários...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <div 
                  key={user.id} 
                  className="border rounded-lg p-4 flex flex-col"
                >
                  <div className="flex items-center mb-4">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBgColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Criado em {format(new Date(user.createdAt), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  
                  <div className="mt-auto pt-3 flex justify-end space-x-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => confirmDelete(user)}
                      // Desabilitar exclusão do usuário atual
                      disabled={user.id === currentUser?.id}
                      className="text-destructive border-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar/editar usuário */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser ? `Editar ${selectedUser.name}` : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {selectedUser 
                ? 'Edite os detalhes do usuário existente.' 
                : 'Preencha os campos para criar um novo usuário.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUser}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Senha {selectedUser && <span className="text-xs text-muted-foreground">(deixe em branco para manter)</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={selectedUser ? '••••••••' : 'Senha'}
                  required={!selectedUser}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <Select value={role} onValueChange={(value) => setRole(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Funcionário</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar exclusão */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário {userToDelete?.name}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
