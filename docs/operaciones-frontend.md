# Operaciones del frontend — Intexa Arca

## Infraestructura transversal

### API base

**`src/lib/api.ts`**

URL base resuelta en orden de prioridad:

```
1. window.__APP_CONFIG__.apiBaseUrl   ← inyectado en public/config.js (producción)
2. import.meta.env.VITE_API_BASE_URL  ← variable de entorno (desarrollo)
3. '/api/v1'                          ← fallback
```

Cada petición adjunta automáticamente el JWT de `localStorage` (`arca_token`):

```
Authorization: Bearer <token>
```

---

### Roles y acceso

**`src/lib/roles.ts`**

```ts
canWrite(role)   // ADMINISTRADOR + TESORERÍA
isAdmin(role)    // solo ADMINISTRADOR
isTreasury(role) // solo TESORERÍA
```

Todas las comparaciones normalizan a mayúsculas. El backend aplica el mismo control con el middleware `RequireRole`:

```
Todos los roles autenticados
  GET  /dashboard, /transactions, /cashflow, /projections,
       /reports, /notifications, /settings (GET + PUT), /categories,
       /exchange-rates, /siigo/status

ADMINISTRADOR + TESORERÍA
  PUT    /dashboard/bank-balance
  POST   /transactions
  PUT    /transactions/{id}
  DELETE /transactions/{id}
  POST   /projections
  POST   /siigo/sync

Solo ADMINISTRADOR
  GET/POST/PUT/DELETE /users
  GET  /activity-logs
  POST /siigo/connect
  GET/POST/DELETE /allowed-domains
```

---

### Formateo de moneda

**`src/contexts/SettingsContext.tsx`**

Todos los montos se almacenan en COP. Si el usuario activa `autoExchangeRate` y configura otra moneda, se aplica la conversión antes de formatear:

```
convertido = amount × (tasa_monedaDestino / tasa_COP)
```

**`formatCurrency(amount)`** — valores completos (totales, detalles, tooltips):

```
Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
  currencyDisplay: 'code',   ← evita ambigüedad del símbolo $
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

COP → "COP 8.000.000,00"
USD → "USD 2,000.00"
EUR → "EUR 1.850,00"
```

**`formatCompact(amount)`** — notación compacta (tarjetas, gráficos, espacios reducidos):

```
Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
+ " " + currency

8_000_000 COP → "8M COP"
  850_000 COP → "850K COP"
    2_000 USD → "2K USD"
```

Los valores compactos muestran el valor completo con `formatCurrency` al hacer hover (atributo `title`) o al recibir foco (tarjetas interactivas con `onFocus`/`onBlur`).

---

### Tipos de sincronización Siigo

**`src/layouts/MainLayout.tsx`** | **`internal/handler/siigo.go`**

El botón **Sincronizar** del header expone tres modos. El usuario activo debe tener rol `ADMINISTRADOR` o `TESORERÍA`.

#### Incremental — automático diario

```
dateStart = hoy − 90 días   (siempre calculado desde time.Now())
dateEnd   = hoy
```

Se ejecuta automáticamente cada día a las **06:00** hora local. También se dispara manualmente al pulsar el botón principal "Sincronizar".

Objetivo: recoger registros nuevos y actualizaciones de estado dentro de la ventana móvil de 90 días.

#### Reconcile — desde la transacción pendiente más antigua

```
dateStart = fecha de la transacción más antigua con status Pendiente o Parcial en BD
dateEnd   = hoy
fallback  = hoy − 90 días   (si no hay transacciones pendientes/parciales)
```

Se ejecuta automáticamente el **1 de cada mes**. También se puede lanzar manualmente desde el menú desplegable del botón de sincronización.

Razonamiento: las transacciones `Completado` son definitivas — Siigo no las modifica. Solo las transacciones `Pendiente` y `Parcial` pueden recibir actualizaciones (cobros, pagos, anulaciones). Por eso el rango parte desde la más antigua de esas dos, optimizando el volumen de datos descargado.

La ventana calculada se registra en los logs estructurados como `siigo_reconcile_window` con `date_start` y `date_end`.

#### Bootstrap — desde fecha seleccionada

```
dateStart = fecha elegida por el usuario (date picker)
dateEnd   = hoy
```

Disponible manualmente desde el menú desplegable. Se usa para cargar historial completo desde una fecha determinada. El date picker:
- Se inicializa con la fecha actual al abrir el panel (`getToday()`)
- Tiene `max = getToday()` — no permite seleccionar fechas futuras
- Al pulsar el botón se muestra el rango explícito: `Importar YYYY-MM-DD → hoy`

#### Filtro de fechas en el servidor

Independientemente del modo, el servidor descarta cualquier registro cuya fecha de documento (`inv.Date` / `pur.Date`) quede fuera del rango `[dateStart, dateEnd]`. Esto compensa el comportamiento de la API de Siigo, que puede devolver registros fuera del rango solicitado.

#### Refresco automático del token

El token de Siigo expira cada 24 horas. Al conectarse, se lanza una goroutine (`StartAutoRefresh`) que renueva el token **10 minutos antes de su expiración** — sin cortar ninguna solicitud en curso. El evento queda registrado como `siigo_token_refreshed` en los logs.

#### Endpoint de sincronización

```
POST /api/v1/siigo/sync  { mode, dateStart?, dateEnd? }
→ { mode, dateStart, dateEnd, invoicesImported, purchasesImported, updated }
```

| Campo | Requerido | Descripción |
|---|---|---|
| `mode` | sí | `"incremental"` · `"reconcile"` · `"bootstrap"` |
| `dateStart` | solo bootstrap | Fecha de inicio `YYYY-MM-DD` |
| `dateEnd` | no | Por defecto: hoy |

---

### Modelo de pagos parciales

