import 'dotenv/config';
import ExcelJS from 'exceljs';
import { supabaseAdmin } from './supabaseClient.js';
import fs from 'fs';
import path from 'path';

// Function to read Excel file
async function readExcelFile(filePath) {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1); // Get first worksheet
        if (!worksheet) {
            console.error('No worksheet found in Excel file');
            return null;
        }
        
        const data = [];
        worksheet.eachRow((row, rowNumber) => {
            const rowData = [];
            row.eachCell((cell, colNumber) => {
                rowData.push(cell.value);
            });
            data.push(rowData);
        });
        
        console.log(`Read ${data.length} rows from ${path.basename(filePath)}`);
        return data;
    } catch (error) {
        console.error(`Error reading Excel file: ${error.message}`);
        return null;
    }
}

// Function to map Excel columns to database fields
function mapExcelRowToPerfume(row, headers) {
    const perfume = {};
    
    // Map each column based on header
    headers.forEach((header, index) => {
        if (header && row[index] !== undefined && row[index] !== null && row[index] !== '') {
            const value = row[index];
            
            switch (header.toLowerCase()) {
                case 'name':
                case 'product name':
                case 'title':
                    perfume.name = String(value).trim();
                    break;
                    
                case 'brand':
                case 'manufacturer':
                case 'company':
                    perfume.brand = String(value).trim();
                    break;
                    
                case 'description':
                case 'product description':
                case 'details':
                    perfume.description = String(value).trim();
                    break;
                    
                case 'price':
                case 'cost':
                case 'amount':
                    // Handle price - remove currency symbols and convert to number
                    const priceStr = String(value).replace(/[^\d.,]/g, '').replace(',', '.');
                    const price = parseFloat(priceStr);
                    if (!isNaN(price) && price > 0) {
                        perfume.price = price;
                    }
                    break;
                    
                case 'amazon url':
                case 'amazon link':
                case 'product url':
                case 'link':
                    perfume.amazon_url = String(value).trim();
                    break;
                    
                case 'asin':
                case 'amazon asin':
                case 'product id':
                    perfume.amazon_asin = String(value).trim();
                    break;
                    
                case 'image url':
                case 'image':
                case 'picture':
                case 'photo':
                    perfume.image_url = String(value).trim();
                    break;
                    
                case 'fragrantica url':
                case 'fragrantica':
                case 'fragrantica link':
                    perfume.fragrantica_url = String(value).trim();
                    break;
                    
                case 'longevity':
                case 'longevity rating':
                    const longevity = parseInt(value);
                    if (!isNaN(longevity) && longevity >= 1 && longevity <= 5) {
                        perfume.longevity = longevity;
                    }
                    break;
                    
                case 'sillage':
                case 'sillage rating':
                    const sillage = parseInt(value);
                    if (!isNaN(sillage) && sillage >= 1 && sillage <= 5) {
                        perfume.sillage = sillage;
                    }
                    break;
                    
                case 'projection':
                case 'projection rating':
                    const projection = parseInt(value);
                    if (!isNaN(projection) && projection >= 1 && projection <= 5) {
                        perfume.projection = projection;
                    }
                    break;
                    
                case 'notes':
                case 'fragrance notes':
                case 'scent notes':
                    if (typeof value === 'string') {
                        // Split by common delimiters and clean up
                        const notes = value.split(/[,;|]/).map(note => note.trim()).filter(note => note);
                        if (notes.length > 0) {
                            perfume.notes = notes;
                        }
                    }
                    break;
                    
                case 'category':
                case 'fragrance type':
                case 'type':
                    perfume.category = String(value).trim();
                    break;
                    
                case 'season':
                case 'seasons':
                case 'best season':
                    if (typeof value === 'string') {
                        const seasons = value.split(/[,;|]/).map(s => s.trim()).filter(s => s);
                        if (seasons.length > 0) {
                            perfume.season = seasons;
                        }
                    }
                    break;
                    
                case 'occasion':
                case 'occasions':
                case 'best for':
                    if (typeof value === 'string') {
                        const occasions = value.split(/[,;|]/).map(o => o.trim()).filter(o => o);
                        if (occasions.length > 0) {
                            perfume.occasion = occasions;
                        }
                    }
                    break;
            }
        }
    });
    
    return perfume;
}

