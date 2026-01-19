/*
  # Agregar soporte para pagos parciales
  
  ## Cambios
  1. Agregar columna `amount_paid` a expense_splits para rastrear pagos parciales
  2. Actualizar la lógica de `is_settled` para considerar pagos parciales
  
  ## Nuevas columnas
  - `amount_paid` (numeric): Monto pagado hasta ahora (default 0)
  
  ## Notas
  - Un split está completamente pagado cuando `amount_paid >= amount`
  - `is_settled` se mantiene para compatibilidad, pero ahora representa si está completamente pagado
  - Los pagos parciales permiten que usuarios paguen lo que puedan y se distribuya entre múltiples deudas
*/

-- Agregar columna para rastrear pagos parciales
ALTER TABLE expense_splits 
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0 NOT NULL;

-- Actualizar los registros existentes: si is_settled = true, entonces amount_paid = amount
UPDATE expense_splits 
SET amount_paid = amount 
WHERE is_settled = true AND amount_paid = 0;

-- Crear índice para consultas de pagos parciales
CREATE INDEX IF NOT EXISTS idx_expense_splits_amount_paid ON expense_splits(amount_paid);

-- Agregar constraint para asegurar que amount_paid nunca sea mayor que amount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_amount_paid_valid'
  ) THEN
    ALTER TABLE expense_splits 
    ADD CONSTRAINT check_amount_paid_valid 
    CHECK (amount_paid >= 0 AND amount_paid <= amount);
  END IF;
END $$;
