
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createTimeRecord, getTimeRecordsByDate, TimeRecord } from '@/services/db';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import { Clock, MapPin } from 'lucide-react';

const RegistroPonto = () => {
  const { user } = useAuth();
  const { currentLocation, refreshLocation, isLoading: locationLoading } = useLocation();
  const [today, setToday] = useState(new Date());
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Atualizar o relógio a cada segundo
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      loadTodayRecords();
    }
  }, [user]);

  const loadTodayRecords = async () => {
    if (!user) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    try {
      const todayRecords = await getTimeRecordsByDate(user.id, startOfDay, endOfDay);
      setRecords(todayRecords.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }));
    } catch (error) {
      console.error('Erro ao carregar registros do dia:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os registros de hoje.",
      });
    }
  };

  const registerTime = async (type: 'check-in' | 'check-out' | 'break-start' | 'break-end') => {
    if (!user) return;

    setIsLoading(true);
    
    try {
      // Atualizar localização antes de registrar o ponto
      let location = currentLocation;
      if (!location) {
        location = await refreshLocation();
      }
      
      const newRecord: TimeRecord = {
        id: `${user.id}-${Date.now()}`,
        userId: user.id,
        type,
        timestamp: new Date(),
        location: location || undefined,
        note: ''
      };
      
      await createTimeRecord(newRecord);
      toast({
        title: "Ponto registrado",
        description: `${getTypeLabel(type)} registrado com sucesso às ${format(new Date(), 'HH:mm:ss')}`,
      });
      
      await loadTodayRecords();
    } catch (error) {
      console.error('Erro ao registrar ponto:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar o ponto.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'check-in': return 'Entrada';
      case 'check-out': return 'Saída';
      case 'break-start': return 'Início de intervalo';
      case 'break-end': return 'Fim de intervalo';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'check-in': return 'bg-green-100 text-green-800';
      case 'check-out': return 'bg-red-100 text-red-800';
      case 'break-start': return 'bg-yellow-100 text-yellow-800';
      case 'break-end': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderButtons = () => {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          className="border-green-500 hover:bg-green-50 text-green-700"
          onClick={() => registerTime('check-in')}
          disabled={isLoading}
        >
          <Clock className="mr-2 h-4 w-4" />
          Registrar Entrada
        </Button>
        <Button
          variant="outline"
          className="border-red-500 hover:bg-red-50 text-red-700"
          onClick={() => registerTime('check-out')}
          disabled={isLoading}
        >
          <Clock className="mr-2 h-4 w-4" />
          Registrar Saída
        </Button>
        <Button
          variant="outline"
          className="border-yellow-500 hover:bg-yellow-50 text-yellow-700"
          onClick={() => registerTime('break-start')}
          disabled={isLoading}
        >
          <Clock className="mr-2 h-4 w-4" />
          Iniciar Intervalo
        </Button>
        <Button
          variant="outline"
          className="border-blue-500 hover:bg-blue-50 text-blue-700"
          onClick={() => registerTime('break-end')}
          disabled={isLoading}
        >
          <Clock className="mr-2 h-4 w-4" />
          Finalizar Intervalo
        </Button>
      </div>
    );
  };

  return (
    <div className="container py-6 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Registro de Ponto</h1>
        <p className="text-muted-foreground">
          {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <div className="text-4xl font-bold mt-2 font-mono animate-pulse">
          {format(currentTime, 'HH:mm:ss')}
        </div>
      </div>

      <Tabs defaultValue="register">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register">Registrar Ponto</TabsTrigger>
          <TabsTrigger value="history">Histórico do Dia</TabsTrigger>
        </TabsList>
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Marcar ponto</CardTitle>
              <CardDescription>
                Selecione o tipo de registro que deseja fazer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderButtons()}
              
              {locationLoading ? (
                <p className="text-center mt-4 text-muted-foreground">Obtendo localização...</p>
              ) : currentLocation ? (
                <div className="mt-4 p-3 bg-muted rounded-md flex items-start">
                  <MapPin className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Sua localização atual</p>
                    <p className="text-xs text-muted-foreground">
                      Lat: {currentLocation.latitude.toFixed(6)}, Lng: {currentLocation.longitude.toFixed(6)}
                      <br />
                      Precisão: {currentLocation.accuracy.toFixed(0)}m
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-md flex items-start">
                  <MapPin className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Localização indisponível</p>
                    <p className="text-xs">
                      Permita o acesso à sua localização para um registro mais preciso.
                    </p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs"
                      onClick={() => refreshLocation()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Todos os registros são salvos com data, hora e localização.
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Registros de hoje</CardTitle>
              <CardDescription>
                Todos os pontos marcados durante o dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado para hoje.
                </p>
              ) : (
                <div className="space-y-4">
                  {records.map((record) => (
                    <div 
                      key={record.id} 
                      className="flex items-center border rounded-md p-3"
                    >
                      <div className="mr-4 flex-shrink-0">
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {format(new Date(record.timestamp), 'HH:mm')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(record.timestamp), 'dd/MM')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                              {getTypeLabel(record.type)}
                            </span>
                          </div>
                          {record.location && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span>
                                {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegistroPonto;
