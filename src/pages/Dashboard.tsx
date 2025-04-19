
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTimeRecordsByDate, TimeRecord } from '@/services/db';
import { useAuth } from '@/contexts/auth-context';
import { format, differenceInHours, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, Calendar, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [todayRecords, setTodayRecords] = useState<TimeRecord[]>([]);
  const [weekRecords, setWeekRecords] = useState<TimeRecord[]>([]);
  const [totalHoursToday, setTotalHoursToday] = useState<number>(0);
  const [totalHoursWeek, setTotalHoursWeek] = useState<number>(0);
  const [dailyHours, setDailyHours] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadTodayRecords();
      loadWeekRecords();
    }
  }, [user]);

  const loadTodayRecords = async () => {
    if (!user) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    try {
      const records = await getTimeRecordsByDate(user.id, startOfDay, endOfDay);
      setTodayRecords(records.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }));
      
      // Calcular horas trabalhadas hoje
      calculateHoursWorked(records);
    } catch (error) {
      console.error('Erro ao carregar registros do dia:', error);
    }
  };

  const loadWeekRecords = async () => {
    if (!user) return;

    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    try {
      const records = await getTimeRecordsByDate(user.id, start, end);
      setWeekRecords(records);
      
      // Calcular horas trabalhadas na semana
      calculateWeeklyHours(records);
    } catch (error) {
      console.error('Erro ao carregar registros da semana:', error);
    }
  };

  const calculateHoursWorked = (records: TimeRecord[]) => {
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

    // Se o último registro foi um check-in, calcular até agora
    if (checkInTime) {
      const diffMinutes = differenceInMinutes(new Date(), checkInTime);
      totalMinutes += diffMinutes;
    }

    setTotalHoursToday(totalMinutes / 60);
  };

  const calculateWeeklyHours = (records: TimeRecord[]) => {
    let totalMinutes = 0;
    const dailyMinutes: Record<string, number> = {};
    
    // Inicializar dias da semana
    const daysOfWeek = eachDayOfInterval({
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: endOfWeek(new Date(), { weekStartsOn: 1 })
    });
    
    daysOfWeek.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      dailyMinutes[dayStr] = 0;
    });

    // Agrupar registros por dia
    const recordsByDay: Record<string, TimeRecord[]> = {};
    records.forEach(record => {
      const day = format(new Date(record.timestamp), 'yyyy-MM-dd');
      if (!recordsByDay[day]) {
        recordsByDay[day] = [];
      }
      recordsByDay[day].push(record);
    });

    // Calcular minutos por dia
    Object.entries(recordsByDay).forEach(([day, dayRecords]) => {
      dayRecords.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      let checkInTime: Date | null = null;
      dayRecords.forEach(record => {
        const recordTime = new Date(record.timestamp);

        if (record.type === 'check-in') {
          checkInTime = recordTime;
        } else if (record.type === 'check-out' && checkInTime) {
          const diffMinutes = differenceInMinutes(recordTime, checkInTime);
          dailyMinutes[day] += diffMinutes;
          totalMinutes += diffMinutes;
          checkInTime = null;
        } else if (record.type === 'break-start' && checkInTime) {
          const diffMinutes = differenceInMinutes(recordTime, checkInTime);
          dailyMinutes[day] += diffMinutes;
          totalMinutes += diffMinutes;
          checkInTime = null;
        } else if (record.type === 'break-end') {
          checkInTime = recordTime;
        }
      });

      // Se o dia for hoje e o último registro foi um check-in, calcular até agora
      if (day === format(new Date(), 'yyyy-MM-dd') && checkInTime) {
        const diffMinutes = differenceInMinutes(new Date(), checkInTime);
        dailyMinutes[day] += diffMinutes;
        totalMinutes += diffMinutes;
      }
    });

    setTotalHoursWeek(totalMinutes / 60);

    // Formatar dados para o gráfico
    const chartData = Object.entries(dailyMinutes).map(([day, minutes]) => ({
      day: format(new Date(day), 'dd/MM'),
      hours: +(minutes / 60).toFixed(1),
      dayName: format(new Date(day), 'EEE', { locale: ptBR })
    }));

    setDailyHours(chartData);
  };

  // Dados para o gráfico de pizza
  const pieData = [
    { name: 'Trabalhadas', value: totalHoursToday },
    { name: 'Restantes', value: Math.max(0, 8 - totalHoursToday) }
  ];

  const COLORS = ['#2563eb', '#e5e7eb'];

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
  };

  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {user?.name}. Aqui está um resumo da sua jornada de trabalho.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Horas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-primary mr-2" />
              <span className="text-2xl font-bold">{formatHours(totalHoursToday)}</span>
              <span className="text-muted-foreground text-sm ml-2">/ 8h</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Horas na Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-primary mr-2" />
              <span className="text-2xl font-bold">{formatHours(totalHoursWeek)}</span>
              <span className="text-muted-foreground text-sm ml-2">/ 40h</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Próximo Ponto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ArrowRight className="h-5 w-5 text-primary mr-2" />
              <span className="text-2xl font-bold">
                {todayRecords.length === 0 && 'Entrada'}
                {todayRecords.length > 0 && todayRecords[todayRecords.length - 1].type === 'check-in' && 'Saída'}
                {todayRecords.length > 0 && todayRecords[todayRecords.length - 1].type === 'check-out' && 'Entrada'}
                {todayRecords.length > 0 && todayRecords[todayRecords.length - 1].type === 'break-start' && 'Fim de Intervalo'}
                {todayRecords.length > 0 && todayRecords[todayRecords.length - 1].type === 'break-end' && 'Saída'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Jornada de Hoje</CardTitle>
            <CardDescription>
              Progresso do seu dia de trabalho
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ value }) => `${value.toFixed(1)}h`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Horas Semanais</CardTitle>
            <CardDescription>
              Distribuição de horas nos dias da semana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyHours}>
                  <XAxis dataKey="dayName" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}h`, 'Horas']} />
                  <Bar dataKey="hours" fill="#2563eb" name="Horas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Hoje</CardTitle>
          <CardDescription>
            Seus pontos registrados hoje
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayRecords.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado para hoje.
            </p>
          ) : (
            <div className="relative">
              <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-muted" />
              <div className="space-y-6 relative ml-6">
                {todayRecords.map((record, index) => (
                  <div key={record.id} className="relative pl-6">
                    <div className="absolute -left-6 mt-1.5 w-3 h-3 rounded-full border-2 border-primary bg-background" />
                    <div className="flex flex-col">
                      <div className="text-sm font-medium">
                        {record.type === 'check-in' && 'Entrada'}
                        {record.type === 'check-out' && 'Saída'}
                        {record.type === 'break-start' && 'Início de Intervalo'}
                        {record.type === 'break-end' && 'Fim de Intervalo'}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(record.timestamp), 'HH:mm')}
                      </span>
                      {record.location && (
                        <span className="text-xs text-muted-foreground mt-1 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function MapPin(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default Dashboard;
