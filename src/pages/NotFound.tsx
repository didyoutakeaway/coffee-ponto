
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: Usuário tentou acessar rota inexistente:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
        <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">Página não encontrada</p>
        <p className="text-gray-500 mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Button asChild className="w-full">
          <a href="/dashboard">Voltar para o Dashboard</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
