
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { WorkSchedule, getWorkSchedulesByUserId, createWorkSchedule, updateWorkSchedule, deleteWorkSchedule, getAllUsers, User } from '@/services/db';
import { Clock, Plus, Calendar, Edit, Trash2 } from 'lucide-react';

// Dias da semana 
const weekDays = [
  { label: 'Segunda-feira', value: 1 },
  { label: 'Terça-feira', value: 2 },
  { label: 'Quarta-feira', value: 3 },
  { label: 'Quinta-feira', value: 4 },
  { label: 'Sexta-feira', value: 5 },
  { label: 'Sábado', value: 6 },
  { label: 'Domingo', value: 0 },
];

// Componente para visualizar horários semanais
const WeeklySchedule = ({ 
  schedules,
  onEdit,
  onDelete,
  readOnly = false
}: { 
  schedules: WorkSchedule[],
  onEdit?: (schedule: WorkSchedule) => void,
  onDelete?: (schedule: WorkSchedule) => void,
  readOnly?: boolean
}) => {
  return (
    <div className="space-y-2">
      {weekDays.map(day => {
        const daySchedule = schedules.find(s => s.weekDay === day.value);
        
        return (
          <div 
            key={day.value} 
            className="flex items-center justify-between p-3 border rounded-md"
          >
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-2 h-2 rounded-full mr-3 ${daySchedule ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div>
                <p className="font-medium">{day.label}</p>
                {daySchedule ? (
                  <p className="text-sm text-muted-foreground">
                    {daySchedule.startTime} - {daySchedule.endTime}
                    {daySchedule.breakStart && daySchedule.breakEnd && 
                      ` (Intervalo: ${daySchedule.breakStart} - ${daySchedule.breakEnd})`}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem horário definido</p>
                )}
              </div>
            </div>
            
            {!readOnly && daySchedule && (
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onEdit && onEdit(daySchedule)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onDelete && onDelete(daySchedule)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Escalas = () => {
  const { user, isManager } = useAuth();
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [userSchedules, setUserSchedules] = useState<{ [userId: string]: WorkSchedule[] }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Formulário
  const [weekDay, setWeekDay] = useState<number>(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakStart, setBreakStart] = useState('12:00');
  const [breakEnd, setBreakEnd] = useState('13:00');
  
  // Guias
  const [activeTab, setActiveTab] = useState<string>('mySchedule');
  
  useEffect(() => {
    if (user) {
      loadMySchedules();
      if (isManager) {
        loadUsers();
      }
    }
  }, [user]);
  
  const loadMySchedules = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userSchedules = await getWorkSchedulesByUserId(user.id);
      setSchedules(userSchedules);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar seus horários.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      const filteredUsers = allUsers.filter(u => u.id !== user?.id);
      setUsers(filteredUsers);
      
      if (filteredUsers.length > 0) {
        setSelectedUserId(filteredUsers[0].id);
        await loadUserSchedules(filteredUsers[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar a lista de funcionários.",
      });
    }
  };
  
  const loadUserSchedules = async (userId: string) => {
    setIsLoading(true);
    try {
      const schedules = await getWorkSchedulesByUserId(userId);
      setUserSchedules(prev => ({
        ...prev,
        [userId]: schedules
      }));
    } catch (error) {
      console.error(`Erro ao carregar horários do usuário ${userId}:`, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUserChange = async (userId: string) => {
    setSelectedUserId(userId);
    if (!userSchedules[userId]) {
      await loadUserSchedules(userId);
    }
  };
  
  const openAddDialog = () => {
    setSelectedSchedule(null);
    setWeekDay(1);
    setStartTime('08:00');
    setEndTime('17:00');
    setBreakStart('12:00');
    setBreakEnd('13:00');
    setOpenDialog(true);
  };
  
  const openEditDialog = (schedule: WorkSchedule) => {
    setSelectedSchedule(schedule);
    setWeekDay(schedule.weekDay);
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setBreakStart(schedule.breakStart || '');
    setBreakEnd(schedule.breakEnd || '');
    setOpenDialog(true);
  };
  
  const handleDeleteSchedule = async (schedule: WorkSchedule) => {
    if (!user) return;
    
    try {
      await deleteWorkSchedule(schedule.id);
      toast({
        title: "Horário removido",
        description: `O horário para ${weekDays.find(d => d.value === schedule.weekDay)?.label} foi removido.`,
      });
      
      // Atualizar listas
      if (schedule.userId === user.id) {
        await loadMySchedules();
      } else {
        await loadUserSchedules(schedule.userId);
      }
    } catch (error) {
      console.error('Erro ao excluir horário:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o horário.",
      });
    }
  };
  
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validar horários
    if (startTime >= endTime) {
      toast({
        variant: "destructive",
        title: "Horários inválidos",
        description: "O horário de início deve ser anterior ao horário de término.",
      });
      return;
    }
    
    if (breakStart && breakEnd && (breakStart >= breakEnd || breakStart <= startTime || breakEnd >= endTime)) {
      toast({
        variant: "destructive",
        title: "Horários de intervalo inválidos",
        description: "Verifique se o intervalo está dentro do horário de trabalho.",
      });
      return;
    }
    
    try {
      const targetUserId = activeTab === 'mySchedule' ? user.id : selectedUserId;
      
      // Verificar se já existe um horário para este dia da semana
      const existingSchedule = schedules.find(s => s.weekDay === weekDay && s.userId === targetUserId);
      
      if (existingSchedule && !selectedSchedule) {
        toast({
          variant: "destructive",
          title: "Horário já definido",
          description: `Já existe um horário definido para ${weekDays.find(d => d.value === weekDay)?.label}.`,
        });
        return;
      }
      
      if (selectedSchedule) {
        // Atualizar horário existente
        const updatedSchedule: WorkSchedule = {
          ...selectedSchedule,
          weekDay,
          startTime,
          endTime,
          breakStart: breakStart || undefined,
          breakEnd: breakEnd || undefined
        };
        
        await updateWorkSchedule(updatedSchedule);
        toast({
          title: "Horário atualizado",
          description: `O horário para ${weekDays.find(d => d.value === weekDay)?.label} foi atualizado.`,
        });
      } else {
        // Criar novo horário
        const newSchedule: WorkSchedule = {
          id: `schedule-${Date.now()}`,
          userId: targetUserId,
          weekDay,
          startTime,
          endTime,
          breakStart: breakStart || undefined,
          breakEnd: breakEnd || undefined
        };
        
        await createWorkSchedule(newSchedule);
        toast({
          title: "Horário criado",
          description: `O horário para ${weekDays.find(d => d.value === weekDay)?.label} foi criado.`,
        });
      }
      
      // Atualizar listas
      if (targetUserId === user.id) {
        await loadMySchedules();
      } else {
        await loadUserSchedules(targetUserId);
      }
      
      setOpenDialog(false);
    } catch (error) {
      console.error('Erro ao salvar horário:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar o horário.",
      });
    }
  };
  
  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Escalas & Horários</h1>
        <p className="text-muted-foreground">
          Gerencie horários de trabalho e escalas
        </p>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mySchedule">Meus Horários</TabsTrigger>
          {isManager && <TabsTrigger value="teamSchedule">Horários da Equipe</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="mySchedule">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div>
                <CardTitle>Minha Escala Semanal</CardTitle>
                <CardDescription>
                  Defina seus horários para cada dia da semana
                </CardDescription>
              </div>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Horário
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando horários...
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum horário definido. Clique em "Adicionar Horário" para começar.
                </div>
              ) : (
                <WeeklySchedule
                  schedules={schedules}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteSchedule}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {isManager && (
          <TabsContent value="teamSchedule">
            <Card>
              <CardHeader>
                <CardTitle>Horários da Equipe</CardTitle>
                <CardDescription>
                  Gerencie os horários de trabalho dos funcionários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="select-user">Selecionar Funcionário</Label>
                    <Select
                      value={selectedUserId}
                      onValueChange={handleUserChange}
                    >
                      <SelectTrigger id="select-user">
                        <SelectValue placeholder="Selecione um funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Separator />
                  
                  {selectedUserId ? (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-semibold">
                          Horários de {users.find(u => u.id === selectedUserId)?.name}
                        </h3>
                        <Button variant="outline" onClick={openAddDialog}>
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar Horário
                        </Button>
                      </div>
                      
                      {isLoading ? (
                        <div className="text-center py-4 text-muted-foreground">
                          Carregando horários...
                        </div>
                      ) : !userSchedules[selectedUserId] || userSchedules[selectedUserId].length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          Nenhum horário definido para este funcionário.
                        </div>
                      ) : (
                        <WeeklySchedule
                          schedules={userSchedules[selectedUserId]}
                          onEdit={openEditDialog}
                          onDelete={handleDeleteSchedule}
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Selecione um funcionário para ver os horários.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      {/* Dialog para adicionar/editar horário */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSchedule 
                ? `Editar horário de ${weekDays.find(d => d.value === selectedSchedule.weekDay)?.label}`
                : 'Adicionar Novo Horário'}
            </DialogTitle>
            <DialogDescription>
              Defina os horários de trabalho para este dia.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSaveSchedule}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="weekDay">Dia da Semana</Label>
                <Select
                  value={weekDay.toString()}
                  onValueChange={(value) => setWeekDay(parseInt(value))}
                  disabled={!!selectedSchedule}
                >
                  <SelectTrigger id="weekDay">
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {weekDays.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Hora de Início</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Hora de Término</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Intervalo</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="breakStart">Início</Label>
                    <Input
                      id="breakStart"
                      type="time"
                      value={breakStart}
                      onChange={(e) => setBreakStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breakEnd">Término</Label>
                    <Input
                      id="breakEnd"
                      type="time"
                      value={breakEnd}
                      onChange={(e) => setBreakEnd(e.target.value)}
                    />
                  </div>
                </div>
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
    </div>
  );
};

export default Escalas;
