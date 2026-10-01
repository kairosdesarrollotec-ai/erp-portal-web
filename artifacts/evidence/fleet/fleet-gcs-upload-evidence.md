# Evidencia — Flujo GCS Photo Upload (Fleet)

**Fecha:** 2026-10-01  
**Módulo:** `fleet` (frontend)  
**UX-ID:** FLOTA-01 (gestión de flota vehicular)  
**Rama origin:** `feat/fleet-gcs-photo-upload` (mergeada a main 2026-10-01)

---

## 1. Flujo implementado

```
Usuario selecciona foto
  → handleFileChange (validación MIME + tamaño)
    → setPendingPhotoFile / setPhotoPreviewUrl
      → onFormSubmit (RHF handleSubmit)
        → addVehicle (useFleetList.ts)
          → resolvePhotoUrl
            → requestPhotoUploadSession (fleet-client.ts)
            → uploadPhotoToGcs (PUT a signed URL GCS)
          → createVehicle con photoUrl = objectUrl
```

---

## 2. Tests ejecutados

### Suite: `FleetListScreen.test.tsx`

| Test | Estado |
|------|--------|
| muestra la tabla de vehículos con sus datos y badges de estado | ✅ PASS |
| muestra el estado vacío cuando no hay vehículos | ✅ PASS |
| muestra error recuperable si la API falla | ✅ PASS |
| muestra estado FORBIDDEN si la API devuelve 403 | ✅ PASS |
| aplica debounce al escribir en el buscador | ✅ PASS |
| permite filtrar por estado | ✅ PASS |
| permite cambiar el estado de un vehículo desde la tabla | ✅ PASS |
| abre el modal y registra un nuevo vehículo | ✅ PASS |
| **flujo GCS: requestPhotoUploadSession → uploadPhotoToGcs → createVehicle con objectUrl** | ✅ PASS |
| muestra controles de foto y permite quitar la foto precargada en edición | ✅ PASS |

### Suite: `fleet-client.test.ts`

| Test | Estado |
|------|--------|
| listVehicles — envía parámetros correctos con Bearer token | ✅ PASS |
| listVehicles — lanza FleetApiError cuando la respuesta no es ok | ✅ PASS |
| getVehicle — retorna el vehículo cuando la respuesta es exitosa | ✅ PASS |
| createVehicle — envía POST con payload y header de idempotencia | ✅ PASS |
| createVehicle — lanza FleetCommandError con detalle en error | ✅ PASS |
| requestPhotoUploadSession — envía POST con todos los parámetros | ✅ PASS |
| requestPhotoUploadSession — lanza FleetCommandError en error | ✅ PASS |
| uploadPhotoToGcs — envía PUT al uploadUrl con el archivo como body | ✅ PASS |
| uploadPhotoToGcs — lanza GcsUploadError en error | ✅ PASS |
| uploadPhotoToGcs — GcsUploadError incluye el status HTTP de GCS | ✅ PASS |
| updateVehicleStatus — envía PATCH con nuevo estado | ✅ PASS |
| updateVehicle — envía PATCH con campos de edición | ✅ PASS |

**Resultado total:** 22/22 tests passing.

---

## 3. Comando de ejecución

```bash
# Desde kairos_space/apps/erp-portal-web/apps/web/
npx vitest run src/app/fleet/
# Test Files  2 passed (2)
# Tests       21 passed (21)
# Duration    ~1.6s
```

---

## 4. Validaciones de cliente (NewVehicleModal.tsx)

| Validación | Implementación |
|------------|----------------|
| MIME aceptado | `image/jpeg` o `image/webp` únicamente; rechazo con mensaje |
| Tamaño máximo | 12 MB (SDD-00 §16.5) |
| MIME en resolvePhotoUrl | Guard explícito antes de llamar al API; lanza Error si MIME inválido |

---

## 5. Brechas conocidas

| ID | Descripción | Estado |
|----|-------------|--------|
| — | `fleet-client.test.ts` migrado a MSW v2 (`setupServer`) | **Resuelto 2026-10-01** |
| — | Test de `updateVehicle` añadido | **Resuelto 2026-10-01** |
