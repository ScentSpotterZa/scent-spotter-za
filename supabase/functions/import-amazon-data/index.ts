import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://cdn.skypack.dev/xlsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractBrandFromTitle(title: string): string {
  // Common fragrance brand patterns
  const brands = ['Calvin Klein', 'Hugo Boss', 'Versace', 'Dolce & Gabbana', 'Tom Ford', 'Chanel', 'Dior', 'Gucci', 'Armani', 'Prada', 'Burberry', 'Givenchy', 'Yves Saint Laurent', 'Marc Jacobs', 'Carolina Herrera', 'Giorgio Armani', 'Jean Paul Gaultier', 'Thierry Mugler', 'Issey Miyake', 'Davidoff']
  
  for (const brand of brands) {
    if (title.toLowerCase().includes(brand.toLowerCase())) {
      return brand
    }
  }
  
  // Try to extract first word(s) as brand
  const words = title.split(' ')
  return words.slice(0, 2).join(' ')
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    console.log('Starting Amazon data import from Excel file...')
    
    // Read the Excel file from the repo
    const excelResponse = await fetch('https://raw.githubusercontent.com/lovable-dev/fragrance-finder/main/amazon_web_scrapes/AmazonFragranceScrape.xlsx')
    if (!excelResponse.ok) {
      throw new Error(`Failed to fetch Excel file: ${excelResponse.statusText}`)
    }
    
    const arrayBuffer = await excelResponse.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    
    if (jsonData.length < 2) {
      throw new Error('Excel file appears to be empty or malformed')
    }
    
    // Parse header to understand column structure
    const headers = (jsonData[0] as string[]).map(h => h?.toLowerCase().replace(/[^a-z0-9]/gi, '_') || '')
    console.log('Excel Headers:', headers)
    
    const imported = []
    const errors = []
    
    // Process each row (skip header)
    for (let i = 1; i < jsonData.length; i++) {
      try {
        const values = jsonData[i] as string[]
        if (!values || values.length < headers.length) continue // Skip incomplete rows
        
        const row: Record<string, string> = {}
        headers.forEach((header, index) => {
          row[header] = values[index]?.toString() || ''
        })
        
        // Extract and clean data for perfumes table
        const brand = row.brand || extractBrandFromTitle(row.title || '')
        const name = row.title || row.name || ''
        const description = row.description || row.about || ''
        const priceStr = row.price || ''
        const currency = row.currency || 'ZAR'
        
        // Parse price (remove currency symbols and convert to number)
        let price = null
        if (priceStr) {
          const cleanPrice = priceStr.replace(/[^\d.,]/g, '').replace(',', '.')
          const parsedPrice = parseFloat(cleanPrice)
          if (!isNaN(parsedPrice)) {
            price = parsedPrice
          }
        }
        
        if (!name.trim()) {
          errors.push(`Row ${i + 1}: Missing product name`)
          continue
        }
        
        const perfumeData = {
          name: name.trim(),
          brand: brand.trim() || 'Unknown',
          description: description.trim(),
          price,
          currency,
          amazon_asin: row.asin || null,
          amazon_url: row.url || row.link || null,
          image_url: row.image_url || row.image || null,
          is_available: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Insert into Supabase
        const { data, error } = await supabase
          .from('perfumes')
          .upsert(perfumeData, { 
            onConflict: 'amazon_asin',
            ignoreDuplicates: false 
          })
          .select()
        
        if (error) {
          console.error(`Error inserting row ${i + 1}:`, error)
          errors.push(`Row ${i + 1}: ${error.message}`)
        } else {
          imported.push(perfumeData)
          console.log(`Imported: ${perfumeData.brand} - ${perfumeData.name}`)
        }
        
      } catch (rowError) {
        console.error(`Error processing row ${i + 1}:`, rowError)
        errors.push(`Row ${i + 1}: ${rowError.message}`)
      }
    }
    
    console.log(`Import completed. Imported: ${imported.length}, Errors: ${errors.length}`)
    
    return new Response(
      JSON.stringify({
        success: true,
        imported: imported.length,
        errors: errors.length,
        errorDetails: errors.slice(0, 10), // Limit error details
        message: `Successfully imported ${imported.length} perfumes from Excel file`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('Import error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})