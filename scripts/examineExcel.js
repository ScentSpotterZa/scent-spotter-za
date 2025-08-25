import ExcelJS from 'exceljs';

async function examineExcel() {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile('amazon_web_scrapes/amazon-2025-08-25.xlsx');
        
        const worksheet = workbook.getWorksheet(1);
        console.log('Worksheet name:', worksheet.name);
        console.log('Row count:', worksheet.rowCount);
        console.log('Column count:', worksheet.columnCount);
        
        // Examine first few rows
        for (let rowNum = 1; rowNum <= Math.min(3, worksheet.rowCount); rowNum++) {
            const row = worksheet.getRow(rowNum);
            console.log(`\n--- Row ${rowNum} ---`);
            row.eachCell((cell, colNumber) => {
                console.log(`Col ${colNumber}: "${cell.value}"`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

examineExcel();