// Function to validate perfume data
function validatePerfume(perfume) {
    const errors = [];
    
    if (!perfume.name || perfume.name.length < 2) {
        errors.push('Name is required and must be at least 2 characters');
    }
    
    if (!perfume.brand || perfume.brand.length < 2) {
        errors.push('Brand is required and must be at least 2 characters');
    }
    
    if (perfume.price && (perfume.price <= 0 || perfume.price > 100000)) {
        errors.push('Price must be between 0 and 100000');
    }
    
    if (perfume.longevity && (perfume.longevity < 1 || perfume.longevity > 5)) {
        errors.push('Longevity must be between 1 and 5');
    }
    
    if (perfume.sillage && (perfume.sillage < 1 || perfume.sillage > 5)) {
        errors.push('Sillage must be between 1 and 5');
    }
    
    if (perfume.projection && (perfume.projection < 1 || perfume.projection > 5)) {
        errors.push('Projection must be between 1 and 5');
    }
    
    return errors;
}

// Function to clear existing data (optional)
async function clearExistingData() {
    try {
        const { error } = await supabaseAdmin
            .from('perfumes')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy record
        
        if (error) {
            console.error('Error clearing existing data:', error);
            return false;
        }
        
        console.log('Cleared existing perfumes data');
        return true;
    } catch (error) {
        console.error('Error clearing data:', error);
        return false;
    }
}

// Function to insert perfumes into Supabase
async function insertPerfumes(perfumes) {
    const validPerfumes = [];
    const errors = [];
    
    // Validate all perfumes first
    perfumes.forEach((perfume, index) => {
        const validationErrors = validatePerfume(perfume);
        if (validationErrors.length === 0) {
            validPerfumes.push(perfume);
        } else {
            errors.push(`Row ${index + 1}: ${validationErrors.join(', ')}`);
        }
    });
    
    if (errors.length > 0) {
        console.log('Validation errors found:');
        errors.forEach(error => console.log(`- ${error}`));
    }
    
    if (validPerfumes.length === 0) {
        console.log('No valid perfumes to insert');
        return;
    }
    
    console.log(`Inserting ${validPerfumes.length} valid perfumes...`);
    
    try {
        const { data, error } = await supabaseAdmin
            .from('perfumes')
            .insert(validPerfumes)
            .select();
        
        if (error) {
            console.error('Error inserting perfumes:', error);
            return;
        }
        
        console.log(`Successfully inserted ${data.length} perfumes!`);
        return data;
    } catch (error) {
        console.error('Error inserting perfumes:', error);
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    const filePath = args[0] || 'amazon_web_scrapes/amazon-2025-08-25.xlsx';
    const clearData = args.includes('--clear');
    const dryRun = args.includes('--dry-run');
    
    console.log(`Importing data from: ${filePath}`);
    console.log(`Clear existing data: ${clearData}`);
    console.log(`Dry run: ${dryRun}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    
    // Read Excel file
    const excelData = await readExcelFile(filePath);
    if (!excelData || excelData.length < 2) {
        console.error('Invalid Excel data or file is empty');
        process.exit(1);
    }
    
    // First row contains headers
    const headers = excelData[0];
    const dataRows = excelData.slice(1);
    
    console.log('Headers found:', headers);
    console.log(`Processing ${dataRows.length} data rows...`);
    
    // Map Excel rows to perfume objects
    const perfumes = dataRows
        .map(row => mapExcelRowToPerfume(row, headers))
        .filter(perfume => perfume.name && perfume.brand); // Only include perfumes with name and brand
    
    console.log(`Mapped ${perfumes.length} perfumes from Excel data`);
    
    if (dryRun) {
        console.log('\n=== DRY RUN - Sample data (first 3 rows): ===');
        perfumes.slice(0, 3).forEach((perfume, index) => {
            console.log(`\nPerfume ${index + 1}:`);
            console.log(JSON.stringify(perfume, null, 2));
        });
        console.log('\n=== DRY RUN COMPLETE ===');
        return;
    }
    
    // Clear existing data if requested
    if (clearData) {
        const cleared = await clearExistingData();
        if (!cleared) {
            console.log('Failed to clear existing data. Aborting import.');
            process.exit(1);
        }
    }
    
    // Insert perfumes
    const insertedData = await insertPerfumes(perfumes);
    
    if (insertedData) {
        console.log('\n=== IMPORT COMPLETE ===');
        console.log(`Total perfumes imported: ${insertedData.length}`);
    }
}

// Run the script
main().catch(console.error);
