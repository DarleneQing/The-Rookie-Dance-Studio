const FINANCE_WORKBOOK_ID = '1Q7BeQdWQEUSUQv6Tc02DiOTZ_v7aPgs7FguVQRYTu30';
const FIRST_DATA_ROW = 5;

const CLASS_CLOSEOUTS_SHEET = 'Class Closeouts';
const CLASS_BACKUP_CONFIRMED_COLUMN = 22; // V

const ABO_SALES_SHEET = 'Abo Sales';
const ABO_ENTRY_CONFIRMED_COLUMN = 13; // M

const OTHER_TRANSACTIONS_SHEET = 'Other Transactions';
const OTHER_ENTRY_CONFIRMED_COLUMN = 14; // N

function doPost(event) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;

  try {
    lock.waitLock(10000);
    lockAcquired = true;
    const body = JSON.parse((event && event.postData && event.postData.contents) || '{}');
    const expectedSecret = PropertiesService.getScriptProperties()
      .getProperty('FINANCE_CLOSEOUT_WEBHOOK_SECRET');

    if (!expectedSecret || body.secret !== expectedSecret) {
      return jsonResponse({ ok: false, message: 'Unauthorized.' });
    }

    const spreadsheet = SpreadsheetApp.openById(FINANCE_WORKBOOK_ID);
    const recordType = body.recordType || 'classCloseout';

    if (recordType === 'classCloseout') {
      return jsonResponse(upsertClassCloseout(spreadsheet, body));
    }
    if (recordType === 'aboSale') {
      return jsonResponse(upsertAboSale(spreadsheet, body));
    }
    if (recordType === 'otherTransaction') {
      return jsonResponse(upsertOtherTransaction(spreadsheet, body));
    }

    throw new Error('Unsupported finance record type.');
  } catch (error) {
    console.error(error);
    return jsonResponse({
      ok: false,
      message: error && error.message ? error.message : 'Unexpected spreadsheet error.',
    });
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

function upsertClassCloseout(spreadsheet, body) {
  validateClassCloseout(body);
  const sheet = getRequiredSheet(spreadsheet, CLASS_CLOSEOUTS_SHEET);
  const rowMatch = findRecordRow(sheet, body.settlementId);

  if (
    rowMatch.row &&
    isChecked(sheet.getRange(rowMatch.row, CLASS_BACKUP_CONFIRMED_COLUMN).getValue())
  ) {
    return {
      ok: true,
      status: 'locked',
      row: rowMatch.row,
      message: 'Backup confirmation has locked this row.',
    };
  }

  const row = requireAvailableRow(rowMatch, CLASS_CLOSEOUTS_SHEET);
  sheet.getRange(row, 1, 1, 13).setValues([[
    body.settlementId,
    parseSheetDate(body.classDate),
    body.courseId,
    body.classStyle,
    body.startTime,
    body.backupName,
    body.adultCashCount,
    body.studentCashCount,
    body.adultTwintCount,
    body.studentTwintCount,
    body.aboCount,
    body.systemCash,
    body.systemTwint,
  ]]);
  SpreadsheetApp.flush();

  return { ok: true, status: rowMatch.row ? 'refreshed' : 'created', row: row };
}

function upsertAboSale(spreadsheet, body) {
  validateAboSale(body);
  const sheet = getRequiredSheet(spreadsheet, ABO_SALES_SHEET);
  const rowMatch = findRecordRow(sheet, body.saleId);

  if (
    rowMatch.row &&
    isChecked(sheet.getRange(rowMatch.row, ABO_ENTRY_CONFIRMED_COLUMN).getValue())
  ) {
    return {
      ok: true,
      status: 'locked',
      row: rowMatch.row,
      message: 'The Abo sale entry is already confirmed.',
    };
  }

  const row = requireAvailableRow(rowMatch, ABO_SALES_SHEET);
  sheet.getRange(row, 1, 1, 14).setValues([[
    body.saleId,
    parseSheetDate(body.paymentDate),
    body.relatedSettlementId || '',
    body.memberReference,
    body.product,
    body.priceLabel,
    body.actualSaleAmount,
    body.paymentChannel,
    body.destination,
    true,
    body.subscriptionId,
    body.enteredBy,
    true,
    new Date(),
  ]]);
  SpreadsheetApp.flush();

  return { ok: true, status: rowMatch.row ? 'refreshed' : 'created', row: row };
}

function upsertOtherTransaction(spreadsheet, body) {
  validateOtherTransaction(body);
  const sheet = getRequiredSheet(spreadsheet, OTHER_TRANSACTIONS_SHEET);
  const rowMatch = findRecordRow(sheet, body.transactionId);

  if (
    rowMatch.row &&
    isChecked(sheet.getRange(rowMatch.row, OTHER_ENTRY_CONFIRMED_COLUMN).getValue())
  ) {
    return {
      ok: true,
      status: 'locked',
      row: rowMatch.row,
      message: 'The transaction entry is already confirmed.',
    };
  }

  const row = requireAvailableRow(rowMatch, OTHER_TRANSACTIONS_SHEET);
  const expense = body.direction === 'expense' ? body.amount : 0;
  const income = body.direction === 'income' ? body.amount : 0;

  sheet.getRange(row, 26).setValue(body.notes || '');
  sheet.getRange(row, 1, 1, 16).setValues([[
    body.transactionId,
    parseSheetDate(body.transactionDate),
    body.serviceDate ? parseSheetDate(body.serviceDate) : '',
    body.transactionType,
    body.category,
    body.description,
    expense,
    income,
    body.paymentChannel,
    body.paidCollectedBy,
    body.destination,
    body.receiptLink || '',
    body.custodyStatus,
    true,
    body.confirmedBy,
    new Date(),
  ]]);
  SpreadsheetApp.flush();

  return { ok: true, status: rowMatch.row ? 'refreshed' : 'created', row: row };
}

function findRecordRow(sheet, recordId) {
  const rowCount = sheet.getMaxRows() - FIRST_DATA_ROW + 1;
  const values = sheet.getRange(FIRST_DATA_ROW, 1, rowCount, 1).getDisplayValues();
  let firstEmptyRow = null;

  for (let index = 0; index < values.length; index += 1) {
    const value = String(values[index][0] || '').trim();
    const row = FIRST_DATA_ROW + index;
    if (value === recordId) return { row: row, firstEmptyRow: firstEmptyRow };
    if (!value && firstEmptyRow === null) firstEmptyRow = row;
  }

  return { row: null, firstEmptyRow: firstEmptyRow };
}

function getRequiredSheet(spreadsheet, title) {
  const sheet = spreadsheet.getSheetByName(title);
  if (!sheet) throw new Error(title + ' sheet was not found.');
  return sheet;
}

function requireAvailableRow(rowMatch, title) {
  const row = rowMatch.row || rowMatch.firstEmptyRow;
  if (!row) throw new Error('No empty ' + title + ' row is available.');
  return row;
}

function isChecked(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}

function parseSheetDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Date must use YYYY-MM-DD.');
  }
  const parts = value.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  if (
    date.getFullYear() !== parts[0] ||
    date.getMonth() !== parts[1] - 1 ||
    date.getDate() !== parts[2]
  ) {
    throw new Error('Date is not a real calendar date.');
  }
  return date;
}