**Backend: `internal/domain/models.go` | `internal/handler/compute.go`**

#### Campos de transacción relevantes

| Campo | Tipo | Descripción |
|---|---|---|
| `Amount` | `float64` | Valor total de la factura |
| `Balance` | `float64` | Saldo pendiente de pago (Siigo lo actualiza en cada sync) |
| `Status` | `string` | `Completado` · `Parcial` · `Pendiente` · `Anulado` |
| `ParentID` | `string` | UUID del padre; presente solo en cuotas de plan de pagos |
| `IsProjection` | `bool` | `true` en cuotas de plan de pagos y proyecciones manuales |

#### Semántica de estado

```
Completado → Balance = 0           → todo cobrado/pagado
Parcial    → 0 < Balance < Amount  → cobro/pago parcial en curso
Pendiente  → Balance = Amount      → sin ningún pago aún
```

#### Helpers de cálculo base — `compute.go`

Todas las operaciones financieras del backend pasan por estos dos helpers para garantizar base de caja consistente:

```
receivedAmount(t):
  Completado → t.Amount
  Parcial    → t.Amount − t.Balance   ← solo lo ya cobrado/pagado
  otherwise  → 0

pendingAmount(t):
  Pendiente  → t.Amount
  Parcial    → t.Balance              ← solo lo aún pendiente
  otherwise  → 0
```

Ejemplos:

```
Factura $6M completamente cobrada:
  receivedAmount = 6_000_000   pendingAmount = 0

Factura $6M con $2M cobrados (Balance = 4M):
  receivedAmount = 2_000_000   pendingAmount = 4_000_000

Factura $6M sin ningún pago:
  receivedAmount = 0           pendingAmount = 6_000_000
```

#### Planes de cuotas (Siigo PaymentTerms)

Cuando Siigo devuelve una factura con más de un `PaymentTerm`, el sync crea una transacción proyectada por cuota:

```
Parent (isProjection=false):
  amount=6M, balance=4M, status=Parcial

Cuota 1 (isProjection=true, parentId=parent.ID):
  amount=2M, date=30d, status=Pendiente

Cuota 2 (isProjection=true, parentId=parent.ID):
  amount=2M, date=60d, status=Pendiente

Cuota 3 (isProjection=true, parentId=parent.ID):
  amount=2M, date=90d, status=Pendiente
```

Las cuotas (`isProjection=true`) se omiten en todos los cálculos históricos y de saldo. Solo el padre contribuye a través de `receivedAmount`. Para proyecciones futuras se usan las cuotas con distribución FIFO (ver §5).

---

### `TransactionDetailDrawer` — componente compartido

**`src/components/TransactionDetailDrawer.tsx`**

Drawer deslizante invocado desde Dashboard, Movements, CashFlow y Projections. Muestra todos los campos de la transacción. Permite edición inline y eliminación con confirmación, solo si:
- `canWrite(user.role) = true`
- `transaction.source ≠ 'Siigo'`

```
PUT    /api/v1/transactions/:id  { type, date, amount, description, category, status }
DELETE /api/v1/transactions/:id
```

El monto en edición se parsea así:
```
parseFloat(editAmount.replace(/,/g, '.'))
```

Cuando `transaction.balance > 0` se muestra una tarjeta de **Pago Parcial** con:
- Barra de progreso: `pagado% = (amount − balance) / amount × 100`
- Tres columnas: Pagado (`amount − balance`), Pendiente (`balance`), Total (`amount`)

---

---

## 1. LoginView

**`src/views/LoginView.tsx`**

### Secciones UI
- Botón de login con Microsoft (OAuth)
- Formulario email/contraseña con toggle de visibilidad

### Operaciones

**Login con email/contraseña**

```
POST /api/v1/auth/login  { email, password }
→ { token, user: { id, name, email, role } }
```

El frontend guarda en `localStorage`:
- `arca_token` — JWT para todas las peticiones siguientes
- `arca_user` — perfil serializado como JSON

**Login con Microsoft (MSAL)**

```
authService.loginWithMicrosoft()
→ POST /api/v1/auth/microsoft  { msalToken }
→ { token, user }
```

No hay operaciones matemáticas en esta vista.

---

---

## 2. DashboardView

**`src/views/DashboardView.tsx`** | **`internal/handler/dashboard.go`**

### Secciones UI
- **Grid de métricas** — Saldo Bancario, Saldo Actual, Ingresos del Mes, Egresos del Mes, Flujo Neto
- **Indicador de salud financiera** — barra de 5 niveles derivada del ratio flujo/ingreso
- **Gráfico de flujo mensual** — barras compuestas ingresos vs. egresos por mes (últimos 7 meses)
- **Distribución de gastos** — donut chart top-5 categorías con porcentaje
- **Alertas de Control** — tarjetas de vencimientos críticos; clic abre `TransactionDetailDrawer`
- **Comparativa semanal** — barra horizontal proporcional ingresos/egresos por semana del mes

### Acciones del usuario
- Editar saldo bancario (solo TESORERÍA); modal de confirmación si no se actualizó hoy
- Clic en alerta → `GET /transactions/:id` → `TransactionDetailDrawer`
- Botón "Nuevo Registro" → `CreateMovementView`

### 2.1 Carga de datos

Al montar se ejecutan dos requests en paralelo:

```
GET /api/v1/dashboard           → DashboardSummary
GET /api/v1/dashboard/bank-balance → BankBalance | null
```

### 2.2 Totales mensuales — base de caja

Para cada transacción se filtra por año y mes usando `txDate(t)` (campo `Date` en formato `YYYY-MM-DD`; fallback a `CreatedAt` si está malformado). Solo se cuenta el efectivo ya recibido/pagado:

