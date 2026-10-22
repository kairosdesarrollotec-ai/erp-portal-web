/**
 * Tipos de evidence.yaml 1.0.0 (doble aprobacion para eliminar evidencia, DEC-EVID-DELETE-002).
 * Escritos A MANO siguiendo el yaml del contrato (contract-first): equivalen a lo que generaria openapi-typescript.
 */

export interface paths {
    "/evidence/deletion-requests": {
        parameters: { query?: never; header?: never; path?: never; cookie?: never };
        /** Lista las solicitudes de la empresa (mas recientes primero) */
        get: {
            parameters: {
                query: {
                    companyId: string;
                    branchId: string;
                    status?: components["schemas"]["EvidenceDeletionStatus"];
                    targetKind?: components["schemas"]["EvidenceDeletionTargetKind"];
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                200: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["EvidenceDeletionRequest"][] } };
                400: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                401: { headers: { [name: string]: unknown }; content?: never };
                403: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                500: { headers: { [name: string]: unknown }; content?: never };
            };
        };
        put?: never;
        /** Solicita eliminar una evidencia (no borra nada todavia) */
        post: {
            parameters: { query?: never; header?: { "Idempotency-Key"?: string }; path?: never; cookie?: never };
            requestBody: { content: { "application/json": components["schemas"]["RequestEvidenceDeletionRequest"] } };
            responses: {
                201: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["EvidenceDeletionRequest"] } };
                400: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                401: { headers: { [name: string]: unknown }; content?: never };
                403: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                404: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                409: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                500: { headers: { [name: string]: unknown }; content?: never };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evidence/deletion-requests/{id}": {
        parameters: { query?: never; header?: never; path?: never; cookie?: never };
        /** Detalle de una solicitud */
        get: {
            parameters: { query: { companyId: string; branchId: string }; header?: never; path: { id: string }; cookie?: never };
            requestBody?: never;
            responses: {
                200: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["EvidenceDeletionRequest"] } };
                401: { headers: { [name: string]: unknown }; content?: never };
                403: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                404: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                500: { headers: { [name: string]: unknown }; content?: never };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evidence/deletion-requests/{id}/approve": {
        parameters: { query?: never; header?: never; path?: never; cookie?: never };
        get?: never;
        put?: never;
        /** Aprueba la solicitud (1a aprobacion -> APPROVED_1; 2a aprobacion -> EXECUTED y borra la evidencia) */
        post: {
            parameters: { query?: never; header?: { "Idempotency-Key"?: string }; path: { id: string }; cookie?: never };
            requestBody: { content: { "application/json": components["schemas"]["ApproveEvidenceDeletionRequest"] } };
            responses: {
                200: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["EvidenceDeletionRequest"] } };
                400: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                401: { headers: { [name: string]: unknown }; content?: never };
                403: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                404: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                409: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                500: { headers: { [name: string]: unknown }; content?: never };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/evidence/deletion-requests/{id}/reject": {
        parameters: { query?: never; header?: never; path?: never; cookie?: never };
        get?: never;
        put?: never;
        /** Rechaza una solicitud abierta (PENDING o APPROVED_1) con motivo */
        post: {
            parameters: { query?: never; header?: { "Idempotency-Key"?: string }; path: { id: string }; cookie?: never };
            requestBody: { content: { "application/json": components["schemas"]["RejectEvidenceDeletionRequest"] } };
            responses: {
                200: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["EvidenceDeletionRequest"] } };
                400: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                401: { headers: { [name: string]: unknown }; content?: never };
                403: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                404: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                409: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["DomainErrorResponse"] } };
                500: { headers: { [name: string]: unknown }; content?: never };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        DomainErrorResponse: {
            statusCode: number;
            /** @description EVIDENCE_DELETION_REQUEST_NOT_FOUND, EVIDENCE_DELETION_REASON_REQUIRED, EVIDENCE_DELETION_ALREADY_REQUESTED, EVIDENCE_DELETION_SELF_APPROVAL, EVIDENCE_DELETION_SAME_APPROVER, EVIDENCE_DELETION_INVALID_STATE, EVIDENCE_DELETION_REQUEST_EXPIRED, ROLE_NOT_ALLOWED */
            code: string;
            detail: string;
        };
        /** @enum {string} */
        EvidenceDeletionTargetKind: "RENTAL" | "RETURN";
        /** @enum {string} */
        EvidenceDeletionStatus: "PENDING" | "APPROVED_1" | "EXECUTED" | "REJECTED" | "EXPIRED";
        RequestEvidenceDeletionRequest: {
            /** Format: uuid */
            companyId: string;
            /** Format: uuid */
            branchId: string;
            targetKind: components["schemas"]["EvidenceDeletionTargetKind"];
            /** Format: uuid */
            targetId: string;
            /** Format: uuid */
            evidenceId: string;
            reason: string;
        };
        ApproveEvidenceDeletionRequest: {
            /** Format: uuid */
            companyId: string;
            /** Format: uuid */
            branchId: string;
            note?: string;
        };
        RejectEvidenceDeletionRequest: {
            /** Format: uuid */
            companyId: string;
            /** Format: uuid */
            branchId: string;
            reason: string;
        };
        /** @description Foto fija del registro al solicitar (el archivo/URL no se expone aqui). */
        EvidenceDeletionEvidence: {
            /** @description PHOTO | VIDEO */
            type: string;
            zone: string;
            uploadedBy: string;
            /** Format: date-time */
            uploadedAt: string;
        };
        /** @description Lo que puede hacer el usuario que consulta (para pintar botones); la autoridad sigue siendo el backend. */
        EvidenceDeletionViewer: {
            canApprove: boolean;
            canReject: boolean;
        };
        EvidenceDeletionRequest: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            companyId: string;
            /** Format: uuid */
            branchId: string;
            targetKind: components["schemas"]["EvidenceDeletionTargetKind"];
            /** Format: uuid */
            targetId: string;
            /** Format: uuid */
            evidenceId: string;
            evidence: components["schemas"]["EvidenceDeletionEvidence"];
            reason: string;
            status: components["schemas"]["EvidenceDeletionStatus"];
            /** @description firebaseUid del solicitante */
            requestedBy: string;
            /** Format: date-time */
            requestedAt: string;
            firstApprovedBy: string | null;
            /** Format: date-time */
            firstApprovedAt: string | null;
            firstApprovalNote: string | null;
            secondApprovedBy: string | null;
            /** Format: date-time */
            secondApprovedAt: string | null;
            secondApprovalNote: string | null;
            rejectedBy: string | null;
            /** Format: date-time */
            rejectedAt: string | null;
            rejectionReason: string | null;
            /** Format: date-time */
            executedAt: string | null;
            /** Format: date-time */
            expiredAt: string | null;
            /** Format: date-time */
            expiresAt: string;
            version: number;
            viewer: components["schemas"]["EvidenceDeletionViewer"];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
