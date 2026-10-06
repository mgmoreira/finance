# Dividendos (estimados) + aporte real en Objetivos

Fecha: 2026-10-06

## Objetivo

Saber cuánto gano por año en dividendos (USD, neto y bruto, y en % de rendimiento), cuándo cobro cada acción, y cuánto capital necesitaría para llegar a un ingreso anual fijo. Sin cargar montos reales: todo estimado desde Yahoo + mis operaciones.

## Modelo de cálculo

- **Dividendo por acción**: eventos de Yahoo (fecha de corte = ex-date, monto por acción/ADR de EEUU), últimos 2 años.
- **CEDEARs con derecho**: cantidad que tenía *antes* de la fecha de corte (`date < exDate`), exacta desde `transactions`. Para pagos futuros: cantidad actual.
- **Bruto** = CEDEARs ÷ paridad × dividendo por acción. **Neto** = bruto × (1 − retención efectiva).
- **Retención efectiva por acción** (incluye impuestos + costos), editable, guardada en `species.withholding_pct` (null = default):
  - EEUU 35% (validado: PEP 35,1%, UNH 35,1%), Brasil 25% (GGB 23,6%, PBR ~30%), ASML 20%, TSM 26%, BABA/JD 15%, YPF/TGS/CRESY 7%, EWZ 35% (ETF de EEUU), resto 35%.
- **Fecha de pago**: pago en EEUU + 1 día (acreditación BYMA; validado PEP 30/9→1/10, UNH 22/9→23/9). Pago en EEUU = confirmado por Yahoo (`calendarEvents.dividendDate`) cuando existe; si no, fecha de corte + desfase típico de esa acción (`dividendDate − exDividendDate` de Yahoo, default 25 días; PBR ≈ 126).
- **Proyección**: los eventos con corte en los últimos 12 meses se repiten un año después con el mismo monto. Si Yahoo confirma la próxima fecha de corte, reemplaza a la proyectada más cercana (±45 días).
- **Ventanas por fecha de pago**: "próximos 12 meses" = pagos en (hoy, hoy+1 año]; "últimos 12 meses" = pagos en (hoy−1 año, hoy].
- **Rendimiento bruto por acción** = suma de dividendos con corte en los últimos 12 meses ÷ precio en EEUU.
- **Rendimiento neto de la cartera** = neto próximos 12 meses ÷ valor de las acciones (balance BOLSA).
- **Calculadora de meta**: capital necesario = ingreso anual neto deseado ÷ rendimiento neto. Falta = capital necesario − valor actual de las acciones. Se muestran también alternativas a 3%, 5% y 7% neto.

## Datos

- Tabla `dividend_cache`: `ticker (pk), events (JSON [{exDate, amount}]), next_ex_date, next_pay_date, pay_lag_days, updated_at`.
- Columna nueva `species.withholding_pct REAL` (nullable).
- Se refresca dentro de `/api/refresh-prices` solo para tickers con cache de más de 24 h (Yahoo es lento: ~2 llamadas por ticker).

## UI

**BOLSA → panel "DIVIDENDOS"** (debajo de posiciones):
1. KPIs: neto próximos 12m (+ % rendimiento neto), bruto próximos 12m, promedio mensual neto, cobrado últimos 12m (estimado).
2. Barras por mes (neto, próximos 12 meses).
3. Calculadora de meta: input de ingreso anual neto → capital necesario, lo que tengo, cuánto falta; alternativas 3/5/7%.
4. Tabla por acción: CEDEARs, dividendo/acción/año, rendimiento bruto %, retención % (editable inline), neto próximos 12m, % del total, próximo pago (fecha + neto).
5. Próximos pagos (10): fecha de pago, acción, neto, si la fecha es confirmada o estimada.

**Detalle de acción (drawer)**: "Div. neto/año" ($ y % bruto) y "Próx. dividendo" (fecha + neto), reemplazando el viejo "Dividendo" (yield de la carga inicial).

**Objetivos**: en cada tarjeta, "APORTE: escenario $X/año · real 12m $Y" (verde si real ≥ escenario). Aporte real = transferencias a inversión de GASTOS de los últimos 12 meses en USD (`amount_usd`, o `amount_ars ÷ exchange_rate`, o ÷ tipo de cambio del presupuesto del mes).

## Fuera de alcance

- Cargar montos reales cobrados / calibración automática (decidido: solo estimado).
- Dividendos de acciones ya vendidas.