```
ingresosMes = Σ receivedAmount(t)  [Ingreso, año=curY, mes=curM, no proyección, no cancelado]
egresosMes  = Σ receivedAmount(t)  [Egreso,  año=curY, mes=curM, no proyección, no cancelado]

donde receivedAmount(t):
  Completado → t.Amount
  Parcial    → t.Amount − t.Balance
  Pendiente  → 0  (excluido)
```

Lo mismo se repite para el mes anterior (`prevInc`, `prevExp`).

### 2.3 Variación porcentual — `signedPct`

```
variación = (actual − anterior) / |anterior| × 100

signedPct(9_000_000, 8_000_000) → "+12.5%"
signedPct(7_000_000, 8_000_000) → "-12.5%"
signedPct(5_000_000, 0)         → ""   ← sin dato anterior
```

Resultado redondeado a 1 decimal. Si `anterior = 0` devuelve cadena vacía y el frontend muestra `"Sin datos mes anterior"`.

Se calcula para tres indicadores:

```
balChange = signedPct(ingresosMes − egresosMes,  prevInc − prevExp)
incChange = signedPct(ingresosMes,               prevInc)
expChange = signedPct(egresosMes,                prevExp)
```

### 2.4 Flujo neto

```
netFlow = ingresosMes − egresosMes
balance = ingresosMes − egresosMes   (idéntico, expuesto como campo separado)
```

### 2.5 Gráfico de barras — últimos 7 meses

```
para i = 0..6:
    t = fechaActual − (6 − i) meses
    chartData[i] = {
        name:     spanishMonths[t.Month]
        ingresos: monthlyTotals(all, t.Year, t.Month).income
        egresos:  monthlyTotals(all, t.Year, t.Month).expense
        saldo:    ingresos − egresos
    }
```

`monthlyTotals` usa `receivedAmount` — incluye Completado y la parte cobrada de Parcial.

Recharts `ComposedChart + Bar`: barras verdes = ingresos, rojas = egresos. Tooltip usa `formatCompact`.

### 2.6 Distribución de gastos por categoría — `expensePie`

**Paso 1** — agrupar egresos por categoría (base de caja):
```
catMap[cat] = Σ receivedAmount(t)  [Egreso, no proyección, no cancelado]
```

**Paso 2** — porcentaje con redondeo a 1 decimal:
```
pct(parte, total) = round(parte / total × 1000) / 10

Ejemplo:
  catMap["Nómina"]    = 3_600_000  → pct = 75.0%
  catMap["Servicios"] = 1_200_000  → pct = 25.0%
```

**Paso 3** — ordenar descendente y recortar a top 5.

El centro del donut muestra `formatCurrency(egresosMes)`.

### 2.7 Comparativa semanal

Semana de cada transacción del mes actual (base de caja):
```
semana = floor((día − 1) / 7) + 1

día  1–7  → semana 1
día  8–14 → semana 2
día 15–21 → semana 3
día 22–28 → semana 4
día 29–31 → semana 5

ingresos[semana] += receivedAmount(t)  [Ingreso]
egresos[semana]  += receivedAmount(t)  [Egreso]
```

Ancho de cada barra de progreso:
```
total_w     = w.ingresos + w.egresos
anchoVerde  = (w.ingresos / total_w) × 100%
anchoRojo   = (w.egresos  / total_w) × 100%

Si total_w = 0 → ambos anchos = 0% (evita división por cero)
```

### 2.8 Indicador de Salud Financiera

```
ratio = netFlow / monthIncome

ratio ≥  0.20 → "Óptima"    (5 barras, verde)
ratio ≥  0.05 → "Buena"     (4 barras, esmeralda)
ratio ≥  0.00 → "Estable"   (3 barras, amarillo)
ratio ≥ -0.10 → "En riesgo" (2 barras, naranja)
ratio <  -0.10 → "Crítica"  (1 barra,  rojo)
monthIncome = 0 → "Sin datos" (0 barras)
```

### 2.9 Alertas de control

Transacciones con `Status = Pendiente` **o** `Status = Parcial`, `IsProjection = false`, antigüedad calculada desde la **fecha contable**:

```
txDía           = date(año(t.Date), mes(t.Date), día(t.Date))
antigüedad_días = floor((ahora − txDía).horas / 24)
monto_alerta    = pendingAmount(t)   ← Balance si Parcial, Amount si Pendiente
```

Solo se incluyen con `antigüedad_días ≥ 5`:

```
tipo = "warning"  si antigüedad_días ≤ 10
tipo = "danger"   si antigüedad_días > 10

descripción = "Pendiente hace N días · Categoría"
            | "Parcial hace N días · Categoría"
```

Ordenadas descendente por `pendingAmount`, recortadas a 4. Si `balance < 0` se antepone una alerta sintética:

```
{ type: "danger", title: "Saldo Negativo",
  description: "El saldo actual es negativo. Revise los egresos pendientes.",
  amount: |balance| }
```

### 2.10 Saldo Bancario

Exclusivo del rol `TESORERÍA`. Al montar, si `localStorage["arca_saldo_updated_date"] ≠ hoy` (ISO `YYYY-MM-DD`), se muestra `BankSaldoModal`.

```
PUT /api/v1/dashboard/bank-balance  { amount: number }
→ { amount, updatedAt, updatedBy }   ← updatedBy = nombre del JWT
```

Tras guardar, se escribe `localStorage["arca_saldo_updated_date"] = hoy`.

---

---

## 3. MovementsView

**`src/views/MovementsView.tsx`** | **`internal/handler/transactions.go`**

### Secciones UI
- **Métricas** — Balance Total (color según signo), Ingresos del Mes, Egresos del Mes
- **Tabla paginada** — Fecha, Descripción, Categoría, Tipo, Monto + saldo pendiente, Estado
- **Panel de filtros** — Tipo (Ingreso/Egreso), Estado (Completado/Parcial/Pendiente/Anulado)
- **Buscador** con debounce de 400 ms
- **Paginación** — hasta 5 botones de página + anterior/siguiente
- **Exportación XLSX** — libro con 8 columnas formateadas