function requireStrings(body, fields) {
  fields.forEach(function (field) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      throw new Error('Missing or invalid ' + field + '.');
    }
  });
}

function requireDate(body, field) {
  try {
    parseSheetDate(body[field]);
  } catch (error) {
    throw new Error(field + ' must use YYYY-MM-DD.');
  }
}

function requireEnum(body, field, values) {
  if (values.indexOf(body[field]) === -1) {
    throw new Error('Missing or invalid ' + field + '.');
  }
}

function validateClassCloseout(body) {
  requireStrings(body, [
    'settlementId',
    'classDate',
    'courseId',
    'classStyle',
    'startTime',
    'backupName',
  ]);
  requireDate(body, 'classDate');

  [
    'adultCashCount',
    'studentCashCount',
    'adultTwintCount',
    'studentTwintCount',
    'aboCount',
    'systemCash',
    'systemTwint',
  ].forEach(function (field) {
    if (typeof body[field] !== 'number' || !isFinite(body[field]) || body[field] < 0) {
      throw new Error('Missing or invalid ' + field + '.');
    }
  });
}

function validateAboSale(body) {
  requireStrings(body, [
    'saleId',
    'paymentDate',
    'memberReference',
    'product',
    'priceLabel',
    'paymentChannel',
    'destination',
    'subscriptionId',
    'enteredBy',
  ]);
  requireDate(body, 'paymentDate');
  requireEnum(body, 'product', ['Monthly', '5-times', '10-times', 'Other']);
  requireEnum(body, 'priceLabel', ['Old Price', 'New Price', 'Discount', 'Special', 'N/A']);
  requireEnum(body, 'paymentChannel', ['Cash', 'TWINT', 'Bank', 'Other']);
  requireEnum(body, 'destination', ['Cash Box', 'Personal TWINT', 'Public Bank Account', 'Other']);

  if (
    typeof body.actualSaleAmount !== 'number' ||
    !isFinite(body.actualSaleAmount) ||
    body.actualSaleAmount <= 0
  ) {
    throw new Error('Actual sale amount must be greater than zero.');
  }
}

function validateOtherTransaction(body) {
  requireStrings(body, [
    'transactionId',
    'transactionDate',
    'transactionType',
    'category',
    'description',
    'direction',
    'paymentChannel',
    'destination',
    'paidCollectedBy',
    'custodyStatus',
    'confirmedBy',
  ]);
  requireDate(body, 'transactionDate');
  if (body.serviceDate) requireDate(body, 'serviceDate');
  requireEnum(body, 'direction', ['income', 'expense']);
  requireEnum(body, 'transactionType', [
    'Instructor Fee',
    'Rent',
    'Expense',
    'Donation',
    'Sponsorship',
    'Refund',
    'Other',
  ]);
  requireEnum(body, 'category', [
    'Instructor',
    'Venue',
    'Admin',
    'Donation',
    'Sponsorship',
    'Refund',
    'Other',
  ]);
  requireEnum(body, 'paymentChannel', ['Cash', 'TWINT', 'Bank', 'Other']);
  requireEnum(body, 'destination', ['Cash Box', 'Personal TWINT', 'Public Bank Account', 'Other']);
  requireEnum(body, 'custodyStatus', [
    'Not Needed',
    'Pending',
    'Reimbursed',
    'Holding Cash',
    'Transferred',
    'Other',
  ]);

  if (typeof body.amount !== 'number' || !isFinite(body.amount) || body.amount <= 0) {
    throw new Error('Transaction amount must be greater than zero.');
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
