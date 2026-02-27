import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Mail, Star, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CardEmail {
  id: string;
  email: string;
  is_primary: boolean;
}

interface CardEmailsManagerProps {
  cardId: string;
  stageId: string;
  onUpdate?: () => void;
}

export const CardEmailsManager: React.FC<CardEmailsManagerProps> = ({ cardId, stageId, onUpdate }) => {
  const [emails, setEmails] = useState<CardEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [cardId]);

  const fetchEmails = async () => {
    const { data, error } = await supabase
      .from('csm_card_emails')
      .select('*')
      .eq('card_id', cardId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (!error && data) {
      setEmails(data);
    }
  };

  const validateEmail = (email: string) => {
    const regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return regex.test(email);
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) return;

    if (!validateEmail(newEmail)) {
      toast.error('E-mail inválido');
      return;
    }

    // Check if email already exists
    if (emails.some(e => e.email.toLowerCase() === newEmail.toLowerCase())) {
      toast.error('Este e-mail já está adicionado');
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { error } = await supabase
        .from('csm_card_emails')
        .insert({
          card_id: cardId,
          email: newEmail,
          is_primary: emails.length === 0,
          created_by: userData.user.id
        });

      if (error) throw error;

      // Update contact_email in crm_cards if this is the first email
      if (emails.length === 0) {
        await supabase
          .from('csm_cards')
          .update({ contact_email: newEmail })
          .eq('id', cardId);
      }

      // Registrar no histórico
      await supabase
        .from('csm_card_stage_history')
        .insert({
          card_id: cardId,
          stage_id: stageId,
          entered_at: new Date().toISOString(),
          moved_by: userData.user.id,
          notes: `E-mail "${newEmail}" adicionado`,
          event_type: 'field_update'
        });

      toast.success('E-mail adicionado com sucesso');
      setNewEmail('');
      await fetchEmails();
      onUpdate?.();
    } catch (error: any) {
      toast.error('Erro ao adicionar e-mail: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmail = async (emailId: string) => {
    setLoading(true);
    try {
      const emailToRemove = emails.find(e => e.id === emailId);
      const emailAddress = emailToRemove?.email || '';
      
      const { error } = await supabase
        .from('csm_card_emails')
        .delete()
        .eq('id', emailId);

      if (error) throw error;

      // If removing primary email, update card's contact_email
      if (emailToRemove?.is_primary) {
        const remainingEmails = emails.filter(e => e.id !== emailId);
        const newPrimaryEmail = remainingEmails[0]?.email || null;
        
        await supabase
          .from('csm_cards')
          .update({ contact_email: newPrimaryEmail })
          .eq('id', cardId);

        // Set new primary if there are remaining emails
        if (newPrimaryEmail && remainingEmails[0]) {
          await supabase
            .from('csm_card_emails')
            .update({ is_primary: true })
            .eq('id', remainingEmails[0].id);
        }
      }

      // Registrar no histórico
      const { data: userData } = await supabase.auth.getUser();
      await supabase
        .from('csm_card_stage_history')
        .insert({
          card_id: cardId,
          stage_id: stageId,
          entered_at: new Date().toISOString(),
          moved_by: userData.user?.id,
          notes: `E-mail "${emailAddress}" removido`,
          event_type: 'field_update'
        });

      toast.success('E-mail removido com sucesso');
      await fetchEmails();
      onUpdate?.();
    } catch (error: any) {
      toast.error('Erro ao remover e-mail: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success('E-mail copiado para a área de transferência');
    } catch (error) {
      toast.error('Erro ao copiar e-mail');
    }
  };

  const handleSetPrimary = async (emailId: string) => {
    setLoading(true);
    try {
      const emailToSetPrimary = emails.find(e => e.id === emailId);
      if (!emailToSetPrimary) return;

      // Remove primary from all emails
      await supabase
        .from('csm_card_emails')
        .update({ is_primary: false })
        .eq('card_id', cardId);

      // Set new primary
      const { error } = await supabase
        .from('csm_card_emails')
        .update({ is_primary: true })
        .eq('id', emailId);

      if (error) throw error;

      // Update card's contact_email
      await supabase
        .from('csm_cards')
        .update({ contact_email: emailToSetPrimary.email })
        .eq('id', cardId);

      // Registrar no histórico
      const { data: userData } = await supabase.auth.getUser();
      await supabase
        .from('csm_card_stage_history')
        .insert({
          card_id: cardId,
          stage_id: stageId,
          entered_at: new Date().toISOString(),
          moved_by: userData.user?.id,
          notes: `E-mail principal alterado para "${emailToSetPrimary.email}"`,
          event_type: 'field_update'
        });

      toast.success('E-mail principal atualizado');
      await fetchEmails();
      onUpdate?.();
    } catch (error: any) {
      toast.error('Erro ao definir e-mail principal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="novo@email.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
          disabled={loading}
          className="flex-1"
        />
        <Button
          onClick={handleAddEmail}
          disabled={loading || !newEmail.trim()}
          size="sm"
          variant="outline"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        {emails.map((email) => (
          <div
            key={email.id}
            className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group"
          >
            <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="flex-1 text-sm truncate">{email.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyEmail(email.email)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
              title="Copiar e-mail"
            >
              <Copy className="w-3 h-3" />
            </Button>
            {email.is_primary && (
              <Badge variant="secondary" className="flex-shrink-0 gap-1">
                <Star className="w-3 h-3" />
                Principal
              </Badge>
            )}
            {!email.is_primary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSetPrimary(email.id)}
                disabled={loading}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
              >
                <Star className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveEmail(email.id)}
              disabled={loading}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {emails.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum e-mail adicionado
          </p>
        )}
      </div>
    </div>
  );
};