### Acciones del usuario
- Búsqueda en tiempo real (debounce 400 ms)
- Filtros acumulables de tipo y estado; botón para limpiar filtros
- Clic en fila → `TransactionDetailDrawer` (edición y eliminación si `canWrite`)
- Exportar XLSX
- Crear movimiento (si `canWrite`) → `CreateMovementView`

### 3.1 Carga de datos

```
GET /api/v1/transactions?page=N&limit=10&search=X&type=Y&status=Z
→ { data: Transaction[], total, totalPages }

GET /api/v1/transactions/summary
→ { totalBalance, monthlyIncome, monthlyExpense }
```

Ambas se disparan en paralelo. La búsqueda usa debounce de 400 ms.

### 3.2 Tarjetas de resumen — base de caja

Los valores vienen del backend (`/transactions/summary`). Cuentan `receivedAmount` para Completado y Parcial:

```
totalBalance    = Σ receivedAmount(t) [Ingreso] − Σ receivedAmount(t) [Egreso]
                  [no proyección, no cancelado, todos los tiempos]

monthlyIncome   = Σ receivedAmount(t) [Ingreso,  no proyección, no cancelado, año=curY, mes=curM]
monthlyExpense  = Σ receivedAmount(t) [Egreso,   no proyección, no cancelado, año=curY, mes=curM]
```

Formato del balance en la tarjeta:
```
formatCompact(Math.abs(totalBalance))   ← siempre positivo; el color indica el signo
```

### 3.3 Indicador de saldo pendiente en la tabla

Cuando `tx.balance > 0`, debajo del monto principal aparece una línea en ámbar:

```
formatCompact(tx.balance) + " pend."
title = "Saldo pendiente: " + formatCurrency(tx.balance)
```

### 3.4 Badge de estado

| Estado | Color |
|---|---|
| Completado | Verde (`brand-success`) |
| Parcial | Ámbar (`brand-warning`) |
| Pendiente | Azul (`brand-primary`) |
| Anulado | Rojo (`brand-danger`) |

### 3.5 Paginación

```
botones visibles = Math.min(totalPages, 5)
conteo pie       = "Mostrando {data.length} de {total} movimientos"
```

### 3.6 Conteo de filtros activos

```
activeFilters = (typeFilter ? 1 : 0) + (statusFilter ? 1 : 0)
```

Se muestra como badge rojo sobre el botón "Filtrar".

### 3.7 Exportación Excel

Se carga la lista completa (`limit=9999`) con los filtros activos y se genera el archivo en el navegador con ExcelJS. Los montos se formatean con `formatCurrency`.

---

---

## 4. CashFlowView

**`src/views/CashFlowView.tsx`** | **`internal/handler/cashflow.go`**

### Secciones UI
- **Selector de período** — Día / Semana / Mes con navegador de fecha (←/→)
- **Resumen superior** — Balance Proyectado 30d + variación % vs. mes anterior
- **Alertas de Liquidez** — tarjetas danger/success del backend (incluye Parcial)
- **Visualización adaptable por período:**
  - **Día** — 4 tarjetas compactas (Total, Ingresos reales, Egresos reales, Proyecciones)
  - **Semana** — 7 columnas con barras de ingresos/egresos reales y proyectados
  - **Mes** — cuadrícula de calendario con resumen por celda
- **Tabla de movimientos detallados** — filtros por Tipo, Estado, Fuente, Tipo de registro

### Acciones del usuario
- Cambiar período y navegar fechas
- 4 filtros acumulables para la tabla de movimientos
- Clic en transacción → `TransactionDetailDrawer`
- Crear movimiento / crear proyección (si `canWrite`)

### 4.1 Carga de datos

```
GET /api/v1/cashflow
→ { days[], projectedBalance, projectedChange, alerts[] }

GET /api/v1/transactions?limit=1000
→ { data: Transaction[] }
```

Ambas en paralelo. El array de transacciones se usa para construir el gráfico en el frontend.

### 4.2 Saldo proyectado (30d)

Calculado en **dos lugares**:

**Backend** (`cashflow.go`) — devuelto como `projectedBalance` (usado en tarjeta superior):

```
balance    = currentBalance(all)
           = Σ receivedAmount(t)  [no proyección, no cancelado]

horizonte  = hoy + 30 días

pendingInc = Σ pendingAmount(t)  [Ingreso, no proyección, txDate(t) ≤ horizonte]
pendingExp = Σ pendingAmount(t)  [Egreso,  no proyección, txDate(t) ≤ horizonte]

donde pendingAmount(t):
  Pendiente → t.Amount
  Parcial   → t.Balance   ← solo el remanente aún no cobrado/pagado

proyectado = balance + pendingInc − pendingExp
```

**Frontend** (`useMemo` sobre `allTxs`) — valor reactivo que se actualiza al editar transacciones:

```
balance = Σ [no proyección, no cancelado]:
    Completado → ±t.amount
    Parcial    → ±(t.amount − t.balance)
    Pendiente  → 0

pendingInc = Σ t  [no proyección, (Pendiente|Parcial), Ingreso, txDate ≤ horizonte]:
    Pendiente → t.amount
    Parcial   → t.balance

pendingExp = Σ t  [no proyección, (Pendiente|Parcial), Egreso,  txDate ≤ horizonte]:
    Pendiente → t.amount
    Parcial   → t.balance

proyectado = balance + pendingInc − pendingExp
```

Ejemplo:
```
hoy             = 2026-05-29   horizonte = 2026-06-28
balance         = 8_000_000    (efectivo recibido a hoy)
pendingInc      = 4_000_000    (cobros dentro del horizonte: 2M Pendiente + 2M Parcial remanente)
pendingExp      = 1_500_000    (pagos dentro del horizonte)
proyectado      = 10_500_000
```

