import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import {
  getNotificationTemplates,
  NotificationChannel,
  NotificationTemplateCommandError,
  NotificationTemplates,
  saveNotificationTemplate,
} from './notification-templates-client';
import { useWorkContextForAdmin } from './useWorkContextForAdmin';

export type NotificationTemplatesState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR';

export function useNotificationTemplates() {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const [state, setState] = useState<NotificationTemplatesState>('LOADING');
  const [data, setData] = useState<NotificationTemplates | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!context) return;
    setState('LOADING');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const result = await getNotificationTemplates(idToken, context.companyId, context.branchId);
      setData(result);
      setState('READY');
    } catch {
      setState('RECOVERABLE_ERROR');
    }
  }, [context]);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, reload]);

  async function save(eventType: string, channels: NotificationChannel[], body: string): Promise<boolean> {
    if (!context) return false;
    setSaving(true);
    setSaveError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      await saveNotificationTemplate(idToken, context.companyId, context.branchId, eventType, channels, body);
      await reload();
      return true;
    } catch (error) {
      setSaveError(error instanceof NotificationTemplateCommandError ? error.message : 'No se pudo guardar la plantilla.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { state, data, context, saving, saveError, save, reload };
}
