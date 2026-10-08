import { fireEvent } from '@testing-library/react';
import type { CandidateDetail, InterviewResponse, OnboardingResponse } from './recruitment-client';

/** Fixtures de las pruebas REC-05..REC-08 (no se importa desde codigo de produccion). */
export const baseContext = {
  companyId: 'c1',
  companyName: 'VeloxRent',
  branchId: 'b1',
  branchName: 'Sede Central',
};

export function makeInterview(overrides: Partial<InterviewResponse> = {}): InterviewResponse {
  return {
    id: 'int-1',
    candidateId: 'cand-1',
    scheduledAt: '2026-10-05T15:00:00Z',
    isVirtual: true,
    meetUrl: 'https://meet.google.com/abc',
    location: null,
    interviewerId: 'user-1',
    qualitativeNotes: null,
    result: 'PENDIENTE',
    evaluatedAt: null,
    createdAt: '2026-10-04T10:00:00Z',
    ...overrides,
  };
}

export function makeOnboarding(overrides: Partial<OnboardingResponse> = {}): OnboardingResponse {
  return {
    id: 'onb-1',
    candidateId: 'cand-1',
    startDate: '2026-10-07',
    inductionScheduled: true,
    equipmentAssigned: true,
    responsibilityCardSigned: true,
    notarizedContractSigned: false,
    isCompleted: true,
    completedAt: '2026-10-06T10:00:00Z',
    probationPassed: null,
    probationEvaluation: null,
    probationEvaluatedAt: null,
    createdAt: '2026-10-06T10:00:00Z',
    ...overrides,
  };
}

export function makeCandidate(overrides: Partial<CandidateDetail> = {}): CandidateDetail {
  return {
    id: 'cand-1',
    vacancyId: 'vac-1',
    fullName: 'Ana Torres',
    documentType: 'DNI',
    documentNumber: '12345678',
    stage: 'ENTREVISTA',
    decision: undefined,
    version: 4,
    createdAt: '2026-10-01T10:00:00Z',
    isMechanic: false,
    email: 'ana@correo.pe',
    phone: '999111222',
    decisionNotes: null,
    decidedAt: null,
    isRestrictedView: false,
    interviews: [],
    onboarding: null,
    ...overrides,
  };
}

/** Sustituto minimo de user-event (no es dependencia del repo). */
export function setupUser() {
  return {
    click: async (element: Element) => {
      fireEvent.click(element);
    },
    type: async (element: Element, text: string) => {
      fireEvent.change(element, { target: { value: text } });
    },
  };
}

export function setMobile(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
