function normalizeOperationNumber(operationNumber) {
  return String(operationNumber || '').trim();
}

/**
 * Consulta de solo lectura a la colección Firestore yape_transacciones.
 * Nunca crea cargos ni modifica los depósitos del monitor Yape.
 */
export const yapeTransactionService = {
  async findIncomingTransaction({ db, operationNumber, expectedAmount } = {}) {
    const operation = normalizeOperationNumber(operationNumber);

    if (!operation || operation.length > 64) {
      throw new Error('Ingresa un número de operación Yape válido.');
    }
    if (!db?.findYapeTransaction) {
      throw new Error('La consulta de transacciones Yape no está disponible.');
    }

    const transaction = await db.findYapeTransaction(operation);
    if (!transaction) {
      throw new Error('No encontramos ese depósito. Verifica el número de operación y espera unos segundos si acabas de yapear.');
    }
    if (String(transaction.tipo || '').toUpperCase() !== 'ENTRADA') {
      throw new Error('El número de operación indicado no corresponde a un depósito recibido.');
    }
    const amount = Number(transaction.monto);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('El depósito encontrado no tiene un monto válido.');
    }
    if (expectedAmount !== undefined && Number(expectedAmount).toFixed(2) !== amount.toFixed(2)) {
      throw new Error(`El depósito es de S/ ${amount.toFixed(2)} y no coincide con el monto solicitado.`);
    }

    return {
      operationNumber: transaction.numero_operacion,
      amount,
      receivedAt: transaction.fecha_hora || transaction.fecha_registro || null,
      senderName: transaction.nombre || null
    };
  }
};
