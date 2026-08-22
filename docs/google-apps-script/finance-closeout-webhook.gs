const FINANCE_WORKBOOK_ID = '1Q7BeQdWQEUSUQv6Tc02DiOTZ_v7aPgs7FguVQRYTu30';
const CLASS_CLOSEOUTS_SHEET = 'Class Closeouts';
const FIRST_DATA_ROW = 5;
const BACKUP_CONFIRMED_COLUMN = 22; // V

function doPost(event) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    const body = JSON.parse((event && event.postData && event.postData.contents) || '{}');
    const expectedSecret = PropertiesService.getScriptProperties()
      .getProperty('FINANCE_CLOSEOUT_WEBHOOK_SECRET');

    if (!expectedSecret || body.secret !== expectedSecret) {
      return jsonResponse({ ok: false, message: 'Unauthorized.' });
    }

    validatePayload(body);

    const spreadsheet = SpreadsheetApp.openById(FINANCE_WORKBOOK_ID);
    const sheet = spreadsheet.getSheetByName(CLASS_CLOSEOUTS_SHEET);
    if (!sheet) throw new Error('Class Closeouts sheet was not found.');

    const rowMatch = findSettlementRow(sheet, body.settlementId);
    if (rowMatch.row && isChecked(sheet.getRange(rowMatch.row, BACKUP_CONFIRMED_COLUMN).getValue())) {
      return jsonResponse({
        ok: true,
        status: 'locked',
        row: rowMatch.row,
        message: 'Backup confirmation has locked this row.',
      });
    }

    const row = rowMatch.row || rowMatch.firstEmptyRow;
    if (!row) {
      throw new Error('No empty Class Closeouts row is available. Add more formatted rows first.');
    }

    const dateParts = body.classDate.split('-').map(Number);
    const classDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0);
    const values = [[
      body.settlementId,
      classDate,
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
    ]];

    sheet.getRange(row, 1, 1, 13).setValues(values);
    SpreadsheetApp.flush();

    return jsonResponse({
      ok: true,
      status: rowMatch.row ? 'refreshed' : 'created',
      row: row,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({
      ok: false,
      message: error && error.message ? error.message : 'Unexpected spreadsheet error.',
    });
  } finally {
    lock.releaseLock();
  }
}

function findSettlementRow(sheet, settlementId) {
  const rowCount = sheet.getMaxRows() - FIRST_DATA_ROW + 1;
  const values = sheet.getRange(FIRST_DATA_ROW, 1, rowCount, 1).getDisplayValues();
  let firstEmptyRow = null;

  for (let index = 0; index < values.length; index += 1) {
    const value = String(values[index][0] || '').trim();
    const row = FIRST_DATA_ROW + index;
    if (value === settlementId) return { row: row, firstEmptyRow: firstEmptyRow };
    if (!value && firstEmptyRow === null) firstEmptyRow = row;
  }

  return { row: null, firstEmptyRow: firstEmptyRow };
}

function isChecked(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}

function validatePayload(body) {
  const requiredStrings = [
    'settlementId',
    'classDate',
    'courseId',
    'classStyle',
    'startTime',
    'backupName',
  ];
  requiredStrings.forEach(function (field) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      throw new Error('Missing or invalid ' + field + '.');
    }
  });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.classDate)) {
    throw new Error('classDate must use YYYY-MM-DD.');
  }

  const nonNegativeNumbers = [
    'adultCashCount',
    'studentCashCount',
    'adultTwintCount',
    'studentTwintCount',
    'aboCount',
    'systemCash',
    'systemTwint',
  ];
  nonNegativeNumbers.forEach(function (field) {
    if (typeof body[field] !== 'number' || !isFinite(body[field]) || body[field] < 0) {
      throw new Error('Missing or invalid ' + field + '.');
    }
  });
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