### 4.3 Variación mes a mes — `projectedChange`

Calculada en el backend:

```
thisNet = monthlyTotals(curY, curM).income − monthlyTotals(curY, curM).expense
prevNet = monthlyTotals(prevY, prevM).income − monthlyTotals(prevY, prevM).expense

projectedChange = round((thisNet − prevNet) / |prevNet| × 100, 1 decimal)
```

Recortado al rango `[−999, +999]`. Si `prevNet = 0` devuelve `0.0`.

### 4.4 Gráfico de barras — construido en frontend

Función `buildChart(allTxs, period, ref)`. Cada punto tiene cuatro valores:

```
ingresos     = Σ t.amount [real, Ingreso,  Status=Completado, fecha ∈ período]
egresos      = Σ t.amount [real, Egreso,   Status=Completado, fecha ∈ período]
proyIngresos = Σ t.amount [proj, Ingreso,  fecha ∈ período]
proyEgresos  = Σ t.amount [proj, Egreso,   fecha ∈ período]
```

Granularidad según período:

| Período | Puntos | Agrupación |
|---|---|---|
| Día | 4 filas (Total, Ingresos, Egresos, Proyecciones) | todas las txs de ese día |
| Semana | 7 puntos | un punto por día (Lun–Dom) |
| Mes | N puntos | un punto por día del mes |

**Rango de fechas:**

- **Semana:** `lunes = fecha − ((diaSemana === DOM ? 6 : diaSemana − 1))` días
- **Mes:** `new Date(año, mes, 1)` → `new Date(año, mes+1, 0)`
- **Día:** `parseTxDate(tx.date) === dateKey(ref)`

### 4.5 Calendario mensual

Solo activo en período `"month"`. Offset de la primera celda:

```
offset = (primerDíaDelMes.getDay() + 6) % 7
```

Convierte la convención DOM=0 a LUN=0. Rellena con `null` hasta completar filas de 7.

### 4.6 Alertas de liquidez

Incluyen tanto Pendiente como Parcial. El monto mostrado es `pendingAmount(t)`:

```
Ingreso Pendiente → title="Cobro Pendiente",  kind="success", amount=t.Amount
Ingreso Parcial   → title="Cobro Parcial",    kind="success", amount=t.Balance
Egreso  Pendiente → title="Pago Pendiente",   kind="danger",  amount=t.Amount
Egreso  Parcial   → title="Pago Parcial",     kind="danger",  amount=t.Balance
```

Ordenadas descendente por monto, recortadas a 4.

### 4.7 Conteo de filtros activos

```
activeFilters = (type≠'' ? 1:0) + (status≠'' ? 1:0) + (source≠'' ? 1:0) + (record≠'' ? 1:0)
```

---

---

## 5. ProjectionsView

**`src/views/ProjectionsView.tsx`** | **`internal/handler/projections.go`**

### Secciones UI
- **Tarjetas de período** — 30 / 60 / 90 días; clic selecciona el período activo del gráfico
  - Muestran Ingresos esperados, Egresos esperados y Saldo Estimado en formato compacto
- **Gráfico de área** — Saldo Proyectado (verde) vs. Zona de Déficit (rojo) a lo largo del período
- **Vencimientos y Alertas** — cuotas individuales o transacciones únicas, ordenadas por urgencia
  - Clic → `GET /transactions/:id` → `TransactionDetailDrawer`

### Acciones del usuario
- Clic en tarjeta de período → cambia gráfico y alertas al horizonte seleccionado
- Hover en valores → tooltip con valor completo
- Clic en alerta → `TransactionDetailDrawer`
- "Agregar proyección manual" → `CreateProjectionView`

### 5.1 Carga de datos

3 requests en paralelo:

```
GET /api/v1/projections?days=30  → ProjectionSummary
GET /api/v1/projections?days=60  → ProjectionSummary
GET /api/v1/projections?days=90  → ProjectionSummary
```

Guardados en `dataMap: Record<30|60|90, ProjectionSummary>`.

### 5.2 Clasificación de transacciones para proyecciones

El backend construye dos grupos mutuamente excluyentes:

**Grupo A — Pago único** (sin cuotas hijas):
- Transacciones `Status ∈ {Pendiente, Parcial}`, `IsProjection=false`, sin hijos en `parentToTerms`
- Fecha de vencimiento: `t.Date` (no `CreatedAt`)
- Monto proyectado: `pendingAmount(t)` = `t.Balance` si Parcial, `t.Amount` si Pendiente

**Grupo B — Plan de cuotas** (con hijos `IsProjection=true, ParentID=parent.ID`):
- El padre se omite del cálculo directo
- Las cuotas se ordenan por fecha y se aplica distribución FIFO:

```
alreadyPaid = parent.Amount − parent.Balance

para cada cuota (orden cronológico):
    si alreadyPaid ≥ cuota.Amount:
        alreadyPaid −= cuota.Amount   ← esta cuota ya fue absorbida por pagos pasados
        continuar
    effective   = cuota.Amount − alreadyPaid
    alreadyPaid = 0
    → proyectar `effective` en la fecha de la cuota
```

Ejemplo — factura $6M, 3 cuotas de $2M, $2M ya pagados (balance=$4M):
```
alreadyPaid = 6M − 4M = 2M

Cuota 1 (30d, $2M): alreadyPaid=2M ≥ 2M → absorbida, alreadyPaid=0
Cuota 2 (60d, $2M): effective=2M−0=2M   → proyecta $2M al día 60
Cuota 3 (90d, $2M): effective=2M−0=2M   → proyecta $2M al día 90
```

### 5.3 Ingresos y egresos proyectados

