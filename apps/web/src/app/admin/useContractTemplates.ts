import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import {
  ContractTemplate,
  ContractTemplateCommandError,
  createContractTemplate,
  listContractTemplates,
} from './contract-templates-client';
import { useWorkContextForAdmin } from './useWorkContextForAdmin';

export type ContractTemplatesState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR';

export function useContractTemplates() {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const [state, setState] = useState<ContractTemplatesState>('LOADING');
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
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
      const result = await listContractTemplates(idToken, context.companyId, context.branchId);
      setTemplates(result);
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

  async function createVersion(type: string): Promise<boolean> {
    if (!context) return false;
    setSaving(true);
    setSaveError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesion no disponible.');
      const idToken = await user.getIdToken();
      await createContractTemplate(idToken, context.companyId, context.branchId, type);
      await reload();
      return true;
    } catch (error) {
      setSaveError(
        error instanceof ContractTemplateCommandError ? error.message : 'No se pudo crear la nueva version.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { state, templates, context, saving, saveError, createVersion, reload };
}
