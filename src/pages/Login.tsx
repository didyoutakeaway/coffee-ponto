
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { initDB } from '@/services/db';
import { Coffee } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Inicializar o banco de dados quando a página de login carregar
    initDB().catch(error => {
      console.error('Falha ao inicializar o banco de dados:', error);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E6B980] to-[#EACDA3] p-4">
      <div className="w-full max-w-md relative">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-32 h-32 bg-white rounded-full shadow-xl flex items-center justify-center">
          <Coffee className="h-16 w-16 text-[#8B4513]" />
        </div>
        <Card className="shadow-xl border-0 backdrop-blur-sm bg-white/90">
          <CardHeader className="space-y-1 text-center pt-16">
            <CardTitle className="text-3xl font-bold font-serif text-[#4A3220]">DiTassi</CardTitle>
            <CardDescription className="text-[#8B4513] italic">
              Sistema de Controle de Ponto
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-[#8B4513]/20"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-[#8B4513]/20"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-[#8B4513] hover:bg-[#6F3410] text-white" 
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
