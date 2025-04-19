
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { getTimeRecordsByDate, TimeRecord, getAllUsers, User } from '@/services/db';
import { useAuth } from '@/contexts/auth-context';
import { 
  startOfMonth, endOfMonth, format, 
  differenceInMinutes, differenceInDays,
  addDays, eachDayOfInterval, isSameDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileText, Clock, Download, ChevronDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DateRange } from 'react-day-picker';

// Função para agrupar registros por dia
const groupRecordsByDay = (records: TimeRecord[]) => {
  const grouped: { [key: string]: TimeRecord[] } = {};
  
  records.forEach(record => {
    const day = format(new Date(record.timestamp), 'yyyy-MM-dd');
    if (!grouped[day]) {
      grouped[day] = [];
    }
    grouped[day].push(record);
  });
  
  return grouped;
};

// Função para calcular horas trabalhadas em um dia
const calculateDayHours = (records: TimeRecord[]) => {
  if (!records.length) return 0;
  
  records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  let totalMinutes = 0;
  let checkInTime: Date | null = null;
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const recordTime = new Date(record.timestamp);
    
    if (record.type === 'check-in') {
      checkInTime = recordTime;
    } else if (record.type === 'check-out' && checkInTime) {
      const diffMinutes = differenceInMinutes(recordTime, checkInTime);
      totalMinutes += diffMinutes;
      checkInTime = null;
    } else if (record.type === 'break-start' && checkInTime) {
      const diffMinutes = differenceInMinutes(recordTime, checkInTime);
      totalMinutes += diffMinutes;
      checkInTime = null;
    } else if (record.type === 'break-end') {
      checkInTime = recordTime;
    }
  }
  
  // Se ainda tiver um check-in aberto e for hoje
  if (checkInTime && isSameDay(checkInTime, new Date())) {
    const diffMinutes = differenceInMinutes(new Date(), checkInTime);
    totalMinutes += diffMinutes;
  }
  
  return totalMinutes / 60;
};