```
daysAway = round((parse(t.Date) − now).horas / 24)
si daysAway < 0 → daysAway = 0   ← vencidas se aplican en día 0
si daysAway > days → excluir

projInc += monto_efectivo  si Ingreso
projExp += monto_efectivo  si Egreso
```

### 5.4 Saldo estimado

```
currentBalance  = Σ receivedAmount(t)  [no proyección, no cancelado]
estimatedBalance = currentBalance + projInc − projExp
```

Ejemplo para 30 días:
```
currentBalance   = 8_000_000
projInc  (30d)   = 2_000_000   (cuota 2 + pago único pendiente)
projExp  (30d)   = 1_200_000
estimatedBalance = 8_800_000
```

### 5.5 Gráfico de área — saldo día a día

**Paso 1** — construir `dailyNet` con los montos efectivos de ambos grupos:
```
dailyNet[daysAway] += monto_efectivo  si Ingreso
dailyNet[daysAway] -= monto_efectivo  si Egreso
```

**Paso 2** — 8 checkpoints uniformes en `[0, days]`:
```
checkpoint[i] = round(i × days / 7)   para i = 0..7

days=30 → [0, 4,  9, 13, 17, 21, 26, 30]
days=60 → [0, 9, 17, 26, 34, 43, 51, 60]
days=90 → [0, 13, 26, 39, 51, 64, 77, 90]
```

**Paso 3** — acumular saldo en cada checkpoint:
```
running = currentBalance

para cada checkpoint cp:
    para d = (cp_anterior + 1) .. cp:
        running += dailyNet[d]

    val     = max(running, 0)     → serie verde  (saldo disponible)
    deficit = max(−running, 0)    → serie roja   (zona de déficit)
```

Recharts `AreaChart` renderiza:
- `val` con gradiente verde — saldo proyectado disponible
- `deficit` con gradiente rojo — visible solo cuando `running < 0`

### 5.6 Alertas de vencimientos

Una entrada por cada flujo proyectado (cuota individual o pago único). El monto mostrado es el `effective` calculado tras FIFO, no el `Amount` original:

```
1. daysAway ascendente    ← más urgentes primero
2. monto    descendente   ← mayor monto en empate
```

Recortadas a máximo **5**. Texto relativo de fecha:
```
daysAway ≤ 0 → "Vence hoy"
daysAway = 1 → "Vence mañana"
daysAway > 1 → "Próximo en N días"
```

Color e icono:
```
Ingreso → "brand-success" + FileCheck
Egreso  → "brand-danger"  + AlertCircle
```

### 5.7 Simulador de escenarios

```
POST /api/v1/projections/simulate  { salesGrowth, paymentDelay }
```

```
base = currentBalance
     + Σ pendingAmount(t)  [Ingreso, no proyección, Pendiente|Parcial]
     − Σ pendingAmount(t)  [Egreso,  no proyección, Pendiente|Parcial]

impacto   = base × (salesGrowth / 100)
penalidad = paymentDelay × (|base| × 0.0005)
            ↑ 0.05% del saldo base por cada día de retraso en cobros
proyectado = base + impacto − penalidad
```

Nivel de riesgo:
```
proyectado < base × 0.3 → "high"    (perdió > 70% del saldo)
proyectado < base × 0.6 → "medium"  (perdió entre 40% y 70%)
en otro caso            → "low"
```

Ejemplo:
```
base         = 10_000_000
salesGrowth  = 10%         → impacto   =  1_000_000
paymentDelay = 5 días      → penalidad =      25_000
proyectado   = 10_975_000  → riesgo    = "low"
```

---

---

## 6. CreateMovementView

**`src/views/CreateMovementView.tsx`**

### Secciones UI
- Selector Ingreso / Egreso (cambia colores y etiquetas)
- Campos: Fecha, Monto, Categoría, Descripción, Fuente (Siigo/Manual), toggle Proyección
- **Panel de impacto estimado** — Balance Actual → Balance Proyectado tras aplicar el monto

### Acciones del usuario
- Toggle Ingreso/Egreso
- Toggle de proyección (marca la transacción como `isProjection: true`)
- Guardar → crea transacción, navega a `/flujo`

### 6.1 Carga de datos

Al montar, en paralelo:

```
GET /api/v1/categories           → categorías disponibles
GET /api/v1/transactions/summary → { totalBalance, monthlyIncome, monthlyExpense }
```

`totalBalance` ya usa `receivedAmount` (base de caja).

### 6.2 Parseo del monto

El campo de monto acepta coma o punto como separador decimal:

```
amountNum = parseFloat(amount.replace(/,/g, '.')) || 0
```

### 6.3 Impacto estimado — sidebar

Calculado en tiempo real en el frontend sin llamadas al backend:

```
saldoProyectado = summary.totalBalance + (type === 'Ingreso' ? +amountNum : −amountNum)
```

Se muestra con `formatCurrency`.

### 6.4 Guardado

```
POST /api/v1/transactions  {
  date, description, category, type,
  amount: parseFloat(amount.replace(/,/g, '.')),
  status: 'Pendiente',
  source,         ← 'Manual' | 'Siigo'
  isProjection    ← bool, toggle en el formulario
}
```

Validación local antes de enviar: `date`, `amount` y `description` son obligatorios.

---

---

## 7. CreateProjectionView

**`src/views/CreateProjectionView.tsx`**

### Secciones UI
- Selector Ingreso Esperado / Egreso Esperado
- Campos: Fecha futura (mín. hoy), Monto, Categoría, Descripción
- **Panel de horizonte** — tarjetas 30d / 60d / 90d que se iluminan según la fecha elegida

### Acciones del usuario
- Seleccionar fecha futura (máximo 90 días); las tarjetas de horizonte se actualizan en tiempo real
- Guardar → crea proyección, navega a `/proyecciones`

