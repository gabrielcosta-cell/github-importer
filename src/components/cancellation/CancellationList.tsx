import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';
import { CancellationRequest } from './CancellationKanbanBoard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CancellationListProps {
  requests: CancellationRequest[];
  onViewDetails: (request: CancellationRequest) => void;
  onDeleteRequest: (request: CancellationRequest) => void;
  isAdmin: boolean;
}

export const CancellationList: React.FC<CancellationListProps> = ({
  requests,
  onViewDetails,
  onDeleteRequest,
  isAdmin
}) => {


  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const },
      em_analise: { label: 'Em Análise', variant: 'default' as const },
      resolvido: { label: 'Resolvido', variant: 'default' as const },
      cancelado: { label: 'Cancelado', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="rounded-lg border border-border/40 bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Empresa</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nenhuma solicitação encontrada
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => (
              <TableRow key={request.id} className="hover:bg-accent/50">
                <TableCell className="font-medium">{request.contract_name || '-'}</TableCell>
                <TableCell>{request.client_name}</TableCell>
                <TableCell>{request.client_email || '-'}</TableCell>
                <TableCell className="max-w-xs truncate">{request.reason || '-'}</TableCell>
                <TableCell>
                  {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(request)}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Ver detalhes
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteRequest(request)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
