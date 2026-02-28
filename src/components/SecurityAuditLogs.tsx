import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  table_name: string;
  action_type: string;
  record_id: string | null;
  user_id: string | null;
  accessed_at: string;
  created_at: string;
}

interface Profile {
  name: string;
  email: string;
}

export const SecurityAuditLogs = () => {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.effectiveRole === 'admin') {
      fetchAuditLogs();
    }
  }, [profile]);

  const fetchAuditLogs = async () => {
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('accessed_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      setLogs(logsData || []);

      // Fetch user profiles for the logs
      const userIds = [...new Set(logsData?.map(log => log.user_id).filter(Boolean) || [])];
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', userIds);

        if (!profilesError && profilesData) {
          const profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.user_id] = { name: profile.name, email: profile.email };
            return acc;
          }, {} as Record<string, Profile>);
          setProfiles(profilesMap);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'select':
      case 'view':
        return 'secondary';
      case 'insert':
      case 'create':
        return 'default';
      case 'update':
      case 'edit':
        return 'outline';
      case 'delete':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const tableNames: Record<string, string> = {
      businesses: 'Empresas',
      contracts: 'Contratos',
      csm_cards: 'Cards CSM',
      profiles: 'Perfis',
      copy_forms: 'Formulários Copy',
      commissions: 'Comissões'
    };
    return tableNames[tableName] || tableName;
  };

  if (profile?.role !== 'admin') {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Acesso negado. Apenas administradores podem visualizar os logs de auditoria.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Logs de Auditoria</CardTitle>
        </div>
        <CardDescription>
          Monitoramento de acesso a dados sensíveis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Carregando logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum log de auditoria encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Últimos {logs.length} acessos registrados
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Registro ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.accessed_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {log.user_id && profiles[log.user_id] ? (
                          <div>
                            <div className="font-medium">{profiles[log.user_id].name}</div>
                            <div className="text-xs text-muted-foreground">
                              {profiles[log.user_id].email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sistema</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTableDisplayName(log.table_name)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeColor(log.action_type)}>
                          {log.action_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.record_id ? (
                          <span className="truncate block max-w-24" title={log.record_id}>
                            {log.record_id.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};