### 7.1 Carga de datos

```
GET /api/v1/categories  → categorías disponibles
```

### 7.2 Cálculo de días hasta la fecha

```
daysUntil = max(0, round((new Date(date).getTime() − Date.now()) / 86_400_000))
```

`86_400_000` = milisegundos en un día.

### 7.3 Horizonte de impacto — sidebar

Determina en qué ventanas de proyección (30/60/90d) aparecerá esta transacción:

```
horizon = daysUntil ≤ 30 ? 30
        : daysUntil ≤ 60 ? 60
        : daysUntil ≤ 90 ? 90
        : null   ← fuera del horizonte soportado

inWindow(d) = horizon !== null && d >= horizon
```

Para cada banda `d ∈ {30, 60, 90}`:
- Si `inWindow(d) = true` → muestra `±formatCurrency(amountNum)` en verde/rojo
- Si `inWindow(d) = false` → muestra `—`

### 7.4 Validación

```
si daysUntil > 90 → error: "La fecha esperada debe estar dentro de los próximos 90 días"
```

### 7.5 Guardado

```
POST /api/v1/projections  { date, description, category, type, amount }
```

El backend marca automáticamente `isProjection = true`.

---

---

## 8. ReportsView

**`src/views/ReportsView.tsx`** | **`internal/handler/reports.go`**

### Secciones UI
- Selector de período — Mensual / Trimestral / Anual
- **Gráfico de barras** — Flujo de Caja: ingresos vs. egresos por período
- **Distribución por categoría** — barras proporcionales + leyenda con porcentajes
- **Tabla de comparación** — Período Actual, Período Anterior, Variación %, Tendencia (↑/↓)
- **Card de insight** — texto generado por el backend con recomendación estratégica
- **Proyección de cierre** — Cierre Proyectado y Probabilidad de cumplimiento en formato compacto
- **Exportación XLSX** — 4 hojas: Flujo de Caja, Gastos por Categoría, Comparación, Resumen

### Acciones del usuario
- Cambio de período → recarga datos
- Descargar XLSX

### 8.1 Carga de datos

```
GET /api/v1/reports?period=mensual|trimestral|anual
→ ReportSummary
```

Se recarga cada vez que el usuario cambia de período.

### 8.2 Período mensual — últimos 6 meses (rolling)

**Gráfico:**
```
para i = 0..5:
    t = fechaActual − (5 − i) meses
    chartData[i] = { name: spanishMonths[t.Month],
                     ingresos: monthlyTotals(all, t.Year, t.Month).inc,
                     egresos:  monthlyTotals(all, t.Year, t.Month).exp }
```

`monthlyTotals` usa `receivedAmount` — incluye Completado y la parte cobrada de Parcial.

**Proyección al cierre del año:**
```
sumNet = Σ (ingresos[m] − egresos[m])  para m ∈ {mes−1, mes−2, mes−3}
avgMonthlyNet   = sumNet / 3
monthsRemaining = 12 − mesActual
projectedClose  = currentBalance + avgMonthlyNet × monthsRemaining
```

### 8.3 Período trimestral — Q1–Q4 del año en curso

**Gráfico:** 4 puntos Q1–Q4. Los trimestres futuros (> curQ) se muestran con `ingresos=0, egresos=0`.

**Proyección:**
```
avgQ = Σ netQ  /  nTrimestresConDatos   (mirando hasta 4 trimestres hacia atrás)
quartersLeft   = 4 − curQ
projectedClose = currentBalance + avgQ × quartersLeft
```

### 8.4 Período anual — ENE–DIC del año en curso

**Gráfico:** 12 puntos, meses futuros con `ingresos=0, egresos=0`.

**Proyección:**
```
ytdInc = Σ ingresos[m]  para m = 1..curM
ytdExp = Σ egresos[m]   para m = 1..curM
avgMonthNet   = (ytdInc − ytdExp) / curM
monthsLeft    = 12 − curM
projectedClose = currentBalance + avgMonthNet × monthsLeft
```

### 8.5 Distribución de gastos por categoría — base de caja

```
para cada egreso en el rango [from, to] (no proyección, no cancelado):
    r = receivedAmount(t)   ← Completado=Amount, Parcial=Amount−Balance, Pendiente=0
    catMap[t.Category] += r
    total += r

pct(cat) = round(catMap[cat] / total × 1000) / 10
```

Ordenado descendente, máximo 6 categorías. Ancho de barra: `width: ${cat.value}%`.

### 8.6 Tabla de comparación por categoría — variación

```
para cada egreso (no proyección, no cancelado):
    r = receivedAmount(t)
    si fecha ∈ [from, to]         → curr[cat] += r
    si fecha ∈ [prevFrom, prevTo] → prev[cat] += r

change = round(((curr − prev) / prev) × 1000) / 10   si prev > 0
change = 0                                             si prev = 0

isPositive = curr ≤ prev || prev = 0
             ↑ gastar menos que el período anterior es positivo
```

Formato en el frontend: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`

### 8.7 Probabilidad (tasa de períodos positivos)

```
netPositiveRate = pct(períodosPositivos, lookback)