const Relatorios = () => {
  const { user, isManager } = useAuth();
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [reportType, setReportType] = useState<'monthly' | 'range'>('monthly');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  
  useEffect(() => {
    if (user) {
      setSelectedUserId(user.id);
      if (isManager) {
        loadUsers();
      }
      loadReportData();
    }
  }, [user, date, reportType, dateRange, selectedUserId]);
  
  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };
  
  const loadReportData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      let startDate: Date;
      let endDate: Date;
      
      if (reportType === 'monthly') {
        startDate = startOfMonth(date);
        endDate = endOfMonth(date);
      } else {
        startDate = dateRange.from!;
        endDate = dateRange.to || dateRange.from!;
      }
      
      // Se for gerente e tiver selecionado um usuário específico
      const userId = isManager && selectedUserId ? selectedUserId : user.id;
      
      const fetchedRecords = await getTimeRecordsByDate(userId, startDate, endDate);
      setRecords(fetchedRecords.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }));
    } catch (error) {
      console.error('Erro ao carregar dados para relatório:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados para o relatório.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportToPDF = async () => {
    const element = document.getElementById('report-to-export');
    if (!element) return;
    
    try {
      toast({
        title: "Gerando PDF",
        description: "Aguarde enquanto o relatório é gerado...",
      });
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Adicionar mais páginas se necessário
      let heightLeft = imgHeight;
      let position = 0;
      
      while (heightLeft > pageHeight) {
        position = heightLeft - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Definir o nome do arquivo
      const reportPeriod = reportType === 'monthly'
        ? format(date, 'MMMM yyyy', { locale: ptBR })
        : `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to || dateRange.from, 'dd/MM/yyyy')}`;
        
      const selectedUser = users.find(u => u.id === selectedUserId);
      const userName = selectedUser ? selectedUser.name : user?.name;
      
      const fileName = `Relatório_${userName}_${reportPeriod}.pdf`;
      
      pdf.save(fileName);
      
      toast({
        title: "PDF gerado com sucesso",
        description: `O relatório foi gerado e está sendo baixado.`,
      });
    } catch (error) {
      console.error('Erro ao exportar para PDF:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
      });
    }
  };
  
  // Agrupar registros por dia
  const recordsByDay = groupRecordsByDay(records);
  
  // Calcular o total de horas no período
  const totalHours = Object.values(recordsByDay)
    .map(dayRecords => calculateDayHours(dayRecords))
    .reduce((sum, hours) => sum + hours, 0);
  
  // Calcular a média de horas por dia
  const workingDays = Object.keys(recordsByDay).length;
  const averageHours = workingDays > 0 ? totalHours / workingDays : 0;
  
  // Calcular dias úteis no período (excluindo finais de semana)
  const calcWorkDays = () => {
    if (reportType === 'monthly') {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const days = eachDayOfInterval({ start, end });
      return days.filter(day => ![0, 6].includes(day.getDay())).length;
    } else {
      const start = dateRange.from;
      const end = dateRange.to || dateRange.from;
      const days = eachDayOfInterval({ start, end });
      return days.filter(day => ![0, 6].includes(day.getDay())).length;
    }
  };
  
  const workDays = calcWorkDays();
  const expectedHours = workDays * 8; // 8 horas por dia útil
  const hourBalance = totalHours - expectedHours; // Saldo de horas (positivo = extra, negativo = déficit)
  
  // Função para formatação de horas
  const formatHours = (hours: number, showSign = false) => {
    const sign = hours >= 0 ? (showSign ? '+' : '') : '-';
    const absHours = Math.abs(hours);
    const wholeHours = Math.floor(absHours);
    const minutes = Math.round((absHours - wholeHours) * 60);
    return `${sign}${wholeHours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
  };
  
  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Visualize e exporte relatórios de ponto
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={exportToPDF}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Configurações do Relatório</CardTitle>
          <CardDescription>
            Defina o período e outras opções para o relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Relatório</label>
              <Select
                value={reportType}
                onValueChange={(value) => setReportType(value as 'monthly' | 'range')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de relatório" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="range">Período Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {reportType === 'monthly' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Mês e Ano</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, 'MMMM yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => newDate && setDate(newDate)}
                      initialFocus
                      month={date}
                      onMonthChange={setDate}
                      captionLayout="dropdown-buttons"
                      fromYear={2020}
                      toYear={2030}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'dd/MM/yyyy')} -{' '}
                            {format(dateRange.to, 'dd/MM/yyyy')}
                          </>
                        ) : (
                          format(dateRange.from, 'dd/MM/yyyy')
                        )
                      ) : (
                        <span>Selecione um período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            
            {isManager && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Funcionário</label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={user?.id || ''}>
                      Meu relatório
                    </SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div id="report-to-export" className="space-y-6 pb-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Relatório de Registros de Ponto</CardTitle>
                <CardDescription>
                  {reportType === 'monthly'
                    ? `Mês de ${format(date, 'MMMM yyyy', { locale: ptBR })}`
                    : `Período: ${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to || dateRange.from, 'dd/MM/yyyy')}`}
                </CardDescription>
              </div>
              
              <div className="mt-2 sm:mt-0 text-sm text-muted-foreground">
                <p className="font-medium">
                  {isManager && selectedUserId && selectedUserId !== user?.id
                    ? users.find(u => u.id === selectedUserId)?.name || 'Funcionário'
                    : user?.name || 'Funcionário'}
                </p>
                <p>Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">{formatHours(totalHours)}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Média por Dia</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">{formatHours(averageHours)}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Saldo de Horas</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-primary mr-2" />
                    <span className={`text-2xl font-bold ${hourBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatHours(hourBalance, true)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Dias Trabalhados</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">{workingDays}</span>
                    <span className="text-sm text-muted-foreground ml-2">/ {workDays}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Separator className="my-6" />
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Detalhamento Diário</h3>
              
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando dados do relatório...
                </div>
              ) : Object.keys(recordsByDay).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado para o período selecionado.
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(recordsByDay)
                    .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
                    .map(([day, dayRecords]) => {
                      const dayDate = new Date(day);
                      const dayHours = calculateDayHours(dayRecords);
                      
                      return (
                        <div key={day} className="border rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                            <div>
                              <h4 className="font-semibold">
                                {format(dayDate, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {dayRecords.length} registros
                              </p>
                            </div>
                            <div className="mt-2 sm:mt-0 text-right">
                              <p className="text-lg font-semibold">
                                Total: {formatHours(dayHours)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {dayHours > 8 
                                  ? `+${formatHours(dayHours - 8)} extras` 
                                  : dayHours < 8 
                                    ? `${formatHours(dayHours - 8)} de déficit`
                                    : 'Jornada completa'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="relative">
                            <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-muted" />
                            <div className="space-y-4 relative ml-6">
                              {dayRecords.map((record) => (
                                <div key={record.id} className="relative pl-6">
                                  <div className="absolute -left-6 mt-1.5 w-3 h-3 rounded-full border-2 border-primary bg-background" />
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="font-medium">
                                        {record.type === 'check-in' && 'Entrada'}
                                        {record.type === 'check-out' && 'Saída'}
                                        {record.type === 'break-start' && 'Início de Intervalo'}
                                        {record.type === 'break-end' && 'Fim de Intervalo'}
                                      </p>
                                    </div>
                                    <p className="text-muted-foreground">
                                      {format(new Date(record.timestamp), 'HH:mm:ss')}
                                    </p>
                                  </div>
                                  {record.location && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Localização: {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Relatorios;