donde períodoPositivo = ingresos[p] ≥ egresos[p]   (usando receivedAmount)
lookback = 6 meses (mensual) | 4 trimestres (trimestral) | 12 meses (anual)
```

### 8.8 Gráfico — Tooltip y cierre proyectado

El `<Tooltip>` de Recharts usa `formatter={(value) => [formatCompact(value), name]}`.

El cierre proyectado se muestra con `formatCompact` para evitar desbordamiento en la tarjeta:
```
formatCompact(data.annual.projectedClose)
→ "6.2B COP"  en lugar de "COP 6.237.317.115,00"
```

### 8.9 Exportación Excel

Genera 4 hojas con ExcelJS directamente en el navegador:
- **Flujo de Caja** — `cashFlowChart` con montos formateados con `formatCurrency`
- **Gastos por Categoría** — porcentajes del `categoryBreakdown`
- **Gasto por Categoría** — tabla comparativa con variación `%`
- **Resumen** — cierre proyectado, probabilidad e insight

---

---

## 9. SettingsView

**`src/views/SettingsView.tsx`**

### Secciones UI
- **Gestión de usuarios** (solo ADMINISTRADOR) — lista de usuarios con avatar, rol y menú; modal de creación con campos Nombre, Email, Contraseña, Rol
- **Preferencias de moneda** (todos los roles) — selector de moneda base (COP/USD/EUR/CLP/MXN), toggle de tipo de cambio automático
- **Registro de actividad** (solo ADMINISTRADOR) — tabla con Usuario, Acción, Módulo, Fecha y hora, Detalle

### Acciones del usuario
- Crear usuario (admin) → modal
- Cambiar moneda base → actualiza `formatCurrency`/`formatCompact` en toda la app vía `refreshSettings()`
- Activar/desactivar conversión automática
- Ver detalle de log de actividad

### 9.1 Carga de datos

Al montar, en paralelo (solo si `isAdmin`):

```
GET /api/v1/users           → User[]
GET /api/v1/settings        → { baseCurrency, autoExchangeRate }
GET /api/v1/activity-logs   → ActivityLog[]
```

### 9.2 Gestión de usuarios — solo ADMINISTRADOR

**Crear usuario:**
```
POST /api/v1/users  { name, email, role, password: sha256(plain) }
```

El hash SHA-256 se calcula en el frontend antes de enviar:
```
hashPassword(plain):
    encoded = TextEncoder.encode(plain)
    buf     = await crypto.subtle.digest('SHA-256', encoded)
    return  Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
```

Roles disponibles: `ADMINISTRADOR`, `TESORERÍA`, `CONSULTA`. Rol por defecto al crear: `CONSULTA`.

### 9.3 Preferencias de moneda — todos los roles

```
PUT /api/v1/settings  { baseCurrency, autoExchangeRate }
```

Al guardar se llama `refreshSettings()` que recarga el `SettingsContext` y propaga `formatCurrency` y `formatCompact` a toda la aplicación.

### 9.4 Logs de actividad — solo ADMINISTRADOR

Los timestamps se formatean con el locale del usuario:
```
new Date(log.timestamp).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
```

---

---

## Resumen del ciclo completo por vista

```
LoginView
  → POST /auth/login o /auth/microsoft
  → JWT + user en localStorage

DashboardView
  → GET /dashboard + /bank-balance (paralelo)
  → Backend: monthlyTotals (receivedAmount), signedPct, expensePie (receivedAmount),
             weeklyData (receivedAmount), pendingAlerts (pendingAmount, incluye Parcial)
  → Frontend: indicador salud (ratio), anchos barras semanales,
              formatCurrency en alertas y saldo

MovementsView
  → GET /transactions (paginado) + /transactions/summary (paralelo)
  → Backend summary: totalBalance/monthlyIncome/monthlyExpense = Σ receivedAmount
  → Frontend: formatCompact(|balance|), balance pendiente en ámbar por fila,
              badge Parcial en ámbar, exportar Excel con formatCurrency

CashFlowView
  → GET /cashflow + GET /transactions?limit=1000 (paralelo)
  → Backend: projectedChange = (thisNet−prevNet)/|prevNet|×100
             projected = currentBalance + Σ pendingAmount(t) dentro de 30d
             alertas incluyen Parcial con pendingAmount
  → Frontend: projectedBalance (useMemo), Completado+Parcial en balance,
              Pendiente+Parcial en pendingInc/Exp,
              buildChart por período, calendarOffset = (firstDay.getDay()+6)%7

ProjectionsView
  → GET /projections?days=30,60,90 (3 en paralelo)
  → Backend: clasificación FIFO de cuotas, fechas desde t.Date,
             receivedAmount para currentBalance,
             pendingAmount/effective para dailyNet,
             8 checkpoints, val/deficit, alertas por urgencia con montos ajustados
  → Frontend: selector de período activo, AreaChart, hover tooltip

CreateMovementView
  → GET /categories + /transactions/summary (paralelo)
  → Frontend: saldoProyectado = totalBalance ± amountNum
  → POST /transactions al guardar

CreateProjectionView
  → GET /categories
  → Frontend: daysUntil = (date−now)/86_400_000, horizon, inWindow por banda
  → POST /projections al guardar

ReportsView
  → GET /reports?period=X (recarga al cambiar período)
  → Backend: rolling avg (receivedAmount), ytd, quarterlyTotals (receivedAmount),
             pct, categoryComparisonTable (receivedAmount), netPositiveRate
  → Frontend: formatCompact en tooltip y cierre proyectado, Excel 4 hojas

SettingsView
  → GET /users + /settings + /activity-logs (paralelo, solo admin)
  → Frontend: sha256(password), refreshSettings tras guardar moneda
  → POST /users al crear usuario
  → PUT  /settings al guardar preferencias

Sincronización Siigo (header — ADMINISTRADOR / TESORERÍA)
  Incremental  → POST /siigo/sync { mode:"incremental" }
                 dateStart = hoy−90d, dateEnd = hoy
                 automático diario 06:00 / manual desde botón principal
  Reconcile    → POST /siigo/sync { mode:"reconcile" }
                 dateStart = fecha más antigua Pendiente|Parcial en BD
                 automático 1° de mes / manual desde menú desplegable
  Bootstrap    → POST /siigo/sync { mode:"bootstrap", dateStart:"YYYY-MM-DD" }
                 dateStart = fecha elegida por usuario, dateEnd = hoy
                 solo manual; date picker inicializado con hoy, max=hoy
```
